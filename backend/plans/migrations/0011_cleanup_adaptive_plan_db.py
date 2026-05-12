from django.db import migrations


MASTER_PLAN_ID = "hyrox_intense_3wk"


def cleanup_adaptive_plan_db(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    PlanWeek = apps.get_model("plans", "PlanWeek")
    PlanExercise = apps.get_model("plans", "PlanExercise")

    Plan.objects.exclude(id=MASTER_PLAN_ID).delete()
    PlanWeek.objects.filter(plan_id=MASTER_PLAN_ID).exclude(
        plan_version__isnull=True,
    ).delete()

    linked_exercise_ids = set(
        apps.get_model("plans", "PlanDayExercise")
        .objects.filter(exercise_id__isnull=False)
        .values_list("exercise_id", flat=True)
    )
    PlanExercise.objects.exclude(id__in=linked_exercise_ids).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0010_adaptive_hyrox_master_plan"),
    ]

    operations = [
        migrations.RunPython(cleanup_adaptive_plan_db, migrations.RunPython.noop),
    ]
