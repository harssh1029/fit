from rest_framework import serializers
from django.utils import timezone

from .models import Plan, PlanDay, PlanDayExercise, PlanWeek
from workouts.models import WorkoutSession


class PlanDayExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanDayExercise
        fields = ['id', 'order', 'label', 'primary', 'secondary']


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
            'day_type',
            'workout_template_id',
            'nutrition',
            'supplements',
            'exercises',
        ]


class PlanWeekSerializer(serializers.ModelSerializer):
    days = PlanDaySerializer(many=True, read_only=True)

    class Meta:
        model = PlanWeek
        fields = ['id', 'number', 'title', 'focus', 'highlights', 'days']


class PlanSerializer(serializers.ModelSerializer):
    weeks = PlanWeekSerializer(many=True, read_only=True)
    user_progress = serializers.SerializerMethodField()

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

        total_sessions = PlanDay.objects.filter(plan_week__plan=obj).count()
        completed_sessions = WorkoutSession.objects.filter(
            user=user,
            plan=obj,
            user_plan=user_plan,
            status='completed',
            completed_at__isnull=False,
        ).count()
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
            'level',
            'duration_weeks',
            'goal',
            'summary',
            'audience',
            'result',
            'sessions_per_week',
            'long_description',
            'weeks',
            'user_progress',
        ]
