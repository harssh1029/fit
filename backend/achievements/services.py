from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Iterable

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Max, Sum
from django.utils import timezone

from .models import (
	AchievementEvent,
	Badge,
	BadgeRule,
	CategoryLevel,
	FeaturedBadge,
	LeaderboardPeriod,
	LeaderboardResult,
	UserBadge,
	UserLevel,
)


User = get_user_model()


LEVELS = [
	(1, 'Rookie', 0, 1000),
	(2, 'Builder', 1000, 4000),
	(3, 'Athlete', 4000, 10000),
	(4, 'Performer', 10000, 25000),
	(5, 'Elite', 25000, 60000),
	(6, 'Legend', 60000, 60000),
]

CATEGORY_TIERS = [
	('bronze', 500, 1500),
	('silver', 1500, 3500),
	('gold', 3500, 7500),
	('platinum', 7500, 15000),
	('elite', 15000, 15000),
]

CATEGORY_SCORE_FIELDS = {
	'strength': 'strength_score',
	'cardio': 'cardio_score',
	'conditioning': 'conditioning_score',
	'mobility': 'mobility_score',
	'sport': 'sport_score',
	'consistency': 'consistency_score',
}

MEANINGFUL_BADGE_CATEGORIES = {'leaderboard', 'challenge', 'plan'}


@dataclass(frozen=True)
class BadgeSeed:
	id: str
	name: str
	description: str
	category: str
	tier: str
	rarity: str
	icon: str
	priority: int
	trigger: str
	condition: str
	threshold: float
	period: str = ''
	metadata: dict[str, Any] | None = None
	is_periodic: bool = False
	is_repeatable: bool = False


