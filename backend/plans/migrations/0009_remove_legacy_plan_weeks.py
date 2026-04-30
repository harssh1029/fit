from django.db import migrations


def remove_legacy_weeks(apps, schema_editor):
    PlanWeek = apps.get_model("plans", "PlanWeek")
    PlanWeek.objects.filter(
        plan_id="hyrox_intense_3wk",
        plan_version__isnull=True,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0008_seed_structured_hyrox_intense"),
    ]

    operations = [
        migrations.RunPython(remove_legacy_weeks, migrations.RunPython.noop),
    ]
