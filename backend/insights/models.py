from django.contrib.auth import get_user_model
from django.db import models

from plans.models import Plan, UserPlan


User = get_user_model()


class FitnessAssessment(models.Model):
	"""Snapshot of a user's fitness test inputs for Fitness Age / Percentile metrics.

	We keep a history of assessments so future features can show trends over time.
	"""

	CAN_TOUCH_TOES_CHOICES = [
		('yes', 'Yes'),
		('almost', 'Almost'),
		('no', 'No'),
	]

	GENDER_CHOICES = [
		('male', 'Male'),
		('female', 'Female'),
	]

	user = models.ForeignKey(
		User,
		related_name='fitness_assessments',
		on_delete=models.CASCADE,
	)
	# Snapshot of profile/body metrics at the time of the test
	age_years = models.PositiveSmallIntegerField(
		help_text='Age in years at the time of the assessment.',
	)
	gender = models.CharField(
		max_length=16,
		choices=GENDER_CHOICES,
		help_text='Gender at time of assessment.',
	)
	height_cm = models.FloatField(
		null=True,
		blank=True,
		help_text='Height in centimeters at time of assessment.',
	)
	weight_kg = models.FloatField(
		null=True,
		blank=True,
		help_text='Weight in kilograms at time of assessment.',
	)
	waist_cm = models.FloatField(
		null=True,
		blank=True,
		help_text='Waist circumference in centimeters at time of assessment.',
	)

	# Fitness test inputs
	resting_heart_rate = models.PositiveSmallIntegerField(
		help_text='Resting heart rate in beats per minute (bpm).',
	)
	max_pushups = models.PositiveSmallIntegerField(
		help_text='Maximum push-ups in one continuous set.',
	)
	max_run_minutes = models.PositiveSmallIntegerField(
		help_text='How many minutes the user can run without stopping.',
	)
	can_touch_toes = models.CharField(
		max_length=8,
		choices=CAN_TOUCH_TOES_CHOICES,
		help_text='Self-reported flexibility test result.',
	)
	sleep_hours = models.FloatField(
		help_text='Average hours of sleep per night.',
	)

	source = models.CharField(
		max_length=32,
		blank=True,
		help_text='Optional label such as "onboarding" or "retest".',
	)
	tested_at = models.DateTimeField(
		auto_now_add=True,
		help_text='Timestamp when this assessment record was created.',
	)

	class Meta:
		ordering = ['-tested_at']

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"FitnessAssessment(user={self.user_id}, tested_at={self.tested_at})"


class RaceBenchmark(models.Model):
	"""Benchmark tests for a specific user-plan journey.

	Used for Race Readiness calculations (e.g. Hyrox baseline vs latest test).
	Each row represents one benchmark test instance.
	"""

	user = models.ForeignKey(
		User,
		related_name='race_benchmarks',
		on_delete=models.CASCADE,
	)
	plan = models.ForeignKey(
		Plan,
		related_name='race_benchmarks',
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
	)
	user_plan = models.ForeignKey(
		UserPlan,
		related_name='race_benchmarks',
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
	)
	# Benchmark fields
	run_1km_seconds = models.PositiveIntegerField(
		help_text='Time to complete 1km run, in seconds.',
	)
	wall_balls_unbroken = models.PositiveSmallIntegerField(
		help_text='Max wall balls in one unbroken set.',
	)
	sled_difficulty = models.PositiveSmallIntegerField(
		help_text='Perceived sled difficulty on a 1-5 scale (5 = very hard).',
	)
	energy_level = models.PositiveSmallIntegerField(
		help_text='Self-reported energy level on a 1-5 scale.',
	)
	is_initial = models.BooleanField(
		default=False,
		help_text='Marks the initial Day 1 benchmark for this user-plan.',
	)
	notes = models.CharField(max_length=255, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['user', 'created_at']),
			models.Index(fields=['user_plan', 'created_at']),
		]

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"RaceBenchmark(user={self.user_id}, plan={self.plan_id}, created_at={self.created_at})"


class UserMetricsSnapshot(models.Model):
	"""Aggregated dashboard metrics snapshot for a user.

	We keep a single "latest" snapshot per user and recompute it on demand
	(e.g. after workout completion or via a periodic task).
	"""

	user = models.OneToOneField(
		User,
		related_name='metrics_snapshot',
		on_delete=models.CASCADE,
	)
	computed_at = models.DateTimeField(auto_now=True)

	# --- Scalar summary fields for quick access ---
	fitness_age_years = models.PositiveSmallIntegerField(null=True, blank=True)
	percentile_rank_overall = models.FloatField(null=True, blank=True)
	race_readiness_score = models.FloatField(null=True, blank=True)
	current_streak_days = models.PositiveIntegerField(default=0)
	longest_streak_days = models.PositiveIntegerField(default=0)
	streak_multiplier = models.FloatField(null=True, blank=True)
	total_minutes_7d = models.PositiveIntegerField(default=0)
	total_minutes_30d = models.PositiveIntegerField(default=0)
	total_minutes_all_time = models.PositiveIntegerField(default=0)
	body_balance_score = models.FloatField(null=True, blank=True)

	# --- Structured per-metric detail payloads (flexible JSON) ---
	fitness_age_detail = models.JSONField(default=dict, blank=True)
	percentile_detail = models.JSONField(default=dict, blank=True)
	race_readiness_detail = models.JSONField(default=dict, blank=True)
	streak_detail = models.JSONField(default=dict, blank=True)
	total_time_detail = models.JSONField(default=dict, blank=True)
	body_battle_map_detail = models.JSONField(default=dict, blank=True)

	class Meta:
		verbose_name = 'User metrics snapshot'
		verbose_name_plural = 'User metrics snapshots'

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"UserMetricsSnapshot(user={self.user_id}, computed_at={self.computed_at})"
