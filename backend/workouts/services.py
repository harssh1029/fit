from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone

from .models import (
	SessionExercise,
	UserGoal,
	UserScorePeriod,
	UserScoreSummary,
	WorkoutScore,
	WorkoutSession,
)


User = get_user_model()


VALID_WORKOUT_TYPES = {'strength', 'cardio', 'conditioning', 'mobility', 'sport', 'recovery'}
MANUAL_MIN_DURATION = 10
RECORDED_MIN_DURATION = 5
CHALLENGE_MIN_DURATION = 20
MAX_LEADERBOARD_XP_PER_DAY = 180
MAX_LEADERBOARD_XP_PER_WEEK = 900


BASE_SCORES = {
	'manual': 40,
	'recorded_timer': 60,
	'plan_workout': 70,
	'challenge_workout': 75,
}

TRUST_MULTIPLIERS = {
	'manual': 0.85,
	'recorded_timer': 1.00,
	'recorded_timer_exercise_added': 1.08,
	'plan_workout_verified': 1.12,
	'challenge_verified': 1.15,
}

ACTIVITY_CAPS = {
	'manual': 85,
	'recorded_timer': 150,
	'recorded_timer_exercise_added': 150,
	'plan_workout_verified': 180,
	'challenge_verified': 180,
	'challenge_workout': 180,
}

TYPE_MULTIPLIERS = {
	'strength': 1.00,
	'cardio': 1.00,
	'conditioning': 1.05,
	'sport': 1.00,
	'mobility': 0.95,
	'recovery': 0.90,
	'custom': 1.00,
}

CATEGORY_DISTRIBUTION = {
	'strength': {'strength_score': 0.80, 'conditioning_score': 0.10, 'consistency_score': 0.10},
	'cardio': {'cardio_score': 0.80, 'conditioning_score': 0.10, 'consistency_score': 0.10},
	'conditioning': {'conditioning_score': 0.70, 'cardio_score': 0.15, 'strength_score': 0.15},
	'mobility': {'mobility_score': 0.75, 'recovery_score': 0.15, 'consistency_score': 0.10},
	'sport': {'sport_score': 0.70, 'cardio_score': 0.15, 'conditioning_score': 0.15},
	'recovery': {'recovery_score': 0.75, 'mobility_score': 0.15, 'consistency_score': 0.10},
	'custom': {'strength_score': 0.60, 'consistency_score': 0.20, 'conditioning_score': 0.20},
}

WEEKLY_ACTIVE_DAY_BONUS = {
	1: 10,
	2: 25,
	3: 60,
	4: 100,
	5: 135,
	6: 150,
	7: 130,
}

BODY_PART_MAP = {
	'chest': ('upper_body_score', 'push_score', 'chest_score'),
	'shoulders': ('upper_body_score', 'push_score', 'shoulders_score'),
	'deltoids': ('upper_body_score', 'push_score', 'shoulders_score'),
	'triceps': ('upper_body_score', 'push_score', 'triceps_score'),
	'back': ('upper_body_score', 'pull_score', 'back_score'),
	'lats': ('upper_body_score', 'pull_score', 'back_score'),
	'trapezius': ('upper_body_score', 'pull_score', 'back_score'),
	'biceps': ('upper_body_score', 'pull_score', 'biceps_score'),
	'forearms': ('upper_body_score', 'pull_score', 'forearms_score'),
	'quads': ('lower_body_score', 'legs_score', 'quads_score'),
	'quadriceps': ('lower_body_score', 'legs_score', 'quads_score'),
	'hamstrings': ('lower_body_score', 'legs_score', 'hamstrings_score'),
	'glutes': ('lower_body_score', 'legs_score', 'glutes_score'),
	'calves': ('lower_body_score', 'legs_score', 'calves_score'),
	'legs': ('lower_body_score', 'legs_score', 'quads_score'),
	'core': ('core_score', 'core_score', 'core_score'),
	'abs': ('core_score', 'core_score', 'core_score'),
	'obliques': ('core_score', 'core_score', 'core_score'),
}


class WorkoutValidationError(ValueError):
	pass


@dataclass
class WorkoutLogResult:
	session: WorkoutSession
	score: WorkoutScore
	summary: dict[str, Any]


def _clean_list(value: Any, *, limit: int = 40) -> list[str]:
	if not isinstance(value, list):
		return []
	cleaned = []
	for item in value[:limit]:
		text = str(item).strip()
		if text and text not in cleaned:
			cleaned.append(text)
	return cleaned


def _normalize_type(value: Any, cardio: bool = False) -> str:
	workout_type = str(value or '').strip().lower()
	if workout_type not in VALID_WORKOUT_TYPES:
		workout_type = 'cardio' if cardio else 'strength'
	return workout_type


def _normalize_intensity(value: Any) -> str:
	text = str(value or 'moderate').strip().lower().replace(' ', '_')
	if text in {'logged', 'moderate'}:
		return 'moderate'
	if text in {'light', 'hard', 'max_effort'}:
		return text
	return 'moderate'


def _duration_multiplier(minutes: int) -> float:
	if minutes < 5:
		return 0.20
	if minutes < 10:
		return 0.45
	if minutes < 20:
		return 0.75
	if minutes < 35:
		return 1.00
	if minutes < 60:
		return 1.15
	if minutes < 90:
		return 1.25
	if minutes < 120:
		return 1.20
	return 1.00


