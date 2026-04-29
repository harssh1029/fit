from rest_framework import serializers

from .models import Challenge
from .services import evaluate_challenge_unlock


class ChallengeSerializer(serializers.ModelSerializer):
    unlockProgress = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = ["id", "order", "card", "detail", "unlock", "unlockProgress"]

    def _evaluation_for(self, instance: Challenge):
        cache = self.context.setdefault("_unlock_evaluations", {})
        if instance.id in cache:
            return cache[instance.id]
        request = self.context.get("request")
        user = getattr(request, "user", None)
        completed_ids = self.context.get("completed_challenge_ids")
        if completed_ids is not None and not isinstance(completed_ids, set):
            completed_ids = set(completed_ids)
        evaluation = evaluate_challenge_unlock(
            instance,
            user,
            completed_ids=completed_ids,
            body_groups=self.context.get("body_battle_groups"),
        )
        cache[instance.id] = evaluation
        return evaluation

    def get_unlockProgress(self, instance: Challenge):
        return self._evaluation_for(instance).as_dict()

    def to_representation(self, instance: Challenge):
        rep = super().to_representation(instance)

        # Ensure ``card.status`` reflects the computed state for this user
        # instead of the static seed value stored in the challenge JSON.
        card = rep.get("card") or {}
        completed_ids = self.context.get("completed_challenge_ids") or set()
        if not isinstance(completed_ids, set):
            completed_ids = set(completed_ids)

        evaluation = self._evaluation_for(instance)
        card["status"] = (
            "done"
            if instance.id in completed_ids
            else "unlocked"
            if evaluation.is_unlocked
            else "locked"
        )
        rep["card"] = card
        rep["unlockProgress"] = evaluation.as_dict()
        return rep
