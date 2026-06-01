from __future__ import annotations

from datetime import date, datetime, timedelta
from math import sqrt
from typing import Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone

from accounts.models import Profile
from plans.models import Plan, UserPlan
from workouts.models import WorkoutSession

from .models import FitnessAssessment, RaceBenchmark, UserMetricsSnapshot


User = get_user_model()


def _get_user_timezone(user: User) -> ZoneInfo:
	profile = Profile.objects.filter(user=user).first()
	tz_name = getattr(profile, 'timezone', None) or settings.TIME_ZONE
	try:
		return ZoneInfo(tz_name)
	except Exception:  # pragma: no cover - fallback
		return ZoneInfo(settings.TIME_ZONE)


def _scale_to_percent(value: float, low: float, high: float, *, invert: bool = False) -> float:
	"""Map ``value`` in ``[low, high]`` to a 0–100 score.

	``low`` represents the lower end of the expected range and ``high`` the
	upper end. By default ``low → 0`` and ``high → 100``. If ``invert`` is
	True, the mapping is flipped so that ``low → 100`` and ``high → 0``.
	Values outside the range are clamped.
	"""
	if low == high:
		return 50.0

	# Ensure low < high for stable math
	if low > high:
		low, high = high, low

	clamped = max(min(value, high), low)
	ratio = (clamped - low) / (high - low)
	if invert:
		ratio = 1.0 - ratio
	return ratio * 100.0


def _latest_assessment(user: User) -> Optional[FitnessAssessment]:
	return (
		FitnessAssessment.objects.filter(user=user)
		.order_by('-tested_at')
		.first()
	)


def _clamp(value: float, low: float, high: float) -> float:
	return max(low, min(high, value))


def _age_from_profile(profile: Optional[Profile], *, fallback: int = 30) -> int:
	if profile and profile.date_of_birth:
		today = timezone.localdate()
		years = today.year - profile.date_of_birth.year
		if (today.month, today.day) < (profile.date_of_birth.month, profile.date_of_birth.day):
			years -= 1
		return max(13, years)
	return fallback


def _recent_activity_signal(user: User) -> Dict:
	as_of = timezone.now()
	since = as_of - timedelta(days=30)
	sessions = WorkoutSession.objects.filter(
		user=user,
		status='completed',
		completed_at__isnull=False,
		completed_at__gte=since,
	)
	workouts_30d = sessions.count()
	minutes_30d = int(sessions.aggregate(total=Sum('duration_minutes'))['total'] or 0)
	tz = _get_user_timezone(user)
	active_days_30d = len(
		{
			session.completed_at.astimezone(tz).date()
			for session in sessions.only('completed_at')
		}
	)
	if workouts_30d == 0:
		activity_score = 50.0
	else:
		raw_score = (
			_scale_to_percent(active_days_30d, 0, 16) * 0.45
			+ _scale_to_percent(minutes_30d, 0, 900) * 0.35
			+ _scale_to_percent(workouts_30d, 0, 20) * 0.20
		)
		activity_score = 50.0 + (raw_score - 50.0) * 0.60
	return {
		'active_days_30d': active_days_30d,
		'minutes_30d': minutes_30d,
		'workouts_30d': workouts_30d,
		'activity_score': round(_clamp(activity_score, 1.0, 99.0), 1),
	}


def _profile_baseline_percentile(profile: Optional[Profile]) -> float:
	if profile and profile.height_cm and profile.weight_kg and profile.height_cm > 0:
		height_m = float(profile.height_cm) / 100.0
		bmi = float(profile.weight_kg) / (height_m * height_m)
		bmi_penalty = min(28.0, abs(bmi - 22.5) * 3.5)
		baseline = 62.0 - bmi_penalty
		if profile.waist_cm and profile.height_cm:
			waist_ratio = float(profile.waist_cm) / float(profile.height_cm)
			if waist_ratio > 0.55:
				baseline -= min(12.0, (waist_ratio - 0.55) * 120.0)
		return _clamp(baseline, 25.0, 75.0)
	return 50.0


