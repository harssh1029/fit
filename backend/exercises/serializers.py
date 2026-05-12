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
	thumbnail_url = serializers.SerializerMethodField()
	has_demo = serializers.SerializerMethodField()

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
			'thumbnail_url',
			'has_demo',
		]

	def _absolute_url(self, value: str) -> str:
		if not value:
			return ''
		if value.startswith('http://') or value.startswith('https://'):
			return value
		request = self.context.get('request')
		if request:
			return request.build_absolute_uri(value)
		return value

	def get_thumbnail_url(self, obj: Exercise) -> str:
		return self._absolute_url(obj.image_url or obj.gif_url or '')

	def get_gif_url(self, obj: Exercise) -> str:
		return self._absolute_url(obj.gif_url or '')

	def get_has_demo(self, obj: Exercise) -> bool:
		return bool(obj.gif_url)


class ExerciseDetailSerializer(ExerciseSerializer):
	gif_url = serializers.SerializerMethodField()

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
			'thumbnail_url',
			'has_demo',
			'secondary_targets',
			'video_url',
			'gif_url',
			'image_url',
			'instructions',
			'common_mistakes',
			'guideline',
			'description',
		]