def _intensity_multiplier(user: User, intensity: str, as_of: datetime) -> float:
	if intensity == 'light':
		return 0.90
	if intensity == 'moderate':
		return 1.00
	if intensity == 'hard':
		return 1.15
	if intensity == 'max_effort':
		week_start = _week_start(as_of.date())
		count = WorkoutSession.objects.filter(
			user=user,
			status='completed',
			completed_at__date__gte=week_start,
			completed_at__lt=as_of,
			intensity__iexact='max_effort',
		).count()
		return 1.25 if count < 3 else 1.05
	return 1.00


def _week_start(day: date) -> date:
	return day - timedelta(days=day.weekday())


def _month_start(day: date) -> date:
	return day.replace(day=1)


def _period_end_for_month(day: date) -> date:
	if day.month == 12:
		return day.replace(year=day.year + 1, month=1, day=1) - timedelta(days=1)
	return day.replace(month=day.month + 1, day=1) - timedelta(days=1)


def _get_completion_bonus(session: WorkoutSession, same_day_index: int) -> int:
	if same_day_index == 1:
		bonus = 15
	elif same_day_index == 2:
		bonus = 5
	else:
		bonus = 0
	if session.entry_source == 'plan_workout':
		bonus += 20
	if session.entry_source == 'challenge_workout':
		bonus += 25
	if session.workout_type == 'recovery':
		bonus += 10
	return bonus


def _get_detail_bonus(session: WorkoutSession, exercises: list[dict[str, Any]]) -> int:
	bonus = 0
	if session.body_groups or session.muscles:
		bonus += 5
	if exercises or (session.metadata or {}).get('exercise_count'):
		bonus += 10
	if session.notes:
		bonus += 5
	if session.pr_note or any(bool(item.get('pr')) for item in exercises if isinstance(item, dict)):
		bonus += 15
	if session.image_url:
		bonus += 5
	return min(25, bonus)


def _trust_level_for(session: WorkoutSession, exercises: list[dict[str, Any]]) -> str:
	if session.trust_level:
		return session.trust_level
	if session.entry_source == 'manual':
		return 'manual'
	if session.entry_source == 'plan_workout':
		return 'plan_workout_verified'
	if session.entry_source == 'challenge_workout':
		return 'challenge_verified'
	if exercises or (session.metadata or {}).get('exercise_count'):
		return 'recorded_timer_exercise_added'
	return 'recorded_timer'


def _same_day_count(user: User, as_of: datetime) -> int:
	start = timezone.make_aware(datetime.combine(as_of.date(), datetime.min.time()))
	end = start + timedelta(days=1)
	return WorkoutSession.objects.filter(
		user=user,
		status='completed',
		completed_at__gte=start,
		completed_at__lt=end,
		completed_at__lte=as_of,
	).count()


def _is_duplicate(session: WorkoutSession, as_of: datetime) -> bool:
	window_start = as_of - timedelta(minutes=30)
	body_groups = set(session.body_groups or [])
	qs = WorkoutSession.objects.filter(
		user=session.user,
		status='completed',
		completed_at__gte=window_start,
		completed_at__lt=as_of,
		workout_type=session.workout_type,
	)
	for other in qs.only('id', 'body_groups'):
		if other.id == session.id:
			continue
		if set(other.body_groups or []) == body_groups:
			return True
	return False


def _overtraining_modifier(user: User, as_of: datetime) -> float:
	seven_days = as_of - timedelta(days=7)
	recent = WorkoutSession.objects.filter(
		user=user,
		status='completed',
		completed_at__gte=seven_days,
		completed_at__lte=as_of,
	)
	hard_count = recent.filter(intensity__in=['hard', 'max_effort']).count()
	duration = recent.aggregate(total=Sum('duration_minutes'))['total'] or 0
	max_effort_dates = sorted(
		{
			item.completed_at.date()
			for item in recent.filter(intensity='max_effort').only('completed_at')
			if item.completed_at
		}
	)
	consecutive = 1
	longest = 1 if max_effort_dates else 0
	for prev, cur in zip(max_effort_dates, max_effort_dates[1:]):
		if (cur - prev).days == 1:
			consecutive += 1
			longest = max(longest, consecutive)
		else:
			consecutive = 1
	if hard_count >= 7 or longest >= 5 or duration > 900:
		return 0.85
	return 1.00


def validate_workout_payload(payload: dict[str, Any]) -> None:
	entry_source = str(payload.get('entry_source') or payload.get('source') or 'manual').strip().lower()
	try:
		duration_minutes = int(payload.get('duration_minutes') or 0)
	except (TypeError, ValueError):
		duration_minutes = 0
	if entry_source == 'manual' and duration_minutes < MANUAL_MIN_DURATION:
		raise WorkoutValidationError('Manual workouts must be at least 10 minutes.')
	if entry_source == 'recorded_timer' and duration_minutes < RECORDED_MIN_DURATION:
		raise WorkoutValidationError('Recorded workouts must be at least 5 minutes.')
	if entry_source == 'challenge_workout' and duration_minutes < CHALLENGE_MIN_DURATION:
		raise WorkoutValidationError('Challenge workouts must be at least 20 minutes.')


