from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Challenge, UserChallengeCompletion
from .serializers import ChallengeSerializer
from .services import (
    completed_challenge_ids_for_user,
    evaluate_challenge_unlock,
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
