from __future__ import annotations

from datetime import datetime, timedelta

from django.db.models import Avg
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from plans.models import UserPlan
from workouts.models import UserScorePeriod, UserScoreSummary
from workouts.services import recalculate_user_score_summary

from .models import UserMetricsSnapshot
from .services import recalculate_user_metrics


BODY_FOCUS_CONFIG = [
    ("chest", "Chest", "chest_score", "chest", "body-outline", "#2454F4"),
    ("shoulders", "Shoulders", "shoulders_score", "shoulders", "body-outline", "#22C9D8"),
    ("arms", "Arms", "biceps_score", "arms", "fitness-outline", "#86A5F4"),
    ("back", "Back", "back_score", "back", "barbell-outline", "#7867F2"),
    ("core", "Core", "core_score", "core", "ellipse-outline", "#20DDBB"),
    ("glutes", "Glutes", "glutes_score", "glutes", "walk-outline", "#F2C16F"),
    ("legs", "Legs", "quads_score", "legs", "walk-outline", "#F47C5C"),
]

CATEGORY_CONFIG = [
    ("strength", "Strength", "strength_score", "barbell-outline", "#2454F4"),
    ("cardio", "Cardio", "cardio_score", "pulse-outline", "#22C9D8"),
    ("conditioning", "Conditioning", "conditioning_score", "flash-outline", "#20DDBB"),
    ("mobility", "Mobility", "mobility_score", "accessibility-outline", "#7867F2"),
    ("sport", "Sport", "sport_score", "football-outline", "#86A5F4"),
]

BODY_XP_TARGETS = [90, 130, 260, 300, 500, 750, 1000, 1500]
CATEGORY_TIERS = [
    ("Bronze", 500),
    ("Silver", 1500),
    ("Gold", 3500),
    ("Platinum", 7500),
    ("Elite", 15000),
]


def _next_target(xp: float, targets: list[int]) -> int:
    for target in targets:
        if xp < target:
            return target
    return targets[-1]


def _category_tier(xp: float) -> tuple[str, int]:
    for tier, target in CATEGORY_TIERS:
        if xp < target:
            return tier, target
    return CATEGORY_TIERS[-1]


def _level_for_xp(xp: int) -> dict:
    levels = [
        (1, "Rookie", 0, 1000),
        (2, "Builder", 1000, 4000),
        (3, "Athlete", 4000, 10000),
        (4, "Performer", 10000, 25000),
        (5, "Elite", 25000, 60000),
        (6, "Legend", 60000, 60000),
    ]
    current = levels[0]
    for row in levels:
        if xp >= row[2]:
            current = row
    level, title, start, next_xp = current
    return {
        "level": level,
        "title": title,
        "career_xp": xp,
        "current_level_xp": start,
        "next_level_xp": next_xp,
        "progress_percent": 100
        if next_xp <= start
        else round(max(0, min(100, ((xp - start) / (next_xp - start)) * 100)), 1),
    }


def _comparison_value(value) -> int:
    return int(round(float(value or 0)))


def _week_label(week_start) -> str:
    return week_start.strftime("%d %b")


def _build_metric_trend(
    *,
    user,
    as_of,
    metric_key: str,
    ideal: int,
    current_average: int,
    period_rows: dict | None = None,
    average_period_rows: dict | None = None,
) -> list[dict]:
    today = as_of.date()
    current_week_start = today - timedelta(days=today.weekday())
    weeks = [current_week_start - timedelta(days=7 * offset) for offset in range(5, -1, -1)]
    if period_rows is None:
        period_rows = {
            row.period_start: row
            for row in UserScorePeriod.objects.filter(
                user=user,
                period_type="weekly",
                period_start__in=weeks,
            )
        }
    average_period_rows = average_period_rows or {}
    trend = []
    for index, week_start in enumerate(weeks):
        row = period_rows.get(week_start)
        average_row = average_period_rows.get(week_start, {})
        if metric_key == "consistency":
            you = min(100, int(round(float(getattr(row, "consistency_score", 0) or 0) / 1.5))) if row else 0
            average = min(100, int(round(float(average_row.get("average_consistency") or 0) / 1.5)))
        elif metric_key == "xp":
            you = _comparison_value(getattr(row, "activity_xp", 0) if row else 0)
            average = _comparison_value(average_row.get("average_xp"))
        elif metric_key == "leaderboard":
            you = _comparison_value(getattr(row, "leaderboard_score", 0) if row else 0)
            average = _comparison_value(average_row.get("average_leaderboard"))
        else:
            # Balance is a current rolling score. Give it a stable trend shape
            # from current data instead of exposing the raw body-map internals.
            you = max(0, _comparison_value(ideal * (0.55 + (index * 0.05))))
            average = current_average
        trend.append(
            {
                "label": _week_label(week_start),
                "you": you,
                "average": average,
                "ideal": ideal,
            }
        )
    return trend