def build_session_from_payload(user: User, payload: dict[str, Any], *, as_of: datetime | None = None) -> WorkoutSession:
	validate_workout_payload(payload)
	as_of = as_of or timezone.now()
	plan = None
	user_plan = None
	scheduled_workout = None
	try:
		scheduled_workout_id = int(payload.get('scheduled_workout_id') or 0)
	except (TypeError, ValueError):
		scheduled_workout_id = 0
	if scheduled_workout_id:
		from plans.models import UserScheduledWorkout

		scheduled_workout = (
			UserScheduledWorkout.objects.select_related('user_plan__plan', 'plan_day')
			.filter(id=scheduled_workout_id, user_plan__user=user)
			.first()
		)
		if scheduled_workout is not None:
			user_plan = scheduled_workout.user_plan
			plan = user_plan.plan
	if user_plan is None:
		try:
			user_plan_id = int(payload.get('user_plan_id') or 0)
		except (TypeError, ValueError):
			user_plan_id = 0
		if user_plan_id:
			from plans.models import UserPlan

			user_plan = UserPlan.objects.filter(id=user_plan_id, user=user).select_related('plan').first()
			if user_plan is not None:
				plan = user_plan.plan
	if plan is None:
		plan_id = str(payload.get('plan_id') or '').strip()
		if plan_id:
			from plans.models import Plan

			plan = Plan.objects.filter(id=plan_id, is_active=True).first()
	body_groups = _clean_list(payload.get('body_groups'), limit=24)
	muscles = _clean_list(payload.get('muscles'), limit=40)
	modes = _clean_list(payload.get('modes'), limit=8)
	cardio = bool(payload.get('cardio', False))
	workout_type = _normalize_type(payload.get('workout_type') or payload.get('mode'), cardio=cardio)
	entry_source = str(payload.get('entry_source') or payload.get('source') or 'manual').strip().lower()
	if plan is not None:
		entry_source = 'plan_workout'
	if entry_source not in BASE_SCORES:
		entry_source = 'manual'
	try:
		duration_minutes = int(payload.get('duration_minutes') or 0)
	except (TypeError, ValueError):
		duration_minutes = 0
	duration_minutes = max(1, min(duration_minutes, 360))
	try:
		recorded_seconds = int(payload.get('recorded_seconds') or payload.get('duration_seconds') or duration_minutes * 60)
	except (TypeError, ValueError):
		recorded_seconds = duration_minutes * 60
	title = str(payload.get('title') or '').strip() or _default_title(workout_type, body_groups, cardio)
	intensity = _normalize_intensity(payload.get('intensity'))
	exercises = _normalize_exercises(payload.get('exercises'))
	image_urls = _normalize_image_urls(payload.get('image_urls'), str(payload.get('image_url') or '').strip())
	primary_image_url = image_urls[0] if image_urls else ''
	try:
		planned_week_number = int(payload.get('planned_week_number') or getattr(scheduled_workout, 'week_number', 0) or 0)
	except (TypeError, ValueError):
		planned_week_number = 0
	planned_day_key = str(
		payload.get('planned_day_key')
		or payload.get('plan_day_id')
		or getattr(scheduled_workout, 'day_index', '')
		or ''
	).strip()
	metadata = dict(payload)
	metadata.update(
		{
			'type': 'plan_workout' if plan is not None else 'custom_workout',
			'title': title,
			'plan_id': plan.id if plan is not None else payload.get('plan_id'),
			'plan_name': getattr(plan, 'name', '') if plan is not None else str(payload.get('plan_name') or ''),
			'user_plan_id': user_plan.id if user_plan is not None else payload.get('user_plan_id'),
			'scheduled_workout_id': scheduled_workout.id if scheduled_workout is not None else payload.get('scheduled_workout_id'),
			'plan_day_id': payload.get('plan_day_id') or getattr(scheduled_workout, 'plan_day_id', None),
			'planned_week_number': planned_week_number or None,
			'planned_day_key': planned_day_key,
			'body_groups': body_groups,
			'muscles': muscles,
			'cardio': cardio,
			'exercise_count': len(exercises) or int(payload.get('exercise_count') or 0),
			'exercises': exercises,
			'mode': workout_type,
			'modes': modes or [workout_type],
			'focus_label': str(payload.get('focus_label') or '').strip(),
			'intensity': intensity,
			'caption': str(payload.get('caption') or '').strip(),
			'image_url': primary_image_url,
			'image_urls': image_urls,
			'pr': str(payload.get('pr') or payload.get('pr_note') or '').strip(),
		}
	)
	return WorkoutSession.objects.create(
		user=user,
		plan=plan,
		user_plan=user_plan,
		planned_week_number=planned_week_number or None,
		planned_day_key=planned_day_key,
		quick_workout_id=f"{entry_source}-{as_of.strftime('%Y%m%d%H%M%S')}",
		status='completed',
		completed_at=as_of,
		duration_minutes=duration_minutes,
		title=title,
		workout_type=workout_type,
		entry_source=entry_source,
		intensity=intensity,
		trust_level=str(payload.get('trust_level') or '').strip(),
		focus_label=str(payload.get('focus_label') or '').strip(),
		body_groups=body_groups,
		muscles=muscles,
		modes=modes or [workout_type],
		caption=str(payload.get('caption') or '').strip(),
		image_url=primary_image_url,
		notes=str(payload.get('notes') or '').strip(),
		pr_note=str(payload.get('pr') or payload.get('pr_note') or '').strip(),
		is_public=bool(payload.get('is_public', True)),
		recorded_seconds=max(0, recorded_seconds),
		metadata=metadata,
	)


