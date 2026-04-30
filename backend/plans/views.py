from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from exercises.models import Exercise
from insights.services import recalculate_user_metrics
from workouts.models import SessionExercise, WorkoutSession

from .models import Plan, PlanDay, UserPlan
from .serializers import PlanSerializer, UserPlanSerializer
from .services import (
    PremiumRequiredError,
    checkMissedWorkouts,
    completeWorkout,
    recalibrateUserPlan,
    startUserPlan,
    user_has_premium,
)


class PlanListView(generics.ListAPIView):
    """Read-only list of plans with nested weeks, days, and exercises."""

    queryset = Plan.objects.filter(is_active=True).prefetch_related(
        "weeks__days__exercises__exercise",
        "versions__weeks__days__exercises__exercise",
    )
    serializer_class = PlanSerializer
    permission_classes = [AllowAny]


class PlanDetailView(generics.RetrieveAPIView):
    """Read-only plan detail including weeks, days, exercises, nutrition, supplements."""

    queryset = Plan.objects.filter(is_active=True).prefetch_related(
        "weeks__days__exercises__exercise",
        "versions__weeks__days__exercises__exercise",
    )
    serializer_class = PlanSerializer
    permission_classes = [AllowAny]


class OptOutPlanView(APIView):
    """Cancel the current user's active enrollment for a plan."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response(
                {"detail": "plan_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response(
                {"detail": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        now = timezone.now()
        updated = UserPlan.objects.filter(
            user=user,
            plan=plan,
            is_active=True,
            status="active",
        ).update(is_active=False, status="cancelled", updated_at=now)

        profile = getattr(user, "profile", None)
        if profile is not None and getattr(profile, "active_plan_id", None) == plan.id:
            profile.active_plan = None
            profile.save(update_fields=["active_plan"])

        snapshot = recalculate_user_metrics(user, as_of=now)
        return Response(
            {
                "status": "cancelled",
                "plan_id": plan.id,
                "cancelled_count": updated,
                "metrics_snapshot_id": snapshot.id,
            },
            status=status.HTTP_200_OK,
        )


class CompletePlanDayView(APIView):
    """Mark a specific plan day complete for the current user.

    This logs a completed ``WorkoutSession`` tied to the user's active
    ``UserPlan`` for the owning ``Plan`` and then recalculates dashboard
    metrics. It also creates per-exercise ``SessionExercise`` rows so the
    Body Battle Map can track weak and strong muscle groups.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        plan_day_id = request.data.get("plan_day_id")
        plan_day = None
        plan = None

        # We primarily identify a PlanDay by its primary key (plan_day_id), but
        # also support a composite identity fallback of (plan_id,
        # plan_week_number, plan_day_index) so that clients that only know the
        # schedule position can still log completion.
        composite_plan_id = request.data.get("plan_id")
        composite_week_number = request.data.get("plan_week_number")
        composite_day_index = request.data.get("plan_day_index")

        if plan_day_id is None and (
            composite_plan_id is None
            or composite_week_number is None
            or composite_day_index is None
        ):
            return Response(
                {
                    "detail": (
                        "Either plan_day_id or (plan_id, plan_week_number, "
                        "plan_day_index) is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if plan_day_id is not None:
            try:
                plan_day_id_int = int(plan_day_id)
            except (TypeError, ValueError):
                plan_day_id_int = None  # fall through to composite lookup below
            if plan_day_id_int is not None:
                try:
                    plan_day = (
                        PlanDay.objects.select_related("plan_week__plan")
                        .prefetch_related("exercises")
                        .get(id=plan_day_id_int)
                    )
                except PlanDay.DoesNotExist:
                    plan_day = None

        # Fallback: resolve by composite identity when we don't have a valid
        # integer plan_day_id, but we do know the plan and schedule position.
        if plan_day is None and all(
            value is not None
            for value in (composite_plan_id, composite_week_number, composite_day_index)
        ):
            try:
                plan_id_int = int(composite_plan_id)  # type: ignore[arg-type]
                week_number_int = int(composite_week_number)  # type: ignore[arg-type]
                day_index_int = int(composite_day_index)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                return Response(
                    {
                        "detail": (
                            "plan_id, plan_week_number, and plan_day_index must all "
                            "be integers."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                plan_day = (
                    PlanDay.objects.select_related("plan_week__plan")
                    .prefetch_related("exercises")
                    .get(
                        plan_week__plan_id=plan_id_int,
                        plan_week__number=week_number_int,
                        day_index=day_index_int,
                    )
                )
            except PlanDay.DoesNotExist:
                return Response(
                    {"detail": "Plan day not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if plan_day is None:
            return Response(
                {"detail": "Plan day not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        plan = plan_day.plan_week.plan

        user_plan = (
            UserPlan.objects.filter(
                user=user,
                plan=plan,
                is_active=True,
                status="active",
            )
            .order_by("-created_at")
            .first()
        )
        if user_plan is None:
            # Lazily enroll the user into this plan the first time they mark a day
            # complete so that workout history and metrics have a concrete
            # UserPlan anchor. We align the start date so that the current plan day
            # being completed is scheduled for "today".
            started_at = timezone.now() - timedelta(
                days=max(plan_day.day_index - 1, 0),
            )
            expected_end_at = started_at + timedelta(weeks=plan.duration_weeks)
            user_plan = UserPlan.objects.create(
                user=user,
                plan=plan,
                is_active=True,
                status="active",
                started_at=started_at,
                expected_end_at=expected_end_at,
            )

        now = timezone.now()

        # Build a normalized name index for Exercise objects so we can
        # tolerate minor differences between plan labels and exercise
        # names (hyphens vs spaces, punctuation, case), e.g.
        # "Barbell Bent-Over Row" -> "barbellbentoverrow" will match
        # the Exercise named "barbell bent over row".
        def _normalize_exercise_label(value: str) -> str:
            import re
            if not value:
                return ""
            return re.sub(r"[^a-z0-9]+", "", value).lower()

        all_exercises = list(Exercise.objects.all())
        normalized_exercise_index = {}
        for ex in all_exercises:
            key = _normalize_exercise_label(ex.name)
            if key and key not in normalized_exercise_index:
                normalized_exercise_index[key] = ex

        # Try to extract a numeric duration (minutes) from the free-form label,
        # e.g. "45 min" -> 45, but keep it optional.
        duration_minutes = None
        if plan_day.duration:
            import re

            match = re.search(r"(\d+)", plan_day.duration)
            if match:
                try:
                    duration_minutes = int(match.group(1))
                except ValueError:
                    duration_minutes = None

        workout_template_id = plan_day.workout_template_id or ""
        planned_week_number = plan_day.plan_week.number
        planned_day_key = str(plan_day.day_index)

        session, created = WorkoutSession.objects.get_or_create(
            user=user,
            plan=plan,
            user_plan=user_plan,
            workout_template_id=workout_template_id,
            planned_week_number=planned_week_number,
            planned_day_key=planned_day_key,
            defaults={
                "status": "completed",
                "completed_at": now,
                "duration_minutes": duration_minutes,
            },
        )

        if not created:
            updated_fields = []
            if session.status != "completed":
                session.status = "completed"
                updated_fields.append("status")
            if session.completed_at is None:
                session.completed_at = now
                updated_fields.append("completed_at")
            if duration_minutes is not None and session.duration_minutes is None:
                session.duration_minutes = duration_minutes
                updated_fields.append("duration_minutes")
            if updated_fields:
                updated_fields.append("updated_at")
                session.save(update_fields=updated_fields)

        # Create or update per-exercise SessionExercise rows based on the
        # structured PlanDay exercises. We first try a direct
        # Exercise.name case-insensitive match to the
        # PlanDayExercise.label. If that fails, we fall back to a
        # normalized lookup that ignores case, spaces, hyphens, and
        # punctuation so labels such as "Barbell Bent-Over Row" still
        # resolve to "barbell bent over row".
        for plan_ex in plan_day.exercises.all():
            label = (plan_ex.label or "").strip()
            if not label:
                continue

            exercise = Exercise.objects.filter(name__iexact=label).first()
            if not exercise:
                normalized_label = _normalize_exercise_label(label)
                if normalized_label:
                    exercise = normalized_exercise_index.get(normalized_label)
            if not exercise:
                continue

            se, se_created = SessionExercise.objects.get_or_create(
                session=session,
                exercise=exercise,
                defaults={
                    "is_completed": True,
                    "completed_at": now,
                },
            )
            if not se_created:
                ex_updated_fields = []
                if not se.is_completed:
                    se.is_completed = True
                    ex_updated_fields.append("is_completed")
                if se.completed_at is None:
                    se.completed_at = now
                    ex_updated_fields.append("completed_at")
                if ex_updated_fields:
                    se.save(update_fields=ex_updated_fields)

        # Keep the cached sessions_completed in sync for Race Readiness progress.
        completed_count = WorkoutSession.objects.filter(
            user=user,
            plan=plan,
            user_plan=user_plan,
            status="completed",
        ).count()
        if user_plan.sessions_completed != completed_count:
            user_plan.sessions_completed = completed_count
            user_plan.save(update_fields=["sessions_completed", "updated_at"])

        snapshot = recalculate_user_metrics(user, as_of=now)

        return Response(
            {
                "status": "completed",
                "plan_id": plan.id,
                "plan_day_id": plan_day.id,
                "user_plan_id": user_plan.id,
                "workout_session_id": session.id,
                "metrics_snapshot_id": snapshot.id,
            },
            status=status.HTTP_200_OK,
        )


class StartUserPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        plan_id = request.data.get("planId") or request.data.get("plan_id")
        sessions_per_week = request.data.get("sessionsPerWeek") or request.data.get(
            "sessions_per_week"
        )
        start_date = request.data.get("startDate") or request.data.get("start_date")

        if not plan_id or sessions_per_week is None or not start_date:
            return Response(
                {"detail": "planId, sessionsPerWeek, and startDate are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_plan = startUserPlan(
                request.user,
                str(plan_id),
                int(sessions_per_week),
                start_date,
            )
        except PremiumRequiredError:
            return Response(
                {"code": "premium_required", "detail": "Premium is required for this plan version."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        user_plan = (
            UserPlan.objects.filter(id=user_plan.id)
            .select_related("plan", "plan_version")
            .prefetch_related(
                "scheduled_workouts__plan_day__exercises__exercise",
                "plan__versions__weeks__days__exercises__exercise",
                "plan_version__weeks__days__exercises__exercise",
            )
            .get()
        )
        return Response(UserPlanSerializer(user_plan).data, status=status.HTTP_201_CREATED)


class ActiveUserPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_plan = (
            UserPlan.objects.filter(user=request.user, is_active=True, status="active")
            .select_related("plan", "plan_version")
            .prefetch_related(
                "scheduled_workouts__plan_day__exercises__exercise",
                "plan__versions__weeks__days__exercises__exercise",
                "plan_version__weeks__days__exercises__exercise",
            )
            .order_by("-created_at")
            .first()
        )
        if user_plan is None:
            return Response({"detail": "No active plan."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserPlanSerializer(user_plan).data, status=status.HTTP_200_OK)


class CompleteScheduledWorkoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id, *args, **kwargs):
        scheduled_workout_id = request.data.get("scheduledWorkoutId") or request.data.get(
            "scheduled_workout_id"
        )
        if scheduled_workout_id is None:
            return Response(
                {"detail": "scheduledWorkoutId is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user_plan = UserPlan.objects.get(id=id, user=request.user)
            updated = completeWorkout(user_plan.id, int(scheduled_workout_id))
        except UserPlan.DoesNotExist:
            return Response({"detail": "User plan not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(UserPlanSerializer(updated).data, status=status.HTTP_200_OK)


class CheckMissedWorkoutsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id, *args, **kwargs):
        try:
            user_plan = UserPlan.objects.get(id=id, user=request.user)
            updated = checkMissedWorkouts(user_plan.id)
        except UserPlan.DoesNotExist:
            return Response({"detail": "User plan not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserPlanSerializer(updated).data, status=status.HTTP_200_OK)


class RecalibrateUserPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id, *args, **kwargs):
        if not user_has_premium(request.user):
            return Response(
                {"code": "premium_required", "detail": "Premium is required to recalibrate plans."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        try:
            user_plan = UserPlan.objects.get(id=id, user=request.user)
            updated = recalibrateUserPlan(user_plan.id)
        except UserPlan.DoesNotExist:
            return Response({"detail": "User plan not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "message": "Your plan has been recalibrated. Missed workouts have been moved to your upcoming training days.",
                "user_plan": UserPlanSerializer(updated).data,
            },
            status=status.HTTP_200_OK,
        )
