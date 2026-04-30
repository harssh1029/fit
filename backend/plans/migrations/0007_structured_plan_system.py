from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0006_seed_hyrox_weeks2_3_exercises"),
    ]

    operations = [
        migrations.AddField(
            model_name="plan",
            name="default_sessions_per_week",
            field=models.PositiveSmallIntegerField(default=4),
        ),
        migrations.AddField(
            model_name="plan",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="plan",
            name="is_premium_plan",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="plan",
            name="subtitle",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="plan",
            name="supported_sessions_per_week",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="plan",
            name="tags",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.CreateModel(
            name="PlanVersion",
            fields=[
                ("id", models.SlugField(max_length=128, primary_key=True, serialize=False)),
                ("sessions_per_week", models.PositiveSmallIntegerField()),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField()),
                ("is_default", models.BooleanField(default=False)),
                ("is_premium", models.BooleanField(default=False)),
                ("split_type", models.CharField(max_length=128)),
                ("training_days_pattern", models.JSONField(default=list)),
                ("total_sessions", models.PositiveSmallIntegerField()),
                ("weekly_structure", models.JSONField(blank=True, default=list)),
                ("plan", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="versions", to="plans.plan")),
            ],
            options={
                "ordering": ["plan_id", "sessions_per_week"],
                "unique_together": {("plan", "sessions_per_week")},
            },
        ),
        migrations.CreateModel(
            name="PlanExercise",
            fields=[
                ("id", models.SlugField(max_length=128, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255, unique=True)),
                ("category", models.CharField(max_length=128)),
                ("movement_pattern", models.CharField(blank=True, max_length=128)),
                ("primary_muscles", models.JSONField(blank=True, default=list)),
                ("secondary_muscles", models.JSONField(blank=True, default=list)),
                ("equipment", models.JSONField(blank=True, default=list)),
                ("difficulty", models.CharField(blank=True, max_length=32)),
                ("priority_score", models.PositiveSmallIntegerField(default=5)),
                ("fatigue_score", models.PositiveSmallIntegerField(default=5)),
                ("goal_tags", models.JSONField(blank=True, default=list)),
                ("coaching_cues", models.JSONField(blank=True, default=list)),
                ("common_mistakes", models.JSONField(blank=True, default=list)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.AddField(
            model_name="planweek",
            name="coach_note",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="planweek",
            name="intensity_theme",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="planweek",
            name="plan_version",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="weeks", to="plans.planversion"),
        ),
        migrations.AlterUniqueTogether(
            name="planweek",
            unique_together={("plan", "plan_version", "number")},
        ),
        migrations.AddField(
            model_name="planday",
            name="coach_note",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="planday",
            name="duration_minutes",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="planday",
            name="intensity",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name="planday",
            name="primary_focus",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="planday",
            name="rpe_target",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name="planday",
            name="secondary_focus",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="planday",
            name="day_type",
            field=models.CharField(choices=[("strength", "Strength"), ("cardio", "Cardio"), ("recovery", "Recovery"), ("mixed", "Mixed"), ("hybrid_strength_run", "Hybrid Strength Run"), ("run_upper_engine", "Run Upper Engine"), ("compromised_running", "Compromised Running"), ("hyrox_simulation", "HYROX Simulation")], max_length=32),
        ),
        migrations.AddField(
            model_name="plandayexercise",
            name="block",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="plandayexercise",
            name="coach_instruction",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="plandayexercise",
            name="exercise",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="plan_day_links", to="plans.planexercise"),
        ),
        migrations.AddField(
            model_name="plandayexercise",
            name="prescription",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="plandayexercise",
            name="progression_rule",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="userplan",
            name="completed_sessions",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="userplan",
            name="completion_percent",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="userplan",
            name="end_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="userplan",
            name="is_recalibrated",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="userplan",
            name="missed_sessions",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="userplan",
            name="original_end_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="userplan",
            name="plan_version",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="user_plans", to="plans.planversion"),
        ),
        migrations.AddField(
            model_name="userplan",
            name="recalibration_count",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="userplan",
            name="sessions_per_week",
            field=models.PositiveSmallIntegerField(default=4),
        ),
        migrations.AddField(
            model_name="userplan",
            name="start_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="userplan",
            name="total_sessions",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="UserScheduledWorkout",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("week_number", models.PositiveSmallIntegerField()),
                ("day_index", models.PositiveSmallIntegerField()),
                ("scheduled_date", models.DateField()),
                ("original_scheduled_date", models.DateField()),
                ("status", models.CharField(choices=[("scheduled", "Scheduled"), ("completed", "Completed"), ("missed", "Missed"), ("skipped", "Skipped")], default="scheduled", max_length=16)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("missed_at", models.DateTimeField(blank=True, null=True)),
                ("order_index", models.PositiveSmallIntegerField()),
                ("plan_day", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="scheduled_workouts", to="plans.planday")),
                ("user_plan", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="scheduled_workouts", to="plans.userplan")),
            ],
            options={
                "ordering": ["user_plan", "order_index"],
                "indexes": [
                    models.Index(fields=["user_plan", "status"], name="plans_users_user_pl_d8d5b6_idx"),
                    models.Index(fields=["scheduled_date"], name="plans_users_schedul_41f0ab_idx"),
                ],
            },
        ),
    ]
