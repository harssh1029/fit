from django.db import migrations, models


class Migration(migrations.Migration):

	dependencies = [
		("plans", "0016_seed_busy_hybrid_fat_loss_plans"),
	]

	operations = [
		migrations.AddField(
			model_name="userplan",
			name="training_days_pattern",
			field=models.JSONField(default=list, blank=True),
		),
	]
