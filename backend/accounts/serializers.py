from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers
from rest_framework.validators import UniqueValidator

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
			'height_cm',
			'weight_kg',
				'waist_cm',
				'gender',
				'date_of_birth',
			'timezone',
			'active_plan_id',
			'personal_bests',
		]
		read_only_fields: list[str] = []


class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ['id', 'username', 'email']


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

	class Meta:
		model = User
		fields = ['username', 'email', 'password']

	def validate_password(self, value: str) -> str:
		"""Run Django's built-in password validators."""
		validate_password(value)
		return value

	def create(self, validated_data):
		password = validated_data.pop('password')
		user = User.objects.create_user(**validated_data, password=password)
		return user
