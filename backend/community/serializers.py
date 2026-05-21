from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from typing import Optional

from .models import (
	ActivityComment,
	CommunityActivity,
	CommunityGroup,
	ContactSyncInvite,
	GroupAnnouncement,
	GroupChallenge,
	GroupChallengeProgress,
	GroupMembership,
	UserPublicCard,
)
from .services import friendship_status_between


User = get_user_model()


class UserPublicCardSerializer(serializers.ModelSerializer):
	id = serializers.IntegerField(source='user_id', read_only=True)
	name = serializers.CharField(source='display_name', read_only=True)
	avatarInitials = serializers.CharField(source='avatar_initials', read_only=True)
	overallScore = serializers.IntegerField(source='overall_score', read_only=True)
	consistencyScore = serializers.IntegerField(source='consistency_score', read_only=True)
	challengesCompleted = serializers.IntegerField(source='challenges_completed', read_only=True)
	bodyBalancePercent = serializers.IntegerField(source='body_balance_percent', read_only=True)
	activePlanName = serializers.CharField(source='active_plan_name', read_only=True)
	streakDays = serializers.IntegerField(source='streak_days', read_only=True)
	recentSessionsThisWeek = serializers.IntegerField(source='recent_sessions_this_week', read_only=True)
	fitnessAgeYears = serializers.IntegerField(source='fitness_age_years', read_only=True)
	followersCount = serializers.IntegerField(source='followers_count', read_only=True)
	followingCount = serializers.IntegerField(source='following_count', read_only=True)
	postCount = serializers.IntegerField(source='post_count', read_only=True)
	performanceScore = serializers.FloatField(source='performance_score', read_only=True)
	weeklyXp = serializers.IntegerField(source='weekly_xp', read_only=True)

	class Meta:
		model = UserPublicCard
		fields = [
			'id',
			'name',
			'username',
			'avatarInitials',
			'overallScore',
			'consistencyScore',
			'challengesCompleted',
			'bodyBalancePercent',
			'activePlanName',
			'streakDays',
			'recentSessionsThisWeek',
			'fitnessAgeYears',
			'followersCount',
			'followingCount',
			'postCount',
			'performanceScore',
			'weeklyXp',
			'tier',
			'updated_at',
		]


class UserSuggestionSerializer(serializers.ModelSerializer):
	id = serializers.IntegerField(read_only=True)
	name = serializers.SerializerMethodField()
	avatarInitials = serializers.SerializerMethodField()
	friendshipStatus = serializers.SerializerMethodField()

	class Meta:
		model = User
		fields = ['id', 'username', 'name', 'avatarInitials', 'friendshipStatus']

	def get_name(self, obj: User) -> str:
		try:
			profile = obj.profile
		except ObjectDoesNotExist:
			profile = None
		return getattr(profile, 'display_name', '') or obj.get_full_name() or obj.get_username()

	def get_avatarInitials(self, obj: User) -> str:
		name = self.get_name(obj)
		parts = [part for part in name.split() if part]
		if len(parts) >= 2:
			return f'{parts[0][0]}{parts[-1][0]}'.upper()
		return name[:2].upper() or 'U'

	def get_friendshipStatus(self, obj: User) -> Optional[str]:
		request = self.context.get('request')
		if request is None or not request.user.is_authenticated:
			return None
		return friendship_status_between(request.user, obj)


class CommunityActivitySerializer(serializers.ModelSerializer):
	userId = serializers.IntegerField(source='user_id', read_only=True)
	userName = serializers.SerializerMethodField()
	avatarInitials = serializers.SerializerMethodField()
	type = serializers.CharField(source='activity_type', read_only=True)
	occurredAt = serializers.DateTimeField(source='occurred_at', read_only=True)
	likedByMe = serializers.SerializerMethodField()
	likesCount = serializers.SerializerMethodField()
	commentsCount = serializers.SerializerMethodField()
	shareCount = serializers.SerializerMethodField()
	frontendSummary = serializers.SerializerMethodField()

	class Meta:
		model = CommunityActivity
		fields = [
			'id',
			'userId',
			'userName',
			'avatarInitials',
			'type',
			'title',
			'description',
			'score',
			'metadata',
			'occurredAt',
			'likedByMe',
			'likesCount',
			'commentsCount',
			'shareCount',
			'frontendSummary',
		]

	def get_userName(self, obj: CommunityActivity) -> str:
		try:
			profile = obj.user.profile
		except ObjectDoesNotExist:
			profile = None
		return getattr(profile, 'display_name', '') or obj.user.get_full_name() or obj.user.get_username()

	def get_avatarInitials(self, obj: CommunityActivity) -> str:
		name = self.get_userName(obj)
		parts = [part for part in name.split() if part]
		if len(parts) >= 2:
			return f'{parts[0][0]}{parts[-1][0]}'.upper()
		return name[:2].upper() or 'U'

	def get_likedByMe(self, obj: CommunityActivity) -> bool:
		request = self.context.get('request')
		if request is None or not request.user.is_authenticated:
			return False
		return obj.likes.filter(user=request.user).exists()

	def get_likesCount(self, obj: CommunityActivity) -> int:
		return getattr(obj, 'likes_count', None) if hasattr(obj, 'likes_count') else obj.likes.count()

	def get_commentsCount(self, obj: CommunityActivity) -> int:
		return getattr(obj, 'comments_count', None) if hasattr(obj, 'comments_count') else obj.comments.count()

	def get_shareCount(self, obj: CommunityActivity) -> int:
		return getattr(obj, 'shares_count', None) if hasattr(obj, 'shares_count') else obj.shares.count()

	def get_frontendSummary(self, obj: CommunityActivity):
		metadata = obj.metadata if isinstance(obj.metadata, dict) else {}
		return metadata.get('frontend_summary') or None