BADGE_SEEDS: list[BadgeSeed] = [
	BadgeSeed('first_session', 'First Session', 'Complete your first workout.', 'consistency', 'bronze', 'common', 'barbell', 10, 'workout_saved', 'total_workouts', 1),
	BadgeSeed('three_day_rhythm', 'Three Day Rhythm', 'Train 3 active days in a week.', 'consistency', 'bronze', 'common', 'calendar', 20, 'workout_saved', 'active_days_in_week', 3),
	BadgeSeed('five_day_discipline', 'Five Day Discipline', 'Train 5 active days in a week.', 'consistency', 'silver', 'rare', 'calendar-check', 30, 'workout_saved', 'active_days_in_week', 5),
	BadgeSeed('consistency_builder', 'Consistency Builder', 'Train 3 weeks in a row with at least 3 active days per week.', 'consistency', 'silver', 'rare', 'flame', 40, 'workout_saved', 'weekly_consistency_streak', 3),
	BadgeSeed('unbroken_month', 'Unbroken Month', 'Train 4 weeks in a row with at least 3 active days per week.', 'consistency', 'gold', 'elite', 'shield', 50, 'workout_saved', 'weekly_consistency_streak', 4),
	BadgeSeed('elite_discipline', 'Elite Discipline', 'Train 12 weeks in a row with at least 3 active days per week.', 'consistency', 'elite', 'legendary', 'medal', 60, 'workout_saved', 'weekly_consistency_streak', 12),
	BadgeSeed('new_personal_best', 'New Personal Best', 'Log a new personal best.', 'pr', 'bronze', 'rare', 'trending-up', 70, 'workout_saved', 'pr_logged', 1),
	BadgeSeed('best_week', 'Best Week', 'Set your highest weekly XP ever.', 'pr', 'silver', 'rare', 'pulse', 75, 'pr_detected', 'best_week', 1),
	BadgeSeed('longest_session', 'Longest Session', 'Record your longest workout session.', 'pr', 'silver', 'rare', 'timer', 76, 'pr_detected', 'longest_session', 1),
	BadgeSeed('most_consistent_week', 'Most Consistent Week', 'Set your best active-days week.', 'pr', 'silver', 'rare', 'calendar-number', 77, 'pr_detected', 'best_consistency_week', 1),
	BadgeSeed('challenge_speedrun', 'Challenge Speedrun', 'Complete a challenge faster than your previous best.', 'pr', 'gold', 'elite', 'flash', 78, 'challenge_completed', 'challenge_speedrun', 1),
	BadgeSeed('top_100_weekly', 'Top 100 Weekly', 'Finish inside the weekly top 100.', 'leaderboard', 'bronze', 'rare', 'podium', 90, 'weekly_period_closed', 'weekly_rank_lte', 100, is_periodic=True, is_repeatable=True),
	BadgeSeed('top_50_weekly', 'Top 50 Weekly', 'Finish inside the weekly top 50.', 'leaderboard', 'silver', 'rare', 'podium', 91, 'weekly_period_closed', 'weekly_rank_lte', 50, is_periodic=True, is_repeatable=True),
	BadgeSeed('top_10_weekly', 'Top 10 Weekly', 'Finish inside the weekly top 10.', 'leaderboard', 'gold', 'elite', 'podium', 92, 'weekly_period_closed', 'weekly_rank_lte', 10, is_periodic=True, is_repeatable=True),
	BadgeSeed('weekly_champion', 'Weekly Champion', 'Finish rank #1 this week.', 'leaderboard', 'elite', 'legendary', 'trophy', 93, 'weekly_period_closed', 'weekly_rank_lte', 1, is_periodic=True, is_repeatable=True),
	BadgeSeed('top_100_monthly', 'Top 100 Monthly', 'Finish inside the monthly top 100.', 'leaderboard', 'bronze', 'rare', 'podium', 94, 'monthly_period_closed', 'monthly_rank_lte', 100, is_periodic=True, is_repeatable=True),
	BadgeSeed('top_50_monthly', 'Top 50 Monthly', 'Finish inside the monthly top 50.', 'leaderboard', 'silver', 'rare', 'podium', 95, 'monthly_period_closed', 'monthly_rank_lte', 50, is_periodic=True, is_repeatable=True),
	BadgeSeed('top_10_monthly', 'Top 10 Monthly', 'Finish inside the monthly top 10.', 'leaderboard', 'gold', 'elite', 'podium', 96, 'monthly_period_closed', 'monthly_rank_lte', 10, is_periodic=True, is_repeatable=True),
	BadgeSeed('monthly_champion', 'Monthly Champion', 'Finish rank #1 this month.', 'leaderboard', 'elite', 'legendary', 'trophy', 97, 'monthly_period_closed', 'monthly_rank_lte', 1, is_periodic=True, is_repeatable=True),
	BadgeSeed('monthly_athlete', 'Monthly Athlete', 'Complete 12 workouts in a month.', 'monthly', 'silver', 'rare', 'calendar', 100, 'workout_saved', 'workouts_this_month', 12, is_periodic=True, is_repeatable=True),
	BadgeSeed('monthly_performer', 'Monthly Performer', 'Reach the top 25% this month.', 'monthly', 'gold', 'elite', 'trending-up', 101, 'monthly_period_closed', 'monthly_percentile_gte', 75, is_periodic=True, is_repeatable=True),
	BadgeSeed('monthly_elite', 'Monthly Elite', 'Reach the top 10% this month.', 'monthly', 'platinum', 'elite', 'shield', 102, 'monthly_period_closed', 'monthly_percentile_gte', 90, is_periodic=True, is_repeatable=True),
	BadgeSeed('plan_starter', 'Plan Starter', 'Start your first training plan.', 'plan', 'bronze', 'common', 'flag', 110, 'plan_completed', 'plan_started', 1),
	BadgeSeed('plan_finisher', 'Plan Finisher', 'Complete your first training plan.', 'plan', 'silver', 'rare', 'flag-checkered', 111, 'plan_completed', 'plan_completed_count', 1),
	BadgeSeed('strength_plan_finisher', 'Strength Plan Finisher', 'Complete a strength training plan.', 'plan', 'gold', 'elite', 'barbell', 112, 'plan_completed', 'plan_tag_completed', 1, metadata={'tag': 'strength'}),
	BadgeSeed('hyrox_plan_finisher', 'HYROX Plan Finisher', 'Complete a HYROX training plan.', 'plan', 'gold', 'elite', 'timer', 113, 'plan_completed', 'plan_tag_completed', 1, metadata={'tag': 'hyrox'}),
	BadgeSeed('half_marathon_builder', 'Half Marathon Builder', 'Complete a half marathon training plan.', 'plan', 'gold', 'elite', 'route', 114, 'plan_completed', 'plan_tag_completed', 1, metadata={'tag': 'half marathon'}),
	BadgeSeed('full_marathon_builder', 'Full Marathon Builder', 'Complete a full marathon training plan.', 'plan', 'platinum', 'elite', 'route', 115, 'plan_completed', 'plan_tag_completed', 1, metadata={'tag': 'marathon'}),
	BadgeSeed('fat_loss_finisher', 'Fat Loss Finisher', 'Complete a fat loss training plan.', 'plan', 'gold', 'elite', 'activity', 116, 'plan_completed', 'plan_tag_completed', 1, metadata={'tag': 'fat loss'}),
	BadgeSeed('hybrid_athlete_finisher', 'Hybrid Athlete Finisher', 'Complete a hybrid training plan.', 'plan', 'gold', 'elite', 'layers', 117, 'plan_completed', 'plan_tag_completed', 1, metadata={'tag': 'hybrid'}),
	BadgeSeed('perfect_plan_completion', 'Perfect Plan Completion', 'Complete every scheduled workout in a plan.', 'plan', 'platinum', 'legendary', 'checkmark-done', 118, 'plan_completed', 'plan_completion_percent', 100),
	BadgeSeed('comeback_plan_finisher', 'Comeback Plan Finisher', 'Finish a plan after adapting your schedule.', 'plan', 'gold', 'elite', 'refresh', 119, 'plan_completed', 'comeback_plan', 1),
	BadgeSeed('challenge_starter', 'Challenge Starter', 'Join your first challenge.', 'challenge', 'bronze', 'common', 'flag', 130, 'challenge_completed', 'challenge_joined_count', 1),
	BadgeSeed('challenge_finisher', 'Challenge Finisher', 'Complete your first challenge.', 'challenge', 'silver', 'rare', 'flag-checkered', 131, 'challenge_completed', 'challenge_completed_count', 1),
	BadgeSeed('challenge_streak', 'Challenge Streak', 'Complete 3 challenges in a month.', 'challenge', 'gold', 'elite', 'flame', 132, 'challenge_completed', 'challenges_completed_this_month', 3, is_periodic=True, is_repeatable=True),
	BadgeSeed('official_challenge_finisher', 'Official Challenge Finisher', 'Complete an official challenge.', 'challenge', 'silver', 'rare', 'shield-check', 133, 'challenge_completed', 'official_challenge_completed', 1),
	BadgeSeed('community_challenge_finisher', 'Community Challenge Finisher', 'Complete a community-created challenge.', 'challenge', 'silver', 'rare', 'people', 134, 'challenge_completed', 'community_challenge_completed', 1),
	BadgeSeed('group_challenge_contributor', 'Group Challenge Contributor', 'Contribute to a group challenge.', 'challenge', 'silver', 'rare', 'people', 135, 'group_event', 'group_challenge_contributions', 1),
	BadgeSeed('challenge_winner', 'Challenge Winner', 'Finish rank #1 in a challenge.', 'challenge', 'elite', 'legendary', 'trophy', 136, 'challenge_completed', 'challenge_rank_lte', 1),
	BadgeSeed('top_10_challenger', 'Top 10 Challenger', 'Finish a challenge in the top 10.', 'challenge', 'gold', 'elite', 'podium', 137, 'challenge_completed', 'challenge_rank_lte', 10),
	BadgeSeed('first_group_joined', 'First Group Joined', 'Join your first training group.', 'group', 'bronze', 'common', 'people', 150, 'group_event', 'group_joined_count', 1),
	BadgeSeed('group_regular', 'Group Regular', 'Contribute 5 workouts to one group.', 'group', 'silver', 'rare', 'people', 151, 'group_event', 'group_workouts_single_group', 5),
	BadgeSeed('group_leader', 'Group Leader', 'Create a group with 20+ members.', 'group', 'gold', 'elite', 'shield', 152, 'group_event', 'created_group_members', 20),
	BadgeSeed('group_captain', 'Group Captain', 'Create 3 group challenges as an admin or owner.', 'group', 'gold', 'elite', 'megaphone', 153, 'group_event', 'created_group_challenges', 3),
	BadgeSeed('group_contributor', 'Group Contributor', 'Contribute 20 group workouts.', 'group', 'gold', 'elite', 'people', 154, 'group_event', 'group_workouts_total', 20),
	BadgeSeed('group_champion', 'Group Champion', 'Finish rank #1 in a group weekly leaderboard.', 'group', 'elite', 'legendary', 'trophy', 155, 'group_event', 'group_weekly_rank_lte', 1, is_periodic=True, is_repeatable=True),
	BadgeSeed('team_player', 'Team Player', 'Complete 5 group challenges.', 'group', 'gold', 'elite', 'handshake', 156, 'group_event', 'group_challenges_completed', 5),
	BadgeSeed('upper_body_builder', 'Upper Body Builder', 'Complete 10 upper-body focused sessions.', 'body_focus', 'silver', 'rare', 'body', 170, 'workout_saved', 'body_focus_sessions', 10, metadata={'focus': 'upper_body'}),
	BadgeSeed('leg_day_loyalist', 'Leg Day Loyalist', 'Complete 8 lower-body focused sessions.', 'body_focus', 'silver', 'rare', 'walk', 171, 'workout_saved', 'body_focus_sessions', 8, metadata={'focus': 'lower_body'}),
	BadgeSeed('core_consistency', 'Core Consistency', 'Complete 8 core-focused sessions.', 'body_focus', 'silver', 'rare', 'ellipse', 172, 'workout_saved', 'body_focus_sessions', 8, metadata={'focus': 'core'}),
	BadgeSeed('balanced_athlete', 'Balanced Athlete', 'Train upper, lower, core, and cardio in the same month.', 'body_focus', 'gold', 'elite', 'analytics', 173, 'workout_saved', 'balanced_month', 1, is_periodic=True, is_repeatable=True),
	BadgeSeed('push_specialist', 'Push Specialist', 'Complete 10 push-focused sessions.', 'body_focus', 'silver', 'rare', 'arrow-up', 174, 'workout_saved', 'body_focus_sessions', 10, metadata={'focus': 'push'}),
	BadgeSeed('pull_specialist', 'Pull Specialist', 'Complete 10 pull-focused sessions.', 'body_focus', 'silver', 'rare', 'arrow-down', 175, 'workout_saved', 'body_focus_sessions', 10, metadata={'focus': 'pull'}),
	BadgeSeed('comeback_session', 'Comeback Session', 'Return to training after 7 inactive days.', 'comeback', 'bronze', 'rare', 'refresh', 190, 'workout_saved', 'inactive_days_before_workout', 7),
	BadgeSeed('back_in_rhythm', 'Back in Rhythm', 'Complete 3 workouts after a break.', 'comeback', 'silver', 'rare', 'pulse', 191, 'workout_saved', 'post_break_workouts', 3, metadata={'inactive_days': 7}),
	BadgeSeed('reset_week', 'Reset Week', 'Complete 3 workouts after 14 inactive days.', 'comeback', 'silver', 'rare', 'refresh-circle', 192, 'workout_saved', 'post_break_workouts', 3, metadata={'inactive_days': 14}),
]


