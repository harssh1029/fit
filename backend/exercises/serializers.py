from rest_framework import serializers

from .models import Exercise, MuscleGroup


class MuscleGroupSerializer(serializers.ModelSerializer):
	class Meta:
		model = MuscleGroup
		fields = ['id', 'name', 'side', 'regions', 'aliases', 'canonical_group']


class ExerciseSerializer(serializers.ModelSerializer):
	primary_muscles = serializers.SlugRelatedField(
		many=True,
		read_only=True,
		slug_field='id',
	)
	secondary_muscles = serializers.SlugRelatedField(
		many=True,
		read_only=True,
		slug_field='id',
	)

	class Meta:
		model = Exercise
		fields = [
			'id',
			'name',
			'primary_muscles',
			'secondary_muscles',
			'movement_pattern',
			'equipment',
			'level',
			'is_compound',
			'is_featured',
			'source',
			'body_part',
			'target',
			'secondary_targets',
			'video_url',
			'gif_url',
			'image_url',
			'instructions',
			'description',
		]
