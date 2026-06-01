from django.db import migrations

from plans.adaptive_seed import seed_adaptive_plan
from plans.master_plan_data import (
    mobilityLongevityMasterPlan,
    movementFoundationHomeMasterPlan,
    strengthPerformanceMasterPlan,
)


PLAN_CONFIGS = [
    (
        movementFoundationHomeMasterPlan,
        "movement_foundation_home",
        "adaptive_home_foundation_master",
        ["beginner", "home_workout", "movement_quality", "conditioning"],
        "beginner",
        "movement quality and practical home fitness",
    ),
    (
        strengthPerformanceMasterPlan,
        "strength_performance",
        "adaptive_strength_performance_master",
        ["strength", "barbell", "power", "progressive_overload"],
        "intermediate",
        "barbell strength and athletic power",
    ),
    (
        mobilityLongevityMasterPlan,
        "mobility_longevity",
        "adaptive_mobility_longevity_master",
        ["mobility", "longevity", "posture", "balance"],
        "beginner",
        "joint-friendly strength and durable movement",
    ),
]


def seed_new_adaptive_plans(apps, schema_editor):
    for config in PLAN_CONFIGS:
        seed_adaptive_plan(apps, *config)


def remove_new_adaptive_plans(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    Plan.objects.filter(id__in=[config[0]["id"] for config in PLAN_CONFIGS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0018_rename_plans_users_user_pl_d8d5b6_idx_plans_users_user_pl_d3ad6a_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_new_adaptive_plans, remove_new_adaptive_plans),
    ]
