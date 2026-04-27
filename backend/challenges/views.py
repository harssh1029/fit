from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Challenge, UserChallengeCompletion
from .serializers import ChallengeSerializer


class ChallengeListView(generics.ListAPIView):
	    queryset = Challenge.objects.all()
	    serializer_class = ChallengeSerializer
	    permission_classes = [AllowAny]
	    # Return the full challenge catalogue in a single response so the
	    # mobile app can render Beginner/Intermediate/Advanced without
	    # dealing with pagination.
	    pagination_class = None

	    def get_serializer_context(self):
	        context = super().get_serializer_context()
	        user = getattr(self.request, "user", None)
	        if user is not None and getattr(user, "is_authenticated", False):
	            completed_ids = list(
	                UserChallengeCompletion.objects.filter(user=user)
	                .values_list("challenge_id", flat=True)
	            )
	            context["completed_challenge_ids"] = completed_ids
	        return context


class ChallengeDetailView(generics.RetrieveAPIView):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    permission_classes = [AllowAny]


class CompleteChallengeView(APIView):
    """Mark or unmark a challenge as completed for the current user."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: str, *args, **kwargs):
        try:
            challenge = Challenge.objects.get(pk=pk)
        except Challenge.DoesNotExist:
            return Response({"detail": "Challenge not found."}, status=status.HTTP_404_NOT_FOUND)

        UserChallengeCompletion.objects.get_or_create(
            user=request.user,
            challenge=challenge,
        )
        return Response({"id": challenge.id, "status": "done"}, status=status.HTTP_200_OK)

    def delete(self, request, pk: str, *args, **kwargs):
        UserChallengeCompletion.objects.filter(user=request.user, challenge_id=pk).delete()
        return Response({"id": pk, "status": "unmarked"}, status=status.HTTP_200_OK)
