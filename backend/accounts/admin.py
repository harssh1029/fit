from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from achievements.models import UserBadge, UserLevel
from challenges.models import UserChallengeCompletion, UserChallengeEnrollment
from community.models import CommunityActivity, GroupMembership, UserPublicCard

from .models import Profile


User = get_user_model()


class ProfileInline(admin.StackedInline):
	model = Profile
	can_delete = False
	extra = 0
	fields = ('display_name', 'height_cm', 'weight_kg', 'waist_cm', 'gender', 'date_of_birth', 'timezone', 'active_plan', 'personal_bests')


class PublicCardInline(admin.StackedInline):
	model = UserPublicCard
	can_delete = False
	extra = 0
	fields = (
		'display_name',
		'username',
		'overall_score',
		'consistency_score',
		'challenges_completed',
		'body_balance_percent',
		'active_plan_name',
		'streak_days',
		'recent_sessions_this_week',
		'fitness_age_years',
		'followers_count',
		'following_count',
		'post_count',
		'performance_score',
		'weekly_xp',
		'tier',
		'updated_at',
	)
	readonly_fields = ('updated_at',)


class GroupMembershipUserInline(admin.TabularInline):
	model = GroupMembership
	extra = 0
	fields = ('group', 'role', 'status', 'created_at')
	readonly_fields = ('created_at',)
	autocomplete_fields = ('group',)


class CommunityActivityUserInline(admin.TabularInline):
	model = CommunityActivity
	extra = 0
	fields = ('activity_type', 'title', 'score', 'occurred_at', 'created_at')
	readonly_fields = ('created_at',)
	show_change_link = True


class UserBadgeInline(admin.TabularInline):
	model = UserBadge
	extra = 0
	fields = ('badge', 'period_key', 'source_type', 'source_id', 'earned_at')
	readonly_fields = ('earned_at',)
	autocomplete_fields = ('badge',)


class UserLevelInline(admin.StackedInline):
	model = UserLevel
	can_delete = False
	extra = 0


class ChallengeCompletionInline(admin.TabularInline):
	model = UserChallengeCompletion
	extra = 0
	fields = ('challenge', 'completed_at')
	readonly_fields = ('completed_at',)
	autocomplete_fields = ('challenge',)


class TrainingChallengeEnrollmentInline(admin.TabularInline):
	model = UserChallengeEnrollment
	extra = 0
	fields = ('challenge', 'status', 'joined_at', 'completed_at')
	readonly_fields = ('joined_at',)
	autocomplete_fields = ('challenge',)


class UserAdmin(BaseUserAdmin):
	inlines = (
		ProfileInline,
		PublicCardInline,
		UserLevelInline,
		GroupMembershipUserInline,
		UserBadgeInline,
		ChallengeCompletionInline,
		TrainingChallengeEnrollmentInline,
		CommunityActivityUserInline,
	)


try:
	admin.site.unregister(User)
except admin.sites.NotRegistered:
	pass

admin.site.register(User, UserAdmin)
