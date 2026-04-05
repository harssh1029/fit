from django.contrib import admin

from .models import FitnessAssessment, RaceBenchmark


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
