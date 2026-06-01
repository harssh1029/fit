from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.core.signing import BadSignature, TimestampSigner
from django.db.models import Count, Exists, F, OuterRef, Q
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
	ActivityComment,
	ActivityLike,
	ActivitySave,
	ActivityShare,
	CommunityActivity,
	CommunityGroup,
	ContactSyncInvite,
	Friendship,
	GroupAnnouncement,
	GroupChallenge,
	GroupInvite,
	GroupMembership,
	UserFollow,
	UserPublicCard,
)
from .serializers import (
	ActivityCommentSerializer,
	CommunityActivitySerializer,
	CommunityGroupSerializer,
	GroupAnnouncementSerializer,
	GroupChallengeProgressSerializer,
	GroupChallengeSerializer,
	GroupMembershipSerializer,
	UserPublicCardSerializer,
	UserSuggestionSerializer,
)
from .services import (
	create_friendship,
	ensure_public_card,
	ensure_public_cards,
	get_friend_cards,
	get_public_card,
	remove_friendship,
)
from workouts.models import WorkoutSession
from achievements.services import evaluate_group_achievements
from challenges.services import challenge_sections_for_user


User = get_user_model()


LEADERBOARD_SORTS = {
	'overall': '-overall_score',
	'consistent': '-consistency_score',
	'balanced': '-body_balance_percent',
	'challenges': '-challenges_completed',
	'active': '-recent_sessions_this_week',
}

GROUP_INVITE_SALT = 'community.group.invite'
GROUP_INVITE_MAX_AGE = 60 * 60 * 24 * 30


def _display_name(user) -> str:
	try:
		profile = user.profile
	except ObjectDoesNotExist:
		profile = None
	return getattr(profile, 'display_name', '') or user.get_full_name() or user.get_username()


def _avatar_url(user) -> str:
	try:
		profile = user.profile
	except ObjectDoesNotExist:
		return ''
	return getattr(profile, 'avatar_url', '') or ''


def _group_invite_token(group: CommunityGroup) -> str:
	return TimestampSigner(salt=GROUP_INVITE_SALT).sign(str(group.id))


def _valid_group_invite_token(group: CommunityGroup, token: str) -> bool:
	if not token:
		return False
	try:
		value = TimestampSigner(salt=GROUP_INVITE_SALT).unsign(token, max_age=GROUP_INVITE_MAX_AGE)
	except BadSignature:
		return False
	return str(value) == str(group.id)


def _group_invite_link(request, group: CommunityGroup) -> dict:
	token = _group_invite_token(group)
	deep_link = f'fit://groups/{group.id}?invite={token}'
	web_link = request.build_absolute_uri(f'/groups/{group.id}?invite={token}')
	return {'token': token, 'url': web_link, 'appUrl': deep_link}


