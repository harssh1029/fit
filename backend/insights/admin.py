from django.contrib import admin

from .models import FitnessAssessment, RaceBenchmark, UserMetricsSnapshot


@admin.register(FitnessAssessment)
class FitnessAssessmentAdmin(admin.ModelAdmin):
	list_display = (
		'user',
		'tested_at',
		'age_years',
		'gender',
		'resting_heart_rate',
		'max_pushups',
		'max_run_minutes',
	)
	list_filter = ('gender', 'source')
	search_fields = ('user__username', 'user__email')


@admin.register(RaceBenchmark)
class RaceBenchmarkAdmin(admin.ModelAdmin):
	list_display = (
		'user',
		'plan',
		'user_plan',
		'is_initial',
		'run_1km_seconds',
		'wall_balls_unbroken',
		'sled_difficulty',
		'energy_level',
		'created_at',
	)
	list_filter = ('is_initial', 'plan')
	search_fields = ('user__username', 'user__email')


@admin.register(UserMetricsSnapshot)
class UserMetricsSnapshotAdmin(admin.ModelAdmin):
	list_display = (
		'user',
		'fitness_age_years',
		'percentile_rank_overall',
		'race_readiness_score',
		'current_streak_days',
		'total_minutes_30d',
		'body_balance_score',
		'computed_at',
	)
	list_filter = ('computed_at',)
	search_fields = ('user__username', 'user__email')
	readonly_fields = (
		'computed_at',
		'fitness_age_detail',
		'percentile_detail',
		'race_readiness_detail',
		'streak_detail',
		'total_time_detail',
		'body_battle_map_detail',
	)
