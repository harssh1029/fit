from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Exercise, MuscleGroup
from .serializers import ExerciseSerializer, MuscleGroupSerializer
from .services import ExerciseDBError, import_all_exercises_from_exercisedb


class ExerciseListView(generics.ListAPIView):
	"""List/search exercises with optional filters.

	Supported query params (all optional):
	- muscles: comma-separated muscle IDs
	- equipment: comma-separated equipment tags
	- level: beginner|intermediate|advanced
	- search: free text over name/description
	"""

	serializer_class = ExerciseSerializer
	permission_classes = [AllowAny]

	def get_queryset(self):
		qs = Exercise.objects.all().prefetch_related('primary_muscles', 'secondary_muscles')
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
		if level:
			qs = qs.filter(level=level)

		search = params.get('search')
		if search:
			qs = qs.filter(
				Q(name__icontains=search) | Q(description__icontains=search)
			)

		equipment = params.get('equipment')
		if equipment:
			tags = [e.strip() for e in equipment.split(',') if e.strip()]
			for tag in tags:
				# Simple containment check on the JSON list; portable enough for v1.
				qs = qs.filter(equipment__icontains=tag)

		return qs


class ExerciseDetailView(generics.RetrieveAPIView):
	queryset = Exercise.objects.all().prefetch_related('primary_muscles', 'secondary_muscles')
	serializer_class = ExerciseSerializer
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