def ensure_badge_catalog() -> None:
	expected_badges = {
		seed.id: {
			'name': seed.name,
			'description': seed.description,
			'category': seed.category,
			'tier': seed.tier,
			'icon': seed.icon,
			'rarity': seed.rarity,
			'unlock_description': seed.description,
			'is_repeatable': seed.is_repeatable,
			'is_periodic': seed.is_periodic,
			'display_priority': seed.priority,
			'shareable_card_enabled': True,
		}
		for seed in BADGE_SEEDS
	}
	existing_badges = {
		badge.id: badge
		for badge in Badge.objects.filter(id__in=expected_badges)
	}
	badges_are_current = len(existing_badges) == len(expected_badges) and all(
		all(getattr(existing_badges[badge_id], field) == value for field, value in values.items())
		for badge_id, values in expected_badges.items()
	)
	if badges_are_current:
		expected_rules = {
			(seed.id, seed.trigger, seed.condition, seed.period): {
				'threshold': float(seed.threshold),
				'metadata': seed.metadata or {},
			}
			for seed in BADGE_SEEDS
		}
		existing_rules = {
			(rule.badge_id, rule.trigger_type, rule.condition_type, rule.period): rule
			for rule in BadgeRule.objects.filter(badge_id__in=expected_badges)
		}
		if len(existing_rules) >= len(expected_rules) and all(
			key in existing_rules
			and float(existing_rules[key].threshold) == values['threshold']
			and existing_rules[key].metadata == values['metadata']
			for key, values in expected_rules.items()
		):
			return

	for seed in BADGE_SEEDS:
		badge, _ = Badge.objects.update_or_create(
			id=seed.id,
			defaults={
				'name': seed.name,
				'description': seed.description,
				'category': seed.category,
				'tier': seed.tier,
				'icon': seed.icon,
				'rarity': seed.rarity,
				'unlock_description': seed.description,
				'is_repeatable': seed.is_repeatable,
				'is_periodic': seed.is_periodic,
				'display_priority': seed.priority,
				'shareable_card_enabled': True,
			},
		)
		BadgeRule.objects.update_or_create(
			badge=badge,
			trigger_type=seed.trigger,
			condition_type=seed.condition,
			period=seed.period,
			defaults={
				'threshold': seed.threshold,
				'metadata': seed.metadata or {},
			},
		)