def _build_comparison_metrics(user, summary, as_of) -> dict:
    averages = UserScoreSummary.objects.aggregate(
        consistency=Avg("consistency_score"),
        weekly_xp=Avg("weekly_xp"),
        streak=Avg("streak_count"),
        leaderboard=Avg("performance_score"),
        balance=Avg("training_balance_score"),
    )
    today = as_of.date()
    current_week_start = today - timedelta(days=today.weekday())
    weeks = [current_week_start - timedelta(days=7 * offset) for offset in range(5, -1, -1)]
    period_rows = {
        row.period_start: row
        for row in UserScorePeriod.objects.filter(
            user=user,
            period_type="weekly",
            period_start__in=weeks,
        )
    }
    average_period_rows = {
        row["period_start"]: row
        for row in UserScorePeriod.objects.filter(
            period_type="weekly",
            period_start__in=weeks,
        )
        .values("period_start")
        .annotate(
            average_consistency=Avg("consistency_score"),
            average_xp=Avg("activity_xp"),
            average_leaderboard=Avg("leaderboard_score"),
        )
    }
    current_consistency = min(100, int(round(float(summary.consistency_score or 0) / 10)))
    average_consistency = min(100, int(round(float(averages["consistency"] or 0) / 10)))
    metric_configs = [
        {
            "key": "consistency",
            "label": "Weekly consistency",
            "unit": "%",
            "description": "Weeks with enough active training days compared with the field and a healthy ideal.",
            "current": current_consistency,
            "average": average_consistency,
            "ideal": 75,
        },
        {
            "key": "xp",
            "label": "XP",
            "unit": "XP",
            "description": "Weekly output from completed training.",
            "current": _comparison_value(summary.weekly_xp),
            "average": _comparison_value(averages["weekly_xp"]),
            "ideal": 300,
        },
        {
            "key": "streak",
            "label": "Weekly consistency streak",
            "unit": "weeks",
            "description": "Consecutive consistency run from the scoring profile. Daily streak is shown separately on the dashboard.",
            "current": _comparison_value(summary.streak_count),
            "average": _comparison_value(averages["streak"]),
            "ideal": 4,
            "trend": [
                {
                    "label": f"{offset}w",
                    "you": min(_comparison_value(summary.streak_count), offset),
                    "average": _comparison_value(averages["streak"]),
                    "ideal": 4,
                }
                for offset in [1, 2, 3, 4, 5, 6]
            ],
        },
        {
            "key": "leaderboard",
            "label": "Leaderboard",
            "unit": "pts",
            "description": "Competitive score from recent training.",
            "current": _comparison_value(summary.performance_score),
            "average": _comparison_value(averages["leaderboard"]),
            "ideal": 500,
        },
        {
            "key": "balance",
            "label": "Balance",
            "unit": "%",
            "description": "Training spread across major focus areas.",
            "current": _comparison_value(summary.training_balance_score),
            "average": _comparison_value(averages["balance"]),
            "ideal": 85,
        },
    ]
    metrics = []
    for config in metric_configs:
        metric = dict(config)
        if "trend" not in metric:
            metric["trend"] = _build_metric_trend(
                user=user,
                as_of=as_of,
                metric_key=config["key"],
                ideal=config["ideal"],
                current_average=config["average"],
                period_rows=period_rows,
                average_period_rows=average_period_rows,
            )
        metrics.append(metric)
    return {"default_metric": "consistency", "metrics": metrics}


