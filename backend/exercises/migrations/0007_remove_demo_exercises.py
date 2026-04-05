from django.db import migrations


def remove_demo_exercises(apps, schema_editor):
	"""Remove the internal demo exercises seeded for testing.

	We keep the MuscleGroup entries (they are used by filters/body map) and only
	delete Exercise rows whose IDs match the ``*_demo`` pattern.
	"""
	Exercise = apps.get_model('exercises', 'Exercise')
	Exercise.objects.filter(id__endswith='_demo').delete()


class Migration(migrations.Migration):

	dependencies = [
		('exercises', '0006_exercise_body_part_exercise_gif_url_and_more'),
	]

	operations = [
		migrations.RunPython(remove_demo_exercises, migrations.RunPython.noop),
	]
