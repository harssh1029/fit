from rest_framework import serializers

from .models import Challenge
from .services import challenge_is_unlocked_for_user


class ChallengeSerializer(serializers.ModelSerializer):
	    class Meta:
	        model = Challenge
	        fields = ["id", "order", "card", "detail", "unlock"]

	    def to_representation(self, instance: Challenge):
	        rep = super().to_representation(instance)
	        request = self.context.get("request")

	        # Ensure ``card.status`` reflects the *computed* unlock + completion
	        # state for the current user instead of the static seed value.
	        card = rep.get("card") or {}
	        user = getattr(request, "user", None)
	        is_unlocked = challenge_is_unlocked_for_user(instance, user)

	        completed_ids = self.context.get("completed_challenge_ids") or set()
	        # ``completed_challenge_ids`` may be a list from the view; normalize to a
	        # set for fast lookup.
	        if not isinstance(completed_ids, set):
	            completed_ids = set(completed_ids)

	        if instance.id in completed_ids:
	            status = "done"
	        else:
	            status = "unlocked" if is_unlocked else "locked"

	        card["status"] = status
	        rep["card"] = card
	        return rep
