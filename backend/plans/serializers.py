from django.utils import timezone
from rest_framework import serializers

from workouts.models import WorkoutSession

from .models import (
    Plan,
    PlanDay,
    PlanDayExercise,
    PlanExercise,
    PlanVersion,
    PlanWeek,
    UserPlan,
    UserScheduledWorkout,
)


class PlanExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanExercise
        fields = [
            'id',
            'name',
            'category',
            'movement_pattern',
            'primary_muscles',
            'secondary_muscles',
            'equipment',
            'difficulty',
            'priority_score',
            'fatigue_score',
            'goal_tags',
            'coaching_cues',
            'common_mistakes',
        ]


class PlanDayExerciseSerializer(serializers.ModelSerializer):
    exercise_id = serializers.CharField(source='exercise.id', read_only=True)
    exercise = PlanExerciseSerializer(read_only=True)

    class Meta:
        model = PlanDayExercise
        fields = [
            'id',
            'exercise_id',
            'exercise',
            'order',
            'block',
            'label',
            'primary',
            'secondary',
            'prescription',
            'coach_instruction',
            'progression_rule',
        ]


class PlanDaySerializer(serializers.ModelSerializer):
    exercises = PlanDayExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = PlanDay
        fields = [
            'id',
            'day_index',
            'title',
            'description',
            'duration',
            'duration_minutes',
            'day_type',
            'intensity',
            'rpe_target',
            'primary_focus',
            'secondary_focus',
            'coach_note',
            'workout_template_id',
            'nutrition',
            'supplements',
            'exercises',
        ]


class PlanWeekSerializer(serializers.ModelSerializer):
    days = PlanDaySerializer(many=True, read_only=True)

    class Meta:
        model = PlanWeek
        fields = [
            'id',
            'number',
            'title',
            'focus',
            'coach_note',
            'intensity_theme',
            'highlights',
            'days',
        ]


class PlanVersionSerializer(serializers.ModelSerializer):
    weeks = PlanWeekSerializer(many=True, read_only=True)

    class Meta:
        model = PlanVersion
        fields = [
            'id',
            'plan_id',
            'sessions_per_week',
            'title',
            'description',
            'is_default',
            'is_premium',
            'split_type',
            'training_days_pattern',
            'total_sessions',
            'weekly_structure',
            'weeks',
        ]


class PlanSerializer(serializers.ModelSerializer):
    weeks = serializers.SerializerMethodField()
    versions = PlanVersionSerializer(many=True, read_only=True)
    user_progress = serializers.SerializerMethodField()

    def get_weeks(self, obj):
        default_version = obj.versions.filter(is_default=True).first()
        if default_version is not None:
            default_weeks = default_version.weeks.all().order_by('number')
        else:
            default_weeks = obj.weeks.filter(plan_version__isnull=True).order_by('number')
        return PlanWeekSerializer(default_weeks, many=True).data

    def get_user_progress(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None

        user_plan = (
            obj.user_plans.filter(user=user)
            .order_by('-is_active', '-started_at', '-created_at')
            .first()
        )
        if user_plan is None:
            return None

        if user_plan.total_sessions:
            total_sessions = user_plan.total_sessions
        elif user_plan.plan_version_id:
            total_sessions = user_plan.plan_version.total_sessions
        else:
            default_version = obj.versions.filter(is_default=True).first()
            if default_version is not None:
                total_sessions = default_version.total_sessions
            else:
                total_sessions = PlanDay.objects.filter(
                    plan_week__plan=obj,
                    plan_week__plan_version__isnull=True,
                ).count()

        completed_sessions = min(user_plan.completed_sessions, total_sessions)
        if not completed_sessions:
            completed_sessions = WorkoutSession.objects.filter(
                user=user,
                plan=obj,
                user_plan=user_plan,
                status='completed',
                completed_at__isnull=False,
            ).count()
            completed_sessions = min(completed_sessions, total_sessions)

        completion_percent = (
            round((completed_sessions / total_sessions) * 100)
            if total_sessions
            else 0
        )

        current_week_number = None
        if user_plan.started_at:
            local_start = timezone.localtime(user_plan.started_at).date()
            days_elapsed = (timezone.localdate() - local_start).days
            if days_elapsed >= 0:
                current_week_number = min(
                    obj.duration_weeks,
                    max(1, days_elapsed // 7 + 1),
                )

        return {
            'is_active': user_plan.is_active,
            'status': user_plan.status,
            'started_at': user_plan.started_at.isoformat()
            if user_plan.started_at
            else None,
            'expected_end_at': user_plan.expected_end_at.isoformat()
            if user_plan.expected_end_at
            else None,
            'current_week_number': current_week_number,
            'completed_sessions': completed_sessions,
            'total_sessions': total_sessions,
            'completion_percent': completion_percent,
        }

    class Meta:
        model = Plan
        fields = [
            'id',
            'name',
            'subtitle',
            'level',
            'duration_weeks',
            'default_sessions_per_week',
            'goal',
            'summary',
            'audience',
            'result',
            'sessions_per_week',
            'long_description',
            'tags',
            'supported_sessions_per_week',
            'is_active',
            'is_premium_plan',
            'versions',
            'weeks',
            'user_progress',
        ]


class UserScheduledWorkoutSerializer(serializers.ModelSerializer):
    plan_day = PlanDaySerializer(read_only=True)

    class Meta:
        model = UserScheduledWorkout
        fields = [
            'id',
            'plan_day',
            'week_number',
            'day_index',
            'scheduled_date',
            'original_scheduled_date',
            'status',
            'completed_at',
            'missed_at',
            'order_index',
        ]


class UserPlanSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    plan_version = PlanVersionSerializer(read_only=True)
    scheduled_workouts = UserScheduledWorkoutSerializer(many=True, read_only=True)

    class Meta:
        model = UserPlan
        fields = [
            'id',
            'user_id',
            'plan',
            'plan_version',
            'status',
            'sessions_per_week',
            'start_date',
            'end_date',
            'original_end_date',
            'is_recalibrated',
            'recalibration_count',
            'completed_sessions',
            'missed_sessions',
            'total_sessions',
            'completion_percent',
            'scheduled_workouts',
        ]