def level_for_xp(xp: int) -> tuple[int, str, int, int]:
	for level, title, start, next_xp in reversed(LEVELS):
		if xp >= start:
			return level, title, start, next_xp
	return 1, 'Rookie', 0, 1000


def tier_for_category_xp(xp: int) -> tuple[str, int]:
	for tier, start, next_xp in reversed(CATEGORY_TIERS):
		if xp >= start:
			return tier, next_xp
	return 'bronze', 500


def sync_user_levels(user: User, *, score_summary=None) -> UserLevel:
	if score_summary is None:
		try:
			score_summary = user.score_summary
		except ObjectDoesNotExist:
			score_summary = None
	career_xp = int(getattr(score_summary, 'career_xp', 0) or 0)
	level, title, current_xp, next_xp = level_for_xp(career_xp)
	existing = UserLevel.objects.filter(user=user).first()
	old_level = existing.current_level if existing else 1
	user_level, _ = UserLevel.objects.update_or_create(
		user=user,
		defaults={
			'career_xp': career_xp,
			'current_level': level,
			'current_title': title,
			'current_level_xp': current_xp,
			'next_level_xp': next_xp,
		},
	)
	if level > old_level:
		AchievementEvent.objects.create(
			user=user,
			event_type='level_up',
			title=f'{title} · Level {level}',
			body='Your career XP moved you into a new training level.',
			metadata={'career_xp': career_xp, 'level': level},
		)
	if score_summary is not None:
		for category, field in CATEGORY_SCORE_FIELDS.items():
			xp = int(round(float(getattr(score_summary, field, 0) or 0)))
			tier, next_tier_xp = tier_for_category_xp(xp)
			CategoryLevel.objects.update_or_create(
				user=user,
				category=category,
				defaults={'xp': max(0, xp), 'tier': tier, 'next_tier_xp': next_tier_xp},
			)
	return user_level


