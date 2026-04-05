from django.db import models


class MuscleGroup(models.Model):
    """Catalog of muscle groups used for filters and the body map."""

    id = models.SlugField(primary_key=True, max_length=64)
    name = models.CharField(max_length=100)
    side = models.CharField(
        max_length=16,
        choices=[('front', 'Front'), ('back', 'Back'), ('both', 'Both')],
    )
    regions = models.JSONField(default=list, blank=True)
    aliases = models.JSONField(default=list, blank=True)
    canonical_group = models.CharField(
        max_length=32,
        blank=True,
        help_text=(
            "7-group mapping used by Body Battle Map: "
            "chest, shoulders, arms, back, core, glutes, legs."
        ),
    )

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name


class Exercise(models.Model):
    """Atomic exercise definition, referenced from WorkoutTemplates."""

    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    id = models.SlugField(primary_key=True, max_length=128)
    name = models.CharField(max_length=255)
    primary_muscles = models.ManyToManyField(
        MuscleGroup, related_name='primary_exercises'
    )
    secondary_muscles = models.ManyToManyField(
        MuscleGroup,
        related_name='secondary_exercises',
        blank=True,
    )
    movement_pattern = models.CharField(max_length=64)
    equipment = models.JSONField(default=list, blank=True)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES, default='beginner')
    is_compound = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    # Optional external metadata (e.g. imported from ExerciseDB)
    source = models.CharField(
        max_length=32,
        default='internal',
        help_text='Origin of this exercise definition, e.g. internal|exercisedb.',
    )
    body_part = models.CharField(
        max_length=64,
        blank=True,
        help_text='High-level body part from external APIs (e.g. chest, back, cardio).',
    )
    target = models.CharField(
        max_length=128,
        blank=True,
        help_text='Primary target muscle or system from external APIs.',
    )
    secondary_targets = models.JSONField(
        default=list,
        blank=True,
        help_text='Secondary target muscles from external APIs.',
    )
    video_url = models.URLField(blank=True)
    gif_url = models.URLField(blank=True)
    image_url = models.URLField(blank=True)
    instructions = models.JSONField(
        default=list,
        blank=True,
        help_text='Step-by-step instructions; list of strings.',
    )
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name
