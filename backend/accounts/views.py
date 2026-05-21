from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from challenges.models import UserChallengeCompletion
from community.models import CommunityActivity, CommunityGroup, GroupMembership, UserFollow
from community.serializers import CommunityActivitySerializer, CommunityGroupSerializer, UserPublicCardSerializer
from community.services import ensure_public_card
from plans.models import UserPlan
from workouts.models import WorkoutSession
from achievements.serializers import CategoryLevelSerializer, UserBadgeSerializer, UserLevelSerializer
from achievements.services import achievement_summary

from .models import Profile
from .serializers import ProfileSerializer, RegisterSerializer, UserSerializer


User = get_user_model()


class MeView(APIView):
	"""Return and update the authenticated user's profile.

	GET  /api/v1/me/   -> user + profile
	PATCH /api/v1/me/  -> partial update of profile fields
	"""

	permission_classes = [IsAuthenticated]

	def get(self, request):
		user: User = request.user
		profile, _ = Profile.objects.get_or_create(user=user)
		data = {
			'id': user.id,
			'username': user.get_username(),
			'email': user.email,
			'profile': ProfileSerializer(profile).data,
		}
		return Response(data)

	def patch(self, request):
		user: User = request.user
		profile, _ = Profile.objects.get_or_create(user=user)
		serializer = ProfileSerializer(profile, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		data = {
			'id': user.id,
			'username': user.get_username(),
			'email': user.email,
			'profile': serializer.data,
		}
		return Response(data)


class RegisterView(APIView):
	"""Register a new user and return JWT tokens.

	POST /api/v1/auth/register/
	"""

	permission_classes = [AllowAny]

	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()

		refresh = RefreshToken.for_user(user)
		data = {
			'user': UserSerializer(user).data,
			'access': str(refresh.access_token),
			'refresh': str(refresh),
		}
		return Response(data, status=status.HTTP_201_CREATED)


def _profile_payload(user: User, request_user: User, *, private: bool = False) -> dict:
	card = ensure_public_card(user)
	activities = (
		CommunityActivity.objects.filter(user=user, activity_type=CommunityActivity.ACTIVITY_WORKOUT)
		.select_related('user', 'user__profile')
		.order_by('-occurred_at', '-id')[:30]
	)
	prs = []
	profile = getattr(user, 'profile', None)
	personal_bests = getattr(profile, 'personal_bests', {}) or {}
	if isinstance(personal_bests, dict):
		for key, value in list(personal_bests.items())[:12]:
			if isinstance(value, dict):
				prs.append({'id': key, **value})
		if personal_bests.get('prs') and isinstance(personal_bests.get('prs'), list):
			prs = personal_bests.get('prs')[:12]
	challenges = [
		{
			'id': completion.challenge_id,
			'name': completion.challenge.card.get('name') or completion.challenge_id,
			'completed_at': completion.completed_at.isoformat(),
			'completedAt': completion.completed_at.isoformat(),
		}
		for completion in UserChallengeCompletion.objects.filter(user=user).select_related('challenge')[:20]
	]
	completed_plans = [
		{
			'id': row.id,
			'planId': row.plan_id,
			'name': row.plan.name,
			'completedAt': row.completed_at.isoformat() if row.completed_at else None,
		}
		for row in UserPlan.objects.filter(user=user, status='completed').select_related('plan')[:20]
	]
	groups = CommunityGroup.objects.filter(
		memberships__user=user,
		memberships__status=GroupMembership.STATUS_ACTIVE,
	).distinct()[:20]
	achievements = achievement_summary(user)
	payload = {
		'public_card': UserPublicCardSerializer(card).data,
		'posts': CommunityActivitySerializer(activities, many=True, context={'request': None}).data,
		'prs': prs,
		'challenges': challenges,
		'groups': CommunityGroupSerializer(groups, many=True, context={'request': None}).data,
		'achievements': {
			'level': UserLevelSerializer(achievements['level']).data,
			'categoryLevels': CategoryLevelSerializer(achievements['category_levels'], many=True).data,
			'featuredBadges': UserBadgeSerializer(achievements['featured_badges'], many=True).data,
			'recentBadges': UserBadgeSerializer(achievements['recent_badges'], many=True).data,
			'completedChallenges': challenges,
			'completedPlans': completed_plans,
		},
		'is_following': UserFollow.objects.filter(
			follower=request_user,
			following=user,
			status=UserFollow.STATUS_ACTIVE,
		).exists() if request_user.is_authenticated and request_user.id != user.id else False,
	}
	if private:
		try:
			score_summary = user.score_summary
		except ObjectDoesNotExist:
			score_summary = None
		payload['insights'] = {
			'score_summary': {
				'total_xp': score_summary.total_xp if score_summary else 0,
				'weekly_xp': score_summary.weekly_xp if score_summary else 0,
				'performance_score': score_summary.performance_score if score_summary else 0,
				'training_balance_score': score_summary.training_balance_score if score_summary else 0,
			},
			'workout_count': WorkoutSession.objects.filter(user=user, status='completed').count(),
		}
	return payload


class ProfileSummaryView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		return Response(_profile_payload(request.user, request.user, private=True))


class PublicProfileView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, user_id: int):
		try:
			user = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
		return Response(_profile_payload(user, request.user, private=user.id == request.user.id))


class ProfileFollowersView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, user_id: int):
		users = User.objects.filter(
			following_edges__following_id=user_id,
			following_edges__status=UserFollow.STATUS_ACTIVE,
		).select_related('profile')
		cards = [ensure_public_card(user) for user in users]
		return Response(UserPublicCardSerializer(cards, many=True).data)


class ProfileFollowingView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, user_id: int):
		users = User.objects.filter(
			follower_edges__follower_id=user_id,
			follower_edges__status=UserFollow.STATUS_ACTIVE,
		).select_related('profile')
		cards = [ensure_public_card(user) for user in users]
		return Response(UserPublicCardSerializer(cards, many=True).data)