def _period_key_for_date(period: str, day: date) -> str:
	if period == 'weekly':
		iso = day.isocalendar()
		return f'{iso.year}_W{iso.week:02d}'
	if period == 'monthly':
		return f'{day.year}_{day.month:02d}'
	if period == 'quarterly':
		quarter = (day.month - 1) // 3 + 1
		return f'{day.year}_Q{quarter}'
	return ''


def _week_start(day: date) -> date:
	return day - timedelta(days=day.weekday())


def _month_start(day: date) -> date:
	return day.replace(day=1)


def _month_end(day: date) -> date:
	if day.month == 12:
		return day.replace(year=day.year + 1, month=1, day=1) - timedelta(days=1)
	return day.replace(month=day.month + 1, day=1) - timedelta(days=1)


def _aware_start(day: date) -> datetime:
	return timezone.make_aware(datetime.combine(day, datetime.min.time()))


def _active_dates(user: User, start: datetime, end: datetime) -> set[date]:
	from workouts.models import WorkoutSession

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


def _weekly_consistency_streak(user: User, as_of: datetime) -> int:
	weeks = 0
	cursor = _week_start(as_of.date())
	for _ in range(104):
		start = _aware_start(cursor)
		end = start + timedelta(days=7)
		if len(_active_dates(user, start, end)) >= 3:
			weeks += 1
			cursor -= timedelta(days=7)
		else:
			break
	return weeks


def _workout_count(user: User, *, start: datetime | None = None, end: datetime | None = None) -> int:
	from workouts.models import WorkoutSession

	qs = WorkoutSession.objects.filter(user=user, status='completed')
	if start is not None:
		qs = qs.filter(completed_at__gte=start)
	if end is not None:
		qs = qs.filter(completed_at__lt=end)
	return qs.count()


def _inactive_days_before_workout(session) -> int:
	from workouts.models import WorkoutSession

	as_of = session.completed_at or timezone.now()
	previous = (
		WorkoutSession.objects.filter(
			user=session.user,
			status='completed',
			completed_at__lt=as_of,
		)
		.exclude(id=session.id)
		.order_by('-completed_at')
		.first()
	)
	if previous is None or previous.completed_at is None:
		return 0
	return max(0, (as_of.date() - previous.completed_at.date()).days)


def _session_matches_focus(session, focus: str) -> bool:
	body_groups = {str(item).lower() for item in (session.body_groups or [])}
	muscles = {str(item).lower() for item in (session.muscles or [])}
	values = body_groups | muscles
	if focus == 'upper_body':
		return bool(values & {'chest', 'shoulders', 'arms', 'back', 'biceps', 'triceps', 'lats'})
	if focus == 'lower_body':
		return bool(values & {'legs', 'glutes', 'quads', 'quadriceps', 'hamstrings', 'calves'})
	if focus == 'core':
		return bool(values & {'core', 'abs', 'obliques'})
	if focus == 'push':
		return bool(values & {'chest', 'shoulders', 'triceps'}) or 'push' in str(session.focus_label).lower()
	if focus == 'pull':
		return bool(values & {'back', 'biceps', 'lats', 'trapezius'}) or 'pull' in str(session.focus_label).lower()
	if focus == 'cardio':
		return session.workout_type in {'cardio', 'conditioning'}
	return False


def _body_focus_count(user: User, focus: str, *, start: datetime | None = None, end: datetime | None = None) -> int:
	from workouts.models import WorkoutSession

	qs = WorkoutSession.objects.filter(user=user, status='completed')
	if start is not None:
		qs = qs.filter(completed_at__gte=start)
	if end is not None:
		qs = qs.filter(completed_at__lt=end)
	return sum(1 for session in qs.only('body_groups', 'muscles', 'focus_label', 'workout_type') if _session_matches_focus(session, focus))


def _post_break_workouts(session, inactive_days: int) -> int:
	from workouts.models import WorkoutSession

	as_of = session.completed_at or timezone.now()
	rows = list(
		WorkoutSession.objects.filter(
			user=session.user,
			status='completed',
			completed_at__lte=as_of,
		).order_by('-completed_at')[:20]
	)
	count = 0
	previous_date = None
	for row in rows:
		if previous_date is not None and (previous_date - row.completed_at.date()).days >= inactive_days:
			break
		count += 1
		previous_date = row.completed_at.date()
	return count


