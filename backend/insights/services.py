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


def _plan_for_user(user: User) -> Tuple[Optional[Plan], Optional[UserPlan]]:
	user_plan = (
		UserPlan.objects.filter(user=user, is_active=True)
		.order_by('-started_at', '-created_at')
		.first()
	)
	return (user_plan.plan, user_plan) if user_plan else (None, None)


def calculate_fitness_and_percentile(user: User) -> Tuple[Dict, Optional[int], Dict, Optional[float]]:
	"""Compute Fitness Age and Percentile Rank from the latest FitnessAssessment.

	Returns (fitness_age_detail, fitness_age_years, percentile_detail, percentile_overall).
	If no assessment exists, numeric values are None and details indicate unavailable.
	"""
	assessment = _latest_assessment(user)
	if not assessment:
		no_data = {"available": False, "reason": "no_assessment"}
		return no_data, None, no_data, None

	# Sub-scores (0–100) using simple but clear linear mappings.
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
	percentile_overall = round(overall_pct, 1)

	age = float(assessment.age_years or 30)
	# Map percentile relative to chronological age. 50% → same as age,
	# >50% → younger fitness age, <50% → older. Clamped to sensible bounds.
	fitness_age = int(round(age - (percentile_overall - 50.0) / 2.0))
	fitness_age = max(16, fitness_age)
	fitness_age = min(int(age) + 20, fitness_age)

	fitness_detail = {
		"available": True,
		"chronological_age": assessment.age_years,
		"fitness_age": fitness_age,
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
		"overall_percentile": percentile_overall,
		"label": f"Fitter than {int(percentile_overall)}% of peers",
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


def calculate_body_battle_map(user: User, *, as_of: Optional[datetime] = None) -> Tuple[Dict, Optional[float]]:
	"""Compute Body Battle Map stats per canonical group and balance score."""
	as_of = as_of or timezone.now()
	tz = _get_user_timezone(user)

	sessions = (
		WorkoutSession.objects.filter(
			user=user,
			status='completed',
			completed_at__isnull=False,
		)
		.prefetch_related(
			'session_exercises__exercise__primary_muscles',
			'session_exercises__exercise__secondary_muscles',
		)
	)

	if not sessions.exists():
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

	group_payload = {}
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
