from django.db import migrations, models


class Migration(migrations.Migration):
	dependencies = [
		('community', '0001_initial'),
	]

	operations = [
		migrations.AddField(
			model_name='userpubliccard',
			name='overall_score',
			field=models.PositiveSmallIntegerField(default=0),
		),
	]
