from datetime import timedelta
from pathlib import Path
from typing import Optional
from uuid import uuid4

from django.core.files.storage import default_storage
from django.utils import timezone
from django.utils.text import get_valid_filename
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from exercises.models import Exercise, MuscleGroup
from insights.models import UserMetricsSnapshot
from plans.models import PlanDay, UserPlan
from .models import SessionExercise, WorkoutDraft, WorkoutSession
from .services import (
	WorkoutValidationError,
	build_session_from_payload,
	log_workout,
	score_completed_workout,
)


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


def _completed_session_indexes(user, user_plan):
	sessions = WorkoutSession.objects.filter(
		user=user,
		user_plan=user_plan,
		status="completed",
		completed_at__isnull=False,
	).only("id", "planned_week_number", "planned_day_key", "completed_at", "metadata")
	by_plan_day = {}
	by_scheduled_workout = {}
	for session in sessions:
		key = (session.planned_week_number, session.planned_day_key)
		if key not in by_plan_day:
			by_plan_day[key] = session
		scheduled_workout_id = (session.metadata or {}).get("scheduled_workout_id")
		if str(scheduled_workout_id).isdigit():
			by_scheduled_workout[int(scheduled_workout_id)] = session
	return by_plan_day, by_scheduled_workout


def _plan_history_entries(user, user_plan, today):
	plan = user_plan.plan
	by_plan_day, by_scheduled_workout = _completed_session_indexes(user, user_plan)
	entries = []
	scheduled_workouts = list(
		user_plan.scheduled_workouts.select_related("plan_day", "plan_day__plan_week")
		.order_by("scheduled_date", "order_index")
	)

	if scheduled_workouts:
		for scheduled in scheduled_workouts:
			plan_day = scheduled.plan_day
			session = by_scheduled_workout.get(scheduled.id) or by_plan_day.get(
				(scheduled.week_number, str(plan_day.day_index))
			)
			if session is not None or scheduled.status == "completed":
				entry_status = "completed"
				completed_at = getattr(session, "completed_at", None) or scheduled.completed_at
			elif scheduled.status == "missed" or (
				scheduled.status == "scheduled" and scheduled.scheduled_date < today
			):
				entry_status = "missed"
				completed_at = None
			else:
				continue
			entries.append(
				{
					"date": scheduled.scheduled_date.isoformat(),
					"status": entry_status,
					"title": plan_day.title,
					"day_type": plan_day.day_type,
					"scheduled_day_index": plan_day.day_index,
					"scheduled_workout_id": scheduled.id,
					"week_number": scheduled.week_number,
					"plan_id": plan.id,
					"plan_name": plan.name,
					"user_plan_id": user_plan.id,
					"workout_session_id": getattr(session, "id", None),
					"completed_at": completed_at.isoformat() if completed_at else None,
				}
			)
		return entries

	# Preserve history for enrollments created before dated schedules existed.
	start_date = user_plan.start_date or (
		user_plan.started_at.date() if user_plan.started_at is not None else None
	)
	if start_date is None:
		return entries
	plan_days = (
		PlanDay.objects.filter(plan_week__plan=plan)
		.select_related("plan_week")
		.order_by("day_index")
	)
	for plan_day in plan_days:
		scheduled_date = start_date + timedelta(days=plan_day.day_index - 1)
		if scheduled_date > today:
			continue
		session = by_plan_day.get((plan_day.plan_week.number, str(plan_day.day_index)))
		if session is not None:
			entry_status = "completed"
			completed_at = session.completed_at
		elif scheduled_date < today:
			entry_status = "missed"
			completed_at = None
		else:
			continue
		entries.append(
			{
				"date": scheduled_date.isoformat(),
				"status": entry_status,
				"title": plan_day.title,
				"day_type": plan_day.day_type,
				"scheduled_day_index": plan_day.day_index,
				"week_number": plan_day.plan_week.number,
				"plan_id": plan.id,
				"plan_name": plan.name,
				"user_plan_id": user_plan.id,
				"workout_session_id": getattr(session, "id", None),
				"completed_at": completed_at.isoformat() if completed_at else None,
			}
		)
	return entries


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

		if user_plan:
			entries = _plan_history_entries(user, user_plan, today)
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
		mode = str(request.data.get("mode") or "custom").strip().lower()
		generic_modes = {"cardio", "conditioning", "mobility", "sport"}
		raw_modes = request.data.get("modes") or []
		if not isinstance(raw_modes, list):
			raw_modes = []
		modes = [
			str(item).strip().lower()
			for item in raw_modes
			if str(item).strip().lower() in {"strength", "cardio", "conditioning", "mobility", "sport"}
		]
		modes = list(dict.fromkeys(modes)) or [mode]
		raw_muscles = request.data.get("muscles") or []
		if not isinstance(raw_muscles, list):
			raw_muscles = []
		muscles = [
			str(muscle).strip()
			for muscle in raw_muscles
			if str(muscle).strip()
		]
		muscles = list(dict.fromkeys(muscles))[:24]
		body_map_side = str(request.data.get("body_map_side") or "front").strip().lower()
		if body_map_side not in {"front", "back"}:
			body_map_side = "front"

		if not body_groups and not cardio and mode not in generic_modes:
			return Response(
				{"detail": "Select at least one body part or cardio."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			exercise_count = int(request.data.get("exercise_count") or 0)
		except (TypeError, ValueError):
			exercise_count = 0
		exercise_count = max(0, min(exercise_count, 40))
		raw_exercises = request.data.get("exercises") or []
		exercises = []
		if isinstance(raw_exercises, list):
			for item in raw_exercises[:40]:
				if not isinstance(item, dict):
					continue
				name = str(item.get("name") or "").strip()
				volume = str(item.get("volume") or "").strip()
				pr = bool(item.get("pr", False))
				if not name and not volume:
					continue
				exercises.append({"name": name, "volume": volume, "pr": pr})

		try:
			duration_minutes = int(request.data.get("duration_minutes") or 0)
		except (TypeError, ValueError):
			duration_minutes = 0
		duration_minutes = max(1, min(duration_minutes or 30, 360))

		now = timezone.now()
		raw_title = str(request.data.get("title") or "").strip()
		title_parts = []
		if body_groups:
			title_parts.append(", ".join(group.title() for group in body_groups))
		if cardio:
			title_parts.append("Cardio")
		title = raw_title or " + ".join(title_parts) or f"{mode.title()} Session"
		focus_label = str(request.data.get("focus_label") or "").strip()
		intensity = str(request.data.get("intensity") or "").strip()
		feeling = str(request.data.get("feeling") or "").strip()
		notes = str(request.data.get("notes") or "").strip()
		caption = str(request.data.get("caption") or "").strip()
		image_url = str(request.data.get("image_url") or "").strip()
		pr_note = str(request.data.get("pr") or "").strip()

		payload = {
			"body_groups": body_groups,
			"muscles": muscles,
			"body_map_side": body_map_side,
			"cardio": cardio,
			"exercise_count": exercise_count,
			"exercises": exercises,
			"duration_minutes": duration_minutes,
			"mode": mode,
			"modes": modes,
			"title": title,
			"focus_label": focus_label,
			"intensity": intensity or "moderate",
			"feeling": feeling,
			"notes": notes,
			"caption": caption,
			"image_url": image_url,
			"pr": pr_note,
			"entry_source": request.data.get("entry_source") or "manual",
		}
		try:
			session = build_session_from_payload(user, payload, as_of=now)
		except WorkoutValidationError as exc:
			return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

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

		result = score_completed_workout(session, as_of=now)
		snapshot = UserMetricsSnapshot.objects.get(user=user)
		return Response(
			{
				"status": "completed",
				"workout_session_id": session.id,
				"activity_xp": result.score.activity_xp,
				"leaderboard_xp": result.score.leaderboard_xp,
				"activity_card": result.summary,
				"metrics_snapshot_id": snapshot.id,
			},
			status=status.HTTP_201_CREATED,
		)


class WorkoutLogView(APIView):
	"""Canonical endpoint for manual, recorded, plan, and challenge workout logs."""

	permission_classes = [IsAuthenticated]

	def post(self, request, *args, **kwargs):  # type: ignore[override]
		try:
			result = log_workout(request.user, request.data)
		except WorkoutValidationError as exc:
			return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
		except ValueError as exc:
			return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
		return Response(
			{
				"status": "completed",
				"workout_session_id": result.session.id,
				"activity_xp": result.score.activity_xp,
				"leaderboard_xp": result.score.leaderboard_xp,
				"challenge_points": result.score.challenge_points,
				"activity_card": result.summary,
			},
			status=status.HTTP_201_CREATED,
		)


class WorkoutImageUploadView(APIView):
	"""Upload an image that can be attached to a workout activity post."""

	permission_classes = [IsAuthenticated]
	parser_classes = [MultiPartParser, FormParser]

	def post(self, request, *args, **kwargs):  # type: ignore[override]
		upload = request.FILES.get("image")
		if upload is None:
			return Response({"detail": "Upload an image file."}, status=status.HTTP_400_BAD_REQUEST)

		content_type = str(getattr(upload, "content_type", "") or "")
		if not content_type.startswith("image/"):
			return Response({"detail": "Only image uploads are supported."}, status=status.HTTP_400_BAD_REQUEST)

		max_size = 8 * 1024 * 1024
		if getattr(upload, "size", 0) > max_size:
			return Response({"detail": "Image must be 8 MB or smaller."}, status=status.HTTP_400_BAD_REQUEST)

		original_name = get_valid_filename(getattr(upload, "name", "") or "workout-image")
		extension = Path(original_name).suffix.lower()
		if extension not in {".jpg", ".jpeg", ".png", ".webp", ".heic"}:
			extension = ".jpg"

		path = f"workout_images/user_{request.user.id}/{uuid4().hex}{extension}"
		saved_path = default_storage.save(path, upload)
		image_url = default_storage.url(saved_path)
		if not image_url.startswith(("http://", "https://")):
			image_url = request.build_absolute_uri(image_url)
		return Response({"image_url": image_url}, status=status.HTTP_201_CREATED)


class WorkoutDraftListCreateView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):  # type: ignore[override]
		drafts = WorkoutDraft.objects.filter(user=request.user)[:50]
		return Response(
			[
				{
					"id": draft.id,
					"title": draft.title,
					"duration_seconds": draft.duration_seconds,
					"payload": draft.payload,
					"created_at": draft.created_at.isoformat(),
					"updated_at": draft.updated_at.isoformat(),
				}
				for draft in drafts
			]
		)

	def post(self, request, *args, **kwargs):  # type: ignore[override]
		payload = request.data.get("payload") if isinstance(request.data.get("payload"), dict) else request.data
		title = str(request.data.get("title") or payload.get("title") or "Workout draft").strip()
		try:
			duration_seconds = int(
				request.data.get("duration_seconds")
				or request.data.get("durationSeconds")
				or payload.get("duration_seconds")
				or payload.get("durationSeconds")
				or 0
			)
		except (TypeError, ValueError):
			duration_seconds = 0
		draft = WorkoutDraft.objects.create(
			user=request.user,
			title=title,
			duration_seconds=max(0, duration_seconds),
			payload=payload,
		)
		return Response(
			{
				"id": draft.id,
				"title": draft.title,
				"duration_seconds": draft.duration_seconds,
				"payload": draft.payload,
				"created_at": draft.created_at.isoformat(),
				"updated_at": draft.updated_at.isoformat(),
			},
			status=status.HTTP_201_CREATED,
		)


class WorkoutDraftDetailView(APIView):
	permission_classes = [IsAuthenticated]

	def _get_draft(self, request, draft_id: int) -> WorkoutDraft:
		return WorkoutDraft.objects.get(id=draft_id, user=request.user)

	def patch(self, request, draft_id: int, *args, **kwargs):  # type: ignore[override]
		try:
			draft = self._get_draft(request, draft_id)
		except WorkoutDraft.DoesNotExist:
			return Response({"detail": "Draft not found."}, status=status.HTTP_404_NOT_FOUND)
		payload = request.data.get("payload") if isinstance(request.data.get("payload"), dict) else None
		if payload is not None:
			draft.payload = payload
		if "title" in request.data:
			draft.title = str(request.data.get("title") or "").strip()
		if "duration_seconds" in request.data or "durationSeconds" in request.data:
			try:
				draft.duration_seconds = max(
					0,
					int(request.data.get("duration_seconds") or request.data.get("durationSeconds") or 0),
				)
			except (TypeError, ValueError):
				draft.duration_seconds = 0
		draft.save()
		return Response(
			{
				"id": draft.id,
				"title": draft.title,
				"duration_seconds": draft.duration_seconds,
				"payload": draft.payload,
				"created_at": draft.created_at.isoformat(),
				"updated_at": draft.updated_at.isoformat(),
			}
		)

	def delete(self, request, draft_id: int, *args, **kwargs):  # type: ignore[override]
		WorkoutDraft.objects.filter(id=draft_id, user=request.user).delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


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
			entries.extend(_plan_history_entries(user, user_plan, today))

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
