from django.db import migrations, models


BODY_GROUP_MAP = {
	# Chest
	'chest': 'chest',
	# Shoulders / upper back
	'neck': 'shoulders',
	'trapezius': 'shoulders',
	'deltoids': 'shoulders',
	# Arms
	'biceps': 'arms',
	'triceps': 'arms',
	'forearms': 'arms',
	# Core
	'abs': 'core',
	'obliques': 'core',
	# Hips & legs
	'hip_flexors': 'legs',
	'quadriceps': 'legs',
	'calves': 'legs',
	'tibialis': 'legs',
	'hamstrings': 'legs',
	# Back
	'lats': 'back',
	'lower_back': 'back',
	# Glutes
	'glutes': 'glutes',
}


def set_canonical_groups(apps, schema_editor):
	MuscleGroup = apps.get_model('exercises', 'MuscleGroup')
	for slug, group in BODY_GROUP_MAP.items():
		try:
			mg = MuscleGroup.objects.get(id=slug)
		except MuscleGroup.DoesNotExist:
			continue
		mg.canonical_group = group
		mg.save(update_fields=['canonical_group'])


def noop_reverse(apps, schema_editor):
	# We don't need to undo the canonical mapping on reverse migrations.
	pass


class Migration(migrations.Migration):

	dependencies = [
		('exercises', '0004_tune_demo_exercises_for_filters'),
	]

	operations = [
		migrations.AddField(
			model_name='musclegroup',
			name='canonical_group',
			field=models.CharField(
				blank=True,
				max_length=32,
				help_text=(
					'7-group mapping used by Body Battle Map: '
					'chest, shoulders, arms, back, core, glutes, legs.'
				),
			),
		),
		migrations.RunPython(set_canonical_groups, noop_reverse),
	]
