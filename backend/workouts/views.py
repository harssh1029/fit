from datetime import timedelta
from typing import Optional

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from exercises.models import Exercise, MuscleGroup
from insights.services import recalculate_user_metrics
from plans.models import PlanDay, UserPlan
from .models import SessionExercise, WorkoutSession


CUSTOM_BODY_GROUPS = {
	"chest",
	"shoulders",
	"arms",
	"back",
	"core",
	"glutes",
	"legs",
}


def _custom_exercise_for_group(group: str) -> Optional[Exercise]:
	muscle = MuscleGroup.objects.filter(canonical_group=group).first()
	if muscle is None:
		return None

	exercise, _ = Exercise.objects.get_or_create(
		id=f"custom-{group}-workout",
		defaults={
			"name": f"Custom {group.title()} Workout",
			"movement_pattern": "custom",
			"equipment": [],
			"level": "beginner",
			"is_compound": True,
			"source": "internal",
			"body_part": group,
			"target": muscle.name,
			"description": "Synthetic exercise used to attribute custom workouts to body-map groups.",
		},
	)
	exercise.primary_muscles.add(muscle)
	return exercise


class WorkoutHistoryView(APIView):
	"""Return recent workout history for the current user's active plan.

	The response focuses on a lightweight list for the dashboard Training Days
	section: each entry contains the scheduled date, session title, and whether
	the workout was completed or missed.
	"""

	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):  # type: ignore[override]
		user = request.user
		try:
			limit = int(request.query_params.get("limit", 30))
		except (TypeError, ValueError):
			limit = 30
		limit = max(1, min(limit, 100))

		# Prefer the user's *profile* active plan so that workout history always
		# lines up with the plan the UI considers active. If that lookup fails,
		# fall back to the most recently created active UserPlan.
		base_qs = UserPlan.objects.filter(
			user=user,
			is_active=True,
			status="active",
		)
		profile = getattr(user, "profile", None)
		active_plan = getattr(profile, "active_plan", None) if profile else None
		active_plan_id = getattr(active_plan, "id", None)

		if active_plan_id is not None:
			user_plan = (
				base_qs.filter(plan_id=active_plan_id)
				.select_related("plan")
				.order_by("-created_at")
				.first()
			)
		else:
			user_plan = None

		if user_plan is None:
			user_plan = (
				base_qs.select_related("plan")
				.order_by("-created_at")
				.first()
			)

		entries = []
		today = timezone.localdate()

		if user_plan and user_plan.started_at is not None:
			plan = user_plan.plan
			start_date = user_plan.started_at.date()

			plan_days = (
				PlanDay.objects.filter(plan_week__plan=plan)
				.select_related("plan_week")
				.order_by("day_index")
			)

			# Index completed sessions by (planned_week_number, planned_day_key) so
			# we can quickly determine whether each scheduled day was completed.
			sessions = (
				WorkoutSession.objects.filter(
					user=user,
					plan=plan,
					user_plan=user_plan,
					status="completed",
					completed_at__isnull=False,
				)
				.only("id", "planned_week_number", "planned_day_key", "completed_at")
			)
			session_index = {}
			for session in sessions:
				key = (session.planned_week_number, session.planned_day_key)
				# Keep the first one we see; in practice there should only be one per day.
				if key not in session_index:
					session_index[key] = session

			for plan_day in plan_days:
				scheduled_date = start_date + timedelta(days=plan_day.day_index - 1)
				if scheduled_date > today:
					continue

				key = (plan_day.plan_week.number, str(plan_day.day_index))
				session = session_index.get(key)

				if session is not None:
					status = "completed"
					completed_at = session.completed_at
				else:
					# Only count as "missed" if the scheduled date is strictly in the
					# past. Today with no session is treated as upcoming.
					if scheduled_date < today:
						status = "missed"
						completed_at = None
					else:
						continue

				entries.append(
					{
						"date": scheduled_date.isoformat(),
						"status": status,
						"title": plan_day.title,
						"day_type": plan_day.day_type,
						"scheduled_day_index": plan_day.day_index,
						"week_number": plan_day.plan_week.number,
						"plan_id": plan.id,
						"user_plan_id": user_plan.id,
						"workout_session_id": getattr(session, "id", None),
						"completed_at": completed_at.isoformat()
						if completed_at is not None
						else None,
					}
				)
		else:
			# Product rule: when there is no active plan, the dashboard "Previous
			# workouts" history should be empty. A separate endpoint will expose
			# the user's full cross-plan workout log for the Profile screen.
			entries = []

		# Sort newest first by date, then trim to the requested limit.
		entries.sort(key=lambda e: e["date"], reverse=True)
		total = len(entries)
		entries = entries[:limit]
		has_more = total > limit

		return Response({"results": entries, "has_more": has_more})


