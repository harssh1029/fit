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
