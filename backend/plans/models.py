from django.contrib.auth import get_user_model
from django.db import models


User = get_user_model()


class Plan(models.Model):
    """High-level training plan, e.g. Hyrox Intense 3-week prep."""

    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    id = models.SlugField(primary_key=True, max_length=128)
    name = models.CharField(max_length=255)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES)
    duration_weeks = models.PositiveSmallIntegerField()
    goal = models.TextField()
    summary = models.TextField()
    audience = models.TextField()
    result = models.TextField()
    sessions_per_week = models.PositiveSmallIntegerField(default=7)
    long_description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name


class PlanWeek(models.Model):
    """Week-level structure for a plan (e.g. Week 1: Build the Engine)."""

    plan = models.ForeignKey(Plan, related_name='weeks', on_delete=models.CASCADE)
    number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255)
    focus = models.CharField(max_length=255)
    highlights = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['plan', 'number']
        unique_together = ('plan', 'number')

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.plan_id} - Week {self.number}"


class PlanDay(models.Model):
    """Day-level details including structured exercises + nutrition/supplements."""

    DAY_TYPE_CHOICES = [
        ('strength', 'Strength'),
        ('cardio', 'Cardio'),
        ('recovery', 'Recovery'),
        ('mixed', 'Mixed'),
    ]

    plan_week = models.ForeignKey(
        PlanWeek, related_name='days', on_delete=models.CASCADE
    )
    day_index = models.PositiveSmallIntegerField(
        help_text='Absolute day index in the plan (e.g. 1-21).'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(
        blank=True,
        help_text='Coach notes / long-form description of the session.',
    )
    duration = models.CharField(
        max_length=32,
        blank=True,
        help_text="Free-form duration label like '75 min' or 'Race'.",
    )
    day_type = models.CharField(max_length=16, choices=DAY_TYPE_CHOICES)
    workout_template_id = models.SlugField(
        max_length=128,
        blank=True,
        help_text='Optional link to a WorkoutTemplate ID.',
    )

    # Flexible blobs so we can evolve the structure without migrations.
    nutrition = models.JSONField(default=dict, blank=True)
    supplements = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['plan_week__plan_id', 'day_index']
        unique_together = ('plan_week', 'day_index')

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.plan_week.plan_id} - Day {self.day_index}: {self.title}"


class PlanDayExercise(models.Model):
    """Individual exercise rows for a given plan day (for the workout dialog)."""

    plan_day = models.ForeignKey(
        PlanDay,
        related_name='exercises',
        on_delete=models.CASCADE,
    )
    order = models.PositiveSmallIntegerField(default=0)
    label = models.CharField(
        max_length=255,
        help_text='Name of the block/exercise, e.g. "Barbell Deadlift" or "Warm Up".',
    )
    primary = models.CharField(
        max_length=255,
        blank=True,
        help_text='Primary prescription, e.g. "3 × 3" or "10 min".',
    )
    secondary = models.CharField(
        max_length=255,
        blank=True,
        help_text='Optional secondary detail, e.g. "80% 1RM" or "Easy pace".',
    )

    class Meta:
        ordering = ['plan_day', 'order', 'id']

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.plan_day} - {self.label} ({self.primary})"


class UserPlan(models.Model):
	"""Link between a user and a Plan, with enrollment and progress metadata.

	This is the per-user instance of a Plan and is the anchor for plan progress,
	Race Readiness, and other journey-level analytics.
	"""

	STATUS_CHOICES = [
		('active', 'Active'),
		('completed', 'Completed'),
		('cancelled', 'Cancelled'),
		('paused', 'Paused'),
	]

	user = models.ForeignKey(
		User,
		related_name='user_plans',
		on_delete=models.CASCADE,
	)
	plan = models.ForeignKey(
		Plan,
		related_name='user_plans',
		on_delete=models.CASCADE,
	)
	is_active = models.BooleanField(
		default=True,
		help_text='Whether this is the user\'s currently active instance of the plan.',
	)
	status = models.CharField(
		max_length=16,
		choices=STATUS_CHOICES,
		default='active',
	)
	started_at = models.DateTimeField(null=True, blank=True)
	expected_end_at = models.DateTimeField(null=True, blank=True)
	completed_at = models.DateTimeField(null=True, blank=True)
	sessions_completed = models.PositiveIntegerField(
		default=0,
		help_text='Cached count of completed WorkoutSessions for this user plan.',
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['user', 'is_active']),
			models.Index(fields=['plan']),
		]

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"UserPlan(user={self.user_id}, plan={self.plan_id}, status={self.status})"

