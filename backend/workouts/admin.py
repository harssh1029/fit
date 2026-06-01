from django.contrib import admin

from .models import (
	SessionExercise,
	UserGoal,
	UserScorePeriod,
	UserScoreSummary,
	WorkoutDraft,
	WorkoutScore,
	WorkoutSession,
)


class SessionExerciseInline(admin.TabularInline):
	model = SessionExercise
	extra = 0
	fields = ('exercise', 'sets_prescribed', 'reps_prescribed', 'is_completed', 'completed_at')
	readonly_fields = ('completed_at',)
	autocomplete_fields = ('exercise',)


class WorkoutScoreInline(admin.StackedInline):
	model = WorkoutScore
	can_delete = False
	extra = 0
	readonly_fields = ('created_at', 'updated_at')


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
	list_display = (
		'user',
		'title',
		'workout_type',
		'entry_source',
		'plan',
		'user_plan',
		'status',
		'completed_at',
		'duration_minutes',
		'activity_xp',
		'leaderboard_xp',
	)
	list_filter = ('status', 'entry_source', 'workout_type', 'plan')
	search_fields = ('user__username', 'user__email', 'title', 'notes', 'caption')
	readonly_fields = ('started_at', 'created_at', 'updated_at')
	inlines = (WorkoutScoreInline, SessionExerciseInline)
	date_hierarchy = 'completed_at'

	def activity_xp(self, obj):
		return getattr(getattr(obj, 'score_record', None), 'activity_xp', 0)

	def leaderboard_xp(self, obj):
		return getattr(getattr(obj, 'score_record', None), 'leaderboard_xp', 0)


@admin.register(SessionExercise)
class SessionExerciseAdmin(admin.ModelAdmin):
	list_display = (
		'session',
		'exercise',
		'is_completed',
		'completed_at',
	)
	list_filter = ('is_completed',)
	search_fields = ('session__user__username', 'session__title', 'exercise__name')
	autocomplete_fields = ('session', 'exercise')


@admin.register(WorkoutScore)
class WorkoutScoreAdmin(admin.ModelAdmin):
	list_display = ('session', 'activity_xp', 'leaderboard_xp', 'challenge_points', 'created_at', 'updated_at')
	list_filter = ('session__entry_source', 'session__workout_type', 'created_at')
	search_fields = ('session__user__username', 'session__user__email', 'session__title')
	readonly_fields = ('created_at', 'updated_at')
	autocomplete_fields = ('session',)


@admin.register(UserScoreSummary)
class UserScoreSummaryAdmin(admin.ModelAdmin):
	list_display = ('user', 'career_xp', 'weekly_xp', 'monthly_xp', 'performance_score', 'tier', 'updated_at')
	list_filter = ('tier', 'updated_at')
	search_fields = ('user__username', 'user__email')
	readonly_fields = ('updated_at',)


@admin.register(UserScorePeriod)
class UserScorePeriodAdmin(admin.ModelAdmin):
	list_display = ('user', 'period_type', 'period_start', 'period_end', 'activity_xp', 'leaderboard_score', 'updated_at')
	list_filter = ('period_type', 'period_start')
	search_fields = ('user__username', 'user__email')
	readonly_fields = ('updated_at',)


@admin.register(UserGoal)
class UserGoalAdmin(admin.ModelAdmin):
	list_display = ('user', 'goal_profile', 'weekly_workouts_target', 'active_days_target', 'updated_at')
	list_filter = ('goal_profile',)
	search_fields = ('user__username', 'user__email')
	readonly_fields = ('updated_at',)


@admin.register(WorkoutDraft)
class WorkoutDraftAdmin(admin.ModelAdmin):
	list_display = ('user', 'title', 'duration_seconds', 'created_at', 'updated_at')
	search_fields = ('user__username', 'user__email', 'title')
	readonly_fields = ('created_at', 'updated_at')
