from django.db import migrations, models


class Migration(migrations.Migration):

	dependencies = [
		('exercises', '0002_seed_demo_bodypart_exercises'),
	]

	operations = [
		migrations.AddField(
			model_name='exercise',
			name='is_featured',
			field=models.BooleanField(default=False),
		),
	]
