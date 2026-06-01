from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone

from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from insights.models import FitnessAssessment
from plans.models import Plan

from .models import Profile


User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
	active_plan_id = serializers.SlugRelatedField(
		slug_field='id',
		source='active_plan',
		queryset=Plan.objects.all(),
		allow_null=True,
		required=False,
	)

	class Meta:
		model = Profile
		fields = [
			'display_name',
			'avatar_url',
			'height_cm',
			'weight_kg',
			'waist_cm',
			'gender',
			'date_of_birth',
			'timezone',
			'active_plan_id',
			'personal_bests',
			'fitness_level',
			'fitness_goals',
			'training_preferences',
			'training_restrictions',
			'onboarding_answers',
			'onboarding_version',
			'onboarding_completed_at',
		]
		read_only_fields = ['avatar_url']


class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ['id', 'username', 'email']


class RegistrationOnboardingSerializer(serializers.Serializer):
	version = serializers.IntegerField(required=False, min_value=1, max_value=10, default=1)
	ageYears = serializers.IntegerField(min_value=13, max_value=100)
	gender = serializers.ChoiceField(choices=['male', 'female', 'other', 'prefer_not_to_say'])
	heightCm = serializers.FloatField(min_value=90, max_value=240)
	weightKg = serializers.FloatField(min_value=30, max_value=250)
	waistCm = serializers.FloatField(required=False, allow_null=True, min_value=40, max_value=180)
	fitnessLevel = serializers.ChoiceField(choices=['beginner', 'consistent', 'advanced'])
	workoutsPerWeek = serializers.IntegerField(min_value=0, max_value=14)
	maxPushups = serializers.IntegerField(min_value=0, max_value=200)
	runMinutes = serializers.IntegerField(min_value=0, max_value=240)
	restingHeartRate = serializers.IntegerField(required=False, min_value=35, max_value=130, default=70)
	canTouchToes = serializers.ChoiceField(choices=['yes', 'almost', 'no'])
	sleepHours = serializers.FloatField(min_value=0, max_value=14)
	goals = serializers.ListField(
		child=serializers.ChoiceField(
			choices=['cardio', 'weight_loss', 'strength', 'stress', 'stay_fit', 'mobility']
		),
		min_length=1,
		max_length=3,
	)
	trainingPreferences = serializers.JSONField(required=False, default=dict)
	restrictions = serializers.JSONField(required=False, default=dict)

	def validate_goals(self, value):
		seen = []
		for item in value:
			if item not in seen:
				seen.append(item)
		return seen

	def validate_trainingPreferences(self, value):
		return value if isinstance(value, dict) else {}

	def validate_restrictions(self, value):
		return value if isinstance(value, dict) else {}


class RegisterSerializer(serializers.ModelSerializer):
	username = serializers.CharField(
		max_length=150,
		validators=[UniqueValidator(queryset=User.objects.all())],
	)
	email = serializers.EmailField(
		required=True,
		validators=[UniqueValidator(queryset=User.objects.all())],
	)
	password = serializers.CharField(write_only=True, min_length=8)
	onboarding = RegistrationOnboardingSerializer(required=False, write_only=True)

	class Meta:
		model = User
		fields = ['username', 'email', 'password', 'onboarding']

	def validate_password(self, value: str) -> str:
		"""Run Django's built-in password validators."""
		validate_password(value)
		return value

	def create(self, validated_data):
		onboarding = validated_data.pop('onboarding', None)
		password = validated_data.pop('password')
		with transaction.atomic():
			user = User.objects.create_user(**validated_data, password=password)
			if onboarding:
				self._save_onboarding(user, onboarding)
		return user

	def _save_onboarding(self, user: User, onboarding: dict) -> None:
		profile, _ = Profile.objects.get_or_create(user=user)
		training_preferences = onboarding.get('trainingPreferences') or {}
		restrictions = onboarding.get('restrictions') or {}
		now = timezone.now()

		profile.height_cm = onboarding['heightCm']
		profile.weight_kg = onboarding['weightKg']
		profile.waist_cm = onboarding.get('waistCm')
		profile.gender = onboarding['gender']
		profile.fitness_level = onboarding['fitnessLevel']
		profile.fitness_goals = onboarding['goals']
		profile.training_preferences = training_preferences
		profile.training_restrictions = restrictions
		profile.onboarding_answers = onboarding
		profile.onboarding_version = onboarding.get('version') or 1
		profile.onboarding_completed_at = now
		profile.save(
			update_fields=[
				'height_cm',
				'weight_kg',
				'waist_cm',
				'gender',
				'fitness_level',
				'fitness_goals',
				'training_preferences',
				'training_restrictions',
				'onboarding_answers',
				'onboarding_version',
				'onboarding_completed_at',
			]
		)

		FitnessAssessment.objects.create(
			user=user,
			age_years=onboarding['ageYears'],
			gender=onboarding['gender'],
			height_cm=onboarding['heightCm'],
			weight_kg=onboarding['weightKg'],
			waist_cm=onboarding.get('waistCm'),
			resting_heart_rate=onboarding.get('restingHeartRate') or 70,
			max_pushups=onboarding['maxPushups'],
			max_run_minutes=onboarding['runMinutes'],
			can_touch_toes=onboarding['canTouchToes'],
			sleep_hours=onboarding['sleepHours'],
			source='registration_onboarding',
		)