def _normalize_image_urls(value: Any, primary: str = '') -> list[str]:
	values = []
	if primary:
		values.append(primary)
	if isinstance(value, list):
		values.extend(str(item).strip() for item in value)
	elif isinstance(value, str) and value.strip():
		values.extend(item.strip() for item in value.split(','))
	clean = [item for item in values if item]
	return list(dict.fromkeys(clean))[:6]


def _default_title(workout_type: str, body_groups: list[str], cardio: bool) -> str:
	if body_groups:
		return ' + '.join(group.title() for group in body_groups)
	if cardio or workout_type == 'cardio':
		return 'Cardio Session'
	return f'{workout_type.title()} Session'


def _normalize_exercises(value: Any) -> list[dict[str, Any]]:
	if not isinstance(value, list):
		return []
	exercises = []
	for item in value[:40]:
		if not isinstance(item, dict):
			continue
		name = str(item.get('name') or '').strip()
		volume = str(item.get('volume') or '').strip()
		pr = bool(item.get('pr', False))
		if name or volume:
			exercises.append({'name': name, 'volume': volume, 'pr': pr})
	return exercises


@transaction.atomic
def log_workout(user: User, payload: dict[str, Any], *, as_of: datetime | None = None) -> WorkoutLogResult:
	session = build_session_from_payload(user, payload, as_of=as_of)
	return score_completed_workout(session, as_of=as_of or session.completed_at or timezone.now())


@transaction.atomic
def score_completed_workout(session: WorkoutSession, *, as_of: datetime | None = None) -> WorkoutLogResult:
	as_of = as_of or session.completed_at or timezone.now()
	exercises = _normalize_exercises((session.metadata or {}).get('exercises'))
	trust_level = _trust_level_for(session, exercises)
	session.trust_level = trust_level
	if not session.title:
		session.title = (session.metadata or {}).get('title') or _default_title(session.workout_type, session.body_groups or [], False)
	if not session.focus_label:
		session.focus_label = str((session.metadata or {}).get('focus_label') or '')
	if not session.intensity:
		session.intensity = _normalize_intensity((session.metadata or {}).get('intensity'))
	if not session.entry_source:
		session.entry_source = 'plan_workout' if session.plan_id else 'manual'
	session.save(
		update_fields=[
			'title',
			'focus_label',
			'intensity',
			'entry_source',
			'trust_level',
			'updated_at',
		]
	)

	duration_minutes = int(session.duration_minutes or 0)
	same_day_index = max(1, _same_day_count(session.user, as_of))
	base_score = BASE_SCORES.get(session.entry_source, 40)
	duration_mult = _duration_multiplier(duration_minutes)
	intensity_mult = _intensity_multiplier(session.user, _normalize_intensity(session.intensity), as_of)
	type_mult = TYPE_MULTIPLIERS.get(session.workout_type, 1.0)
	trust_mult = TRUST_MULTIPLIERS.get(trust_level, 1.0)
	completion_bonus = _get_completion_bonus(session, same_day_index)
	detail_bonus = _get_detail_bonus(session, exercises)
	raw_xp = base_score * duration_mult * intensity_mult * type_mult * trust_mult + completion_bonus + detail_bonus
	cap = ACTIVITY_CAPS.get(trust_level, 150)
	capped_xp = min(raw_xp, cap)
	anti_spam_modifier = 1.0
	leaderboard_zero = False
	if same_day_index == 3:
		anti_spam_modifier = 0.30
	elif same_day_index >= 4:
		anti_spam_modifier = 0.0
		leaderboard_zero = True
	if _is_duplicate(session, as_of):
		anti_spam_modifier = min(anti_spam_modifier, 0.20)
		leaderboard_zero = True
	overtraining_modifier = _overtraining_modifier(session.user, as_of)
	activity_xp = int(round(capped_xp * anti_spam_modifier))
	leaderboard_xp = 0 if leaderboard_zero else int(round(activity_xp * overtraining_modifier))
	leaderboard_xp = _apply_leaderboard_caps(session.user, leaderboard_xp, as_of)
	challenge_points = _calculate_challenge_points(session, activity_xp)
	breakdown = {
		'base_score': base_score,
		'duration_minutes': duration_minutes,
		'duration_multiplier': duration_mult,
		'intensity_multiplier': intensity_mult,
		'type_multiplier': type_mult,
		'trust_level': trust_level,
		'trust_multiplier': trust_mult,
		'completion_bonus': completion_bonus,
		'detail_bonus': detail_bonus,
		'raw_xp': round(raw_xp, 2),
		'capped_xp': round(capped_xp, 2),
		'anti_spam_modifier': anti_spam_modifier,
		'overtraining_modifier': overtraining_modifier,
		'same_day_index': same_day_index,
	}
	score, _ = WorkoutScore.objects.update_or_create(
		session=session,
		defaults={
			'activity_xp': activity_xp,
			'leaderboard_xp': leaderboard_xp,
			'challenge_points': challenge_points,
			'base_score': base_score,
			'duration_multiplier': duration_mult,
			'intensity_multiplier': intensity_mult,
			'type_multiplier': type_mult,
			'trust_multiplier': trust_mult,
			'completion_bonus': completion_bonus,
			'detail_bonus': detail_bonus,
			'anti_spam_modifier': anti_spam_modifier,
			'overtraining_modifier': overtraining_modifier,
			'calculation_breakdown': breakdown,
		},
	)
	recalculate_user_score_summary(session.user, as_of=as_of)
	plan_badges = _complete_plan_schedule_for_session(session, as_of=as_of)
	_update_group_challenge_progress(session, score, as_of=as_of)
	_update_training_challenge_progress(session, score)
	earned_badges = _evaluate_workout_achievements(session, score, as_of=as_of)
	earned_badges = [*plan_badges, *earned_badges]
	summary = materialize_activity_card(session, score, as_of=as_of, earned_badges=earned_badges)
	return WorkoutLogResult(session=session, score=score, summary=summary)


