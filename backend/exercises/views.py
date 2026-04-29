from django.db.models import Q
from rest_framework import generics, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Exercise, MuscleGroup
from .serializers import (
	ExerciseDetailSerializer,
	ExerciseSerializer,
	MuscleGroupSerializer,
)
from .services import ExerciseDBError, import_all_exercises_from_exercisedb


class ExercisePagination(LimitOffsetPagination):
	default_limit = 12
	max_limit = 24


class ExerciseListView(generics.ListAPIView):
	"""List/search exercises with optional filters.

	Supported query params (all optional):
	- muscles: comma-separated muscle IDs
	- equipment: comma-separated equipment tags
	- level: beginner|intermediate|advanced
	- mechanic: compound|isolation
	- force: push|pull|hold
	- starts_with: first letter for alphabet navigation
	- search: free text over name/description

	List responses intentionally include only still thumbnails, never GIF/video
	media. Detail fetches carry the heavier media URLs after a user opens one
	exercise.
	"""

	serializer_class = ExerciseSerializer
	permission_classes = [AllowAny]
	pagination_class = ExercisePagination

	def get_queryset(self):
		qs = Exercise.objects.all().prefetch_related(
			'primary_muscles',
			'secondary_muscles',
		)
		params = self.request.query_params

		muscles = params.get('muscles')
		if muscles:
			ids = [m.strip() for m in muscles.split(',') if m.strip()]
			if ids:
				qs = qs.filter(
					Q(primary_muscles__id__in=ids)
					| Q(secondary_muscles__id__in=ids)
				).distinct()

		level = params.get('level')
		if level in {'beginner', 'intermediate', 'advanced'}:
			qs = qs.filter(level=level)

		mechanic = params.get('mechanic')
		if mechanic == 'compound':
			qs = qs.filter(is_compound=True)
		elif mechanic == 'isolation':
			qs = qs.filter(is_compound=False)

		force = params.get('force')
		if force == 'push':
			qs = qs.filter(
				Q(movement_pattern__icontains='push')
				| Q(movement_pattern__icontains='press')
			)
		elif force == 'pull':
			qs = qs.filter(
				Q(movement_pattern__icontains='pull')
				| Q(movement_pattern__icontains='row')
				| Q(movement_pattern__icontains='curl')
			)
		elif force == 'hold':
			qs = qs.filter(
				Q(movement_pattern__icontains='hold')
				| Q(movement_pattern__icontains='carry')
			)

		search = params.get('search')
		if search:
			qs = qs.filter(
				Q(name__icontains=search) | Q(description__icontains=search)
			)

		starts_with = params.get('starts_with')
		if starts_with:
			letter = starts_with.strip()[:1]
			if letter.isalpha():
				qs = qs.filter(name__istartswith=letter)

		equipment = params.get('equipment')
		if equipment:
			tags = [e.strip() for e in equipment.split(',') if e.strip()]
			for tag in tags:
				# Simple containment check on the JSON list; portable enough for v1.
				qs = qs.filter(equipment__icontains=tag)

		return qs


class ExerciseDetailView(generics.RetrieveAPIView):
	queryset = Exercise.objects.all().prefetch_related(
		'primary_muscles',
		'secondary_muscles',
	)
	serializer_class = ExerciseDetailSerializer
	permission_classes = [AllowAny]


class MuscleGroupListView(generics.ListAPIView):
	queryset = MuscleGroup.objects.all()
	serializer_class = MuscleGroupSerializer
	permission_classes = [AllowAny]


class ExerciseImportFromExerciseDBView(APIView):
	"""Admin-only endpoint to sync exercises from the external ExerciseDB API.

	This performs network I/O and writes to the database, so it is intentionally
	restricted to admin users. It is expected to be called manually (e.g. from
	Django admin or a protected backend tool) rather than by end users.
	"""

	permission_classes = [IsAdminUser]

	def post(self, request, *args, **kwargs):
		page_size_param = request.query_params.get("page_size")
		try:
			page_size = int(page_size_param) if page_size_param else 200
		except ValueError:
			page_size = 200

		# Optional dry-run mode for smoke testing the integration without writes.
		dry_run = request.query_params.get("dry_run") in {"1", "true", "True"}

		try:
			summary = import_all_exercises_from_exercisedb(
				page_size=page_size,
				dry_run=dry_run,
			)
		except ExerciseDBError as exc:
			return Response(
				{"detail": str(exc)},
				status=status.HTTP_502_BAD_GATEWAY,
			)

		return Response(
			{
				"dry_run": dry_run,
				"page_size": page_size,
				"summary": summary,
			}
		)
