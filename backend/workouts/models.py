from django.contrib.auth import get_user_model
from django.db import models

from exercises.models import Exercise
from plans.models import Plan, UserPlan


User = get_user_model()


class WorkoutSession(models.Model):
	"""Per-user workout instance (planned or quick).

	Represents a single workout attempt and is the primary log for durations,
	completion status, and plan linkage. This is the backbone for Race Readiness,
	Total Time, Streaks, and Body Battle Map.
	"""

	STATUS_CHOICES = [
		('in_progress', 'In progress'),
		('completed', 'Completed'),
		('cancelled', 'Cancelled'),
	]

	user = models.ForeignKey(
		User,
		related_name='workout_sessions',
		on_delete=models.CASCADE,
	)
	plan = models.ForeignKey(
		Plan,
		related_name='workout_sessions',
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
	)
	user_plan = models.ForeignKey(
		UserPlan,
		related_name='workout_sessions',
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
	)
	workout_template_id = models.SlugField(
		max_length=128,
		blank=True,
		help_text='Identifier of the WorkoutTemplate this session is based on.',
	)
	planned_week_number = models.PositiveSmallIntegerField(
		null=True,
		blank=True,
		help_text='Denormalised week number within the plan for analytics.',
	)
	planned_day_key = models.CharField(
		max_length=32,
		blank=True,
		help_text="Identifier for the plan day (e.g. 'w1_mon').",
	)
	quick_workout_id = models.SlugField(
		max_length=128,
		blank=True,
		help_text='Optional ID for quick workouts not tied to a plan.',
	)
	status = models.CharField(
		max_length=16,
		choices=STATUS_CHOICES,
		default='in_progress',
	)
	started_at = models.DateTimeField(
		auto_now_add=True,
		help_text='When the user started this session.',
	)
	completed_at = models.DateTimeField(
		null=True,
		blank=True,
		help_text='When the user completed this session.',
	)
	duration_minutes = models.PositiveSmallIntegerField(
		null=True,
		blank=True,
		help_text='Total duration of the workout in minutes.',
	)
	metadata = models.JSONField(
		default=dict,
		blank=True,
		help_text='Optional extra data (e.g. RPE summary, device IDs).',
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-started_at']
		indexes = [
			models.Index(fields=['user', 'status']),
			models.Index(fields=['user', 'completed_at']),
			models.Index(fields=['plan', 'user_plan']),
		]

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"WorkoutSession(user={self.user_id}, status={self.status}, started_at={self.started_at})"


class SessionExercise(models.Model):
	"""Per-exercise completion within a WorkoutSession.

	We do not track every set; instead, we capture whether the prescribed
	exercise was completed, plus basic prescription metadata for analytics.
	"""

	session = models.ForeignKey(
		WorkoutSession,
		related_name='session_exercises',
		on_delete=models.CASCADE,
	)
	exercise = models.ForeignKey(
		Exercise,
		related_name='session_exercises',
		on_delete=models.CASCADE,
	)
	sets_prescribed = models.PositiveSmallIntegerField(
		null=True,
		blank=True,
		help_text='Sets prescribed for this exercise, copied from template.',
	)
	reps_prescribed = models.PositiveSmallIntegerField(
		null=True,
		blank=True,
		help_text='Reps prescribed per set, copied from template.',
	)
	is_completed = models.BooleanField(default=False)
	completed_at = models.DateTimeField(
		null=True,
		blank=True,
		help_text='When this exercise was marked complete, if applicable.',
	)

	class Meta:
		ordering = ['session', 'id']
		unique_together = ('session', 'exercise')

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"SessionExercise(session={self.session_id}, exercise={self.exercise_id})"
