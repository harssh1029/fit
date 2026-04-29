from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CommunityActivity, ContactSyncInvite, UserPublicCard
from .serializers import (
	CommunityActivitySerializer,
	UserPublicCardSerializer,
	UserSuggestionSerializer,
)
from .services import (
	community_scope_user_ids,
	create_friendship,
	ensure_public_card,
	ensure_public_cards,
	get_friend_cards,
	remove_friendship,
	sync_recent_activities,
)


User = get_user_model()


LEADERBOARD_SORTS = {
	'overall': '-overall_score',
	'consistent': '-consistency_score',
	'balanced': '-body_balance_percent',
	'challenges': '-challenges_completed',
	'active': '-recent_sessions_this_week',
}


class CommunitySummaryView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		user = request.user
		card = ensure_public_card(user)
		friend_cards = get_friend_cards(user)
		for friend_card in friend_cards:
			sync_recent_activities(friend_card.user)
		sync_recent_activities(user)
		activities = CommunityActivity.objects.filter(
			user_id__in=community_scope_user_ids(user)
		).select_related('user', 'user__profile')[:25]
		return Response(
			{
				'public_card': UserPublicCardSerializer(card).data,
				'friends': UserPublicCardSerializer(friend_cards, many=True).data,
				'recent_activity': CommunityActivitySerializer(activities, many=True).data,
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
		sort_field = LEADERBOARD_SORTS.get(metric, LEADERBOARD_SORTS['overall'])
		limit = min(int(request.query_params.get('limit', 100)), 100)
		ensure_public_card(request.user)
		ensure_public_cards(User.objects.filter(public_card__isnull=True)[:100])

		all_cards = UserPublicCard.objects.select_related('user').order_by(sort_field, 'display_name', 'id')
		top_cards = list(all_cards[:limit])
		user_card = ensure_public_card(request.user)
		user_rank = None
		for index, card in enumerate(all_cards, start=1):
			if card.user_id == request.user.id:
				user_rank = index
				break

		return Response(
			{
				'metric': metric,
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
		user_ids = community_scope_user_ids(request.user)
		for user in User.objects.filter(id__in=user_ids):
			sync_recent_activities(user)

		activities = CommunityActivity.objects.filter(user_id__in=user_ids).select_related('user', 'user__profile')
		if feed_filter in {'workout', 'challenge', 'plan', 'test'}:
			activities = activities.filter(activity_type=feed_filter)
		elif feed_filter == 'friends':
			activities = activities.exclude(user=request.user)
		elif feed_filter == 'consistency':
			activities = activities.order_by('-score', '-occurred_at')

		return Response(CommunityActivitySerializer(activities[:limit], many=True).data)
