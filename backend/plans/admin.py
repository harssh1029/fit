from django.contrib import admin

from .models import Plan, PlanDay, PlanDayExercise, PlanWeek


class PlanWeekInline(admin.TabularInline):
    model = PlanWeek
    extra = 0


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'level', 'duration_weeks', 'sessions_per_week')
    search_fields = ('id', 'name', 'goal', 'summary')
    inlines = [PlanWeekInline]


@admin.register(PlanWeek)
class PlanWeekAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan', 'number', 'title')
    list_filter = ('plan',)
    search_fields = ('title', 'focus')


class PlanDayExerciseInline(admin.TabularInline):
    model = PlanDayExercise
    extra = 0


@admin.register(PlanDay)
class PlanDayAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan_week', 'day_index', 'title', 'day_type')
    list_filter = ('plan_week__plan', 'day_type')
    search_fields = ('title', 'description')
    inlines = [PlanDayExerciseInline]

