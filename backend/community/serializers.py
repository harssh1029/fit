from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from typing import Optional

from .models import CommunityActivity, ContactSyncInvite, UserPublicCard
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


class ContactSyncInviteSerializer(serializers.ModelSerializer):
	class Meta:
		model = ContactSyncInvite
		fields = ['identifier', 'source', 'created_at']
