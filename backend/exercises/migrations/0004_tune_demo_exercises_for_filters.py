from django.db import migrations


BODY_PART_CONFIG = {
	'chest': {
		'movement_pattern': 'push press',
		'is_compound': True,
		'is_featured': True,
	},
	'biceps': {
		'movement_pattern': 'curl pull',
		'is_compound': False,
		'is_featured': True,
	},
	'triceps': {
		'movement_pattern': 'press push',
		'is_compound': True,
		'is_featured': False,
	},
	'forearms': {
		'movement_pattern': 'hold carry',
		'is_compound': False,
		'is_featured': False,
	},
	'lats': {
		'movement_pattern': 'row pull',
		'is_compound': True,
		'is_featured': True,
	},
	'glutes': {
		'movement_pattern': 'bridge hold',
		'is_compound': True,
		'is_featured': False,
	},
	'hamstrings': {
		'movement_pattern': 'hinge pull',
		'is_compound': True,
		'is_featured': False,
	},
}


def tune_demo_exercises(apps, schema_editor):
	Exercise = apps.get_model('exercises', 'Exercise')

	for slug, cfg in BODY_PART_CONFIG.items():
		ex_id = f'{slug}_demo'
		try:
			ex = Exercise.objects.get(id=ex_id)
		except Exercise.DoesNotExist:
			continue

		ex.movement_pattern = cfg['movement_pattern']
		ex.is_compound = cfg['is_compound']
		ex.is_featured = cfg['is_featured']
		ex.save(update_fields=['movement_pattern', 'is_compound', 'is_featured'])


def noop(apps, schema_editor):
	# The exact previous values are not important, so we don't attempt to
	# restore them on migration rollback.
	pass


class Migration(migrations.Migration):

	dependencies = [
		('exercises', '0003_add_is_featured_field'),
	]

	operations = [
		migrations.RunPython(tune_demo_exercises, noop),
	]