def _condition_met(rule: BadgeRule, *, user: User, context: dict[str, Any]) -> bool:
	condition = rule.condition_type
	threshold = float(rule.threshold)
	as_of = context.get('as_of') or timezone.now()
	session = context.get('session')
	if condition == 'total_workouts':
		return _workout_count(user) >= threshold
	if condition == 'active_days_in_week':
		start = _aware_start(_week_start(as_of.date()))
		return len(_active_dates(user, start, start + timedelta(days=7))) >= threshold
	if condition == 'weekly_consistency_streak':
		return _weekly_consistency_streak(user, as_of) >= threshold
	if condition == 'workouts_this_month':
		start = _aware_start(_month_start(as_of.date()))
		end = _aware_start(_month_end(as_of.date()) + timedelta(days=1))
		return _workout_count(user, start=start, end=end) >= threshold
	if condition == 'pr_logged':
		if session is None:
			return False
		metadata = session.metadata if isinstance(session.metadata, dict) else {}
		exercises = metadata.get('exercises') if isinstance(metadata.get('exercises'), list) else []
		return bool(session.pr_note or metadata.get('pr') or any(isinstance(item, dict) and item.get('pr') for item in exercises))
	if condition == 'inactive_days_before_workout':
		return session is not None and _inactive_days_before_workout(session) >= threshold
	if condition == 'post_break_workouts':
		return session is not None and _post_break_workouts(session, int(rule.metadata.get('inactive_days') or 7)) >= threshold and _inactive_days_before_workout(session) >= int(rule.metadata.get('inactive_days') or 7)
	if condition == 'body_focus_sessions':
		focus = str(rule.metadata.get('focus') or '')
		return bool(focus) and _body_focus_count(user, focus) >= threshold
	if condition == 'balanced_month':
		start = _aware_start(_month_start(as_of.date()))
		end = _aware_start(_month_end(as_of.date()) + timedelta(days=1))
		return all(_body_focus_count(user, focus, start=start, end=end) > 0 for focus in ['upper_body', 'lower_body', 'core', 'cardio'])
	if condition in {'weekly_rank_lte', 'monthly_rank_lte', 'challenge_rank_lte', 'group_weekly_rank_lte'}:
		return int(context.get('rank') or 999999) <= threshold
	if condition in {'monthly_percentile_gte'}:
		return float(context.get('percentile') or 0) >= threshold
	if condition == 'plan_started':
		return int(context.get('plan_started_count') or context.get('plan_completed_count') or 0) >= threshold
	if condition == 'plan_completed_count':
		return int(context.get('plan_completed_count') or 0) >= threshold
	if condition == 'plan_tag_completed':
		plan_name = str(context.get('plan_name') or '').lower()
		plan_tags = ' '.join(str(item).lower() for item in context.get('plan_tags') or [])
		tag = str(rule.metadata.get('tag') or '').lower()
		return bool(tag) and (tag in plan_name or tag in plan_tags)
	if condition == 'plan_completion_percent':
		return float(context.get('completion_percent') or 0) >= threshold
	if condition == 'comeback_plan':
		return bool(context.get('is_recalibrated') or context.get('missed_sessions'))
	if condition == 'challenge_joined_count':
		return int(context.get('challenge_joined_count') or context.get('challenge_completed_count') or 0) >= threshold
	if condition == 'challenge_completed_count':
		return int(context.get('challenge_completed_count') or 0) >= threshold
	if condition == 'challenges_completed_this_month':
		return int(context.get('challenges_completed_this_month') or 0) >= threshold
	if condition == 'official_challenge_completed':
		return context.get('challenge_visibility') == 'official'
	if condition == 'community_challenge_completed':
		return context.get('challenge_visibility') == 'community'
	if condition in {'challenge_speedrun', 'best_week', 'longest_session', 'best_consistency_week'}:
		return bool(context.get(condition))
	if condition == 'group_joined_count':
		return int(context.get('group_joined_count') or 0) >= threshold
	if condition == 'group_workouts_single_group':
		return int(context.get('group_workouts_single_group') or 0) >= threshold
	if condition == 'created_group_members':
		return int(context.get('created_group_members') or 0) >= threshold
	if condition == 'created_group_challenges':
		return int(context.get('created_group_challenges') or 0) >= threshold
	if condition == 'group_workouts_total':
		return int(context.get('group_workouts_total') or 0) >= threshold
	if condition == 'group_challenges_completed':
		return int(context.get('group_challenges_completed') or 0) >= threshold
	if condition == 'group_challenge_contributions':
		return int(context.get('group_challenge_contributions') or 0) >= threshold
	return False


def _meaningful_for_feed(badge: Badge) -> bool:
	return badge.rarity in {'rare', 'elite', 'legendary'} or badge.category in MEANINGFUL_BADGE_CATEGORIES


