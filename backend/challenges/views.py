from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Challenge, TrainingChallenge, UserChallengeCompletion
from .serializers import ChallengeSerializer, TrainingChallengeSerializer
from .services import (
    challenge_sections_for_user,
    completed_challenge_ids_for_user,
    enroll_user_in_training_challenge,
    evaluate_challenge_unlock,
    ensure_official_training_challenges,
    load_body_battle_groups,
)


class ChallengeListView(generics.ListAPIView):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    permission_classes = [AllowAny]
    # Return the full catalogue so the mobile app can render all tiers without
    # pagination state.
    pagination_class = None

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = getattr(self.request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            context["completed_challenge_ids"] = completed_challenge_ids_for_user(user)
            context["body_battle_groups"] = load_body_battle_groups(user)
        return context


class ChallengeDetailView(generics.RetrieveAPIView):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = getattr(self.request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            context["completed_challenge_ids"] = completed_challenge_ids_for_user(user)
            context["body_battle_groups"] = load_body_battle_groups(user)
        return context


class CompleteChallengeView(APIView):
    """Mark or unmark a challenge as completed for the current user."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: str, *args, **kwargs):
        try:
            challenge = Challenge.objects.get(pk=pk)
        except Challenge.DoesNotExist:
            return Response(
                {"detail": "Challenge not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        completed_ids = completed_challenge_ids_for_user(request.user)
        evaluation = evaluate_challenge_unlock(
            challenge,
            request.user,
            completed_ids=completed_ids,
            body_groups=load_body_battle_groups(request.user),
        )
        if not evaluation.is_unlocked and challenge.id not in completed_ids:
            return Response(
                {
                    "detail": "Challenge is locked.",
                    "unlockProgress": evaluation.as_dict(),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        UserChallengeCompletion.objects.get_or_create(
            user=request.user,
            challenge=challenge,
        )
        from achievements.services import evaluate_challenge_completion

        evaluate_challenge_completion(
            request.user,
            context={
                "challenge_completed_count": UserChallengeCompletion.objects.filter(user=request.user).count(),
                "challenge_joined_count": UserChallengeCompletion.objects.filter(user=request.user).count(),
                "challenge_visibility": "official",
            },
        )
        return Response(
            {
                "id": challenge.id,
                "status": "done",
                "unlockProgress": evaluation.as_dict(),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk: str, *args, **kwargs):
        UserChallengeCompletion.objects.filter(
            user=request.user,
            challenge_id=pk,
        ).delete()
        return Response({"id": pk, "status": "unmarked"}, status=status.HTTP_200_OK)


class TrainingChallengeSectionsView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		return Response(challenge_sections_for_user(request.user))

	def post(self, request, *args, **kwargs):
		name = str(request.data.get("challenge_name") or request.data.get("name") or "").strip()
		if not name:
			return Response({"detail": "challenge_name is required."}, status=status.HTTP_400_BAD_REQUEST)
		duration = int(request.data.get("duration") or request.data.get("duration_days") or 7)
		challenge = TrainingChallenge.objects.create(
			name=name[:180],
			description=str(request.data.get("description") or "").strip(),
			requirement=str(request.data.get("requirement") or f"{request.data.get('required_sessions') or 3} qualifying sessions").strip(),
			duration_days=max(1, min(duration, 120)),
			eligible_workout_types=request.data.get("eligible_workout_types") or [],
			eligible_body_parts=request.data.get("eligible_body_parts") or [],
			minimum_duration=int(request.data.get("minimum_duration") or 20),
			required_sessions=int(request.data.get("required_sessions") or 3),
			allowed_intensity=request.data.get("allowed_intensity") or [],
			visibility=str(request.data.get("visibility") or TrainingChallenge.VISIBILITY_COMMUNITY),
			created_by=request.user,
			badge_icon=str(request.data.get("badge_icon") or "shield-checkmark")[:64],
			reward_xp=int(request.data.get("reward_xp") or 150),
		)
		return Response(TrainingChallengeSerializer(challenge).data, status=status.HTTP_201_CREATED)


class TrainingChallengeJoinView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, challenge_id: int, *args, **kwargs):
		ensure_official_training_challenges()
		try:
			challenge = TrainingChallenge.objects.get(id=challenge_id)
		except TrainingChallenge.DoesNotExist:
			return Response({"detail": "Challenge not found."}, status=status.HTTP_404_NOT_FOUND)
		enrollment = enroll_user_in_training_challenge(request.user, challenge)
		return Response({"id": enrollment.id, "status": enrollment.status}, status=status.HTTP_201_CREATED)