def _fitness_age_from_percentile(age: int, percentile: float) -> int:
	fitness_age = int(round(float(age) - (percentile - 50.0) / 2.0))
	return max(16, min(int(age) + 20, fitness_age))


def _plan_for_user(user: User) -> Tuple[Optional[Plan], Optional[UserPlan]]:
	user_plan = (
		UserPlan.objects.filter(user=user, is_active=True)
		.order_by('-started_at', '-created_at')
		.first()
	)
	return (user_plan.plan, user_plan) if user_plan else (None, None)


def calculate_fitness_and_percentile(user: User) -> Tuple[Dict, Optional[int], Dict, Optional[float]]:
	"""Compute Fitness Age and Percentile Rank.

	A submitted assessment is the primary signal. Without one, the dashboard
	returns a low-confidence profile/activity estimate so registration has a
	rough starting point that can move as the user logs workouts.
	"""
	assessment = _latest_assessment(user)
	profile = Profile.objects.filter(user=user).first()
	activity = _recent_activity_signal(user)
	if not assessment:
		age = _age_from_profile(profile)
		profile_pct = _profile_baseline_percentile(profile)
		activity_adjustment = (float(activity['activity_score']) - 50.0) * 0.35
		percentile_overall = round(_clamp(profile_pct + activity_adjustment, 1.0, 99.0), 1)
		fitness_age = _fitness_age_from_percentile(age, percentile_overall)
		confidence = 'medium' if profile and profile.height_cm and profile.weight_kg else 'low'
		fitness_detail = {
			"available": True,
			"source": "profile_activity_estimate",
			"confidence": confidence,
			"chronological_age": age,
			"fitness_age": fitness_age,
			"profile_baseline_percentile": round(profile_pct, 1),
			"activity_adjustment": round(activity_adjustment, 1),
			"activity": activity,
		}
		percentile_detail = {
			"available": True,
			"source": "profile_activity_estimate",
			"confidence": confidence,
			"overall_percentile": percentile_overall,
			"label": f"Fitter than {int(percentile_overall)}% of peers",
			"profile_baseline_percentile": round(profile_pct, 1),
			"activity_adjustment": round(activity_adjustment, 1),
			"activity": activity,
		}
		return fitness_detail, fitness_age, percentile_detail, percentile_overall

	# Sub-scores (0-100) using simple but clear linear mappings.
	strength_pct = _scale_to_percent(
		assessment.max_pushups,
		low=5,
		high=50,
	)
	heart_pct = _scale_to_percent(
		assessment.resting_heart_rate,
		low=50,
		high=90,
		invert=True,  # lower RHR is better
	)
	running_pct = _scale_to_percent(
		assessment.max_run_minutes,
		low=10,
		high=45,
	)
	flex_map = {"no": 30.0, "almost": 70.0, "yes": 90.0}
	flex_pct = flex_map.get(assessment.can_touch_toes, 50.0)

	overall_pct = (
		strength_pct * 0.30
		+ heart_pct * 0.25
		+ running_pct * 0.30
		+ flex_pct * 0.15
	)
	activity_adjustment = (float(activity['activity_score']) - 50.0) * 0.18
	percentile_overall = round(
		_clamp(overall_pct + activity_adjustment, 1.0, 99.0),
		1,
	)

	age = float(assessment.age_years or 30)
	fitness_age = _fitness_age_from_percentile(int(age), percentile_overall)
	is_registration_onboarding = assessment.source == "registration_onboarding"
	assessment_source = (
		"registration_onboarding_estimate"
		if is_registration_onboarding
		else "assessment_activity_adjusted"
	)
	confidence = "medium" if is_registration_onboarding else "high"

	fitness_detail = {
		"available": True,
		"source": assessment_source,
		"confidence": confidence,
		"estimated": is_registration_onboarding,
		"chronological_age": assessment.age_years,
		"fitness_age": fitness_age,
		"assessment_percentile": round(overall_pct, 1),
		"activity_adjustment": round(activity_adjustment, 1),
		"activity": activity,
		"inputs": {
			"resting_heart_rate": assessment.resting_heart_rate,
			"max_pushups": assessment.max_pushups,
			"max_run_minutes": assessment.max_run_minutes,
			"can_touch_toes": assessment.can_touch_toes,
			"sleep_hours": assessment.sleep_hours,
		},
		"subscores": {
			"strength_pct": round(strength_pct, 1),
			"heart_pct": round(heart_pct, 1),
			"running_pct": round(running_pct, 1),
			"flexibility_pct": round(flex_pct, 1),
		},
	}

	percentile_detail = {
		"available": True,
		"source": assessment_source,
		"confidence": confidence,
		"estimated": is_registration_onboarding,
		"overall_percentile": percentile_overall,
		"label": f"Fitter than {int(percentile_overall)}% of peers",
		"assessment_percentile": round(overall_pct, 1),
		"activity_adjustment": round(activity_adjustment, 1),
		"activity": activity,
		"subscores": fitness_detail["subscores"],
	}

	return fitness_detail, fitness_age, percentile_detail, percentile_overall


