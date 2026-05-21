from rest_framework import serializers

from .models import Challenge, TrainingChallenge
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


class TrainingChallengeSerializer(serializers.ModelSerializer):
	groupId = serializers.IntegerField(source="group_id", read_only=True)
	createdById = serializers.IntegerField(source="created_by_id", read_only=True)
	durationDays = serializers.IntegerField(source="duration_days", read_only=True)
	eligibleWorkoutTypes = serializers.JSONField(source="eligible_workout_types", read_only=True)
	eligibleBodyParts = serializers.JSONField(source="eligible_body_parts", read_only=True)
	minimumDuration = serializers.IntegerField(source="minimum_duration", read_only=True)
	requiredSessions = serializers.IntegerField(source="required_sessions", read_only=True)
	allowedIntensity = serializers.JSONField(source="allowed_intensity", read_only=True)
	badgeIcon = serializers.CharField(source="badge_icon", read_only=True)
	rewardXp = serializers.IntegerField(source="reward_xp", read_only=True)
	participantCount = serializers.IntegerField(source="participant_count", read_only=True)

	class Meta:
		model = TrainingChallenge
		fields = [
			"id",
			"name",
			"description",
			"requirement",
			"durationDays",
			"eligibleWorkoutTypes",
			"eligibleBodyParts",
			"minimumDuration",
			"requiredSessions",
			"allowedIntensity",
			"visibility",
			"is_official",
			"groupId",
			"createdById",
			"start_date",
			"end_date",
			"badgeIcon",
			"rewardXp",
			"status",
			"participantCount",
		]