class ActivityCommentSerializer(serializers.ModelSerializer):
	userId = serializers.IntegerField(source='user_id', read_only=True)
	userName = serializers.SerializerMethodField()
	avatarInitials = serializers.SerializerMethodField()
	createdAt = serializers.DateTimeField(source='created_at', read_only=True)

	class Meta:
		model = ActivityComment
		fields = ['id', 'userId', 'userName', 'avatarInitials', 'body', 'createdAt']

	def get_userName(self, obj: ActivityComment) -> str:
		try:
			profile = obj.user.profile
		except ObjectDoesNotExist:
			profile = None
		return getattr(profile, 'display_name', '') or obj.user.get_full_name() or obj.user.get_username()

	def get_avatarInitials(self, obj: ActivityComment) -> str:
		name = self.get_userName(obj)
		parts = [part for part in name.split() if part]
		if len(parts) >= 2:
			return f'{parts[0][0]}{parts[-1][0]}'.upper()
		return name[:2].upper() or 'U'


class GroupMembershipSerializer(serializers.ModelSerializer):
	userId = serializers.IntegerField(source='user_id', read_only=True)
	userName = serializers.SerializerMethodField()
	avatarInitials = serializers.SerializerMethodField()

	class Meta:
		model = GroupMembership
		fields = ['id', 'userId', 'userName', 'avatarInitials', 'role', 'status', 'created_at']

	def get_userName(self, obj: GroupMembership) -> str:
		try:
			profile = obj.user.profile
		except ObjectDoesNotExist:
			profile = None
		return getattr(profile, 'display_name', '') or obj.user.get_full_name() or obj.user.get_username()

	def get_avatarInitials(self, obj: GroupMembership) -> str:
		name = self.get_userName(obj)
		return ''.join(part[0] for part in name.split()[:2]).upper() or name[:2].upper() or 'U'


class CommunityGroupSerializer(serializers.ModelSerializer):
	ownerId = serializers.IntegerField(source='owner_id', read_only=True)
	memberCount = serializers.IntegerField(source='member_count', read_only=True)
	groupType = serializers.CharField(source='group_type', read_only=True)
	coverImageUrl = serializers.CharField(source='cover_image_url', read_only=True)
	weeklyGoalTarget = serializers.IntegerField(source='weekly_goal_target', read_only=True)
	weeklyActivityCount = serializers.IntegerField(source='weekly_activity_count', read_only=True)
	groupRank = serializers.IntegerField(source='group_rank', read_only=True)
	activeChallenge = serializers.CharField(source='active_challenge_title', read_only=True)
	myRole = serializers.SerializerMethodField()
	joined = serializers.SerializerMethodField()

	class Meta:
		model = CommunityGroup
		fields = [
			'id',
			'name',
			'description',
			'category',
			'groupType',
			'privacy',
			'goal',
			'coverImageUrl',
			'weeklyGoalTarget',
			'weeklyActivityCount',
			'groupRank',
			'activeChallenge',
			'ownerId',
			'memberCount',
			'myRole',
			'joined',
			'created_at',
			'updated_at',
		]

	def _membership(self, obj: CommunityGroup):
		request = self.context.get('request')
		if request is None or not request.user.is_authenticated:
			return None
		return obj.memberships.filter(user=request.user, status=GroupMembership.STATUS_ACTIVE).first()

	def get_myRole(self, obj: CommunityGroup):
		membership = self._membership(obj)
		return membership.role if membership else None

	def get_joined(self, obj: CommunityGroup) -> bool:
		return self._membership(obj) is not None


class GroupChallengeProgressSerializer(serializers.ModelSerializer):
	userId = serializers.IntegerField(source='user_id', read_only=True)
	userName = serializers.SerializerMethodField()

	class Meta:
		model = GroupChallengeProgress
		fields = ['id', 'userId', 'userName', 'points', 'active_days', 'recorded_workouts', 'manual_logs', 'completed_at']

	def get_userName(self, obj: GroupChallengeProgress) -> str:
		try:
			profile = obj.user.profile
		except ObjectDoesNotExist:
			profile = None
		return getattr(profile, 'display_name', '') or obj.user.get_full_name() or obj.user.get_username()


class GroupChallengeSerializer(serializers.ModelSerializer):
	groupId = serializers.IntegerField(source='group_id', read_only=True)
	createdById = serializers.IntegerField(source='created_by_id', read_only=True)

	class Meta:
		model = GroupChallenge
		fields = [
			'id',
			'groupId',
			'createdById',
			'title',
			'challenge_type',
			'eligible_workout_types',
			'eligible_body_parts',
			'min_duration',
			'max_daily_entries',
			'start_date',
			'end_date',
			'scoring_rules',
			'completion_bonus',
			'required_sessions',
			'reward_xp',
			'badge_icon',
			'visibility',
			'created_at',
		]


class GroupAnnouncementSerializer(serializers.ModelSerializer):
	createdById = serializers.IntegerField(source='created_by_id', read_only=True)

	class Meta:
		model = GroupAnnouncement
		fields = ['id', 'createdById', 'announcement_type', 'title', 'body', 'is_pinned', 'created_at', 'updated_at']


class ContactSyncInviteSerializer(serializers.ModelSerializer):
	class Meta:
		model = ContactSyncInvite
		fields = ['identifier', 'source', 'created_at']