def _time_ago(value) -> str:
	now = timezone.now()
	diff = max(timedelta(seconds=0), now - value)
	minutes = int(diff.total_seconds() // 60)
	if minutes < 1:
		return 'Just now'
	if minutes < 60:
		return f'{minutes}m ago'
	hours = minutes // 60
	if hours < 24:
		return f'{hours}h ago'
	return 'Today'


def _recency_score(value) -> int:
	diff = timezone.now() - value
	minutes = diff.total_seconds() / 60
	if minutes < 30:
		return 30
	if minutes < 120:
		return 20
	if minutes < 360:
		return 10
	return 5


def _activity_event_type(activity: CommunityActivity) -> str:
	if activity.activity_type == CommunityActivity.ACTIVITY_CHALLENGE:
		metadata = activity.metadata if isinstance(activity.metadata, dict) else {}
		return str(metadata.get('event_type') or 'challenge_completed')
	if activity.activity_type == CommunityActivity.ACTIVITY_PLAN:
		return 'plan_completed'
	if activity.activity_type == CommunityActivity.ACTIVITY_TEST:
		return 'badge_earned'
	if activity.activity_type == CommunityActivity.ACTIVITY_BADGE:
		return 'badge_earned'
	if activity.activity_type == CommunityActivity.ACTIVITY_GROUP:
		metadata = activity.metadata if isinstance(activity.metadata, dict) else {}
		return str(metadata.get('event_type') or 'group_joined')
	return 'workout_completed'


def _activity_subtitle(metadata: dict) -> str:
	parts = []
	focus = metadata.get('focus_label') or metadata.get('focus')
	intensity = metadata.get('intensity')
	if focus:
		parts.append(str(focus))
	if intensity:
		parts.append(str(intensity).replace('_', ' ').title())
	return ' • '.join(parts)


def _member_group_ids(user) -> list[int]:
	return list(
		GroupMembership.objects.filter(
			user=user,
			status=GroupMembership.STATUS_ACTIVE,
		).values_list('group_id', flat=True)
	)


def _visible_feed_activities(user):
	group_ids = _member_group_ids(user)
	group_member_ids = GroupMembership.objects.filter(
			group_id__in=group_ids,
			status=GroupMembership.STATUS_ACTIVE,
		).values('user_id')
	following_ids = UserFollow.objects.filter(
		follower=user,
		status=UserFollow.STATUS_ACTIVE,
	).values('following_id')
	friend_ids_from = Friendship.objects.filter(
		from_user=user,
		status=Friendship.STATUS_ACCEPTED,
	).values('to_user_id')
	friend_ids_to = Friendship.objects.filter(
		to_user=user,
		status=Friendship.STATUS_ACCEPTED,
	).values('from_user_id')
	return CommunityActivity.objects.filter(
		Q(user=user)
		| Q(user_id__in=following_ids)
		| Q(user_id__in=friend_ids_from)
		| Q(user_id__in=friend_ids_to)
		| Q(user_id__in=group_member_ids)
	).filter(
		Q(metadata__group_id__isnull=True) | Q(metadata__group_id__in=group_ids)
	)


def _with_activity_engagement(queryset, user):
	return queryset.annotate(
		likes_count=Count('likes', distinct=True),
		comments_count=Count('comments', distinct=True),
		shares_count=Count('shares', distinct=True),
		liked_by_me=Exists(
			ActivityLike.objects.filter(activity_id=OuterRef('pk'), user=user)
		),
		saved_by_me=Exists(
			ActivitySave.objects.filter(activity_id=OuterRef('pk'), user=user)
		),
	)


class CommunitySummaryView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		user = request.user
		card = get_public_card(user)
		friend_cards = get_friend_cards(user)
		week_start = timezone.now() - timedelta(days=7)
		activities = _visible_feed_activities(user).filter(
			occurred_at__gte=week_start,
		).select_related('user', 'user__profile')
		activities = _with_activity_engagement(activities, user).order_by('-occurred_at', '-id')[:100]
		return Response(
			{
				'public_card': UserPublicCardSerializer(card).data,
				'friends': UserPublicCardSerializer(friend_cards, many=True).data,
				'recent_activity': CommunityActivitySerializer(
					activities,
					many=True,
					context={'request': request},
				).data,
			}
		)


class FriendListView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		cards = get_friend_cards(request.user)
		return Response(UserPublicCardSerializer(cards, many=True).data)


class UserSearchView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		query = request.query_params.get('q', '').strip()
		limit = min(int(request.query_params.get('limit', 20)), 50)
		users = User.objects.exclude(id=request.user.id).select_related('profile')
		if query:
			users = users.filter(
				Q(username__icontains=query)
				| Q(email__icontains=query)
				| Q(profile__display_name__icontains=query)
				| Q(first_name__icontains=query)
				| Q(last_name__icontains=query)
			)
		else:
			users = users.order_by('-date_joined')
		users = users[:limit]
		ensure_public_cards(users)
		return Response(UserSuggestionSerializer(users, many=True, context={'request': request}).data)


class AddFriendView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, *args, **kwargs):
		user_id = request.data.get('user_id')
		if not user_id:
			return Response({'detail': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
		try:
			other_user = User.objects.get(id=user_id)
			create_friendship(request.user, other_user)
		except User.DoesNotExist:
			return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
		except ValueError as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
		return Response({'status': 'accepted'}, status=status.HTTP_201_CREATED)


class RemoveFriendView(APIView):
	permission_classes = [IsAuthenticated]

	def delete(self, request, user_id: int, *args, **kwargs):
		try:
			other_user = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response(status=status.HTTP_204_NO_CONTENT)
		remove_friendship(request.user, other_user)
		return Response(status=status.HTTP_204_NO_CONTENT)


class ContactSyncView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, *args, **kwargs):
		raw_contacts = request.data.get('contacts', [])
		if not isinstance(raw_contacts, list):
			return Response({'detail': 'contacts must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

		identifiers = [
			str(item).strip().lower()
			for item in raw_contacts
			if str(item).strip()
		]
		for identifier in identifiers:
			ContactSyncInvite.objects.get_or_create(
				user=request.user,
				identifier=identifier,
				defaults={'source': 'contacts'},
			)

		matches = User.objects.exclude(id=request.user.id).filter(
			Q(email__in=identifiers) | Q(username__in=identifiers)
		).select_related('profile')[:50]
		ensure_public_cards(matches)
		matched_emails = {user.email.lower() for user in matches if user.email}
		matched_usernames = {user.username.lower() for user in matches if user.username}
		invites = [
			identifier
			for identifier in identifiers
			if identifier not in matched_emails and identifier not in matched_usernames
		]
		return Response(
			{
				'suggestions': UserSuggestionSerializer(matches, many=True, context={'request': request}).data,
				'invites': invites,
				'invite_link': 'https://fit-app.local/invite',
			}
		)


class LeaderboardView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		metric = request.query_params.get('metric', 'overall')
		scope = request.query_params.get('scope', 'global')
		group_id = request.query_params.get('group_id')
		sort_field = LEADERBOARD_SORTS.get(metric, LEADERBOARD_SORTS['overall'])
		limit = min(int(request.query_params.get('limit', 100)), 100)
		get_public_card(request.user)
		ensure_public_cards(User.objects.filter(public_card__isnull=True)[:100])

		all_cards = UserPublicCard.objects.select_related(
			'user',
			'user__profile',
			'user__achievement_level',
		)
		selected_group = None
		if scope == 'following':
			user_ids = list(
				UserFollow.objects.filter(
					follower=request.user,
					status=UserFollow.STATUS_ACTIVE,
				).values_list('following_id', flat=True)
			)
			user_ids = list(dict.fromkeys([request.user.id, *user_ids]))
			all_cards = all_cards.filter(user_id__in=user_ids)
		elif scope == 'group' and group_id:
			selected_group = CommunityGroup.objects.filter(
				Q(privacy=CommunityGroup.PRIVACY_PUBLIC)
				| Q(memberships__user=request.user, memberships__status=GroupMembership.STATUS_ACTIVE),
				id=group_id,
			).distinct().first()
			if selected_group is not None:
				all_cards = all_cards.filter(
					user_id__in=selected_group.memberships.filter(
						status=GroupMembership.STATUS_ACTIVE,
					).values_list('user_id', flat=True)
				)
			else:
				all_cards = all_cards.none()
		elif scope == 'location':
			try:
				timezone_name = request.user.profile.timezone
			except ObjectDoesNotExist:
				timezone_name = ''
			if timezone_name:
				all_cards = all_cards.filter(user__profile__timezone=timezone_name)
		else:
			scope = 'global'

		all_cards = all_cards.order_by(sort_field, 'display_name', 'id')
		top_cards = list(all_cards[:limit])
		user_card = get_public_card(request.user)
		user_rank = None
		for index, card in enumerate(all_cards, start=1):
			if card.user_id == request.user.id:
				user_rank = index
				break

		return Response(
			{
				'metric': metric,
				'scope': scope,
				'selected_group': CommunityGroupSerializer(selected_group, context={'request': request}).data if selected_group else None,
				'limit': limit,
				'user_rank': user_rank,
				'user_card': UserPublicCardSerializer(user_card).data,
				'results': UserPublicCardSerializer(top_cards, many=True).data,
			}
		)


class ActivityFeedView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		feed_filter = request.query_params.get('filter', 'recent')
		limit = min(int(request.query_params.get('limit', 50)), 100)
		week_start = timezone.now() - timedelta(days=7)
		activities = _visible_feed_activities(request.user).filter(
			occurred_at__gte=week_start,
		).select_related('user', 'user__profile')
		activities = _with_activity_engagement(activities, request.user).order_by('-occurred_at', '-id')
		if feed_filter in {'workout', 'challenge', 'plan', 'test'}:
			activities = activities.filter(activity_type=feed_filter)
		elif feed_filter == 'friends':
			activities = activities.exclude(user=request.user)
		elif feed_filter == 'consistency':
			activities = activities.order_by('-score', '-occurred_at')

		return Response(
			CommunityActivitySerializer(
				activities[:limit],
				many=True,
				context={'request': request},
			).data
		)


class TodayActivityView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		following_ids = list(
			UserFollow.objects.filter(
				follower=request.user,
				status=UserFollow.STATUS_ACTIVE,
			).values_list('following_id', flat=True)
		)
		if not following_ids:
			return Response([])

		tz = timezone.get_current_timezone()
		today = timezone.localdate()
		start = timezone.make_aware(datetime.combine(today, time.min), tz)
		end = start + timedelta(days=1)
		updates = []

		activities = CommunityActivity.objects.filter(
			user_id__in=following_ids,
			occurred_at__gte=start,
			occurred_at__lt=end,
		).select_related('user', 'user__profile').annotate(
			likes_count=Count('likes', distinct=True),
			comments_count=Count('comments', distinct=True),
		)
		for activity in activities:
			metadata = activity.metadata if isinstance(activity.metadata, dict) else {}
			event_type = _activity_event_type(activity)
			event_weight = {
				'workout_started': 50,
				'badge_earned': 40,
				'challenge_completed': 35,
				'plan_completed': 35,
				'streak_reached': 30,
				'rank_moved': 25,
				'pr_logged': 25,
				'workout_completed': 20,
				'challenge_joined': 15,
				'group_joined': 10,
			}.get(event_type, 20)
			engagement_score = min(
				15,
				((getattr(activity, 'likes_count', 0) or 0) + (getattr(activity, 'comments_count', 0) or 0) * 2) * 5,
			)
			updates.append(
				{
					'id': f'activity-{activity.id}',
					'user': {
						'id': activity.user_id,
						'name': _display_name(activity.user),
						'avatar_url': _avatar_url(activity.user),
					},
					'type': event_type,
					'title': str(metadata.get('title') or activity.title or 'Workout completed'),
					'subtitle': _activity_subtitle(metadata),
					'time_ago': _time_ago(activity.occurred_at),
					'created_at': activity.occurred_at.isoformat(),
					'is_live': False,
					'live_duration_seconds': None,
					'priority_score': event_weight + _recency_score(activity.occurred_at) + 10 + engagement_score,
				}
			)

		live_sessions = WorkoutSession.objects.filter(
			user_id__in=following_ids,
			status='in_progress',
			started_at__gte=start,
			started_at__lt=end,
			is_public=True,
		).select_related('user', 'user__profile')
		now = timezone.now()
		for session in live_sessions:
			metadata = session.metadata if isinstance(session.metadata, dict) else {}
			duration_seconds = max(0, int((now - session.started_at).total_seconds()))
			focus = session.focus_label or metadata.get('focus_label') or session.workout_type
			intensity = session.intensity or metadata.get('intensity')
			subtitle = ' • '.join(
				str(part).replace('_', ' ').title()
				for part in [focus, intensity]
				if part
			)
			updates.append(
				{
					'id': f'live-{session.id}',
					'user': {
						'id': session.user_id,
						'name': _display_name(session.user),
						'avatar_url': _avatar_url(session.user),
					},
					'type': 'workout_started',
					'title': session.title or str(metadata.get('title') or 'Training now'),
					'subtitle': subtitle,
					'time_ago': _time_ago(session.started_at),
					'created_at': session.started_at.isoformat(),
					'is_live': True,
					'live_duration_seconds': duration_seconds,
					'priority_score': 50 + _recency_score(session.started_at) + 10,
				}
			)

		updates.sort(key=lambda item: (item['priority_score'], item['created_at']), reverse=True)
		return Response(updates[:20])


class ActivityLikeView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, activity_id: int, *args, **kwargs):
		activity = CommunityActivity.objects.filter(id=activity_id).first()
		if activity is None:
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _can_view_activity(activity, request.user):
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		ActivityLike.objects.get_or_create(activity=activity, user=request.user)
		return Response({'liked': True, 'likesCount': activity.likes.count()}, status=status.HTTP_200_OK)

	def delete(self, request, activity_id: int, *args, **kwargs):
		activity = CommunityActivity.objects.filter(id=activity_id).first()
		if activity is None:
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _can_view_activity(activity, request.user):
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		ActivityLike.objects.filter(activity_id=activity_id, user=request.user).delete()
		count = ActivityLike.objects.filter(activity_id=activity_id).count()
		return Response({'liked': False, 'likesCount': count}, status=status.HTTP_200_OK)


class ActivityCommentsView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, activity_id: int, *args, **kwargs):
		activity = CommunityActivity.objects.filter(id=activity_id).first()
		if activity is None or not _can_view_activity(activity, request.user):
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		comments = ActivityComment.objects.filter(activity=activity).select_related('user', 'user__profile')
		return Response(ActivityCommentSerializer(comments, many=True).data)

	def post(self, request, activity_id: int, *args, **kwargs):
		activity = CommunityActivity.objects.filter(id=activity_id).first()
		if activity is None:
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _can_view_activity(activity, request.user):
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		body = str(request.data.get('body') or '').strip()
		if not body:
			return Response({'detail': 'body is required.'}, status=status.HTTP_400_BAD_REQUEST)
		comment = ActivityComment.objects.create(activity=activity, user=request.user, body=body[:1000])
		return Response(ActivityCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class ActivityCommentDetailView(APIView):
	permission_classes = [IsAuthenticated]

	def _get_comment(self, activity_id: int, comment_id: int, user):
		comment = (
			ActivityComment.objects.filter(id=comment_id, activity_id=activity_id)
			.select_related('activity', 'user', 'user__profile')
			.first()
		)
		if comment is None or not _can_view_activity(comment.activity, user):
			return None
		return comment

	def patch(self, request, activity_id: int, comment_id: int, *args, **kwargs):
		comment = self._get_comment(activity_id, comment_id, request.user)
		if comment is None:
			return Response({'detail': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)
		if comment.user_id != request.user.id and not request.user.is_staff:
			return Response({'detail': 'Only the comment owner can edit this comment.'}, status=status.HTTP_403_FORBIDDEN)
		body = str(request.data.get('body') or '').strip()
		if not body:
			return Response({'detail': 'body is required.'}, status=status.HTTP_400_BAD_REQUEST)
		comment.body = body[:1000]
		comment.save(update_fields=['body', 'updated_at'])
		return Response(ActivityCommentSerializer(comment).data)

	def delete(self, request, activity_id: int, comment_id: int, *args, **kwargs):
		comment = self._get_comment(activity_id, comment_id, request.user)
		if comment is None:
			return Response(status=status.HTTP_204_NO_CONTENT)
		if comment.user_id != request.user.id and not request.user.is_staff:
			return Response({'detail': 'Only the comment owner can delete this comment.'}, status=status.HTTP_403_FORBIDDEN)
		comment.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


class ActivityShareView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, activity_id: int, *args, **kwargs):
		activity = CommunityActivity.objects.filter(id=activity_id).first()
		if activity is None:
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _can_view_activity(activity, request.user):
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		ActivityShare.objects.create(activity=activity, user=request.user)
		return Response({'shared': True, 'shareCount': activity.shares.count()}, status=status.HTTP_201_CREATED)


class ActivitySaveView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, activity_id: int, *args, **kwargs):
		activity = CommunityActivity.objects.filter(id=activity_id).first()
		if activity is None or not _can_view_activity(activity, request.user):
			return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
		ActivitySave.objects.get_or_create(activity=activity, user=request.user)
		return Response({'saved': True}, status=status.HTTP_200_OK)

	def delete(self, request, activity_id: int, *args, **kwargs):
		ActivitySave.objects.filter(activity_id=activity_id, user=request.user).delete()
		return Response({'saved': False}, status=status.HTTP_200_OK)


class SavedActivityListView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		try:
			limit = min(max(int(request.query_params.get('limit', 30)), 1), 50)
		except (TypeError, ValueError):
			limit = 30
		try:
			before = int(request.query_params.get('before', '0')) or None
		except (TypeError, ValueError):
			before = None

		visible_activity_ids = _visible_feed_activities(request.user).values('id')
		saves = ActivitySave.objects.filter(
			user=request.user,
			activity_id__in=visible_activity_ids,
		)
		if before is not None:
			saves = saves.filter(id__lt=before)
		saves = list(saves.order_by('-created_at', '-id')[:limit + 1])
		page = saves[:limit]
		activities = _with_activity_engagement(
			CommunityActivity.objects.filter(id__in=[save.activity_id for save in page])
			.select_related('user', 'user__profile'),
			request.user,
		)
		activities_by_id = {activity.id: activity for activity in activities}
		results = [
			activities_by_id[save.activity_id]
			for save in page
			if save.activity_id in activities_by_id
		]
		return Response(
			{
				'results': CommunityActivitySerializer(
					results,
					many=True,
					context={'request': request},
				).data,
				'nextCursor': page[-1].id if len(saves) > limit and page else None,
			}
		)


def _activity_group_id(activity: CommunityActivity):
	metadata = activity.metadata if isinstance(activity.metadata, dict) else {}
	group_id = metadata.get('group_id')
	try:
		return int(group_id) if group_id is not None else None
	except (TypeError, ValueError):
		return None


def _is_group_member(group: CommunityGroup, user) -> bool:
	return GroupMembership.objects.filter(
		group=group,
		user=user,
		status=GroupMembership.STATUS_ACTIVE,
	).exists()


def _can_view_activity(activity: CommunityActivity, user) -> bool:
	group_id = _activity_group_id(activity)
	if group_id is not None:
		return GroupMembership.objects.filter(
			group_id=group_id,
			user=user,
			status=GroupMembership.STATUS_ACTIVE,
		).exists()
	if GroupMembership.objects.filter(
		user=user,
		status=GroupMembership.STATUS_ACTIVE,
		group__memberships__user_id=activity.user_id,
		group__memberships__status=GroupMembership.STATUS_ACTIVE,
	).exists():
		return True
	return _visible_feed_activities(user).filter(id=activity.id).exists()


def _is_group_admin(group: CommunityGroup, user) -> bool:
	return GroupMembership.objects.filter(
		group=group,
		user=user,
		status=GroupMembership.STATUS_ACTIVE,
		role__in=[GroupMembership.ROLE_OWNER, GroupMembership.ROLE_ADMIN],
	).exists()


def _is_group_owner(group: CommunityGroup, user) -> bool:
	return group.owner_id == user.id or GroupMembership.objects.filter(
		group=group,
		user=user,
		status=GroupMembership.STATUS_ACTIVE,
		role=GroupMembership.ROLE_OWNER,
	).exists()


def _refresh_group_count(group: CommunityGroup, *, persist: bool = True, member_ids=None) -> None:
	count = len(member_ids) if member_ids is not None else group.memberships.filter(status=GroupMembership.STATUS_ACTIVE).count()
	if group.member_count != count:
		group.member_count = count
		if persist:
			group.save(update_fields=['member_count', 'updated_at'])


def _refresh_group_metrics(group: CommunityGroup, *, persist: bool = True, member_ids=None) -> None:
	today = timezone.localdate()
	week_start = today - timedelta(days=today.weekday())
	if member_ids is None:
		member_ids = list(group.memberships.filter(status=GroupMembership.STATUS_ACTIVE).values_list('user_id', flat=True))
	weekly_activity = WorkoutSession.objects.filter(
		user_id__in=member_ids,
		status='completed',
		completed_at__date__gte=week_start,
	).count() if member_ids else 0
	active_challenge = group.challenges.filter(start_date__lte=today, end_date__gte=today).order_by('-start_date').first()
	active_challenge_title = active_challenge.title if active_challenge else ''
	if (
		group.weekly_activity_count != weekly_activity
		or group.active_challenge_title != active_challenge_title
	):
		group.weekly_activity_count = weekly_activity
		group.active_challenge_title = active_challenge_title
		if persist:
			group.save(update_fields=['weekly_activity_count', 'active_challenge_title', 'updated_at'])


def _group_leaderboard_payload(group: CommunityGroup, user, *, limit: int = 10, member_ids=None) -> dict:
	today = timezone.localdate()
	week_start = today - timedelta(days=today.weekday())
	start_dt = timezone.make_aware(datetime.combine(week_start, time.min))
	rows = (
		WorkoutSession.objects.filter(
			user_id__in=member_ids
			if member_ids is not None
			else group.memberships.filter(status=GroupMembership.STATUS_ACTIVE).values_list('user_id', flat=True),
			status='completed',
			completed_at__gte=start_dt,
		)
		.values('user_id', 'user__profile__display_name', 'user__username')
		.annotate(workouts=Count('id'))
		.order_by('-workouts', 'user_id')
	)
	results = []
	for index, row in enumerate(rows, start=1):
		results.append(
			{
				'rank': index,
				'userId': row['user_id'],
				'name': row['user__profile__display_name'] or row['user__username'],
				'score': row['workouts'],
				'isYou': row['user_id'] == user.id,
			}
		)
	top = results[:limit]
	user_rank = next((item for item in results if item['userId'] == user.id), None)
	neighborhood = []
	if user_rank and user_rank['rank'] > limit:
		start = max(0, user_rank['rank'] - 2)
		neighborhood = results[start:start + 3]
	return {'top': top, 'userRank': user_rank, 'neighborhood': neighborhood}


def _group_feed_payload(group: CommunityGroup, request, *, limit: int = 20, member_ids=None) -> dict:
	if member_ids is None:
		member_ids = list(
			group.memberships.filter(status=GroupMembership.STATUS_ACTIVE).values_list('user_id', flat=True)
		)
	week_start = timezone.now() - timedelta(days=14)
	member_activity = CommunityActivity.objects.filter(
		user_id__in=member_ids,
		activity_type__in=[
			CommunityActivity.ACTIVITY_WORKOUT,
			CommunityActivity.ACTIVITY_CHALLENGE,
			CommunityActivity.ACTIVITY_PLAN,
			CommunityActivity.ACTIVITY_BADGE,
		],
		occurred_at__gte=week_start,
	).select_related('user', 'user__profile')
	member_activity = _with_activity_engagement(member_activity, request.user).order_by('-occurred_at', '-id')[:limit]

	group_posts = CommunityActivity.objects.filter(
		activity_type=CommunityActivity.ACTIVITY_GROUP,
		metadata__group_id=group.id,
	).select_related('user', 'user__profile')
	group_posts = list(_with_activity_engagement(group_posts, request.user).order_by('-occurred_at', '-id')[:80])

	def by_kind(*kinds):
		return [item for item in group_posts if (item.metadata if isinstance(item.metadata, dict) else {}).get('kind') in kinds]

	context = {'request': request}
	return {
		'memberActivity': CommunityActivitySerializer(member_activity, many=True, context=context).data,
		'threads': CommunityActivitySerializer(by_kind('thread', 'post'), many=True, context=context).data[:limit],
		'events': CommunityActivitySerializer(by_kind('event'), many=True, context=context).data[:limit],
		'notifications': CommunityActivitySerializer(by_kind('notification', 'admin_post'), many=True, context=context).data[:limit],
	}


def _group_join_requests_payload(group: CommunityGroup) -> list[dict]:
	requests = GroupInvite.objects.filter(
		group=group,
		status=GroupInvite.STATUS_PENDING,
		invited_by_id=F('invitee_id'),
	).select_related('invitee', 'invitee__profile')
	payload = []
	for invite in requests:
		payload.append(
			{
				'id': invite.id,
				'userId': invite.invitee_id,
				'userName': _display_name(invite.invitee),
				'avatarInitials': ''.join(part[0] for part in _display_name(invite.invitee).split()[:2]).upper() or 'U',
				'createdAt': invite.created_at.isoformat(),
			}
		)
	return payload


class CommunityOverviewView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		today_view = TodayActivityView()
		today_view.request = request
		today = TodayActivityView.get(today_view, request).data
		groups = CommunityGroup.objects.filter(
			Q(privacy=CommunityGroup.PRIVACY_PUBLIC)
			| Q(memberships__user=request.user, memberships__status=GroupMembership.STATUS_ACTIVE)
		).distinct()[:10]
		for group in groups:
			_refresh_group_count(group, persist=False)
			_refresh_group_metrics(group, persist=False)
		return Response(
			{
				'todayActivity': today,
				'groups': CommunityGroupSerializer(groups, many=True, context={'request': request}).data,
				'challenges': challenge_sections_for_user(request.user),
			}
		)


class GroupListCreateView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		groups = CommunityGroup.objects.filter(
			Q(privacy=CommunityGroup.PRIVACY_PUBLIC)
			| Q(memberships__user=request.user, memberships__status=GroupMembership.STATUS_ACTIVE)
		).distinct().prefetch_related('memberships')
		for group in groups:
			_refresh_group_count(group, persist=False)
			_refresh_group_metrics(group, persist=False)
		return Response(CommunityGroupSerializer(groups, many=True, context={'request': request}).data)

	def post(self, request, *args, **kwargs):
		name = str(request.data.get('name') or '').strip()
		if not name:
			return Response({'detail': 'name is required.'}, status=status.HTTP_400_BAD_REQUEST)
		group = CommunityGroup.objects.create(
			name=name[:255],
			description=str(request.data.get('description') or '').strip(),
			category=str(request.data.get('category') or request.data.get('group_type') or 'Open').strip()[:64],
			group_type=str(request.data.get('group_type') or request.data.get('type') or 'open').strip().lower(),
			privacy=str(request.data.get('privacy') or CommunityGroup.PRIVACY_PUBLIC).strip().lower()
			if str(request.data.get('privacy') or '').strip().lower() in {CommunityGroup.PRIVACY_PUBLIC, CommunityGroup.PRIVACY_PRIVATE, CommunityGroup.PRIVACY_INVITE_ONLY}
			else CommunityGroup.PRIVACY_PUBLIC,
			goal=str(request.data.get('goal') or 'accountability').strip().lower(),
			cover_image_url=str(request.data.get('cover_image_url') or request.data.get('image') or '').strip(),
			weekly_goal_target=int(request.data.get('weekly_goal_target') or 300),
			owner=request.user,
		)
		GroupMembership.objects.create(
			group=group,
			user=request.user,
			role=GroupMembership.ROLE_OWNER,
			status=GroupMembership.STATUS_ACTIVE,
		)
		_refresh_group_count(group)
		evaluate_group_achievements(
			request.user,
			context={
				'group_id': group.id,
				'group_joined_count': GroupMembership.objects.filter(user=request.user, status=GroupMembership.STATUS_ACTIVE).count(),
				'created_group_members': group.member_count,
			},
		)
		return Response(CommunityGroupSerializer(group, context={'request': request}).data, status=status.HTTP_201_CREATED)


class GroupDetailView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		membership = GroupMembership.objects.filter(
			group=group,
			user=request.user,
			status=GroupMembership.STATUS_ACTIVE,
		).first()
		is_member = membership is not None
		setattr(group, f'_request_membership_{request.user.id}', membership)
		pending_request = GroupInvite.objects.filter(
			group=group,
			invitee=request.user,
			invited_by=request.user,
			status=GroupInvite.STATUS_PENDING,
		).exists()
		member_ids = list(
			group.memberships.filter(status=GroupMembership.STATUS_ACTIVE).values_list('user_id', flat=True)
		)
		_refresh_group_count(group, persist=False, member_ids=member_ids)
		_refresh_group_metrics(group, persist=False, member_ids=member_ids)
		activities = CommunityActivity.objects.none()
		if is_member:
			activities = CommunityActivity.objects.filter(
				user_id__in=member_ids,
				occurred_at__gte=timezone.now() - timedelta(days=7),
			).select_related('user', 'user__profile')
			activities = _with_activity_engagement(activities, request.user)[:8]
		pinned = group.announcements.filter(is_pinned=True).first()
		payload = CommunityGroupSerializer(group, context={'request': request}).data
		group_feed = _group_feed_payload(group, request, member_ids=member_ids) if is_member else {
			'memberActivity': [],
			'threads': [],
			'events': [],
			'notifications': [],
		}
		payload.update(
			{
				'pulse': CommunityActivitySerializer(activities, many=True, context={'request': request}).data,
				**group_feed,
				'weeklyGoal': {
					'target': group.weekly_goal_target,
					'current': group.weekly_activity_count,
					'percent': min(100, round((group.weekly_activity_count / max(1, group.weekly_goal_target)) * 100)),
				},
				'activeChallenges': GroupChallengeSerializer(group.challenges.filter(start_date__lte=timezone.localdate(), end_date__gte=timezone.localdate()), many=True).data if is_member else [],
				'leaderboard': _group_leaderboard_payload(group, request.user, member_ids=member_ids) if is_member else {'top': [], 'userRank': None, 'neighborhood': []},
				'pinnedAnnouncement': GroupAnnouncementSerializer(pinned).data if pinned and is_member else None,
				'pendingRequest': pending_request,
				'joinRequests': _group_join_requests_payload(group)
				if membership and membership.role in [GroupMembership.ROLE_OWNER, GroupMembership.ROLE_ADMIN]
				else [],
			}
		)
		return Response(payload)

	def patch(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _is_group_admin(group, request.user):
			return Response({'detail': 'Only group admins can edit this group.'}, status=status.HTTP_403_FORBIDDEN)
		for field in ['name', 'description', 'category', 'privacy', 'group_type', 'goal', 'cover_image_url', 'weekly_goal_target']:
			if field in request.data:
				setattr(group, field, str(request.data.get(field) or '').strip())
		if group.privacy not in {CommunityGroup.PRIVACY_PUBLIC, CommunityGroup.PRIVACY_PRIVATE, CommunityGroup.PRIVACY_INVITE_ONLY}:
			group.privacy = CommunityGroup.PRIVACY_PUBLIC
		group.save()
		return Response(CommunityGroupSerializer(group, context={'request': request}).data)

	def delete(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response(status=status.HTTP_204_NO_CONTENT)
		if not _is_group_owner(group, request.user):
			return Response({'detail': 'Only group owners can delete this group.'}, status=status.HTTP_403_FORBIDDEN)
		group.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


class GroupJoinLeaveView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, group_id: int, action: str, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if action == 'join':
			if group.privacy in {CommunityGroup.PRIVACY_PRIVATE, CommunityGroup.PRIVACY_INVITE_ONLY}:
				invite_token = str(request.data.get('invite_token') or request.data.get('inviteToken') or '').strip()
				has_valid_invite_link = _valid_group_invite_token(group, invite_token)
				invite = GroupInvite.objects.filter(group=group, invitee=request.user, status=GroupInvite.STATUS_PENDING).first()
				if invite is None and group.owner_id != request.user.id and not has_valid_invite_link:
					invite = GroupInvite.objects.create(
						group=group,
						invitee=request.user,
						invited_by=request.user,
						status=GroupInvite.STATUS_PENDING,
					)
					return Response({'requested': True, 'id': invite.id, 'status': invite.status}, status=status.HTTP_202_ACCEPTED)
				if invite is not None:
					if invite.invited_by_id == request.user.id and group.owner_id != request.user.id and not has_valid_invite_link:
						return Response({'requested': True, 'id': invite.id, 'status': invite.status}, status=status.HTTP_202_ACCEPTED)
					invite.status = GroupInvite.STATUS_ACCEPTED
					invite.save(update_fields=['status', 'updated_at'])
			GroupMembership.objects.update_or_create(
				group=group,
				user=request.user,
				defaults={'status': GroupMembership.STATUS_ACTIVE, 'role': GroupMembership.ROLE_MEMBER},
			)
			_refresh_group_count(group)
			evaluate_group_achievements(
				request.user,
				context={
					'group_id': group.id,
					'group_joined_count': GroupMembership.objects.filter(user=request.user, status=GroupMembership.STATUS_ACTIVE).count(),
				},
			)
			CommunityActivity.objects.update_or_create(
				user=request.user,
				activity_type=CommunityActivity.ACTIVITY_GROUP,
				metadata__source_id=f'group_join:{group.id}:{request.user.id}',
				defaults={
					'title': group.name,
					'description': 'Joined group',
					'metadata': {'source_id': f'group_join:{group.id}:{request.user.id}', 'event_type': 'group_joined'},
					'occurred_at': timezone.now(),
				},
			)
			return Response(CommunityGroupSerializer(group, context={'request': request}).data)
		if action == 'leave':
			GroupMembership.objects.filter(group=group, user=request.user).delete()
			_refresh_group_count(group)
			return Response(status=status.HTTP_204_NO_CONTENT)
		return Response({'detail': 'Unsupported group action.'}, status=status.HTTP_400_BAD_REQUEST)


class GroupMembersView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		is_member = GroupMembership.objects.filter(group=group, user=request.user, status=GroupMembership.STATUS_ACTIVE).exists()
		if group.privacy == CommunityGroup.PRIVACY_PRIVATE and not is_member:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		memberships = group.memberships.filter(status=GroupMembership.STATUS_ACTIVE).select_related('user', 'user__profile')
		return Response(GroupMembershipSerializer(memberships, many=True).data)


class GroupInviteView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _is_group_member(group, request.user):
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		return Response(_group_invite_link(request, group))

	def post(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _is_group_admin(group, request.user):
			return Response({'detail': 'Only group admins can invite members.'}, status=status.HTTP_403_FORBIDDEN)
		user_id = request.data.get('user_id')
		try:
			invitee = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
		invite, _ = GroupInvite.objects.update_or_create(
			group=group,
			invitee=invitee,
			defaults={'invited_by': request.user, 'status': GroupInvite.STATUS_PENDING},
		)
		return Response({'id': invite.id, 'status': invite.status, **_group_invite_link(request, group)}, status=status.HTTP_201_CREATED)


class GroupJoinRequestActionView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, group_id: int, invite_id: int, action: str, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _is_group_admin(group, request.user):
			return Response({'detail': 'Only group admins can manage requests.'}, status=status.HTTP_403_FORBIDDEN)
		invite = GroupInvite.objects.filter(group=group, id=invite_id, status=GroupInvite.STATUS_PENDING).select_related('invitee').first()
		if invite is None:
			return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)
		if action == 'approve':
			invite.status = GroupInvite.STATUS_ACCEPTED
			invite.save(update_fields=['status', 'updated_at'])
			GroupMembership.objects.update_or_create(
				group=group,
				user=invite.invitee,
				defaults={'status': GroupMembership.STATUS_ACTIVE, 'role': GroupMembership.ROLE_MEMBER},
			)
			_refresh_group_count(group)
			return Response({'approved': True, 'group': CommunityGroupSerializer(group, context={'request': request}).data})
		if action == 'reject':
			invite.status = GroupInvite.STATUS_DECLINED
			invite.save(update_fields=['status', 'updated_at'])
			return Response({'rejected': True})
		return Response({'detail': 'Unsupported request action.'}, status=status.HTTP_400_BAD_REQUEST)


class GroupRemoveMemberView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _is_group_admin(group, request.user):
			return Response({'detail': 'Only group admins can remove members.'}, status=status.HTTP_403_FORBIDDEN)
		user_id = request.data.get('user_id')
		GroupMembership.objects.filter(group=group, user_id=user_id).exclude(user=group.owner).delete()
		_refresh_group_count(group)
		return Response(CommunityGroupSerializer(group, context={'request': request}).data)


class GroupChallengesView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _is_group_admin(group, request.user):
			return Response({'detail': 'Only group admins can create group challenges.'}, status=status.HTTP_403_FORBIDDEN)
		title = str(request.data.get('title') or '').strip()
		if not title:
			return Response({'detail': 'title is required.'}, status=status.HTTP_400_BAD_REQUEST)
		today = timezone.localdate()
		challenge = GroupChallenge.objects.create(
			group=group,
			created_by=request.user,
			title=title[:255],
			challenge_type=str(request.data.get('challenge_type') or 'custom').strip()[:64],
			eligible_workout_types=request.data.get('eligible_workout_types') or [],
			eligible_body_parts=request.data.get('eligible_body_parts') or [],
			min_duration=int(request.data.get('min_duration') or 20),
			max_daily_entries=int(request.data.get('max_daily_entries') or 1),
			start_date=request.data.get('start_date') or today,
			end_date=request.data.get('end_date') or (today + timedelta(days=14)),
			scoring_rules=request.data.get('scoring_rules') or {},
			completion_bonus=int(request.data.get('completion_bonus') or 0),
			required_sessions=int(request.data.get('required_sessions') or 1),
			reward_xp=int(request.data.get('reward_xp') or 150),
			badge_icon=str(request.data.get('badge_icon') or '').strip(),
			visibility=str(request.data.get('visibility') or 'group').strip(),
		)
		group.active_challenge_title = challenge.title
		group.save(update_fields=['active_challenge_title', 'updated_at'])
		evaluate_group_achievements(
			request.user,
			context={
				'group_id': group.id,
				'created_group_challenges': GroupChallenge.objects.filter(created_by=request.user).count(),
			},
		)
		return Response(GroupChallengeSerializer(challenge).data, status=status.HTTP_201_CREATED)


class GroupAnnouncementsView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _is_group_admin(group, request.user):
			return Response({'detail': 'Only group admins can create announcements.'}, status=status.HTTP_403_FORBIDDEN)
		title = str(request.data.get('title') or '').strip()
		if not title:
			return Response({'detail': 'title is required.'}, status=status.HTTP_400_BAD_REQUEST)
		GroupAnnouncement.objects.filter(group=group, is_pinned=True).update(is_pinned=False)
		announcement = GroupAnnouncement.objects.create(
			group=group,
			created_by=request.user,
			announcement_type=str(request.data.get('announcement_type') or 'admin_note').strip(),
			title=title[:180],
			body=str(request.data.get('body') or '').strip()[:700],
			is_pinned=True,
		)
		return Response(GroupAnnouncementSerializer(announcement).data, status=status.HTTP_201_CREATED)


class GroupActivityPostView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _is_group_member(group, request.user):
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		return Response(_group_feed_payload(group, request, limit=50))

	def post(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if not _is_group_member(group, request.user):
			return Response({'detail': 'Only group members can post here.'}, status=status.HTTP_403_FORBIDDEN)
		kind = str(request.data.get('kind') or 'thread').strip().lower()
		if kind not in {'thread', 'post', 'event', 'notification', 'admin_post'}:
			kind = 'thread'
		if kind in {'event', 'notification', 'admin_post'} and not _is_group_admin(group, request.user):
			return Response({'detail': 'Only group admins can create events and notifications.'}, status=status.HTTP_403_FORBIDDEN)
		title = str(request.data.get('title') or '').strip()
		if not title:
			return Response({'detail': 'title is required.'}, status=status.HTTP_400_BAD_REQUEST)
		description = str(request.data.get('description') or request.data.get('body') or '').strip()
		image_urls = request.data.get('image_urls') or request.data.get('imageUrls') or []
		if not isinstance(image_urls, list):
			image_urls = []
		score = request.data.get('score')
		try:
			score = float(score) if score not in {None, ''} else None
		except (TypeError, ValueError):
			score = None
		activity = CommunityActivity.objects.create(
			user=request.user,
			activity_type=CommunityActivity.ACTIVITY_GROUP,
			title=title[:255],
			description=description[:500],
			score=score,
			metadata={
				'event_type': 'group_thread' if kind in {'thread', 'post'} else f'group_{kind}',
				'kind': kind,
				'group_id': group.id,
				'group_name': group.name,
				'image_urls': [str(url) for url in image_urls[:6]],
				'frontend_summary': {
					'image_urls': [str(url) for url in image_urls[:6]],
				},
				'source_id': f'group_activity:{group.id}:{request.user.id}:{timezone.now().timestamp()}',
			},
			occurred_at=timezone.now(),
		)
		_refresh_group_metrics(group)
		return Response(CommunityActivitySerializer(activity, context={'request': request}).data, status=status.HTTP_201_CREATED)


class GroupLeaderboardView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, group_id: int, *args, **kwargs):
		group = CommunityGroup.objects.filter(id=group_id).first()
		if group is None:
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		if group.privacy == CommunityGroup.PRIVACY_PRIVATE and not GroupMembership.objects.filter(group=group, user=request.user, status=GroupMembership.STATUS_ACTIVE).exists():
			return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
		progress = []
		for challenge in group.challenges.all():
			progress.extend(list(challenge.progress_rows.select_related('user', 'user__profile')[:100]))
		progress.sort(key=lambda item: (-item.points, -item.active_days, -item.recorded_workouts, item.manual_logs, item.completed_at or timezone.now()))
		return Response(GroupChallengeProgressSerializer(progress[:100], many=True).data)


class FollowView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, user_id: int, *args, **kwargs):
		if request.user.id == user_id:
			return Response({'detail': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
		try:
			other_user = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
		UserFollow.objects.update_or_create(
			follower=request.user,
			following=other_user,
			defaults={'status': UserFollow.STATUS_ACTIVE},
		)
		ensure_public_card(request.user)
		ensure_public_card(other_user)
		return Response({'following': True}, status=status.HTTP_201_CREATED)

	def delete(self, request, user_id: int, *args, **kwargs):
		UserFollow.objects.filter(follower=request.user, following_id=user_id).delete()
		ensure_public_card(request.user)
		if User.objects.filter(id=user_id).exists():
			ensure_public_card(User.objects.get(id=user_id))
		return Response(status=status.HTTP_204_NO_CONTENT)
