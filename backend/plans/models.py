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
    subtitle = models.CharField(max_length=255, blank=True)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES)
    duration_weeks = models.PositiveSmallIntegerField()
    goal = models.TextField()
    summary = models.TextField()
    audience = models.TextField()
    result = models.TextField()
    sessions_per_week = models.PositiveSmallIntegerField(default=7)
    default_sessions_per_week = models.PositiveSmallIntegerField(default=4)
    long_description = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    supported_sessions_per_week = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    is_premium_plan = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name


class PlanVersion(models.Model):
    """A concrete day-per-week version of a master plan."""

    id = models.SlugField(primary_key=True, max_length=128)
    plan = models.ForeignKey(Plan, related_name='versions', on_delete=models.CASCADE)
    sessions_per_week = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255)
    description = models.TextField()
    is_default = models.BooleanField(default=False)
    is_premium = models.BooleanField(default=False)
    split_type = models.CharField(max_length=128)
    training_days_pattern = models.JSONField(default=list)
    total_sessions = models.PositiveSmallIntegerField()
    weekly_structure = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['plan_id', 'sessions_per_week']
        unique_together = ('plan', 'sessions_per_week')

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.title


class PlanWeek(models.Model):
    """Week-level structure for a plan (e.g. Week 1: Build the Engine)."""

    plan = models.ForeignKey(Plan, related_name='weeks', on_delete=models.CASCADE)
    plan_version = models.ForeignKey(
        PlanVersion,
        related_name='weeks',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255)
    focus = models.CharField(max_length=255)
    coach_note = models.TextField(blank=True)
    intensity_theme = models.CharField(max_length=255, blank=True)
    highlights = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['plan', 'number']
        unique_together = ('plan', 'plan_version', 'number')

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.plan_id} - Week {self.number}"


class PlanDay(models.Model):
    """Day-level details including structured exercises + nutrition/supplements."""

    DAY_TYPE_CHOICES = [
        ('strength', 'Strength'),
        ('cardio', 'Cardio'),
        ('recovery', 'Recovery'),
        ('mixed', 'Mixed'),
        ('hybrid_strength_run', 'Hybrid Strength Run'),
        ('run_upper_engine', 'Run Upper Engine'),
        ('compromised_running', 'Compromised Running'),
        ('hyrox_simulation', 'HYROX Simulation'),
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
    duration_minutes = models.PositiveSmallIntegerField(default=0)
    day_type = models.CharField(max_length=32, choices=DAY_TYPE_CHOICES)
    intensity = models.CharField(max_length=32, blank=True)
    rpe_target = models.CharField(max_length=32, blank=True)
    primary_focus = models.CharField(max_length=255, blank=True)
    secondary_focus = models.CharField(max_length=255, blank=True)
    coach_note = models.TextField(blank=True)
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
    exercise = models.ForeignKey(
        'PlanExercise',
        related_name='plan_day_links',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    order = models.PositiveSmallIntegerField(default=0)
    block = models.CharField(max_length=64, blank=True)
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
    prescription = models.JSONField(default=dict, blank=True)
    coach_instruction = models.TextField(blank=True)
    progression_rule = models.TextField(blank=True)

    class Meta:
        ordering = ['plan_day', 'order', 'id']

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.plan_day} - {self.label} ({self.primary})"


class PlanExercise(models.Model):
    """Reusable exercise database for structured professional plans."""

    id = models.SlugField(primary_key=True, max_length=128)
    name = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=128)
    movement_pattern = models.CharField(max_length=128, blank=True)
    primary_muscles = models.JSONField(default=list, blank=True)
    secondary_muscles = models.JSONField(default=list, blank=True)
    equipment = models.JSONField(default=list, blank=True)
    difficulty = models.CharField(max_length=32, blank=True)
    priority_score = models.PositiveSmallIntegerField(default=5)
    fatigue_score = models.PositiveSmallIntegerField(default=5)
    goal_tags = models.JSONField(default=list, blank=True)
    coaching_cues = models.JSONField(default=list, blank=True)
    common_mistakes = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name


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
	plan_version = models.ForeignKey(
		PlanVersion,
		related_name='user_plans',
		null=True,
		blank=True,
		on_delete=models.PROTECT,
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
	sessions_per_week = models.PositiveSmallIntegerField(default=4)
	start_date = models.DateField(null=True, blank=True)
	end_date = models.DateField(null=True, blank=True)
	original_end_date = models.DateField(null=True, blank=True)
	is_recalibrated = models.BooleanField(default=False)
	recalibration_count = models.PositiveSmallIntegerField(default=0)
	sessions_completed = models.PositiveIntegerField(
		default=0,
		help_text='Cached count of completed WorkoutSessions for this user plan.',
	)
	completed_sessions = models.PositiveIntegerField(default=0)
	missed_sessions = models.PositiveIntegerField(default=0)
	total_sessions = models.PositiveIntegerField(default=0)
	completion_percent = models.DecimalField(default=0, max_digits=5, decimal_places=2)
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


class UserScheduledWorkout(models.Model):
	"""A dated workout instance generated from a user's selected plan version."""

	STATUS_CHOICES = [
		('scheduled', 'Scheduled'),
		('completed', 'Completed'),
		('missed', 'Missed'),
		('skipped', 'Skipped'),
	]

	user_plan = models.ForeignKey(
		UserPlan,
		related_name='scheduled_workouts',
		on_delete=models.CASCADE,
	)
	plan_day = models.ForeignKey(
		PlanDay,
		related_name='scheduled_workouts',
		on_delete=models.PROTECT,
	)
	week_number = models.PositiveSmallIntegerField()
	day_index = models.PositiveSmallIntegerField()
	scheduled_date = models.DateField()
	original_scheduled_date = models.DateField()
	status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='scheduled')
	completed_at = models.DateTimeField(null=True, blank=True)
	missed_at = models.DateTimeField(null=True, blank=True)
	order_index = models.PositiveSmallIntegerField()

	class Meta:
		ordering = ['user_plan', 'order_index']
		indexes = [
			models.Index(fields=['user_plan', 'status']),
			models.Index(fields=['scheduled_date']),
		]

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"{self.user_plan_id} - {self.plan_day_id} on {self.scheduled_date}"
