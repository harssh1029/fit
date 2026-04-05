from django.db import migrations


BODY_PART_DEFS = [
	('neck', 'Neck', 'front'),
	('trapezius', 'Trapezius', 'both'),
	('chest', 'Chest', 'front'),
	('deltoids', 'Deltoids', 'both'),
	('biceps', 'Biceps', 'front'),
	('triceps', 'Triceps', 'back'),
	('forearms', 'Forearms', 'both'),
	('abs', 'Abs', 'front'),
	('obliques', 'Obliques', 'front'),
	('hip_flexors', 'Hip Flexors', 'front'),
	('quadriceps', 'Quadriceps', 'front'),
	('calves', 'Calves', 'both'),
	('tibialis', 'Tibialis', 'front'),
	('lats', 'Lats', 'back'),
	('lower_back', 'Lower Back', 'back'),
	('glutes', 'Glutes', 'back'),
	('hamstrings', 'Hamstrings', 'back'),
]


def create_demo_muscles_and_exercises(apps, schema_editor):
	MuscleGroup = apps.get_model('exercises', 'MuscleGroup')
	Exercise = apps.get_model('exercises', 'Exercise')

	for slug, name, side in BODY_PART_DEFS:
		muscle, _ = MuscleGroup.objects.get_or_create(
			id=slug,
			defaults={
				'name': name,
				'side': side,
				'regions': [],
				'aliases': [],
			},
		)

		if not Exercise.objects.filter(id=f'{slug}_demo').exists():
			exercise = Exercise.objects.create(
				id=f'{slug}_demo',
				name=f'{name} Demo Exercise',
				movement_pattern='demo',
				equipment=[],
				level='beginner',
				is_compound=True,
			)
			exercise.primary_muscles.add(muscle)


def remove_demo_muscles_and_exercises(apps, schema_editor):
	MuscleGroup = apps.get_model('exercises', 'MuscleGroup')
	Exercise = apps.get_model('exercises', 'Exercise')

	ex_ids = [f'{slug}_demo' for slug, _, _ in BODY_PART_DEFS]
	Exercise.objects.filter(id__in=ex_ids).delete()
	MuscleGroup.objects.filter(id__in=[slug for slug, _, _ in BODY_PART_DEFS]).delete()


class Migration(migrations.Migration):

	dependencies = [
		('exercises', '0001_initial'),
	]

	operations = [
		migrations.RunPython(
			create_demo_muscles_and_exercises,
			remove_demo_muscles_and_exercises,
		),
	]
