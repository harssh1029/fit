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

		# Prefer the user's active plan so we can also infer "missed" days from the
		# plan schedule. If no active plan is found (or it has no start date), we
		# fall back to listing recent completed sessions only.
		user_plan = (
			UserPlan.objects.filter(
				user=user,
				is_active=True,
				status="active",
			)
			.select_related("plan")
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
			# Fallback: list recent completed sessions (no "missed" inference
			# without a plan schedule).
			for session in (
				WorkoutSession.objects.filter(
					user=user, status="completed", completed_at__isnull=False
				)
				.select_related("plan", "user_plan")
				.order_by("-completed_at")[:limit]
			):
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

		# Sort newest first by date, then trim to the requested limit.
		entries.sort(key=lambda e: e["date"], reverse=True)
		total = len(entries)
		entries = entries[:limit]
		has_more = total > limit

		return Response({"results": entries, "has_more": has_more})