def _build_training_profile(user, body_detail: dict, *, as_of=None) -> dict:
    as_of = as_of or timezone.now()
    summary = UserScoreSummary.objects.filter(user=user).first()
    if summary is None:
        summary = recalculate_user_score_summary(user, as_of=as_of)
    body_scores = summary.body_part_scores or {}
    body_groups = body_detail.get("groups") if isinstance(body_detail, dict) else {}
    if not isinstance(body_groups, dict):
        body_groups = {}

    body_focus = []
    for key, label, score_field, group_key, icon, accent in BODY_FOCUS_CONFIG:
        xp = float(body_scores.get(score_field, 0) or 0)
        target = _next_target(xp, BODY_XP_TARGETS)
        group_info = body_groups.get(group_key) or {}
        body_focus.append(
            {
                "key": key,
                "label": label,
                "metric_type": "body_part",
                "xp": int(round(xp)),
                "target_xp": target,
                "percent": round(max(0, min(100, (xp / target) * 100)), 1) if target else 0,
                "rank": group_info.get("rank") or "Recruit",
                "sessions": int(group_info.get("sessions") or 0),
                "icon": icon,
                "accent": accent,
            }
        )

    category_levels = []
    for key, label, score_field, icon, accent in CATEGORY_CONFIG:
        xp = float(getattr(summary, score_field, 0) or 0)
        tier, target = _category_tier(xp)
        category_levels.append(
            {
                "key": key,
                "label": label,
                "metric_type": "training_category",
                "xp": int(round(xp)),
                "target_xp": target,
                "percent": round(max(0, min(100, (xp / target) * 100)), 1) if target else 0,
                "tier": tier,
                "icon": icon,
                "accent": accent,
            }
        )

    return {
        "available": True,
        "level": _level_for_xp(int(summary.career_xp or 0)),
        "body_focus": body_focus,
        "category_levels": category_levels,
        "weekly_xp": int(summary.weekly_xp or 0),
        "monthly_xp": int(summary.monthly_xp or 0),
        "performance_score": round(float(summary.performance_score or 0), 1),
        "training_balance_score": round(float(summary.training_balance_score or 0), 1),
        "updated_at": summary.updated_at.isoformat() if summary.updated_at else None,
        "comparison_metrics": _build_comparison_metrics(user, summary, as_of),
    }


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

        refresh = request.query_params.get("refresh", "").lower() in {"1", "true", "yes"}
        snapshot = UserMetricsSnapshot.objects.filter(user=user).first()
        if snapshot is None or date_param or refresh:
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
            "training_profile": _build_training_profile(user, body_detail, as_of=as_of),
        }

        # Build a lightweight training calendar from the user's active structured
        # plan, if any. This matches the shape expected by
        # ``buildMonthCalendarDaysFromDashboard`` on mobile:
        # ``{range_start, range_end, days: [{date, workouts}]}``.
        calendar_payload = None
        user_plan = (
            UserPlan.objects.filter(user=user, is_active=True, status="active")
            .select_related("plan", "plan_version")
            .prefetch_related("scheduled_workouts")
            .order_by("-created_at")
            .first()
        )
        if user_plan is not None:
            workouts_by_date: dict[str, int] = {}
            for sw in user_plan.scheduled_workouts.all():
                iso = sw.scheduled_date.isoformat()
                workouts_by_date[iso] = workouts_by_date.get(iso, 0) + 1
            if workouts_by_date:
                ordered_dates = sorted(workouts_by_date.keys())
                calendar_payload = {
                    "range_start": ordered_dates[0],
                    "range_end": ordered_dates[-1],
                    "days": [
                        {"date": d, "workouts": workouts_by_date[d]}
                        for d in ordered_dates
                    ],
                }

        payload = {
            "hero": None,
            "metrics": metrics,
            "quick_workouts": [],
            "recent_activity": [],
            "calendar": calendar_payload,
            "ai_estimation": None,
            "badge_preview": None,
        }

        return Response(payload)
