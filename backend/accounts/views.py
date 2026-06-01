from pathlib import Path
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.core.files.storage import default_storage
from django.db.models import Count, Exists, OuterRef
from django.utils.text import get_valid_filename

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from challenges.models import UserChallengeCompletion, UserChallengeEnrollment
from community.models import ActivityLike, ActivitySave, CommunityActivity, CommunityGroup, GroupMembership, UserFollow
from community.serializers import CommunityActivitySerializer, CommunityGroupSerializer, UserPublicCardSerializer
from community.services import ensure_public_card, get_public_card
from insights.services import recalculate_user_metrics
from plans.models import UserPlan
from workouts.models import WorkoutSession
from achievements.serializers import CategoryLevelSerializer, UserBadgeSerializer, UserLevelSerializer
from achievements.services import achievement_summary

from .models import Profile
from .serializers import ProfileSerializer, RegisterSerializer, UserSerializer


User = get_user_model()


class LoginTokenObtainPairView(TokenObtainPairView):
	"""JWT login endpoint with an auth-specific throttle scope."""

	throttle_classes = [ScopedRateThrottle]
	throttle_scope = 'auth_login'


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


class ProfileAvatarUploadView(APIView):
	"""Upload and persist the authenticated user's profile picture."""

	permission_classes = [IsAuthenticated]
	parser_classes = [MultiPartParser, FormParser]

	def post(self, request):
		upload = request.FILES.get('image')
		if upload is None:
			return Response({'detail': 'Upload an image file.'}, status=status.HTTP_400_BAD_REQUEST)

		content_type = str(getattr(upload, 'content_type', '') or '')
		if not content_type.startswith('image/'):
			return Response({'detail': 'Only image uploads are supported.'}, status=status.HTTP_400_BAD_REQUEST)
		if getattr(upload, 'size', 0) > 5 * 1024 * 1024:
			return Response({'detail': 'Image must be 5 MB or smaller.'}, status=status.HTTP_400_BAD_REQUEST)

		original_name = get_valid_filename(getattr(upload, 'name', '') or 'profile-image')
		extension = Path(original_name).suffix.lower()
		if extension not in {'.jpg', '.jpeg', '.png', '.webp', '.heic'}:
			extension = '.jpg'

		path = f'profile_images/user_{request.user.id}/{uuid4().hex}{extension}'
		saved_path = default_storage.save(path, upload)
		avatar_url = default_storage.url(saved_path)
		profile, _ = Profile.objects.get_or_create(user=request.user)
		profile.avatar_url = avatar_url
		profile.save(update_fields=['avatar_url'])
		refreshed_user = User.objects.select_related('profile').get(id=request.user.id)
		ensure_public_card(refreshed_user)
		return Response({'avatar_url': avatar_url}, status=status.HTTP_201_CREATED)


class RegisterView(APIView):
	"""Register a new user and return JWT tokens.

	POST /api/v1/auth/register/
	"""

	permission_classes = [AllowAny]
	throttle_classes = [ScopedRateThrottle]
	throttle_scope = 'auth_register'

	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		snapshot = recalculate_user_metrics(user)

		refresh = RefreshToken.for_user(user)
		data = {
			'user': UserSerializer(user).data,
			'access': str(refresh.access_token),
			'refresh': str(refresh),
			'metrics_snapshot_id': snapshot.id,
		}
		return Response(data, status=status.HTTP_201_CREATED)


class RegisterValidationView(APIView):
	"""Validate account credentials without creating a user.

	POST /api/v1/auth/register/validate/
	"""

	permission_classes = [AllowAny]
	throttle_classes = [ScopedRateThrottle]
	throttle_scope = 'auth_register_validate'

	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		return Response({'ok': True}, status=status.HTTP_200_OK)


def _profile_payload(user: User, request_user: User, *, private: bool = False) -> dict:
	card = get_public_card(user)
	activities = []
	if not private:
		activities = (
			CommunityActivity.objects.filter(user=user, activity_type=CommunityActivity.ACTIVITY_WORKOUT)
			.select_related('user', 'user__profile')
			.annotate(
				likes_count=Count('likes', distinct=True),
				comments_count=Count('comments', distinct=True),
				shares_count=Count('shares', distinct=True),
				saved_by_me=Exists(
					ActivitySave.objects.filter(activity_id=OuterRef('pk'), user=request_user)
				),
			)
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
	joined_challenges = []
	for enrollment in (
		UserChallengeEnrollment.objects.filter(user=user)
		.exclude(status=UserChallengeEnrollment.STATUS_LEFT)
		.select_related('challenge', 'progress')[:20]
	):
		try:
			progress_percent = enrollment.progress.progress_percent
		except ObjectDoesNotExist:
			progress_percent = 0
		joined_challenges.append(
			{
				'id': enrollment.challenge_id,
				'name': enrollment.challenge.name,
				'requirement': enrollment.challenge.requirement,
				'status': enrollment.status,
				'progressPercent': progress_percent,
				'badgeIcon': enrollment.challenge.badge_icon,
				'joinedAt': enrollment.joined_at.isoformat(),
			}
		)
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
		'joined_challenges': joined_challenges,
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


class ProfilePostsView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		try:
			limit = min(max(int(request.query_params.get('limit', 30)), 1), 50)
		except (TypeError, ValueError):
			limit = 30
		try:
			before = int(request.query_params.get('before', '0')) or None
		except (TypeError, ValueError):
			before = None

		activities = (
			CommunityActivity.objects.filter(
				user=request.user,
				activity_type=CommunityActivity.ACTIVITY_WORKOUT,
			)
			.select_related('user', 'user__profile')
			.annotate(
				likes_count=Count('likes', distinct=True),
				comments_count=Count('comments', distinct=True),
				shares_count=Count('shares', distinct=True),
				liked_by_me=Exists(
					ActivityLike.objects.filter(activity_id=OuterRef('pk'), user=request.user)
				),
				saved_by_me=Exists(
					ActivitySave.objects.filter(activity_id=OuterRef('pk'), user=request.user)
				),
			)
		)
		if before is not None:
			activities = activities.filter(id__lt=before)
		page = list(activities.order_by('-id')[:limit + 1])
		results = page[:limit]
		return Response(
			{
				'results': CommunityActivitySerializer(
					results,
					many=True,
					context={'request': request},
				).data,
				'nextCursor': results[-1].id if len(page) > limit and results else None,
			}
		)


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
