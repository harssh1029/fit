from datetime import timedelta
from typing import Iterable, Optional

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.utils import timezone

from challenges.models import UserChallengeCompletion
from insights.models import UserMetricsSnapshot
from workouts.models import UserScoreSummary, WorkoutSession

from .models import CommunityActivity, Friendship, UserFollow, UserPublicCard


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
	followers_count = UserFollow.objects.filter(following=user, status=UserFollow.STATUS_ACTIVE).count()
	following_count = UserFollow.objects.filter(follower=user, status=UserFollow.STATUS_ACTIVE).count()
	post_count = CommunityActivity.objects.filter(user=user, activity_type=CommunityActivity.ACTIVITY_WORKOUT).count()
	try:
		score_summary: Optional[UserScoreSummary] = user.score_summary
	except ObjectDoesNotExist:
		score_summary = None

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
			'followers_count': followers_count,
			'following_count': following_count,
			'post_count': post_count,
			'performance_score': score_summary.performance_score if score_summary else overall_score,
			'weekly_xp': score_summary.weekly_xp if score_summary else 0,
			'tier': score_summary.tier if score_summary else 'Rookie',
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

	week_start = timezone.now() - timedelta(days=7)

	for session in WorkoutSession.objects.filter(
		user=user,
		status='completed',
		completed_at__gte=week_start,
	).order_by('-completed_at', '-id'):
		occurred_at = session.completed_at or session.updated_at or session.created_at
		session_metadata = session.metadata or {}
		custom_title = session_metadata.get('title') if isinstance(session_metadata, dict) else None
		title = session.title or (session.plan.name if session.plan else str(custom_title or 'Completed workout'))
		description_parts = []
		if session.duration_minutes:
			description_parts.append(f'{session.duration_minutes} min session')
		if isinstance(session_metadata, dict):
			body_groups = session_metadata.get('body_groups') or []
			focus_label = session_metadata.get('focus_label')
			if isinstance(focus_label, str) and focus_label:
				description_parts.append(focus_label)
			if isinstance(body_groups, list) and body_groups:
				description_parts.append(
					' + '.join(str(group).title() for group in body_groups[:3])
				)
			if session_metadata.get('cardio'):
				description_parts.append('Cardio')
			intensity = session_metadata.get('intensity')
			if isinstance(intensity, str) and intensity:
				description_parts.append(intensity)
		description = ' / '.join(description_parts) or 'Workout completed'
		source_id = f'workout:{session.id}'
		activity_metadata = {'source_id': source_id}
		if isinstance(session_metadata, dict):
			activity_metadata.update(
				{
					'title': title,
					'body_groups': session.body_groups or session_metadata.get('body_groups') or [],
					'muscles': session.muscles or session_metadata.get('muscles') or [],
					'body_map_side': session_metadata.get('body_map_side') or 'front',
					'cardio': bool(session_metadata.get('cardio', False)),
					'exercise_count': session_metadata.get('exercise_count'),
					'exercises': session_metadata.get('exercises') or [],
					'mode': session.workout_type or session_metadata.get('mode'),
					'modes': session.modes or session_metadata.get('modes') or [],
					'focus_label': session.focus_label or session_metadata.get('focus_label') or '',
					'intensity': session.intensity or session_metadata.get('intensity') or '',
					'feeling': session_metadata.get('feeling') or '',
					'notes': session.notes or session_metadata.get('notes') or '',
					'caption': session.caption or session_metadata.get('caption') or '',
					'image_url': session.image_url or session_metadata.get('image_url') or '',
					'pr': session.pr_note or session_metadata.get('pr') or '',
				}
			)
		try:
			score_record = session.score_record
		except ObjectDoesNotExist:
			score_record = None
		if score_record is not None:
			activity_metadata.update(
				{
					'activity_xp': score_record.activity_xp,
					'leaderboard_xp': score_record.leaderboard_xp,
					'challenge_points': score_record.challenge_points,
					'frontend_summary': {
						'title': title,
						'duration_minutes': session.duration_minutes,
						'intensity': session.intensity,
						'focus': session.focus_label or session.workout_type.title(),
						'xp': score_record.activity_xp,
						'challenge_badge': 'Challenge' if score_record.challenge_points else None,
					},
				}
			)
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
				metadata=activity_metadata,
				occurred_at=occurred_at,
			)
		else:
			activity.title = title
			activity.description = description
			activity.score = session.duration_minutes
			activity.metadata = activity_metadata
			activity.occurred_at = occurred_at
			activity.save(update_fields=['title', 'description', 'score', 'metadata', 'occurred_at'])

	for completion in UserChallengeCompletion.objects.filter(
		user=user,
		completed_at__gte=week_start,
	).select_related('challenge').order_by('-completed_at', '-id'):
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
	following = list(
		UserFollow.objects.filter(
			follower=user,
			status=UserFollow.STATUS_ACTIVE,
		).values_list('following_id', flat=True)
	)
	return list(dict.fromkeys([user.id, *accepted_friend_user_ids(user), *following]))
