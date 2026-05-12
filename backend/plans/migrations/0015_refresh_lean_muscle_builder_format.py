from importlib import import_module

from django.db import migrations


def refresh_lean_muscle_plan(apps, schema_editor):
    seed_module = import_module("plans.migrations.0014_seed_lean_muscle_builder")
    seed_module.seed_lean_muscle_plan(apps, schema_editor)


def remove_refreshed_lean_muscle_plan(apps, schema_editor):
    seed_module = import_module("plans.migrations.0014_seed_lean_muscle_builder")
    seed_module.remove_lean_muscle_plan(apps, schema_editor)


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0014_seed_lean_muscle_builder"),
    ]

    operations = [
        migrations.RunPython(
            refresh_lean_muscle_plan,
            remove_refreshed_lean_muscle_plan,
        ),
    ]