def _complete_plan_schedule_for_session(session: WorkoutSession, *, as_of: datetime) -> list[Any]:
	if session.entry_source != 'plan_workout' or not session.user_plan_id:
		return []
	metadata = session.metadata or {}
	scheduled_workout_id = metadata.get('scheduled_workout_id')
	if not scheduled_workout_id:
		return []
	try:
		scheduled_id = int(scheduled_workout_id)
	except (TypeError, ValueError):
		return []
	from plans.models import UserScheduledWorkout
	from plans.services import _sync_user_plan_progress

	workout = (
		UserScheduledWorkout.objects.select_for_update()
		.filter(id=scheduled_id, user_plan=session.user_plan, user_plan__user=session.user)
		.first()
	)
	if workout is None:
		return []
	if workout.status != 'completed':
		workout.status = 'completed'
		workout.completed_at = as_of
		workout.missed_at = None
		workout.save(update_fields=['status', 'completed_at', 'missed_at'])
		synced = _sync_user_plan_progress(session.user_plan, create_feed_activity=False)
		return list(getattr(synced, '_earned_badges', []) or [])
	return []


def _apply_leaderboard_caps(user: User, candidate_xp: int, as_of: datetime) -> int:
	if candidate_xp <= 0:
		return 0
	day_start = timezone.make_aware(datetime.combine(as_of.date(), datetime.min.time()))
	day_end = day_start + timedelta(days=1)
	week_start_date = _week_start(as_of.date())
	week_start_dt = timezone.make_aware(datetime.combine(week_start_date, datetime.min.time()))
	day_total = WorkoutScore.objects.filter(
		session__user=user,
		session__completed_at__gte=day_start,
		session__completed_at__lt=day_end,
	).exclude(session__completed_at=as_of).aggregate(total=Sum('leaderboard_xp'))['total'] or 0
	week_total = WorkoutScore.objects.filter(
		session__user=user,
		session__completed_at__gte=week_start_dt,
		session__completed_at__lte=as_of,
	).aggregate(total=Sum('leaderboard_xp'))['total'] or 0
	return max(0, min(candidate_xp, MAX_LEADERBOARD_XP_PER_DAY - int(day_total), MAX_LEADERBOARD_XP_PER_WEEK - int(week_total)))


def _calculate_challenge_points(session: WorkoutSession, activity_xp: int) -> int:
	if session.entry_source != 'challenge_workout':
		return 0
	if session.trust_level == 'manual':
		return int(round(activity_xp * 0.70))
	return activity_xp


def _tier_for_xp(xp: int) -> str:
	if xp >= 60000:
		return 'Legend'
	if xp >= 25000:
		return 'Elite'
	if xp >= 10000:
		return 'Performer'
	if xp >= 4000:
		return 'Athlete'
	if xp >= 1000:
		return 'Builder'
	return 'Rookie'


def _active_dates(user: User, start: datetime, end: datetime) -> set[date]:
	return {
		item.completed_at.date()
		for item in WorkoutSession.objects.filter(
			user=user,
			status='completed',
			completed_at__gte=start,
			completed_at__lt=end,
		).only('completed_at')
		if item.completed_at
	}


def _rolling_streak(user: User, as_of: datetime) -> int:
	weeks = 0
	cursor = _week_start(as_of.date())
	for _ in range(52):
		start = timezone.make_aware(datetime.combine(cursor, datetime.min.time()))
		end = start + timedelta(days=7)
		if len(_active_dates(user, start, end)) >= 3:
			weeks += 1
			cursor -= timedelta(days=7)
		else:
			break
	return weeks


