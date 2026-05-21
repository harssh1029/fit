from django.conf import settings
from django.db import models


class Challenge(models.Model):
    """Body Battle challenge definition.

    We intentionally keep the nested structure (card/detail/unlock) in JSON so
    the mobile client can render rich layouts without needing many related
    tables. This also keeps authoring flexible while the design iterates.
    """

    id = models.SlugField(primary_key=True, max_length=32)
    order = models.PositiveSmallIntegerField()

    # Card data shown in the grid/list on the Challenges screen.
    card = models.JSONField()

    # Detail sheet data rendered when the card is opened.
    detail = models.JSONField()

    # Unlock metadata and messaging.
    unlock = models.JSONField()

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.card.get("name") or self.id


class UserChallengeCompletion(models.Model):
    """Per-user record of completed challenges.

    This is intentionally lightweight: detailed workout history lives in the
    workouts/insights domain.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="completed_challenges",
        on_delete=models.CASCADE,
    )
    challenge = models.ForeignKey(
        Challenge,
        related_name="completions",
        on_delete=models.CASCADE,
    )
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-completed_at"]
        unique_together = ("user", "challenge")

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"UserChallengeCompletion(user={self.user_id}, challenge={self.challenge_id})"


class TrainingChallenge(models.Model):
	VISIBILITY_OFFICIAL = "official"
	VISIBILITY_COMMUNITY = "community"
	VISIBILITY_GROUP = "group"
	VISIBILITY_CHOICES = [
		(VISIBILITY_OFFICIAL, "Official"),
		(VISIBILITY_COMMUNITY, "Community"),
		(VISIBILITY_GROUP, "Group"),
	]
	STATUS_DRAFT = "draft"
	STATUS_ACTIVE = "active"
	STATUS_COMPLETED = "completed"
	STATUS_ARCHIVED = "archived"
	STATUS_CHOICES = [
		(STATUS_DRAFT, "Draft"),
		(STATUS_ACTIVE, "Active"),
		(STATUS_COMPLETED, "Completed"),
		(STATUS_ARCHIVED, "Archived"),
	]

	name = models.CharField(max_length=180)
	description = models.CharField(max_length=600, blank=True)
	requirement = models.CharField(max_length=260)
	duration_days = models.PositiveSmallIntegerField(default=7)
	eligible_workout_types = models.JSONField(default=list, blank=True)
	eligible_body_parts = models.JSONField(default=list, blank=True)
	minimum_duration = models.PositiveSmallIntegerField(default=20)
	required_sessions = models.PositiveSmallIntegerField(default=3)
	allowed_intensity = models.JSONField(default=list, blank=True)
	visibility = models.CharField(max_length=24, choices=VISIBILITY_CHOICES, default=VISIBILITY_COMMUNITY)
	is_official = models.BooleanField(default=False)
	group = models.ForeignKey(
		"community.CommunityGroup",
		related_name="training_challenges",
		null=True,
		blank=True,
		on_delete=models.CASCADE,
	)
	created_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name="created_training_challenges",
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
	)
	start_date = models.DateField(null=True, blank=True)
	end_date = models.DateField(null=True, blank=True)
	badge_icon = models.CharField(max_length=64, blank=True)
	reward_xp = models.PositiveIntegerField(default=150)
	status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
	participant_count = models.PositiveIntegerField(default=0)
	trending_score = models.FloatField(default=0)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-trending_score", "-created_at"]
		indexes = [
			models.Index(fields=["status", "visibility"]),
			models.Index(fields=["start_date", "end_date"]),
			models.Index(fields=["group", "status"]),
		]

	def __str__(self) -> str:  # pragma: no cover - trivial
		return self.name


class UserChallengeEnrollment(models.Model):
	STATUS_ACTIVE = "active"
	STATUS_COMPLETED = "completed"
	STATUS_LEFT = "left"
	STATUS_CHOICES = [
		(STATUS_ACTIVE, "Active"),
		(STATUS_COMPLETED, "Completed"),
		(STATUS_LEFT, "Left"),
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="training_challenge_enrollments", on_delete=models.CASCADE)
	challenge = models.ForeignKey(TrainingChallenge, related_name="enrollments", on_delete=models.CASCADE)
	status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
	joined_at = models.DateTimeField(auto_now_add=True)
	completed_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		unique_together = ("user", "challenge")
		indexes = [
			models.Index(fields=["user", "status"]),
			models.Index(fields=["challenge", "status"]),
		]


class UserChallengeProgress(models.Model):
	enrollment = models.OneToOneField(UserChallengeEnrollment, related_name="progress", on_delete=models.CASCADE)
	sessions_completed = models.PositiveSmallIntegerField(default=0)
	progress_percent = models.PositiveSmallIntegerField(default=0)
	points = models.PositiveIntegerField(default=0)
	active_days = models.PositiveSmallIntegerField(default=0)
	qualifying_workout_ids = models.JSONField(default=list, blank=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-points", "-sessions_completed", "updated_at"]
