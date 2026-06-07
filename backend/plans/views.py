import re
from datetime import timedelta
from decimal import Decimal

from django.db.models import Prefetch, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from exercises.models import Exercise
from insights.models import UserMetricsSnapshot
from insights.services import recalculate_user_metrics
from workouts.services import (
    materialize_activity_card,
    plan_day_body_groups,
    score_completed_workout,
)
from workouts.models import SessionExercise, WorkoutSession

from .models import Plan, PlanDay, UserPlan
from .serializers import PlanSerializer, UserPlanSerializer
from .services import (
    PremiumRequiredError,
    checkMissedWorkouts,
    recalibrateUserPlan,
    startUserPlan,
)


def _hydrated_user_plan(user_plan_id: int) -> UserPlan:
    return (
        UserPlan.objects.filter(id=user_plan_id)
        .select_related("plan", "plan_version")
        .prefetch_related("scheduled_workouts__plan_day__exercises__exercise")
        .get()
    )


def _refresh_existing_public_card(user) -> None:
    from community.services import refresh_public_card_if_exists

    refresh_public_card_if_exists(user)


MAX_EXERCISE_FALLBACK_CANDIDATES = 250


def _normalize_exercise_label(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _resolved_exercises_for_plan_day(plan_day: PlanDay) -> list[Exercise]:
    labels = {
        (plan_ex.label or "").strip()
        for plan_ex in plan_day.exercises.all()
        if (plan_ex.label or "").strip()
    }
    if not labels:
        return []

    exact_query = Q()
    for label in labels:
        exact_query |= Q(name__iexact=label)
    candidates = {
        exercise.id: exercise
        for exercise in Exercise.objects.filter(exact_query).only("id", "name")
    }
    normalized_index = {
        _normalize_exercise_label(exercise.name): exercise
        for exercise in candidates.values()
    }

    unresolved_labels = [
        label for label in labels if _normalize_exercise_label(label) not in normalized_index
    ]
    fallback_query = Q()
    for label in unresolved_labels:
        tokens = [token for token in re.findall(r"[a-z0-9]+", label.lower()) if len(token) >= 3]
        if not tokens:
            continue
        label_query = Q()
        for token in tokens:
            label_query &= Q(name__icontains=token)
        fallback_query |= label_query
    if fallback_query:
        fallback = Exercise.objects.filter(fallback_query).only("id", "name").distinct()[
            :MAX_EXERCISE_FALLBACK_CANDIDATES
        ]
        for exercise in fallback:
            normalized_index.setdefault(_normalize_exercise_label(exercise.name), exercise)

    resolved = {
        exercise.id: exercise
        for label in labels
        if (exercise := normalized_index.get(_normalize_exercise_label(label))) is not None
    }
    return list(resolved.values())


def _sync_session_exercises_for_plan_day(session: WorkoutSession, plan_day: PlanDay, *, completed_at) -> None:
    exercises = _resolved_exercises_for_plan_day(plan_day)
    if not exercises:
        return
    exercise_ids = [exercise.id for exercise in exercises]
    existing = {
        row.exercise_id: row
        for row in SessionExercise.objects.filter(
            session=session,
            exercise_id__in=exercise_ids,
        )
    }
    SessionExercise.objects.bulk_create(
        [
            SessionExercise(
                session=session,
                exercise=exercise,
                is_completed=True,
                completed_at=completed_at,
            )
            for exercise in exercises
            if exercise.id not in existing
        ],
        ignore_conflicts=True,
    )
    updated = []
    for row in existing.values():
        if row.is_completed and row.completed_at is not None:
            continue
        row.is_completed = True
        row.completed_at = row.completed_at or completed_at
        updated.append(row)
    if updated:
        SessionExercise.objects.bulk_update(updated, ["is_completed", "completed_at"])


class PlanListView(generics.ListAPIView):
    """Read-only plan summaries for discovery cards."""

    serializer_class = PlanSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Plan.objects.filter(is_active=True).prefetch_related("versions")
        user = self.request.user
        if user.is_authenticated:
            queryset = queryset.prefetch_related(
                Prefetch(
                    "user_plans",
                    queryset=UserPlan.objects.filter(user=user)
                    .select_related("plan_version")
                    .order_by("-is_active", "-started_at", "-created_at"),
                    to_attr="_current_user_plans",
                )
            )
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["include_weeks"] = False
        sessions = self.request.query_params.get("sessions_per_week") or self.request.query_params.get(
            "sessionsPerWeek"
        )
        if sessions is not None:
            try:
                context["selected_sessions_per_week"] = int(sessions)
            except (TypeError, ValueError):
                pass
        return context


class PlanDetailView(generics.RetrieveAPIView):
    """Read-only plan detail including weeks, days, exercises, nutrition, supplements."""

    queryset = Plan.objects.filter(is_active=True).prefetch_related(
        "weeks__days__exercises",
        "versions__weeks__days__exercises",
    )
    serializer_class = PlanSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["include_weeks"] = True
        sessions = self.request.query_params.get("sessions_per_week") or self.request.query_params.get(
            "sessionsPerWeek"
        )
        if sessions is not None:
            try:
                context["selected_sessions_per_week"] = int(sessions)
            except (TypeError, ValueError):
                pass
        return context


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
        _refresh_existing_public_card(user)
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
                week_number_int = int(composite_week_number)  # type: ignore[arg-type]
                day_index_int = int(composite_day_index)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                return Response(
                    {
                        "detail": (
                            "plan_week_number and plan_day_index must both be integers."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                plan_day = (
                    PlanDay.objects.select_related("plan_week__plan")
                    .prefetch_related("exercises")
                    .get(
                        plan_week__plan_id=str(composite_plan_id),
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
        scheduled_workout = (
            user_plan.scheduled_workouts.filter(plan_day=plan_day)
            .order_by("order_index")
            .first()
        )

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

        session.title = plan_day.title
        session.workout_type = plan_day.day_type if plan_day.day_type in {
            "strength",
            "cardio",
            "conditioning",
            "mobility",
            "sport",
            "recovery",
        } else "strength"
        session.entry_source = "plan_workout"
        session.intensity = (plan_day.intensity or "moderate").replace(" ", "_").lower()
        session.focus_label = plan_day.primary_focus or plan_day.day_type.title()
        session.modes = [session.workout_type]
        session.body_groups = plan_day_body_groups(plan_day)
        session.muscles = [group.title() for group in session.body_groups]
        session.metadata = {
            **(session.metadata or {}),
            "type": "plan_workout",
            "title": plan_day.title,
            "mode": session.workout_type,
            "modes": [session.workout_type],
            "focus_label": session.focus_label,
            "intensity": session.intensity,
            "body_groups": session.body_groups,
            "muscles": session.muscles,
            "plan_day_id": plan_day.id,
            "plan_id": plan.id,
            "user_plan_id": user_plan.id,
            "scheduled_workout_id": scheduled_workout.id if scheduled_workout else None,
            "planned_week_number": planned_week_number,
            "planned_day_key": planned_day_key,
        }
        session.save(
            update_fields=[
                "title",
                "workout_type",
                "entry_source",
                "intensity",
                "focus_label",
                "modes",
                "body_groups",
                "muscles",
                "metadata",
                "updated_at",
            ]
        )

        _sync_session_exercises_for_plan_day(session, plan_day, completed_at=now)

        # Keep plan progress in sync for Race Readiness, profile progress, and
        # plan-completion achievements. This endpoint predates scheduled
        # workouts, so it computes progress from completed plan sessions.
        completed_count = WorkoutSession.objects.filter(
            user=user,
            plan=plan,
            user_plan=user_plan,
            status="completed",
        ).count()
        total_sessions = (
            user_plan.total_sessions
            or PlanDay.objects.filter(plan_week__plan=plan).count()
            or completed_count
        )
        was_completed = user_plan.status == "completed"
        user_plan.sessions_completed = completed_count
        user_plan.completed_sessions = completed_count
        user_plan.total_sessions = total_sessions
        user_plan.completion_percent = (
            Decimal(completed_count * 100) / Decimal(total_sessions)
            if total_sessions
            else Decimal("0")
        ).quantize(Decimal("0.01"))
        if total_sessions and completed_count >= total_sessions:
            user_plan.status = "completed"
            user_plan.is_active = False
            if user_plan.completed_at is None:
                user_plan.completed_at = now
        user_plan.save(
            update_fields=[
                "sessions_completed",
                "completed_sessions",
                "total_sessions",
                "completion_percent",
                "status",
                "is_active",
                "completed_at",
                "updated_at",
            ],
        )

        result = score_completed_workout(session, as_of=now)
        plan_badges = []
        if user_plan.status == "completed" and not was_completed:
            try:
                from achievements.services import evaluate_plan_completion

                plan_badges = evaluate_plan_completion(
                    user_plan,
                    create_feed_activity=False,
                )
            except Exception:
                plan_badges = []
            if plan_badges:
                result.summary = materialize_activity_card(
                    session,
                    result.score,
                    as_of=now,
                    earned_badges=plan_badges,
                )
        snapshot = UserMetricsSnapshot.objects.get(user=user)

        return Response(
            {
                "status": "completed",
                "plan_id": plan.id,
                "plan_day_id": plan_day.id,
                "user_plan_id": user_plan.id,
                "workout_session_id": session.id,
                "activity_xp": result.score.activity_xp,
                "leaderboard_xp": result.score.leaderboard_xp,
                "activity_card": result.summary,
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
        training_days = request.data.get("trainingDaysPattern") or request.data.get(
            "training_days_pattern"
        )

        if not plan_id or sessions_per_week is None or not start_date:
            return Response(
                {"detail": "planId, sessionsPerWeek, and startDate are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Normalize training_days to a simple list of weekday codes like
        # ["MON", "WED", "FRI"]. If the client omits this, we fall back to the
        # PlanVersion's configured pattern inside startUserPlan.
        if isinstance(training_days, (list, tuple)):
            training_days_pattern = [
                str(item).upper()
                for item in training_days
                if isinstance(item, str) and item
            ]
        else:
            training_days_pattern = None

        try:
            user_plan = startUserPlan(
                request.user,
                str(plan_id),
                int(sessions_per_week),
                start_date,
                training_days_pattern=training_days_pattern,
            )
        except PremiumRequiredError:
            return Response(
                {"code": "premium_required", "detail": "Premium is required for this plan version."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        user_plan = _hydrated_user_plan(user_plan.id)
        recalculate_user_metrics(request.user)
        _refresh_existing_public_card(request.user)
        return Response(UserPlanSerializer(user_plan).data, status=status.HTTP_201_CREATED)


class ActiveUserPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_plan_id = (
            UserPlan.objects.filter(user=request.user, is_active=True, status="active")
            .order_by("-created_at")
            .values_list("id", flat=True)
            .first()
        )
        if user_plan_id is None:
            return Response({"detail": "No active plan."}, status=status.HTTP_404_NOT_FOUND)
        checkMissedWorkouts(user_plan_id)
        user_plan = _hydrated_user_plan(user_plan_id)
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
            scheduled_workout_id_int = int(scheduled_workout_id)
            updated = UserPlan.objects.select_related("plan").get(id=id, user=request.user)
        except UserPlan.DoesNotExist:
            return Response({"detail": "User plan not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        scheduled = (
            updated.scheduled_workouts.select_related("plan_day", "plan_day__plan_week")
            .filter(id=scheduled_workout_id_int)
            .first()
        )
        if scheduled is not None:
            now = scheduled.completed_at or timezone.now()
            plan_day = scheduled.plan_day

            session, _ = WorkoutSession.objects.get_or_create(
                user=request.user,
                plan=updated.plan,
                user_plan=updated,
                workout_template_id=plan_day.workout_template_id or "",
                planned_week_number=scheduled.week_number,
                planned_day_key=str(plan_day.day_index),
                defaults={
                    "status": "completed",
                    "completed_at": now,
                    "duration_minutes": plan_day.duration_minutes or None,
                    "title": plan_day.title,
                    "workout_type": plan_day.day_type if plan_day.day_type in {"strength", "cardio", "conditioning", "mobility", "sport", "recovery"} else "strength",
                    "entry_source": "plan_workout",
                    "intensity": (plan_day.intensity or "moderate").replace(" ", "_").lower(),
                    "focus_label": plan_day.primary_focus or plan_day.day_type.title(),
                    "modes": [plan_day.day_type],
                    "metadata": {
                        "type": "plan_workout",
                        "title": plan_day.title,
                        "mode": plan_day.day_type,
                        "focus_label": plan_day.primary_focus or plan_day.day_type.title(),
                        "plan_day_id": plan_day.id,
                        "scheduled_workout_id": scheduled.id,
                    },
                },
            )
            session.title = plan_day.title
            session.status = "completed"
            session.completed_at = session.completed_at or now
            session.duration_minutes = session.duration_minutes or plan_day.duration_minutes or None
            session.workout_type = plan_day.day_type if plan_day.day_type in {"strength", "cardio", "conditioning", "mobility", "sport", "recovery"} else "strength"
            session.entry_source = "plan_workout"
            session.intensity = (plan_day.intensity or "moderate").replace(" ", "_").lower()
            session.focus_label = plan_day.primary_focus or plan_day.day_type.title()
            session.modes = [session.workout_type]
            session.body_groups = plan_day_body_groups(plan_day)
            session.muscles = [group.title() for group in session.body_groups]
            session.metadata = {
                **(session.metadata or {}),
                "type": "plan_workout",
                "title": plan_day.title,
                "mode": session.workout_type,
                "modes": [session.workout_type],
                "focus_label": session.focus_label,
                "intensity": session.intensity,
                "body_groups": session.body_groups,
                "muscles": session.muscles,
                "plan_id": updated.plan_id,
                "user_plan_id": updated.id,
                "plan_day_id": plan_day.id,
                "scheduled_workout_id": scheduled.id,
                "planned_week_number": scheduled.week_number,
                "planned_day_key": str(plan_day.day_index),
            }
            session.save(
                update_fields=[
                    "title",
                    "status",
                    "completed_at",
                    "duration_minutes",
                    "workout_type",
                    "entry_source",
                    "intensity",
                    "focus_label",
                    "modes",
                    "body_groups",
                    "muscles",
                    "metadata",
                    "updated_at",
                ]
            )
            _sync_session_exercises_for_plan_day(session, plan_day, completed_at=now)
            score_completed_workout(session, as_of=now)
            updated.refresh_from_db()
        return Response(
            UserPlanSerializer(_hydrated_user_plan(updated.id)).data,
            status=status.HTTP_200_OK,
        )


class CheckMissedWorkoutsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id, *args, **kwargs):
        try:
            user_plan = UserPlan.objects.get(id=id, user=request.user)
            updated = checkMissedWorkouts(user_plan.id)
        except UserPlan.DoesNotExist:
            return Response({"detail": "User plan not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            UserPlanSerializer(_hydrated_user_plan(updated.id)).data,
            status=status.HTTP_200_OK,
        )


class RecalibrateUserPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id, *args, **kwargs):
        try:
            user_plan = UserPlan.objects.get(id=id, user=request.user)
            updated = recalibrateUserPlan(user_plan.id)
        except UserPlan.DoesNotExist:
            return Response({"detail": "User plan not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        snapshot = recalculate_user_metrics(request.user)
        return Response(
            {
                "message": "Your plan has been recalibrated. Missed workouts have been moved to your upcoming training days.",
                "user_plan": UserPlanSerializer(_hydrated_user_plan(updated.id)).data,
                "metrics_snapshot_id": snapshot.id,
            },
            status=status.HTTP_200_OK,
        )
