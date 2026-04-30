from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Iterable

from django.db import transaction
from django.utils import timezone

from .models import Plan, PlanVersion, UserPlan, UserScheduledWorkout


WEEKDAY_INDEX = {
    "MON": 0,
    "TUE": 1,
    "WED": 2,
    "THU": 3,
    "FRI": 4,
    "SAT": 5,
    "SUN": 6,
}

TRAINING_DAY_PATTERNS = {
    3: ["MON", "WED", "FRI"],
    4: ["MON", "TUE", "THU", "SAT"],
    5: ["MON", "TUE", "WED", "FRI", "SAT"],
    6: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
}


class PremiumRequiredError(Exception):
    pass


def user_has_premium(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return True
    profile = getattr(user, "profile", None)
    personal_bests = getattr(profile, "personal_bests", {}) or {}
    return bool(
        personal_bests.get("is_premium")
        or personal_bests.get("premium")
        or personal_bests.get("subscription") == "premium"
    )


def parse_start_date(value: str | date | None) -> date:
    if value is None:
        return timezone.localdate()
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


def getPlanDetails(planId: str, userId=None) -> Plan:
    return (
        Plan.objects.filter(id=planId, is_active=True)
        .prefetch_related(
            "versions__weeks__days__exercises__exercise",
            "weeks__days__exercises__exercise",
        )
        .get()
    )


def getPlanVersion(planId: str, sessionsPerWeek: int) -> PlanVersion:
    return (
        PlanVersion.objects.select_related("plan")
        .prefetch_related("weeks__days__exercises__exercise")
        .get(plan_id=planId, sessions_per_week=sessionsPerWeek)
    )


def _next_training_date(current: date, valid_weekdays: Iterable[int]) -> date:
    valid = set(valid_weekdays)
    cursor = current
    while cursor.weekday() not in valid:
        cursor += timedelta(days=1)
    return cursor


def generateSchedule(planVersionId: str, startDate: str | date):
    version = (
        PlanVersion.objects.prefetch_related("weeks__days")
        .select_related("plan")
        .get(id=planVersionId)
    )
    start = parse_start_date(startDate)
    weekdays = [WEEKDAY_INDEX[item] for item in version.training_days_pattern]
    cursor = _next_training_date(start, weekdays)
    scheduled = []

    plan_days = []
    for week in version.weeks.all().order_by("number"):
        for plan_day in week.days.all().order_by("day_index"):
            plan_days.append((week.number, plan_day))

    for order_index, (week_number, plan_day) in enumerate(plan_days, start=1):
        cursor = _next_training_date(cursor, weekdays)
        scheduled.append(
            {
                "plan_day": plan_day,
                "week_number": week_number,
                "day_index": plan_day.day_index,
                "scheduled_date": cursor,
                "original_scheduled_date": cursor,
                "order_index": order_index,
            }
        )
        cursor += timedelta(days=1)

    return scheduled


def _sync_user_plan_progress(user_plan: UserPlan) -> UserPlan:
    qs = user_plan.scheduled_workouts.all()
    completed = qs.filter(status="completed").count()
    missed = qs.filter(status="missed").count()
    total = qs.count() or user_plan.total_sessions
    completion = Decimal("0")
    if total:
        completion = Decimal(completed * 100) / Decimal(total)

    user_plan.completed_sessions = completed
    user_plan.missed_sessions = missed
    user_plan.sessions_completed = completed
    user_plan.total_sessions = total
    user_plan.completion_percent = completion.quantize(Decimal("0.01"))
    user_plan.save(
        update_fields=[
            "completed_sessions",
            "missed_sessions",
            "sessions_completed",
            "total_sessions",
            "completion_percent",
            "updated_at",
        ]
    )
    return user_plan


@transaction.atomic
def startUserPlan(user, planId: str, sessionsPerWeek: int, startDate: str | date) -> UserPlan:
    version = getPlanVersion(planId, sessionsPerWeek)
    if version.is_premium and not user_has_premium(user):
        raise PremiumRequiredError("premium_required")

    schedule = generateSchedule(version.id, startDate)
    if not schedule:
        raise ValueError("Plan version has no schedulable workouts.")

    start = parse_start_date(startDate)
    end = schedule[-1]["scheduled_date"]
    started_at = timezone.make_aware(datetime.combine(start, time.min))
    expected_end_at = timezone.make_aware(datetime.combine(end, time.max))

    UserPlan.objects.filter(user=user, is_active=True, status="active").update(
        is_active=False,
        status="cancelled",
    )
    user_plan = UserPlan.objects.create(
        user=user,
        plan=version.plan,
        plan_version=version,
        is_active=True,
        status="active",
        sessions_per_week=version.sessions_per_week,
        start_date=start,
        end_date=end,
        original_end_date=end,
        started_at=started_at,
        expected_end_at=expected_end_at,
        total_sessions=len(schedule),
    )

    UserScheduledWorkout.objects.bulk_create(
        [
            UserScheduledWorkout(user_plan=user_plan, **item)
            for item in schedule
        ]
    )

    profile = getattr(user, "profile", None)
    if profile is not None:
        profile.active_plan = version.plan
        profile.save(update_fields=["active_plan"])

    return _sync_user_plan_progress(user_plan)


@transaction.atomic
def completeWorkout(userPlanId: int, scheduledWorkoutId: int) -> UserPlan:
    user_plan = UserPlan.objects.select_for_update().get(id=userPlanId)
    workout = user_plan.scheduled_workouts.select_for_update().get(id=scheduledWorkoutId)
    if workout.status != "completed":
        workout.status = "completed"
        workout.completed_at = timezone.now()
        workout.missed_at = None
        workout.save(update_fields=["status", "completed_at", "missed_at"])
    return _sync_user_plan_progress(user_plan)


@transaction.atomic
def checkMissedWorkouts(userPlanId: int) -> UserPlan:
    user_plan = UserPlan.objects.select_for_update().get(id=userPlanId)
    today = timezone.localdate()
    now = timezone.now()
    user_plan.scheduled_workouts.filter(
        status="scheduled",
        scheduled_date__lt=today,
    ).update(status="missed", missed_at=now)
    return _sync_user_plan_progress(user_plan)


@transaction.atomic
def recalibrateUserPlan(userPlanId: int) -> UserPlan:
    user_plan = (
        UserPlan.objects.select_for_update()
        .select_related("plan_version")
        .get(id=userPlanId)
    )
    version = user_plan.plan_version
    if version is None:
        raise ValueError("User plan has no structured plan version.")

    movable = list(
        user_plan.scheduled_workouts.select_for_update()
        .filter(status__in=["missed", "scheduled"])
        .order_by("order_index")
    )
    if not movable:
        return _sync_user_plan_progress(user_plan)

    weekdays = [WEEKDAY_INDEX[item] for item in version.training_days_pattern]
    cursor = timezone.localdate()
    for workout in movable:
        cursor = _next_training_date(cursor, weekdays)
        workout.scheduled_date = cursor
        workout.status = "scheduled"
        workout.missed_at = None
        workout.save(update_fields=["scheduled_date", "status", "missed_at"])
        cursor += timedelta(days=1)

    user_plan.end_date = movable[-1].scheduled_date
    user_plan.expected_end_at = timezone.make_aware(
        datetime.combine(user_plan.end_date, time.max)
    )
    user_plan.recalibration_count += 1
    user_plan.is_recalibrated = True
    user_plan.save(
        update_fields=[
            "end_date",
            "expected_end_at",
            "recalibration_count",
            "is_recalibrated",
            "updated_at",
        ]
    )
    return _sync_user_plan_progress(user_plan)