def calculate_race_readiness(user: User) -> Tuple[Dict, Optional[float]]:
	"""Compute Race Readiness from RaceBenchmark and plan progress.

	Returns (detail, readiness_score_0_100).
	"""
	plan, user_plan = _plan_for_user(user)
	qs = RaceBenchmark.objects.filter(user=user)
	if plan and user_plan:
		qs = qs.filter(plan=plan, user_plan=user_plan)
	initial = qs.order_by('created_at').first()
	latest = qs.order_by('-created_at').first()

	if not latest:
		return {"available": False, "reason": "no_benchmarks"}, None

	def _single_run_score(seconds: int) -> float:
		# 4 min (240s) → 100, 7 min (420s) → 0
		return _scale_to_percent(seconds, low=240, high=420, invert=True)

	if initial and latest and initial != latest:
		imp = (initial.run_1km_seconds - latest.run_1km_seconds) / float(
			initial.run_1km_seconds
		)
		imp = max(-0.5, min(0.5, imp))  # clamp
		run_score = (0.5 + imp) * 100.0
	else:
		run_score = _single_run_score(latest.run_1km_seconds)

	wall_score = _scale_to_percent(latest.wall_balls_unbroken, low=10, high=80)
	sled_score = _scale_to_percent(6 - latest.sled_difficulty, low=1, high=5)
	energy_score = _scale_to_percent(latest.energy_level, low=1, high=5)

	component_score = (
		run_score * 0.4
		+ wall_score * 0.3
		+ sled_score * 0.15
		+ energy_score * 0.15
	)

	progress_pct = None
	if plan and user_plan:
		target_sessions = max(1, plan.sessions_per_week * plan.duration_weeks)
		progress_pct = max(
			0.0,
			min(1.0, float(user_plan.sessions_completed or 0) / float(target_sessions)),
		)
	else:
		progress_pct = None

	if progress_pct is not None:
		readiness = 0.7 * component_score + 0.3 * (progress_pct * 100.0)
	else:
		readiness = component_score

	readiness = round(max(0.0, min(100.0, readiness)), 2)

	detail = {
		"available": True,
		"score": readiness,
		"components": {
			"run_1km_score": round(run_score, 1),
			"wall_balls_score": round(wall_score, 1),
			"sled_score": round(sled_score, 1),
			"energy_score": round(energy_score, 1),
		},
		"plan_progress_pct": round(progress_pct * 100.0, 1) if progress_pct is not None else None,
		"initial_benchmark_id": initial.id if initial else None,
		"latest_benchmark_id": latest.id,
	}

	return detail, readiness