def _create_badge_activity(user: User, user_badge: UserBadge) -> None:
	if user_badge.source_type in {'workout', 'challenge'}:
		return
	if not _meaningful_for_feed(user_badge.badge):
		return
	from community.models import CommunityActivity

	source_id = f'badge:{user_badge.id}'
	CommunityActivity.objects.update_or_create(
		user=user,
		activity_type='badge',
		metadata__source_id=source_id,
		defaults={
			'title': f'Earned {user_badge.badge.name}',
			'description': user_badge.badge.description,
			'metadata': {
				'source_id': source_id,
				'event_type': 'badge_earned',
				'badge_id': user_badge.badge_id,
				'badge_name': user_badge.badge.name,
				'badge_rarity': user_badge.badge.rarity,
				'badge_tier': user_badge.badge.tier,
				'reason': user_badge.badge.description,
				'frontend_summary': {
					'title': user_badge.badge.name,
					'rarity': user_badge.badge.rarity,
					'reason': user_badge.badge.description,
				},
			},
			'occurred_at': user_badge.earned_at,
		},
	)


def award_badge(
	user: User,
	badge: Badge,
	*,
	source_type: str = '',
	source_id: str = '',
	period_key: str = '',
	metadata: dict[str, Any] | None = None,
	create_feed_activity: bool = True,
) -> UserBadge | None:
	effective_period_key = period_key if badge.is_periodic or badge.is_repeatable else ''
	user_badge, created = UserBadge.objects.get_or_create(
		user=user,
		badge=badge,
		period_key=effective_period_key,
		defaults={
			'source_type': source_type,
			'source_id': source_id,
			'metadata': metadata or {},
		},
	)
	if not created:
		return None
	AchievementEvent.objects.create(
		user=user,
		event_type='badge_earned',
		title=f'You unlocked {badge.name}',
		body=badge.description,
		source_type=source_type,
		source_id=source_id,
		metadata={'badge_id': badge.id, 'period_key': effective_period_key, **(metadata or {})},
	)
	if create_feed_activity:
		_create_badge_activity(user, user_badge)
	return user_badge


def earned_badge_summaries(user_badges: list[UserBadge]) -> list[dict[str, str]]:
	return [
		{
			'id': item.badge_id,
			'name': item.badge.name,
			'rarity': item.badge.rarity,
			'tier': item.badge.tier,
			'reason': item.badge.description,
		}
		for item in user_badges
	]


def evaluate_badges(
	user: User,
	trigger_type: str,
	*,
	context: dict[str, Any] | None = None,
	source_type: str = '',
	source_id: str = '',
	period_key: str = '',
	create_feed_activity: bool = True,
) -> list[UserBadge]:
	ensure_badge_catalog()
	context = context or {}
	as_of = context.get('as_of') or timezone.now()
	earned: list[UserBadge] = []
	for rule in BadgeRule.objects.filter(trigger_type=trigger_type).select_related('badge'):
		badge_period_key = period_key
		if rule.badge.is_periodic and not badge_period_key:
			badge_period_key = _period_key_for_date(rule.period or trigger_type.split('_')[0], as_of.date())
		if _condition_met(rule, user=user, context=context):
			user_badge = award_badge(
				user,
				rule.badge,
				source_type=source_type or trigger_type,
				source_id=source_id,
				period_key=badge_period_key,
				metadata={'condition_type': rule.condition_type, **context.get('badge_metadata', {})},
				create_feed_activity=create_feed_activity,
			)
			if user_badge is not None:
				earned.append(user_badge)
	return earned


def evaluate_workout_achievements(session, score=None, *, as_of: datetime | None = None) -> list[UserBadge]:
	as_of = as_of or session.completed_at or timezone.now()
	try:
		score_summary = session.user.score_summary
	except ObjectDoesNotExist:
		score_summary = None
	sync_user_levels(session.user, score_summary=score_summary)
	earned = evaluate_badges(
		session.user,
		'workout_saved',
		context={'session': session, 'score': score, 'as_of': as_of},
		source_type='workout',
		source_id=str(session.id),
	)
	if session.pr_note or ((session.metadata or {}).get('pr')):
		earned.extend(
			evaluate_badges(
				session.user,
				'pr_detected',
				context={'session': session, 'score': score, 'as_of': as_of, 'longest_session': _is_longest_session(session)},
				source_type='workout',
				source_id=str(session.id),
			)
		)
	return earned


def _is_longest_session(session) -> bool:
	from workouts.models import WorkoutSession

	if not session.duration_minutes:
		return False
	best = (
		WorkoutSession.objects.filter(user=session.user, status='completed')
		.exclude(id=session.id)
		.aggregate(max_duration=Max('duration_minutes'))
	)
	return (best.get('max_duration') or 0) < session.duration_minutes


def evaluate_group_achievements(user: User, *, context: dict[str, Any] | None = None) -> list[UserBadge]:
	return evaluate_badges(user, 'group_event', context=context or {}, source_type='group', source_id=str((context or {}).get('group_id') or ''))


