from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from plans.models import PlanDay, UserPlan
from .models import WorkoutSession


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


class FullWorkoutHistoryView(APIView):
	"""Return all completed workout sessions for the current user.

	Used by the Profile screen to show a cross-plan workout log, while the
	dashboard history remains scoped to the currently active plan.
	"""

	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):  # type: ignore[override]
		user = request.user
		try:
			limit = int(request.query_params.get("limit", 100))
		except (TypeError, ValueError):
			limit = 100
		limit = max(1, min(limit, 500))

		# Fetch up to limit+1 sessions so we can expose a simple has_more flag
		# without an extra COUNT query.
		sessions = (
			WorkoutSession.objects.filter(
				user=user,
				status="completed",
				completed_at__isnull=False,
			)
			.select_related("plan", "user_plan")
			.order_by("-completed_at")[: limit + 1]
		)

		entries = []
		for session in sessions:
			completed_at = session.completed_at
			if completed_at is None:
				continue
			entries.append(
				{
					"date": completed_at.date().isoformat(),
					"status": "completed",
					"title": getattr(session.plan, "name", "Workout"),
					"day_type": None,
					"scheduled_day_index": None,
					"week_number": None,
					"plan_id": getattr(session.plan, "id", None),
					"user_plan_id": getattr(session.user_plan, "id", None),
					"workout_session_id": session.id,
					"completed_at": completed_at.isoformat(),
				}
			)

		has_more = len(entries) > limit
		entries = entries[:limit]
		return Response({"results": entries, "has_more": has_more})