def _balance_score(user: User, start: datetime, end: datetime) -> float:
	rows = (
		WorkoutScore.objects.filter(
			session__user=user,
			session__completed_at__gte=start,
			session__completed_at__lt=end,
		)
		.values('session__workout_type')
		.annotate(total=Sum('activity_xp'))
	)
	totals = {row['session__workout_type']: float(row['total'] or 0) for row in rows}
	total = sum(totals.values())
	if total <= 0:
		return 0
	goal, _ = UserGoal.objects.get_or_create(user=user)
	strength = totals.get('strength', 0) / total * 100
	cardio = (totals.get('cardio', 0) + totals.get('conditioning', 0)) / total * 100
	recovery = (totals.get('mobility', 0) + totals.get('recovery', 0)) / total * 100
	if goal.goal_profile == 'cardio':
		targets = {'strength': (10, 25), 'cardio': (60, 80), 'recovery': (5, 20)}
	elif goal.goal_profile == 'gym':
		targets = {'strength': (60, 80), 'cardio': (10, 30), 'recovery': (5, 20)}
	else:
		targets = {'strength': (35, 50), 'cardio': (35, 50), 'recovery': (5, 15)}
	deviation = 0.0
	for key, value in {'strength': strength, 'cardio': cardio, 'recovery': recovery}.items():
		low, high = targets[key]
		if value < low:
			deviation += low - value
		elif value > high:
			deviation += value - high
	return max(0.0, min(100.0, 100.0 - deviation))


def _body_distribution(user: User) -> tuple[dict[str, float], dict[str, float]]:
	summary_scores = {
		'upper_body_score': 0.0,
		'lower_body_score': 0.0,
		'core_score': 0.0,
		'push_score': 0.0,
		'pull_score': 0.0,
		'legs_score': 0.0,
		'full_body_score': 0.0,
	}
	body_parts = {
		'chest_score': 0.0,
		'back_score': 0.0,
		'shoulders_score': 0.0,
		'biceps_score': 0.0,
		'triceps_score': 0.0,
		'forearms_score': 0.0,
		'quads_score': 0.0,
		'hamstrings_score': 0.0,
		'glutes_score': 0.0,
		'calves_score': 0.0,
		'core_score': 0.0,
	}
	for score in WorkoutScore.objects.filter(session__user=user).select_related('session'):
		session = score.session
		selected = [item.lower() for item in (session.muscles or session.body_groups or [])]
		if not selected:
			continue
		pool = score.activity_xp * 0.35
		share = pool / len(selected)
		for item in selected:
			mapped = BODY_PART_MAP.get(item)
			if not mapped:
				continue
			region, movement, body_part = mapped
			summary_scores[region] = summary_scores.get(region, 0.0) + share
			summary_scores[movement] = summary_scores.get(movement, 0.0) + share
			body_parts[body_part] = body_parts.get(body_part, 0.0) + share
	if summary_scores['upper_body_score'] and summary_scores['lower_body_score'] and summary_scores['core_score']:
		summary_scores['full_body_score'] = min(
			summary_scores['upper_body_score'],
			summary_scores['lower_body_score'],
			summary_scores['core_score'],
		)
	return summary_scores, body_parts


def recalculate_user_score_summary(user: User, *, as_of: datetime | None = None) -> UserScoreSummary:
	as_of = as_of or timezone.now()
	today = as_of.date()
	week_start = _week_start(today)
	month_start = _month_start(today)
	rolling_start_dt = as_of - timedelta(days=30)
	week_start_dt = timezone.make_aware(datetime.combine(week_start, datetime.min.time()))
	month_start_dt = timezone.make_aware(datetime.combine(month_start, datetime.min.time()))
	all_scores = WorkoutScore.objects.filter(session__user=user).select_related('session')
	career_xp = int(all_scores.aggregate(total=Sum('activity_xp'))['total'] or 0)
	weekly_xp = int(all_scores.filter(session__completed_at__gte=week_start_dt).aggregate(total=Sum('activity_xp'))['total'] or 0)
	monthly_xp = int(all_scores.filter(session__completed_at__gte=month_start_dt).aggregate(total=Sum('activity_xp'))['total'] or 0)
	rolling = all_scores.filter(session__completed_at__gte=rolling_start_dt)
	category = {
		'strength_score': 0.0,
		'cardio_score': 0.0,
		'conditioning_score': 0.0,
		'mobility_score': 0.0,
		'sport_score': 0.0,
		'recovery_score': 0.0,
		'consistency_score': 0.0,
	}
	challenge_score = 0.0
	for score in all_scores:
		distribution = CATEGORY_DISTRIBUTION.get(score.session.workout_type, CATEGORY_DISTRIBUTION['custom'])
		for field, ratio in distribution.items():
			category[field] = category.get(field, 0.0) + score.activity_xp * ratio
		challenge_score += score.challenge_points
	week_active_days = len(_active_dates(user, week_start_dt, week_start_dt + timedelta(days=7)))
	weekly_consistency = WEEKLY_ACTIVE_DAY_BONUS.get(week_active_days, 0)
	streak_count = _rolling_streak(user, as_of)
	consistency_score = category['consistency_score'] + weekly_consistency + _streak_bonus(streak_count)
	balance_score = _balance_score(user, rolling_start_dt, as_of)
	rolling_xp = float(rolling.aggregate(total=Sum('activity_xp'))['total'] or 0)
	rolling_consistency = min(1000.0, consistency_score)
	rolling_challenge = float(rolling.aggregate(total=Sum('challenge_points'))['total'] or 0)
	performance = rolling_xp * 0.50 + rolling_consistency * 0.25 + rolling_challenge * 0.15 + balance_score * 0.10
	body_scores, body_parts = _body_distribution(user)
	manual_count = WorkoutSession.objects.filter(user=user, entry_source='manual', status='completed').count()
	recorded_count = WorkoutSession.objects.filter(user=user, status='completed').exclude(entry_source='manual').count()
	active_days = WorkoutSession.objects.filter(user=user, status='completed', completed_at__isnull=False).dates('completed_at', 'day').count()
	summary, _ = UserScoreSummary.objects.update_or_create(
		user=user,
		defaults={
			'total_xp': career_xp,
			'weekly_xp': weekly_xp,
			'monthly_xp': monthly_xp,
			'career_xp': career_xp,
			'performance_score': round(performance, 2),
			'consistency_score': round(consistency_score, 2),
			'training_balance_score': round(balance_score, 2),
			'challenge_score': round(challenge_score, 2),
			'manual_log_count': manual_count,
			'recorded_log_count': recorded_count,
			'active_days_count': active_days,
			'streak_count': streak_count,
			'tier': _tier_for_xp(career_xp),
			'body_part_scores': body_parts,
			**{
				k: round(v, 2)
				for k, v in category.items()
				if k != 'consistency_score' and hasattr(UserScoreSummary, k)
			},
			**{k: round(v, 2) for k, v in body_scores.items() if hasattr(UserScoreSummary, k)},
		},
	)
	_update_periods(user, as_of=as_of, balance_score=balance_score)
	return summary