def calculate_streak(user: User, *, as_of: Optional[datetime] = None) -> Tuple[Dict, int, int, float]:
	"""Compute current and longest streak (in days) and a simple multiplier.

	Returns (detail, current_streak, longest_streak, streak_multiplier).
	"""
	as_of = as_of or timezone.now()
	tz = _get_user_timezone(user)
	local_today = as_of.astimezone(tz).date()

	sessions = (
		WorkoutSession.objects.filter(
			user=user,
			status='completed',
			completed_at__isnull=False,
		)
		.only('id', 'completed_at')
	)

	if not sessions.exists():
		return {"available": False, "reason": "no_completed_sessions"}, 0, 0, 1.0

	# Unique set of local dates with at least one completed workout.
	workout_dates: List[date] = sorted(
		{
				s.completed_at.astimezone(tz).date()
				for s in sessions
		}
	)

	# Current streak: contiguous block ending at the most recent workout day.
	last_date = workout_dates[-1]
	current_streak = 1
	for prev, cur in zip(reversed(workout_dates[:-1]), reversed(workout_dates)):
		if (cur - prev).days == 1:
			current_streak += 1
		else:
			break

	# Longest streak over history.
	longest = 1
	streak = 1
	for prev, cur in zip(workout_dates, workout_dates[1:]):
		if (cur - prev).days == 1:
			streak += 1
		else:
			longest = max(longest, streak)
			streak = 1
	longest = max(longest, streak)

	streak_active = last_date == local_today
	streak_multiplier = 1.0 + min(current_streak, 14) * 0.02  # caps at ~1.28

	detail = {
		"available": True,
		"current_streak_days": current_streak,
		"longest_streak_days": longest,
		"last_workout_date": last_date.isoformat(),
		"streak_active_today": streak_active,
		"multiplier": round(streak_multiplier, 3),
	}

	return detail, current_streak, longest, streak_multiplier


def calculate_total_time(user: User, *, as_of: Optional[datetime] = None) -> Tuple[Dict, int, int, int]:
	"""Compute total training minutes in 7d, 30d, and all-time windows."""
	as_of = as_of or timezone.now()
	seven_days_ago = as_of - timedelta(days=7)
	thirty_days_ago = as_of - timedelta(days=30)

	base_qs = WorkoutSession.objects.filter(
		user=user,
		status='completed',
		completed_at__isnull=False,
	)

	def _sum(qs):
		agg = qs.aggregate(total=Sum('duration_minutes'))
		return int(agg['total'] or 0)

	minutes_7d = _sum(base_qs.filter(completed_at__gte=seven_days_ago))
	minutes_30d = _sum(base_qs.filter(completed_at__gte=thirty_days_ago))
	minutes_all = _sum(base_qs)

	detail = {
		"available": True,
		"total_minutes_7d": minutes_7d,
		"total_minutes_30d": minutes_30d,
		"total_minutes_all_time": minutes_all,
	}

	return detail, minutes_7d, minutes_30d, minutes_all


CANONICAL_GROUPS = [
	"chest",
	"shoulders",
	"arms",
	"back",
	"core",
	"glutes",
	"legs",
]

ONBOARDING_GOAL_GROUPS = {
	"cardio": ["legs", "core"],
	"weight_loss": ["legs", "core", "glutes"],
	"strength": ["chest", "back", "legs", "core"],
	"stress": ["core", "shoulders"],
	"stay_fit": ["chest", "back", "core", "legs"],
	"mobility": ["shoulders", "glutes", "core"],
}

ONBOARDING_RANKS = ["Recruit", "Soldier", "Warrior", "Beast"]


def _onboarding_focus_groups(profile: Profile) -> List[str]:
	goals = getattr(profile, "fitness_goals", None)
	if not isinstance(goals, list):
		return []
	focus: List[str] = []
	for goal in goals:
		for group in ONBOARDING_GOAL_GROUPS.get(str(goal), []):
			if group not in focus:
				focus.append(group)
	return focus


def _onboarding_rank_index(profile: Profile) -> int:
	answers = getattr(profile, "onboarding_answers", None)
	answers = answers if isinstance(answers, dict) else {}
	level = getattr(profile, "fitness_level", "") or ""
	score = {"beginner": 0, "consistent": 1, "advanced": 2}.get(level, 0)
	if int(answers.get("workoutsPerWeek") or 0) >= 4:
		score += 1
	if int(answers.get("maxPushups") or 0) >= 30:
		score += 1
	if int(answers.get("runMinutes") or 0) >= 30:
		score += 1
	if float(answers.get("sleepHours") or 0) >= 7:
		score += 0.5
	if int(answers.get("restingHeartRate") or 999) <= 62:
		score += 0.5
	if score >= 4:
		return 3
	if score >= 3:
		return 2
	if score >= 1.5:
		return 1
	return 0


