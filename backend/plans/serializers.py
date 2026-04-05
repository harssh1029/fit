from rest_framework import serializers

from .models import Plan, PlanDay, PlanDayExercise, PlanWeek


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
        ]

