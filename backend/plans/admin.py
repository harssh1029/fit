from django.contrib import admin

from .models import (
    Plan,
    PlanDay,
    PlanDayExercise,
    PlanExercise,
    PlanVersion,
    PlanWeek,
    UserPlan,
    UserScheduledWorkout,
)


class PlanWeekInline(admin.TabularInline):
    model = PlanWeek
    extra = 0


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'level', 'duration_weeks', 'default_sessions_per_week', 'is_active')
    search_fields = ('id', 'name', 'goal', 'summary')
    inlines = [PlanWeekInline]


@admin.register(PlanWeek)
class PlanWeekAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan', 'plan_version', 'number', 'title')
    list_filter = ('plan', 'plan_version')
    search_fields = ('title', 'focus')


class PlanDayExerciseInline(admin.TabularInline):
    model = PlanDayExercise
    extra = 0


@admin.register(PlanDay)
class PlanDayAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan_week', 'day_index', 'title', 'day_type', 'intensity', 'rpe_target')
    list_filter = ('plan_week__plan', 'plan_week__plan_version', 'day_type', 'intensity')
    search_fields = ('title', 'description')
    inlines = [PlanDayExerciseInline]


@admin.register(PlanVersion)
class PlanVersionAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan', 'sessions_per_week', 'is_default', 'is_premium', 'total_sessions')
    list_filter = ('plan', 'sessions_per_week', 'is_default', 'is_premium')
    search_fields = ('id', 'title', 'description')


@admin.register(PlanExercise)
class PlanExerciseAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'difficulty', 'priority_score', 'fatigue_score')
    list_filter = ('category', 'difficulty')
    search_fields = ('id', 'name')


@admin.register(UserPlan)
class UserPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'plan', 'plan_version', 'status', 'completion_percent', 'end_date')
    list_filter = ('status', 'plan', 'plan_version', 'is_recalibrated')


@admin.register(UserScheduledWorkout)
class UserScheduledWorkoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_plan', 'plan_day', 'scheduled_date', 'status', 'order_index')
    list_filter = ('status', 'scheduled_date')