def _estimated_body_battle_map_from_onboarding(
	profile: Profile,
	*,
	as_of: datetime,
) -> Tuple[Dict, float]:
	focus_groups = _onboarding_focus_groups(profile)
	if not focus_groups:
		focus_groups = ["core", "legs", "chest"]
	base_index = _onboarding_rank_index(profile)
	group_payload: Dict[str, Dict] = {}

	for group in CANONICAL_GROUPS:
		rank_index = base_index if group in focus_groups else max(0, base_index - 1)
		group_payload[group] = {
			"sessions": 0,
			"rank": ONBOARDING_RANKS[rank_index],
			"last": None,
			"status": "estimated",
			"estimated": True,
			"rank_estimated": True,
		}

	weak_spots = [group for group in CANONICAL_GROUPS if group not in focus_groups][:3]
	balance_score = _clamp(58.0 + (base_index * 9.0) + min(len(focus_groups), 4) * 1.5, 45.0, 88.0)
	detail = {
		"available": True,
		"source": "registration_onboarding_estimate",
		"confidence": "medium",
		"estimated": True,
		"groups": group_payload,
		"weak_spots": weak_spots,
		"strong_spots": focus_groups[:3],
		"balance_score": round(balance_score, 1),
		"updated_at": as_of.astimezone(timezone.utc).isoformat(),
	}
	return detail, balance_score


