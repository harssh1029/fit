from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from achievements.models import UserBadge, UserLevel
from challenges.models import UserChallengeCompletion, UserChallengeEnrollment
from community.models import (
	ActivityComment,
	ActivityLike,
	ActivityShare,
	CommunityActivity,
	GroupMembership,
	UserFollow,
	UserPublicCard,
)
from insights.models import FitnessAssessment, RaceBenchmark, UserMetricsSnapshot
from plans.models import UserPlan
from workouts.models import UserScorePeriod, UserScoreSummary, WorkoutSession

from .models import Profile


User = get_user_model()


class ProfileInline(admin.StackedInline):
	model = Profile
	can_delete = False
	extra = 0
	fields = (
		'display_name',
		'height_cm',
		'weight_kg',
		'waist_cm',
		'gender',
		'date_of_birth',
		'timezone',
		'active_plan',
		'personal_bests',
		'fitness_level',
		'fitness_goals',
		'training_preferences',
		'training_restrictions',
		'onboarding_version',
		'onboarding_completed_at',
		'onboarding_answers',
	)


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


class UserScoreSummaryInline(admin.StackedInline):
	model = UserScoreSummary
	can_delete = False
	extra = 0
	readonly_fields = ('updated_at',)


class UserMetricsSnapshotInline(admin.StackedInline):
	model = UserMetricsSnapshot
	can_delete = False
	extra = 0
	fields = (
		'fitness_age_years',
		'percentile_rank_overall',
		'race_readiness_score',
		'current_streak_days',
		'longest_streak_days',
		'total_minutes_7d',
		'total_minutes_30d',
		'total_minutes_all_time',
		'body_balance_score',
		'computed_at',
	)
	readonly_fields = ('computed_at',)


class UserPlanInline(admin.TabularInline):
	model = UserPlan
	extra = 0
	fields = ('plan', 'plan_version', 'status', 'is_active', 'completed_sessions', 'missed_sessions', 'total_sessions', 'completion_percent', 'started_at', 'completed_at')
	readonly_fields = ('started_at', 'completed_at')
	autocomplete_fields = ('plan', 'plan_version')


class WorkoutSessionUserInline(admin.TabularInline):
	model = WorkoutSession
	extra = 0
	fields = ('title', 'workout_type', 'entry_source', 'status', 'duration_minutes', 'plan', 'user_plan', 'completed_at')
	readonly_fields = ('completed_at',)
	show_change_link = True
	autocomplete_fields = ('plan',)


class UserScorePeriodInline(admin.TabularInline):
	model = UserScorePeriod
	extra = 0
	fields = ('period_type', 'period_start', 'period_end', 'activity_xp', 'leaderboard_score', 'updated_at')
	readonly_fields = ('updated_at',)


class FitnessAssessmentInline(admin.TabularInline):
	model = FitnessAssessment
	extra = 0
	fields = ('tested_at', 'age_years', 'gender', 'resting_heart_rate', 'max_pushups', 'max_run_minutes', 'source')
	readonly_fields = ('tested_at',)


class RaceBenchmarkInline(admin.TabularInline):
	model = RaceBenchmark
	extra = 0
	fields = ('plan', 'user_plan', 'is_initial', 'run_1km_seconds', 'wall_balls_unbroken', 'sled_difficulty', 'energy_level', 'created_at')
	readonly_fields = ('created_at',)
	autocomplete_fields = ('plan',)


class FollowerInline(admin.TabularInline):
	model = UserFollow
	fk_name = 'following'
	extra = 0
	fields = ('follower', 'status', 'created_at')
	readonly_fields = ('created_at',)
	autocomplete_fields = ('follower',)
	verbose_name_plural = 'Followers'


class FollowingInline(admin.TabularInline):
	model = UserFollow
	fk_name = 'follower'
	extra = 0
	fields = ('following', 'status', 'created_at')
	readonly_fields = ('created_at',)
	autocomplete_fields = ('following',)
	verbose_name_plural = 'Following'


class ActivityLikeUserInline(admin.TabularInline):
	model = ActivityLike
	extra = 0
	fields = ('activity', 'created_at')
	readonly_fields = ('created_at',)
	autocomplete_fields = ('activity',)


class ActivityCommentUserInline(admin.TabularInline):
	model = ActivityComment
	extra = 0
	fields = ('activity', 'body', 'created_at')
	readonly_fields = ('created_at',)
	autocomplete_fields = ('activity',)


class ActivityShareUserInline(admin.TabularInline):
	model = ActivityShare
	extra = 0
	fields = ('activity', 'created_at')
	readonly_fields = ('created_at',)
	autocomplete_fields = ('activity',)


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
		UserScoreSummaryInline,
		UserMetricsSnapshotInline,
		UserPlanInline,
		WorkoutSessionUserInline,
		UserScorePeriodInline,
		FitnessAssessmentInline,
		RaceBenchmarkInline,
		FollowerInline,
		FollowingInline,
		GroupMembershipUserInline,
		UserBadgeInline,
		ChallengeCompletionInline,
		TrainingChallengeEnrollmentInline,
		CommunityActivityUserInline,
		ActivityLikeUserInline,
		ActivityCommentUserInline,
		ActivityShareUserInline,
	)


try:
	admin.site.unregister(User)
except admin.sites.NotRegistered:
	pass

admin.site.register(User, UserAdmin)
