from django.contrib import admin

from .models import SessionExercise, WorkoutSession


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
	list_display = (
		'user',
		'plan',
		'user_plan',
		'status',
		'started_at',
		'completed_at',
		'duration_minutes',
	)
	list_filter = ('status', 'plan')
	search_fields = ('user__username', 'user__email')


@admin.register(SessionExercise)
class SessionExerciseAdmin(admin.ModelAdmin):
	list_display = (
		'session',
		'exercise',
		'is_completed',
		'completed_at',
	)
	list_filter = ('is_completed',)