def evaluate_plan_completion(user_plan, *, create_feed_activity: bool = True) -> list[UserBadge]:
	context = {
		'plan_completed_count': user_plan.user.user_plans.filter(status='completed').count(),
		'plan_started_count': user_plan.user.user_plans.count(),
		'plan_name': user_plan.plan.name,
		'plan_tags': user_plan.plan.tags or [],
		'completion_percent': float(user_plan.completion_percent or 0),
		'is_recalibrated': user_plan.is_recalibrated,
		'missed_sessions': user_plan.missed_sessions,
		'as_of': user_plan.completed_at or timezone.now(),
	}
	return evaluate_badges(
		user_plan.user,
		'plan_completed',
		context=context,
		source_type='plan',
		source_id=str(user_plan.id),
		create_feed_activity=create_feed_activity,
	)


def evaluate_challenge_completion(
	user: User,
	*,
	challenge=None,
	context: dict[str, Any] | None = None,
	create_feed_activity: bool = True,
) -> list[UserBadge]:
	context = context or {}
	if challenge is not None:
		context.setdefault('challenge_visibility', 'official' if getattr(challenge, 'is_official', False) else 'community')
		context.setdefault('challenge_name', getattr(challenge, 'name', None) or getattr(challenge, 'title', None))
	return evaluate_badges(
		user,
		'challenge_completed',
		context=context,
		source_type='challenge',
		source_id=str(getattr(challenge, 'id', context.get('challenge_id', ''))),
		create_feed_activity=create_feed_activity,
	)


@transaction.atomic
def close_leaderboard_period(period_type: str, start_date: date, end_date: date) -> LeaderboardPeriod:
	from workouts.models import UserScorePeriod

	ensure_badge_catalog()
	period_key = _period_key_for_date(period_type, start_date)
	period, _ = LeaderboardPeriod.objects.update_or_create(
		type=period_type,
		period_key=period_key,
		defaults={
			'start_date': start_date,
			'end_date': end_date,
			'status': 'closed',
			'closed_at': timezone.now(),
		},
	)
	score_type = 'weekly' if period_type == 'weekly' else 'monthly'
	if period_type == 'quarterly':
		rows = (
			UserScorePeriod.objects.filter(period_type='monthly', period_start__gte=start_date, period_end__lte=end_date)
			.values('user')
			.annotate(score=Sum('leaderboard_score'))
			.order_by('-score', 'user')
		)
	else:
		rows = (
			UserScorePeriod.objects.filter(period_type=score_type, period_start=start_date, period_end=end_date)
			.values('user')
			.annotate(score=Sum('leaderboard_score'))
			.order_by('-score', 'user')
		)
	total = rows.count()
	for index, row in enumerate(rows, start=1):
		score = float(row['score'] or 0)
		percentile = 0 if total <= 1 else round((1 - ((index - 1) / max(1, total - 1))) * 100, 2)
		result, _ = LeaderboardResult.objects.update_or_create(
			period=period,
			user_id=row['user'],
			defaults={'rank': index, 'score': score, 'percentile': percentile},
		)
		trigger = f'{period_type}_period_closed'
		earned = evaluate_badges(
			result.user,
			trigger,
			context={'rank': index, 'score': score, 'percentile': percentile, 'as_of': timezone.now()},
			source_type='leaderboard',
			source_id=str(period.id),
			period_key=period_key,
		)
		if earned:
			result.awarded_badges = [badge.badge_id for badge in earned]
			result.save(update_fields=['awarded_badges'])
	return period


def set_featured_badges(user: User, user_badge_ids: Iterable[int]) -> list[FeaturedBadge]:
	ids = list(dict.fromkeys(int(item) for item in user_badge_ids))[:3]
	badges = list(UserBadge.objects.filter(user=user, id__in=ids).select_related('badge'))
	by_id = {badge.id: badge for badge in badges}
	FeaturedBadge.objects.filter(user=user).delete()
	created = []
	for slot, user_badge_id in enumerate(ids, start=1):
		user_badge = by_id.get(user_badge_id)
		if user_badge is None:
			continue
		created.append(FeaturedBadge.objects.create(user=user, user_badge=user_badge, slot=slot))
	return created


def achievement_summary(user: User) -> dict[str, Any]:
	ensure_badge_catalog()
	try:
		score_summary = user.score_summary
	except ObjectDoesNotExist:
		score_summary = None
	level = UserLevel.objects.filter(user=user).first()
	categories = list(CategoryLevel.objects.filter(user=user))
	if level is None or (score_summary is not None and not categories):
		level = sync_user_levels(user, score_summary=score_summary)
		categories = list(CategoryLevel.objects.filter(user=user))
	featured = FeaturedBadge.objects.filter(user=user).select_related('user_badge__badge')
	recent = UserBadge.objects.filter(user=user).select_related('badge')[:12]
	return {
		'level': level,
		'featured_badges': [row.user_badge for row in featured],
		'recent_badges': list(recent),
		'category_levels': categories,
	}