def _streak_bonus(streak_count: int) -> int:
	if streak_count >= 30:
		return 250
	if streak_count >= 14:
		return 120
	if streak_count >= 7:
		return 60
	if streak_count >= 5:
		return 40
	if streak_count >= 3:
		return 20
	return 0


def _update_periods(user: User, *, as_of: datetime, balance_score: float) -> None:
	today = as_of.date()
	periods = [
		('daily', today, today),
		('weekly', _week_start(today), _week_start(today) + timedelta(days=6)),
		('monthly', _month_start(today), _period_end_for_month(today)),
		('rolling_30', today - timedelta(days=29), today),
	]
	for period_type, start, end in periods:
		start_dt = timezone.make_aware(datetime.combine(start, datetime.min.time()))
		end_dt = timezone.make_aware(datetime.combine(end + timedelta(days=1), datetime.min.time()))
		scores = WorkoutScore.objects.filter(
			session__user=user,
			session__completed_at__gte=start_dt,
			session__completed_at__lt=end_dt,
		)
		activity = float(scores.aggregate(total=Sum('activity_xp'))['total'] or 0)
		challenge = float(scores.aggregate(total=Sum('challenge_points'))['total'] or 0)
		active_days = len(_active_dates(user, start_dt, end_dt))
		consistency = WEEKLY_ACTIVE_DAY_BONUS.get(active_days, 0)
		if period_type == 'monthly':
			leaderboard = activity * 0.50 + consistency * 0.25 + challenge * 0.15 + balance_score * 0.10
		elif period_type == 'weekly':
			leaderboard = activity * 0.55 + consistency * 0.25 + challenge * 0.15 + balance_score * 0.05
		else:
			leaderboard = float(scores.aggregate(total=Sum('leaderboard_xp'))['total'] or 0)
		UserScorePeriod.objects.update_or_create(
			user=user,
			period_type=period_type,
			period_start=start,
			period_end=end,
			defaults={
				'activity_xp': round(activity, 2),
				'consistency_score': round(consistency, 2),
				'challenge_score': round(challenge, 2),
				'balance_bonus': round(balance_score, 2),
				'leaderboard_score': round(leaderboard, 2),
			},
		)


def _earned_badge_summaries(earned_badges: list[Any] | None) -> list[dict[str, Any]]:
	summaries = []
	for user_badge in earned_badges or []:
		badge = getattr(user_badge, 'badge', None)
		if badge is None:
			continue
		if badge.rarity not in {'rare', 'elite', 'legendary'} and badge.category not in {'leaderboard', 'challenge', 'plan'}:
			continue
		summaries.append(
			{
				'user_badge_id': user_badge.id,
				'id': badge.id,
				'name': badge.name,
				'rarity': badge.rarity,
				'tier': badge.tier,
				'reason': badge.description,
				'earned_at': user_badge.earned_at.isoformat() if user_badge.earned_at else None,
			}
		)
	return summaries