def calculate_body_battle_map(user: User, *, as_of: Optional[datetime] = None) -> Tuple[Dict, Optional[float]]:
	"""Compute Body Battle Map stats per canonical group and balance score."""
	as_of = as_of or timezone.now()
	tz = _get_user_timezone(user)
	profile = Profile.objects.filter(user=user).first()

	sessions = (
		WorkoutSession.objects.filter(
			user=user,
			status="completed",
			completed_at__isnull=False,
		)
		.prefetch_related(
			"session_exercises__exercise__primary_muscles",
			"session_exercises__exercise__secondary_muscles",
		)
	)

	if not sessions.exists():
		if profile and getattr(profile, "onboarding_completed_at", None):
			return _estimated_body_battle_map_from_onboarding(profile, as_of=as_of)
		return {"available": False, "reason": "no_completed_sessions"}, None

	stats: Dict[str, Dict] = {
		g: {"sessions": 0, "last_date": None} for g in CANONICAL_GROUPS
	}

	for session in sessions:
		local_date = session.completed_at.astimezone(tz).date()
		groups_for_session = set()
		for se in session.session_exercises.all():
			if not se.is_completed:
				continue
			exercise = se.exercise
			muscles = list(exercise.primary_muscles.all()) + list(
				exercise.secondary_muscles.all()
			)
			for m in muscles:
				if not m.canonical_group:
					continue
				groups_for_session.add(m.canonical_group)

		for g in groups_for_session:
			if g not in stats:
				continue
			stats[g]["sessions"] += 1
			last = stats[g]["last_date"]
			if last is None or local_date > last:
				stats[g]["last_date"] = local_date

	local_today = as_of.astimezone(tz).date()

	def _rank(sessions: int) -> str:
		if sessions == 0:
			return "Recruit"
		if sessions <= 5:
			return "Recruit"
		if sessions <= 15:
			return "Soldier"
		if sessions <= 30:
			return "Warrior"
		if sessions <= 60:
			return "Beast"
		return "Legend"

	def _status(last_date: Optional[date]) -> str:
		if last_date is None:
			return "never"
		days = (local_today - last_date).days
		if days <= 2:
			return "fresh"
		if days <= 4:
			return "recovering"
		if days <= 7:
			return "ready"
		return "neglected"

	group_payload: Dict[str, Dict] = {}
	counts: List[int] = []

	for g in CANONICAL_GROUPS:
		entry = stats[g]
		s = entry["sessions"]
		last = entry["last_date"]
		counts.append(s)
		group_payload[g] = {
			"sessions": s,
			"rank": _rank(s),
			"last": last.isoformat() if last else None,
			"status": _status(last),
		}

	total_sessions = sum(counts)
	if total_sessions == 0:
		# There are completed sessions for this user, but none of the
		# exercises are mapped to canonical muscle groups yet. Treat this as
		# "no data" for Body Battle Map instead of raising an error so the
		# dashboard can still render with neutral defaults.
		detail = {
			"available": False,
			"reason": "no_completed_sessions",
			"groups": group_payload,
			"weak_spots": [],
			"strong_spots": [],
			"balance_score": 0.0,
			"updated_at": as_of.astimezone(timezone.utc).isoformat(),
		}
		return detail, 0.0

	mean = total_sessions / float(len(counts))
	variance = sum((c - mean) ** 2 for c in counts) / float(len(counts))
	stddev = sqrt(variance)
	imbalance_ratio = stddev / (mean or 1.0)
	balance_score = max(0.0, 100.0 - min(100.0, imbalance_ratio * 50.0))

	# Weak spots: up to 3 groups with the fewest sessions (and at least one
	# group having more sessions so we don't flag if everything is zero).
	max_count = max(counts) if counts else 0
	weak_spots: List[str] = []
	if max_count > 0:
		ordered = sorted(CANONICAL_GROUPS, key=lambda g: stats[g]["sessions"])
		for g in ordered:
			if stats[g]["sessions"] < max_count and len(weak_spots) < 3:
				weak_spots.append(g)

	# Strong spots: any groups tied for the most sessions (non-zero).
	strong_spots: List[str] = []
	if counts:
		max_sessions = max(counts)
		if max_sessions > 0:
			strong_spots = [
				g for g in CANONICAL_GROUPS if stats[g]["sessions"] == max_sessions
			]

	detail = {
		"available": True,
		"groups": group_payload,
		"weak_spots": weak_spots,
		"strong_spots": strong_spots,
		"balance_score": round(balance_score, 1),
		"updated_at": as_of.astimezone(timezone.utc).isoformat(),
	}

	return detail, balance_score


def recalculate_user_metrics(user: User, *, as_of: Optional[datetime] = None) -> UserMetricsSnapshot:
	"""Recalculate all dashboard metrics for a user and persist snapshot.

	This is the main orchestration entry point. It is safe to call repeatedly;
	results are upserted into ``UserMetricsSnapshot``.
	"""
	as_of = as_of or timezone.now()

	fitness_detail, fitness_age, percentile_detail, perc_overall = (
		calculate_fitness_and_percentile(user)
	)
	race_detail, readiness_score = calculate_race_readiness(user)
	streak_detail, current_streak, longest_streak, streak_multiplier = calculate_streak(
		user, as_of=as_of
	)
	time_detail, minutes_7d, minutes_30d, minutes_all = calculate_total_time(
		user, as_of=as_of
	)
	body_detail, balance_score = calculate_body_battle_map(user, as_of=as_of)

	snapshot, _ = UserMetricsSnapshot.objects.update_or_create(
		user=user,
		defaults={
			"fitness_age_years": fitness_age,
			"percentile_rank_overall": perc_overall,
			"race_readiness_score": readiness_score,
			"current_streak_days": current_streak,
			"longest_streak_days": longest_streak,
			"streak_multiplier": streak_multiplier,
			"total_minutes_7d": minutes_7d,
			"total_minutes_30d": minutes_30d,
			"total_minutes_all_time": minutes_all,
			"body_balance_score": balance_score,
			"fitness_age_detail": fitness_detail,
			"percentile_detail": percentile_detail,
			"race_readiness_detail": race_detail,
			"streak_detail": streak_detail,
			"total_time_detail": time_detail,
			"body_battle_map_detail": body_detail,
		},
	)

	return snapshot
