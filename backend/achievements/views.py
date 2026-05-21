from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from challenges.models import UserChallengeCompletion
from plans.models import UserPlan

from .models import Badge, UserBadge
from .serializers import BadgeSerializer, CategoryLevelSerializer, UserBadgeSerializer, UserLevelSerializer
from .services import achievement_summary, ensure_badge_catalog, set_featured_badges


class AchievementSummaryView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		summary = achievement_summary(request.user)
		completed_challenges = [
			{
				'id': row.challenge_id,
				'name': row.challenge.card.get('name') or row.challenge_id,
				'completedAt': row.completed_at.isoformat(),
			}
			for row in UserChallengeCompletion.objects.filter(user=request.user).select_related('challenge')[:20]
		]
		completed_plans = [
			{
				'id': row.id,
				'planId': row.plan_id,
				'name': row.plan.name,
				'completedAt': row.completed_at.isoformat() if row.completed_at else None,
			}
			for row in UserPlan.objects.filter(user=request.user, status='completed').select_related('plan')[:20]
		]
		return Response(
			{
				'level': UserLevelSerializer(summary['level']).data,
				'categoryLevels': CategoryLevelSerializer(summary['category_levels'], many=True).data,
				'featuredBadges': UserBadgeSerializer(summary['featured_badges'], many=True).data,
				'recentBadges': UserBadgeSerializer(summary['recent_badges'], many=True).data,
				'completedChallenges': completed_challenges,
				'completedPlans': completed_plans,
			}
		)


class BadgeCatalogView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		ensure_badge_catalog()
		earned = {
			row.badge_id: row
			for row in UserBadge.objects.filter(user=request.user, period_key='').select_related('badge')
		}
		payload = []
		for badge in Badge.objects.all():
			item = BadgeSerializer(badge).data
			user_badge = earned.get(badge.id)
			item['earned'] = user_badge is not None
			item['earnedBadge'] = UserBadgeSerializer(user_badge).data if user_badge else None
			payload.append(item)
		return Response(payload)


class FeaturedBadgePinsView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, *args, **kwargs):
		ids = request.data.get('user_badge_ids') or request.data.get('userBadgeIds') or []
		if not isinstance(ids, list):
			return Response({'detail': 'user_badge_ids must be a list.'}, status=status.HTTP_400_BAD_REQUEST)
		featured = set_featured_badges(request.user, ids)
		return Response(UserBadgeSerializer([row.user_badge for row in featured], many=True).data)
