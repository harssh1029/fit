from datetime import timedelta
from typing import Iterable, Optional

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.utils import timezone

from challenges.models import UserChallengeCompletion
from insights.models import UserMetricsSnapshot
from workouts.models import WorkoutSession

from .models import CommunityActivity, Friendship, UserPublicCard


User = get_user_model()


def user_display_name(user: User) -> str:
	try:
		profile = user.profile
	except ObjectDoesNotExist:
		profile = None
	display_name = getattr(profile, 'display_name', '') if profile else ''
	return display_name or user.get_full_name() or user.get_username()


def initials_for_name(name: str) -> str:
	parts = [part for part in name.strip().split() if part]
	if not parts:
		return 'U'
	if len(parts) == 1:
		return parts[0][:2].upper()
	return f'{parts[0][0]}{parts[-1][0]}'.upper()


def accepted_friend_user_ids(user: User) -> list[int]:
	edges = Friendship.objects.filter(
		Q(from_user=user) | Q(to_user=user),
		status=Friendship.STATUS_ACCEPTED,
	)
	ids: list[int] = []
	for edge in edges:
		ids.append(edge.to_user_id if edge.from_user_id == user.id else edge.from_user_id)
	return ids


def friendship_status_between(user: User, other_user: User) -> Optional[str]:
	edge = Friendship.objects.filter(
		Q(from_user=user, to_user=other_user) | Q(from_user=other_user, to_user=user)
	).first()
	return edge.status if edge else None


def ensure_public_card(user: User) -> UserPublicCard:
	"""Refresh and return the saved public card for a user."""

	try:
		profile = user.profile
	except ObjectDoesNotExist:
		profile = None
	try:
		snapshot: Optional[UserMetricsSnapshot] = user.metrics_snapshot
	except ObjectDoesNotExist:
		snapshot = None
	now = timezone.now()
	week_start = now - timedelta(days=7)
	display_name = user_display_name(user)
	active_plan_name = ''
	active_plan = getattr(profile, 'active_plan', None) if profile else None
	if active_plan is not None:
		active_plan_name = active_plan.name

	recent_sessions_this_week = WorkoutSession.objects.filter(
		user=user,
		status='completed',
		completed_at__gte=week_start,
	).count()
	challenges_completed = UserChallengeCompletion.objects.filter(user=user).count()

	current_streak = snapshot.current_streak_days if snapshot else 0
	total_30d = snapshot.total_minutes_30d if snapshot else 0
	body_balance = snapshot.body_balance_score if snapshot else None
	fitness_age = snapshot.fitness_age_years if snapshot else None
	percentile = snapshot.percentile_rank_overall if snapshot else None
	consistency_score = min(100, round(current_streak * 8 + recent_sessions_this_week * 7 + total_30d / 18))
	body_balance_percent = min(100, max(0, round(body_balance or 0)))
	fitness_age_score = (
		max(0, min(100, round(100 - max(0, fitness_age - 22) * 2)))
		if fitness_age is not None
		else 0
	)
	overall_score = min(
		100,
		round(
			consistency_score * 0.28
			+ min(100, challenges_completed * 10) * 0.14
			+ min(100, current_streak * 8) * 0.16
			+ body_balance_percent * 0.18
			+ fitness_age_score * 0.12
			+ (percentile or 0) * 0.12
		),
	)

	card, _ = UserPublicCard.objects.update_or_create(
		user=user,
		defaults={
			'display_name': display_name,
			'username': user.get_username(),
			'avatar_initials': initials_for_name(display_name),
			'overall_score': max(0, overall_score),
			'consistency_score': max(0, consistency_score),
			'challenges_completed': challenges_completed,
			'body_balance_percent': body_balance_percent,
			'active_plan_name': active_plan_name,
			'streak_days': current_streak,
			'recent_sessions_this_week': recent_sessions_this_week,
			'fitness_age_years': fitness_age,
			'metadata': {
				'email': user.email,
				'last_snapshot_at': snapshot.computed_at.isoformat() if snapshot else None,
			},
		},
	)
	return card


def ensure_public_cards(users: Iterable[User]) -> list[UserPublicCard]:
	return [ensure_public_card(user) for user in users]


def get_friend_cards(user: User) -> list[UserPublicCard]:
	friend_ids = accepted_friend_user_ids(user)
	users = User.objects.filter(id__in=friend_ids).select_related('profile')
	return ensure_public_cards(users)


def create_friendship(user: User, other_user: User) -> Friendship:
	if user.id == other_user.id:
		raise ValueError('You cannot add yourself as a friend.')

	first, second = (user, other_user)
	if first.id > second.id:
		first, second = second, first

	edge, _ = Friendship.objects.update_or_create(
		from_user=first,
		to_user=second,
		defaults={'status': Friendship.STATUS_ACCEPTED},
	)
	ensure_public_card(user)
	ensure_public_card(other_user)
	return edge


def remove_friendship(user: User, other_user: User) -> None:
	Friendship.objects.filter(
		Q(from_user=user, to_user=other_user) | Q(from_user=other_user, to_user=user)
	).delete()


def sync_recent_activities(user: User) -> None:
	"""Materialize recent activity from existing workout/challenge data."""

	for session in WorkoutSession.objects.filter(user=user, status='completed').order_by('-completed_at')[:20]:
		occurred_at = session.completed_at or session.updated_at or session.created_at
		title = session.plan.name if session.plan else 'Completed workout'
		description = (
			f'{session.duration_minutes} min session'
			if session.duration_minutes
			else 'Workout completed'
		)
		source_id = f'workout:{session.id}'
		activity = CommunityActivity.objects.filter(
			user=user,
			activity_type=CommunityActivity.ACTIVITY_WORKOUT,
			metadata__source_id=source_id,
		).first()
		if activity is None:
			CommunityActivity.objects.create(
				user=user,
				activity_type=CommunityActivity.ACTIVITY_WORKOUT,
				title=title,
				description=description,
				score=session.duration_minutes,
				metadata={'source_id': source_id},
				occurred_at=occurred_at,
			)
		else:
			activity.title = title
			activity.description = description
			activity.score = session.duration_minutes
			activity.occurred_at = occurred_at
			activity.save(update_fields=['title', 'description', 'score', 'occurred_at'])

	for completion in UserChallengeCompletion.objects.filter(user=user).select_related('challenge').order_by('-completed_at')[:20]:
		challenge_name = completion.challenge.card.get('name') or completion.challenge.id
		source_id = f'challenge:{completion.challenge_id}'
		activity = CommunityActivity.objects.filter(
			user=user,
			activity_type=CommunityActivity.ACTIVITY_CHALLENGE,
			metadata__source_id=source_id,
		).first()
		if activity is None:
			CommunityActivity.objects.create(
				user=user,
				activity_type=CommunityActivity.ACTIVITY_CHALLENGE,
				title=f'Completed {challenge_name}',
				description='Challenge completed',
				metadata={'source_id': source_id},
				occurred_at=completion.completed_at,
			)
		else:
			activity.title = f'Completed {challenge_name}'
			activity.description = 'Challenge completed'
			activity.occurred_at = completion.completed_at
			activity.save(update_fields=['title', 'description', 'occurred_at'])


def community_scope_user_ids(user: User) -> list[int]:
	return [user.id, *accepted_friend_user_ids(user)]