class CustomWorkoutView(APIView):
	"""Log a completed quick workout outside the active plan."""

	permission_classes = [IsAuthenticated]

	def post(self, request, *args, **kwargs):  # type: ignore[override]
		user = request.user
		raw_groups = request.data.get("body_groups") or []
		if not isinstance(raw_groups, list):
			raw_groups = []
		body_groups = [
			str(group).strip().lower()
			for group in raw_groups
			if str(group).strip().lower() in CUSTOM_BODY_GROUPS
		]
		body_groups = list(dict.fromkeys(body_groups))
		cardio = bool(request.data.get("cardio", False))

		if not body_groups and not cardio:
			return Response(
				{"detail": "Select at least one body part or cardio."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			exercise_count = int(request.data.get("exercise_count") or 0)
		except (TypeError, ValueError):
			exercise_count = 0
		exercise_count = max(0, min(exercise_count, 40))

		try:
			duration_minutes = int(request.data.get("duration_minutes") or 0)
		except (TypeError, ValueError):
			duration_minutes = 0
		duration_minutes = max(1, min(duration_minutes or 30, 360))

		now = timezone.now()
		title_parts = []
		if body_groups:
			title_parts.append(", ".join(group.title() for group in body_groups))
		if cardio:
			title_parts.append("Cardio")
		title = " + ".join(title_parts) or "Custom workout"

		session = WorkoutSession.objects.create(
			user=user,
			quick_workout_id=f"custom-{now.strftime('%Y%m%d%H%M%S')}",
			status="completed",
			completed_at=now,
			duration_minutes=duration_minutes,
			metadata={
				"type": "custom_workout",
				"title": title,
				"body_groups": body_groups,
				"cardio": cardio,
				"exercise_count": exercise_count,
			},
		)

		for group in body_groups:
			exercise = _custom_exercise_for_group(group)
			if exercise is None:
				continue
			SessionExercise.objects.get_or_create(
				session=session,
				exercise=exercise,
				defaults={
					"is_completed": True,
					"completed_at": now,
				},
			)

		snapshot = recalculate_user_metrics(user, as_of=now)
		return Response(
			{
				"status": "completed",
				"workout_session_id": session.id,
				"metrics_snapshot_id": snapshot.id,
			},
			status=status.HTTP_201_CREATED,
		)


class FullWorkoutHistoryView(APIView):
	"""Return scheduled workout history across all user plans.

	Used by profile/consistency views to show completed and missed training days
	across enrolled plans, while the dashboard history remains scoped to the
	currently active plan.
	"""

	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):  # type: ignore[override]
		user = request.user
		try:
			limit = int(request.query_params.get("limit", 100))
		except (TypeError, ValueError):
			limit = 100
		limit = max(1, min(limit, 500))

		entries = []

		user_plans = (
			UserPlan.objects.filter(user=user)
			.select_related("plan")
			.order_by("-started_at", "-created_at")
		)
		today = timezone.localdate()

		for user_plan in user_plans:
			if user_plan.started_at is None:
				continue
			plan = user_plan.plan
			start_date = user_plan.started_at.date()

			plan_days = (
				PlanDay.objects.filter(plan_week__plan=plan)
				.select_related("plan_week")
				.order_by("day_index")
			)
			sessions = (
				WorkoutSession.objects.filter(
					user=user,
					plan=plan,
					user_plan=user_plan,
					status="completed",
					completed_at__isnull=False,
				)
				.only("id", "planned_week_number", "planned_day_key", "completed_at")
			)
			session_index = {}
			for session in sessions:
				key = (session.planned_week_number, session.planned_day_key)
				if key not in session_index:
					session_index[key] = session

			for plan_day in plan_days:
				scheduled_date = start_date + timedelta(days=plan_day.day_index - 1)
				if scheduled_date > today:
					continue

				key = (plan_day.plan_week.number, str(plan_day.day_index))
				session = session_index.get(key)
				if session is not None:
					status = "completed"
					completed_at = session.completed_at
				elif scheduled_date < today:
					status = "missed"
					completed_at = None
				else:
					continue

				entries.append(
					{
						"date": scheduled_date.isoformat(),
						"status": status,
						"title": plan_day.title,
						"day_type": plan_day.day_type,
						"scheduled_day_index": plan_day.day_index,
						"week_number": plan_day.plan_week.number,
						"plan_id": plan.id,
						"plan_name": plan.name,
						"user_plan_id": user_plan.id,
						"workout_session_id": getattr(session, "id", None),
						"completed_at": completed_at.isoformat()
						if completed_at is not None
						else None,
					}
				)

		quick_sessions = (
			WorkoutSession.objects.filter(
				user=user,
				status="completed",
				completed_at__isnull=False,
				plan__isnull=True,
				user_plan__isnull=True,
			)
			.order_by("-completed_at")
		)
		for session in quick_sessions:
			completed_at = session.completed_at
			if completed_at is None:
				continue
			entries.append(
				{
					"date": completed_at.date().isoformat(),
					"status": "completed",
					"title": session.metadata.get("title") or "Custom workout",
					"day_type": "custom",
					"scheduled_day_index": None,
					"week_number": None,
					"plan_id": None,
					"plan_name": None,
					"user_plan_id": None,
					"workout_session_id": session.id,
					"completed_at": completed_at.isoformat(),
				}
			)

		entries.sort(key=lambda e: e["date"], reverse=True)
		has_more = len(entries) > limit
		entries = entries[:limit]
		return Response({"results": entries, "has_more": has_more})
