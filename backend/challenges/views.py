from datetime import timedelta

from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Challenge,
    TrainingChallenge,
    UserChallengeCompletion,
    UserChallengeEnrollment,
)
from .serializers import ChallengeSerializer, TrainingChallengeSerializer
from .services import (
    challenge_sections_for_user,
    completed_challenge_ids_for_user,
    enroll_user_in_training_challenge,
    evaluate_challenge_unlock,
    ensure_official_training_challenges,
    load_body_battle_groups,
)


def _display_name(user) -> str:
    try:
        profile = user.profile
    except ObjectDoesNotExist:
        profile = None
    return (
        getattr(profile, "display_name", "")
        or user.get_full_name()
        or user.get_username()
    )


def _avatar_initials(name: str) -> str:
    parts = [part for part in name.split() if part]
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[-1][0]}".upper()
    return name[:2].upper() or "U"


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

        completion, _ = UserChallengeCompletion.objects.get_or_create(
            user=request.user,
            challenge=challenge,
        )
        from achievements.services import earned_badge_summaries, evaluate_challenge_completion
        from community.services import materialize_challenge_activity

        earned_badges = evaluate_challenge_completion(
            request.user,
            context={
                "challenge_completed_count": UserChallengeCompletion.objects.filter(user=request.user).count(),
                "challenge_joined_count": UserChallengeCompletion.objects.filter(user=request.user).count(),
                "challenge_visibility": "official",
                "challenge_id": challenge.id,
            },
            create_feed_activity=False,
        )
        challenge_name = challenge.card.get("name") or challenge.id
        activity_metadata = {
            "event_type": "challenge_completed",
            "challenge_id": challenge.id,
            "challenge_name": challenge_name,
            "frontend_summary": {
                "title": challenge_name,
                "challenge_badge": challenge.detail.get("badge_name") or "Challenge",
            },
        }
        if earned_badges:
            activity_metadata["earned_badges"] = earned_badge_summaries(earned_badges)
        materialize_challenge_activity(
            request.user,
            source_id=f"challenge:{challenge.id}",
            title=f"Completed {challenge_name}",
            metadata=activity_metadata,
            occurred_at=completion.completed_at,
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
        from community.models import CommunityActivity

        CommunityActivity.objects.filter(
            user=request.user,
            activity_type=CommunityActivity.ACTIVITY_CHALLENGE,
            metadata__source_id=f"challenge:{pk}",
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
		try:
			duration = max(1, min(int(request.data.get("duration") or request.data.get("duration_days") or 7), 120))
			minimum_duration = max(1, min(int(request.data.get("minimum_duration") or 20), 360))
			required_sessions = max(1, min(int(request.data.get("required_sessions") or 3), 120))
		except (TypeError, ValueError):
			return Response({"detail": "Challenge numbers must be valid integers."}, status=status.HTTP_400_BAD_REQUEST)
		today = timezone.localdate()
		challenge = TrainingChallenge.objects.create(
			name=name[:180],
			description=str(request.data.get("description") or "").strip(),
			requirement=str(request.data.get("requirement") or f"{required_sessions} qualifying sessions").strip(),
			duration_days=duration,
			eligible_workout_types=request.data.get("eligible_workout_types") or [],
			eligible_body_parts=request.data.get("eligible_body_parts") or [],
			minimum_duration=minimum_duration,
			required_sessions=required_sessions,
			allowed_intensity=request.data.get("allowed_intensity") or [],
			visibility=TrainingChallenge.VISIBILITY_COMMUNITY,
			created_by=request.user,
			start_date=today,
			end_date=today + timedelta(days=duration - 1),
			badge_icon=str(request.data.get("badge_icon") or "shield-checkmark")[:64],
			reward_xp=0,
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


class TrainingChallengeParticipantsView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, challenge_id: int, *args, **kwargs):
		try:
			challenge = TrainingChallenge.objects.get(id=challenge_id)
		except TrainingChallenge.DoesNotExist:
			return Response({"detail": "Challenge not found."}, status=status.HTTP_404_NOT_FOUND)
		rows = (
			UserChallengeEnrollment.objects.filter(challenge=challenge)
			.exclude(status=UserChallengeEnrollment.STATUS_LEFT)
			.select_related("user", "user__profile", "progress")
			.order_by(
				"status",
				"-progress__points",
				"-progress__sessions_completed",
				"joined_at",
			)[:100]
		)
		participants = []
		for row in rows:
			name = _display_name(row.user)
			progress = getattr(row, "progress", None)
			participants.append(
				{
					"id": row.id,
					"userId": row.user_id,
					"userName": name,
					"avatarInitials": _avatar_initials(name),
					"status": row.status,
					"joinedAt": row.joined_at.isoformat() if row.joined_at else None,
					"completedAt": (
						row.completed_at.isoformat() if row.completed_at else None
					),
					"progress": {
						"sessionsCompleted": progress.sessions_completed if progress else 0,
						"requiredSessions": challenge.required_sessions,
						"percent": progress.progress_percent if progress else 0,
						"points": progress.points if progress else 0,
						"activeDays": progress.active_days if progress else 0,
					},
				}
			)
		return Response(
			{
				"participants": participants,
				"completed": [
					item
					for item in participants
					if item["status"] == UserChallengeEnrollment.STATUS_COMPLETED
				],
			}
		)
