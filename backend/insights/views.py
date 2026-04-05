from datetime import datetime

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import recalculate_user_metrics


class DashboardSummaryView(APIView):
	"""Return a composed dashboard summary for the current user.

	v1 focuses on quick metrics backed by ``UserMetricsSnapshot``. Other sections
	(hero, quick_workouts, etc.) are stubbed for now so the response shape is
	forward-compatible with the dashboard spec.
	"""

	permission_classes = [IsAuthenticated]

	def get(self, request, *args, **kwargs):
		user = request.user

		# Optional date param; defaults to "now" in the server's timezone. For v1 we
		# only use it to choose an ``as_of`` timestamp for metrics.
		date_param = request.query_params.get("date")
		as_of = timezone.now()
		if date_param:
			parsed = parse_date(date_param)
			if parsed is not None:
				as_of = timezone.make_aware(
					datetime.combine(parsed, datetime.min.time()),
					timezone.get_current_timezone(),
				)

		snapshot = recalculate_user_metrics(user, as_of=as_of)

		def _is_available(detail: dict, has_scalar: bool) -> bool:
			if isinstance(detail, dict) and "available" in detail:
				return bool(detail.get("available"))
			return bool(has_scalar)

		fitness_detail = snapshot.fitness_age_detail or {}
		race_detail = snapshot.race_readiness_detail or {}
		percentile_detail = snapshot.percentile_detail or {}
		streak_detail = snapshot.streak_detail or {}
		time_detail = snapshot.total_time_detail or {}
		body_detail = snapshot.body_battle_map_detail or {}

		metrics = {
			"fitness_age": {
				"available": _is_available(
					fitness_detail, snapshot.fitness_age_years is not None
				),
				"fitness_age_years": snapshot.fitness_age_years,
				"chronological_age": fitness_detail.get("chronological_age"),
				"detail": fitness_detail,
			},
			"race_readiness": {
				"available": _is_available(
					race_detail, snapshot.race_readiness_score is not None
				),
				"score": snapshot.race_readiness_score,
				"detail": race_detail,
			},
			"percentile_rank": {
				"available": _is_available(
					percentile_detail, snapshot.percentile_rank_overall is not None
				),
				"percentile": snapshot.percentile_rank_overall,
				"detail": percentile_detail,
			},
			"streak": {
				"available": _is_available(
					streak_detail, snapshot.current_streak_days is not None
				),
				"current_streak_days": snapshot.current_streak_days,
				"longest_streak_days": snapshot.longest_streak_days,
				"multiplier": snapshot.streak_multiplier,
				"detail": streak_detail,
			},
			"total_time": {
				"available": _is_available(
					time_detail, snapshot.total_minutes_all_time is not None
				),
				"total_minutes_7d": snapshot.total_minutes_7d,
				"total_minutes_30d": snapshot.total_minutes_30d,
				"total_minutes_all_time": snapshot.total_minutes_all_time,
				"detail": time_detail,
			},
			"body_battle_map": {
				"available": _is_available(
					body_detail, snapshot.body_balance_score is not None
				),
				"balance_score": snapshot.body_balance_score,
				"detail": body_detail,
			},
		}

		payload = {
			"hero": None,
			"metrics": metrics,
			"quick_workouts": [],
			"recent_activity": [],
			"calendar": None,
			"ai_estimation": None,
			"badge_preview": None,
		}

		return Response(payload)

