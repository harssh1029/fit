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
	ENTRY_SOURCE_CHOICES = [
		('manual', 'Manual'),
		('recorded_timer', 'Recorded timer'),
		('plan_workout', 'Plan workout'),
		('challenge_workout', 'Challenge workout'),
	]
	WORKOUT_TYPE_CHOICES = [
		('strength', 'Strength'),
		('cardio', 'Cardio'),
		('conditioning', 'Conditioning'),
		('mobility', 'Mobility'),
		('sport', 'Sport'),
		('recovery', 'Recovery'),
		('custom', 'Custom'),
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
	title = models.CharField(max_length=255, blank=True)
	workout_type = models.CharField(
		max_length=32,
		choices=WORKOUT_TYPE_CHOICES,
		default='custom',
	)
	entry_source = models.CharField(
		max_length=32,
		choices=ENTRY_SOURCE_CHOICES,
		default='manual',
	)
	intensity = models.CharField(max_length=32, blank=True)
	trust_level = models.CharField(max_length=32, blank=True)
	focus_label = models.CharField(max_length=128, blank=True)
	body_groups = models.JSONField(default=list, blank=True)
	muscles = models.JSONField(default=list, blank=True)
	modes = models.JSONField(default=list, blank=True)
	caption = models.TextField(blank=True)
	image_url = models.URLField(max_length=1000, blank=True)
	notes = models.TextField(blank=True)
	pr_note = models.CharField(max_length=500, blank=True)
	is_public = models.BooleanField(default=True)
	recorded_seconds = models.PositiveIntegerField(default=0)
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
			models.Index(fields=['user', 'entry_source', 'completed_at']),
		]

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"WorkoutSession(user={self.user_id}, status={self.status}, started_at={self.started_at})"


class WorkoutDraft(models.Model):
	"""Persisted draft for workout records that are not posted yet."""

	user = models.ForeignKey(
		User,
		related_name='workout_drafts',
		on_delete=models.CASCADE,
	)
	title = models.CharField(max_length=255, blank=True)
	duration_seconds = models.PositiveIntegerField(default=0)
	payload = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-updated_at']
		indexes = [
			models.Index(fields=['user', 'updated_at']),
		]

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"WorkoutDraft(user={self.user_id}, title={self.title})"


class WorkoutScore(models.Model):
	"""Audit trail for how a workout contributed to product scores."""

	session = models.OneToOneField(
		WorkoutSession,
		related_name='score_record',
		on_delete=models.CASCADE,
	)
	activity_xp = models.PositiveIntegerField(default=0)
	leaderboard_xp = models.PositiveIntegerField(default=0)
	challenge_points = models.PositiveIntegerField(default=0)
	base_score = models.FloatField(default=0)
	duration_multiplier = models.FloatField(default=1)
	intensity_multiplier = models.FloatField(default=1)
	type_multiplier = models.FloatField(default=1)
	trust_multiplier = models.FloatField(default=1)
	completion_bonus = models.FloatField(default=0)
	detail_bonus = models.FloatField(default=0)
	anti_spam_modifier = models.FloatField(default=1)
	overtraining_modifier = models.FloatField(default=1)
	calculation_breakdown = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"WorkoutScore(session={self.session_id}, xp={self.activity_xp})"


class UserScoreSummary(models.Model):
	"""Cached score buckets powering profile, feed, and leaderboards."""

	user = models.OneToOneField(
		User,
		related_name='score_summary',
		on_delete=models.CASCADE,
	)
	total_xp = models.PositiveIntegerField(default=0)
	weekly_xp = models.PositiveIntegerField(default=0)
	monthly_xp = models.PositiveIntegerField(default=0)
	career_xp = models.PositiveIntegerField(default=0)
	performance_score = models.FloatField(default=0)
	consistency_score = models.FloatField(default=0)
	training_balance_score = models.FloatField(default=0)
	challenge_score = models.FloatField(default=0)
	strength_score = models.FloatField(default=0)
	cardio_score = models.FloatField(default=0)
	conditioning_score = models.FloatField(default=0)
	mobility_score = models.FloatField(default=0)
	sport_score = models.FloatField(default=0)
	recovery_score = models.FloatField(default=0)
	upper_body_score = models.FloatField(default=0)
	lower_body_score = models.FloatField(default=0)
	core_score = models.FloatField(default=0)
	push_score = models.FloatField(default=0)
	pull_score = models.FloatField(default=0)
	legs_score = models.FloatField(default=0)
	full_body_score = models.FloatField(default=0)
	body_part_scores = models.JSONField(default=dict, blank=True)
	manual_log_count = models.PositiveIntegerField(default=0)
	recorded_log_count = models.PositiveIntegerField(default=0)
	active_days_count = models.PositiveIntegerField(default=0)
	streak_count = models.PositiveIntegerField(default=0)
	tier = models.CharField(max_length=32, default='Rookie')
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"UserScoreSummary(user={self.user_id}, xp={self.total_xp})"


class UserScorePeriod(models.Model):
	PERIOD_CHOICES = [
		('daily', 'Daily'),
		('weekly', 'Weekly'),
		('monthly', 'Monthly'),
		('rolling_30', 'Rolling 30 days'),
	]

	user = models.ForeignKey(
		User,
		related_name='score_periods',
		on_delete=models.CASCADE,
	)
	period_type = models.CharField(max_length=16, choices=PERIOD_CHOICES)
	period_start = models.DateField()
	period_end = models.DateField()
	activity_xp = models.FloatField(default=0)
	consistency_score = models.FloatField(default=0)
	challenge_score = models.FloatField(default=0)
	balance_bonus = models.FloatField(default=0)
	leaderboard_score = models.FloatField(default=0)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('user', 'period_type', 'period_start', 'period_end')
		indexes = [
			models.Index(fields=['period_type', 'period_start', 'leaderboard_score']),
			models.Index(fields=['user', 'period_type']),
		]

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"UserScorePeriod(user={self.user_id}, type={self.period_type}, score={self.leaderboard_score})"


class UserGoal(models.Model):
	GOAL_PROFILE_CHOICES = [
		('gym', 'Gym'),
		('cardio', 'Cardio'),
		('hybrid', 'Hybrid'),
	]

	user = models.OneToOneField(
		User,
		related_name='training_goal',
		on_delete=models.CASCADE,
	)
	goal_profile = models.CharField(
		max_length=16,
		choices=GOAL_PROFILE_CHOICES,
		default='hybrid',
	)
	weekly_workouts_target = models.PositiveSmallIntegerField(default=4)
	active_days_target = models.PositiveSmallIntegerField(default=4)
	custom_targets = models.JSONField(default=dict, blank=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"UserGoal(user={self.user_id}, profile={self.goal_profile})"


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