def materialize_activity_card(
	session: WorkoutSession,
	score: WorkoutScore,
	*,
	as_of: datetime | None = None,
	earned_badges: list[Any] | None = None,
) -> dict[str, Any]:
	from community.models import CommunityActivity
	from community.services import ensure_public_card

	as_of = as_of or session.completed_at or timezone.now()
	metadata = dict(session.metadata or {})
	badge_summaries = _earned_badge_summaries(earned_badges)
	image_urls = _normalize_image_urls(metadata.get('image_urls'), session.image_url)
	metadata.update(
		{
			'source_id': f'workout:{session.id}',
			'workout_session_id': session.id,
			'title': session.title,
			'body_groups': session.body_groups or [],
			'muscles': session.muscles or [],
			'body_map_side': metadata.get('body_map_side') or 'front',
			'cardio': session.workout_type in {'cardio', 'conditioning'} or bool(metadata.get('cardio')),
			'exercise_count': metadata.get('exercise_count') or len(_normalize_exercises(metadata.get('exercises'))),
			'exercises': _normalize_exercises(metadata.get('exercises')),
			'mode': session.workout_type,
			'modes': session.modes or [session.workout_type],
			'focus_label': session.focus_label,
			'plan_id': session.plan_id,
			'plan_name': session.plan.name if session.plan_id else metadata.get('plan_name'),
			'user_plan_id': session.user_plan_id,
			'planned_week_number': session.planned_week_number,
			'planned_day_key': session.planned_day_key,
			'intensity': session.intensity,
			'notes': session.notes,
			'caption': session.caption,
			'image_url': session.image_url,
			'image_urls': image_urls,
			'pr': session.pr_note,
			'activity_xp': score.activity_xp,
			'leaderboard_xp': score.leaderboard_xp,
			'challenge_points': score.challenge_points,
			'streak_days': getattr(getattr(session.user, 'score_summary', None), 'streak_count', 0),
			'earned_badges': badge_summaries,
			'frontend_summary': {
				'title': session.title,
				'duration_minutes': session.duration_minutes,
				'intensity': session.intensity,
				'focus': session.focus_label or session.workout_type.title(),
				'plan_name': session.plan.name if session.plan_id else metadata.get('plan_name'),
				'planned_week_number': session.planned_week_number,
				'xp': score.activity_xp,
				'challenge_badge': 'Challenge' if score.challenge_points else None,
				'earned_badges': badge_summaries,
			},
		}
	)
	description_parts = []
	if session.duration_minutes:
		description_parts.append(f'{session.duration_minutes} min session')
	if session.focus_label:
		description_parts.append(session.focus_label)
	if session.intensity:
		description_parts.append(session.intensity.replace('_', ' ').title())
	description = ' / '.join(description_parts) or 'Workout completed'
	activity, _ = CommunityActivity.objects.update_or_create(
		user=session.user,
		activity_type=CommunityActivity.ACTIVITY_WORKOUT,
		metadata__source_id=f'workout:{session.id}',
		defaults={
			'title': session.title or 'Completed workout',
			'description': description,
			'score': session.duration_minutes,
			'metadata': metadata,
			'occurred_at': as_of,
		},
	)
	ensure_public_card(session.user)
	return {
		'activity_id': activity.id,
		'activity_xp': score.activity_xp,
		'leaderboard_xp': score.leaderboard_xp,
		'challenge_points': score.challenge_points,
		'summary': metadata['frontend_summary'],
	}


def _is_group_admin(group, user: User) -> bool:
	from community.models import GroupMembership

	return GroupMembership.objects.filter(
		group=group,
		user=user,
		status=GroupMembership.STATUS_ACTIVE,
		role=GroupMembership.ROLE_ADMIN,
	).exists()


def _update_group_challenge_progress(session: WorkoutSession, score: WorkoutScore, *, as_of: datetime) -> None:
	from community.models import GroupChallenge, GroupChallengeProgress, GroupMembership
	from achievements.services import evaluate_group_achievements

	active_groups = GroupMembership.objects.filter(
		user=session.user,
		status=GroupMembership.STATUS_ACTIVE,
	).values_list('group_id', flat=True)
	for challenge in GroupChallenge.objects.filter(
		group_id__in=active_groups,
		start_date__lte=as_of.date(),
		end_date__gte=as_of.date(),
	):
		types = challenge.eligible_workout_types or []
		parts = challenge.eligible_body_parts or []
		if types and session.workout_type not in types:
			continue
		if parts and not set(parts).intersection(set(session.body_groups or [])):
			continue
		if (session.duration_minutes or 0) < challenge.min_duration:
			continue
		progress, _ = GroupChallengeProgress.objects.get_or_create(
			challenge=challenge,
			user=session.user,
		)
		progress.points += score.challenge_points or score.activity_xp
		if session.entry_source == 'manual':
			progress.manual_logs += 1
		else:
			progress.recorded_workouts += 1
		progress.active_days = WorkoutSession.objects.filter(
			user=session.user,
			completed_at__date__gte=challenge.start_date,
			completed_at__date__lte=challenge.end_date,
			status='completed',
		).dates('completed_at', 'day').count()
		progress.save()
		total_group_progress = GroupChallengeProgress.objects.filter(user=session.user).aggregate(
			recorded=Sum('recorded_workouts'),
			manual=Sum('manual_logs'),
		)
		evaluate_group_achievements(
			session.user,
			context={
				'group_id': challenge.group_id,
				'group_challenge_contributions': 1,
				'group_workouts_single_group': progress.recorded_workouts + progress.manual_logs,
				'group_workouts_total': int(total_group_progress.get('recorded') or 0) + int(total_group_progress.get('manual') or 0),
				'as_of': as_of,
			},
		)


def _update_training_challenge_progress(session: WorkoutSession, score: WorkoutScore) -> None:
	try:
		from challenges.services import update_training_challenge_progress_for_workout
	except Exception:
		return
	update_training_challenge_progress_for_workout(session, score)


def _evaluate_workout_achievements(session: WorkoutSession, score: WorkoutScore, *, as_of: datetime) -> list[Any]:
	try:
		from achievements.services import evaluate_workout_achievements
	except Exception:
		return []
	return evaluate_workout_achievements(session, score, as_of=as_of)
