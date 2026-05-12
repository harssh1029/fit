from django.db import migrations
from django.utils.text import slugify

from plans.master_plan_data import (
    WEEKDAY_PATTERNS,
    busyProfessionalMasterPlan,
    fatLossShredMasterPlan,
    hybridAthleteMasterPlan,
)


PLAN_CONFIGS = [
    (
        busyProfessionalMasterPlan,
        "busy_professional",
        "adaptive_busy_professional_master",
        ["busy_professional", "efficient_fitness", "conditioning"],
        "intermediate",
        "efficient hybrid fitness",
    ),
    (
        hybridAthleteMasterPlan,
        "hybrid_athlete",
        "adaptive_hybrid_athlete_master",
        ["hybrid_athlete", "performance", "conditioning"],
        "advanced",
        "hybrid performance",
    ),
    (
        fatLossShredMasterPlan,
        "fat_loss",
        "adaptive_fat_loss_shred_master",
        ["fat_loss", "metabolic", "body_recomposition"],
        "intermediate",
        "metabolic fat loss",
    ),
]


def parse_minutes(value):
    import re

    match = re.search(r"(\d+)", value or "")
    return int(match.group(1)) if match else 0


def exercise_slug(prefix, name):
    return f"{prefix}_{slugify(name).replace('-', '_')}"[:128]


def exercise_meta(category, day_type, fatigue_score):
    if category == "run":
        return {
            "movement_pattern": "running",
            "primary_muscles": ["aerobic_system", "legs"],
            "secondary_muscles": ["calves", "core"],
            "equipment": ["bodyweight"],
            "priority_score": 8,
            "fatigue_score": max(4, fatigue_score),
        }
    if category == "strength":
        return {
            "movement_pattern": "strength",
            "primary_muscles": ["full_body"],
            "secondary_muscles": ["core", "postural_system"],
            "equipment": ["weights"],
            "priority_score": 8,
            "fatigue_score": max(3, fatigue_score - 1),
        }
    if category == "conditioning":
        return {
            "movement_pattern": "conditioning",
            "primary_muscles": ["full_body"],
            "secondary_muscles": ["aerobic_system", "core"],
            "equipment": ["erg", "mixed", "bodyweight"],
            "priority_score": 7,
            "fatigue_score": max(3, fatigue_score),
        }
    if category == "recovery" or day_type == "recovery":
        return {
            "movement_pattern": "recovery",
            "primary_muscles": ["aerobic_system"],
            "secondary_muscles": ["hips", "spine", "breathing"],
            "equipment": ["bodyweight"],
            "priority_score": 5,
            "fatigue_score": max(1, min(4, fatigue_score)),
        }
    return {
        "movement_pattern": "hybrid",
        "primary_muscles": ["full_body"],
        "secondary_muscles": ["core"],
        "equipment": ["mixed"],
        "priority_score": 6,
        "fatigue_score": max(1, min(5, fatigue_score)),
    }


def nutrition_for(plan_name, workout):
    hard = workout["intensity"] in {"hard", "race"} or workout["fatigue_score"] >= 8
    return {
        "title": f"{plan_name} fueling",
        "description": "Support training quality, recovery, and body composition with simple, repeatable nutrition.",
        "bullets": [
            "Prioritize protein at each meal to protect lean tissue.",
            "Use carbohydrates around hard sessions." if hard else "Keep meals steady and hydration consistent.",
            "Add electrolytes for longer, hotter, or sweat-heavy sessions.",
        ],
    }


def weekly_structure_for(sessions):
    if sessions == 3:
        return ["P1 core sessions only", "Highest ROI training days", "Recovery protected"]
    if sessions == 4:
        return ["P1 core sessions", "Top P2 support session", "Recovery protected"]
    if sessions == 5:
        return ["P1 core sessions", "P2 support work", "Top P3 recovery session"]
    return ["All P1 sessions", "All P2 support sessions", "P3 recovery session"]


def seed_plan(apps, data, prefix, split_type, goal_tags, difficulty, plan_focus):
    Plan = apps.get_model("plans", "Plan")
    PlanVersion = apps.get_model("plans", "PlanVersion")
    PlanWeek = apps.get_model("plans", "PlanWeek")
    PlanDay = apps.get_model("plans", "PlanDay")
    PlanExercise = apps.get_model("plans", "PlanExercise")
    PlanDayExercise = apps.get_model("plans", "PlanDayExercise")

    plan, _ = Plan.objects.update_or_create(
        id=data["id"],
        defaults={
            "name": data["name"],
            "subtitle": data["subtitle"],
            "level": data["level"],
            "duration_weeks": data["duration_weeks"],
            "sessions_per_week": data["max_sessions_per_week"],
            "default_sessions_per_week": 4,
            "max_sessions_per_week": data["max_sessions_per_week"],
            "supported_sessions_per_week": data["supported_sessions_per_week"],
            "goal": data["goal"],
            "summary": data["summary"],
            "audience": data["audience"],
            "result": data["result"],
            "long_description": data["long_description"],
            "tags": data["tags"],
            "is_active": True,
            "is_premium_plan": True,
        },
    )

    PlanWeek.objects.filter(plan=plan).delete()
    PlanVersion.objects.filter(plan=plan).delete()

    for sessions in data["supported_sessions_per_week"]:
        PlanVersion.objects.create(
            id=f"{data['id']}_{sessions}d",
            plan=plan,
            sessions_per_week=sessions,
            title=f"{data['name']} - {sessions} Days/Week",
            description=(
                f"Adaptive {sessions}-day rhythm filtered from the same "
                f"8-week {data['name']} master plan."
            ),
            is_default=sessions == 4,
            is_premium=sessions in {5, 6},
            split_type=split_type,
            training_days_pattern=WEEKDAY_PATTERNS[sessions],
            total_sessions=sessions * data["duration_weeks"],
            weekly_structure=weekly_structure_for(sessions),
        )

    exercise_cache = {}
    for week_data in data["weeks"]:
        week = PlanWeek.objects.create(
            plan=plan,
            plan_version=None,
            number=week_data["number"],
            title=week_data["title"],
            focus=week_data["focus"],
            coach_note=week_data["coach_note"],
            recovery_priority=week_data["recovery_priority"],
            intensity_theme=week_data["focus"],
            highlights=[
                week_data["focus"],
                week_data["recovery_priority"],
                "Workout visibility adapts by selected weekly rhythm.",
            ],
        )

        for workout_data in week_data["workouts"]:
            absolute_day = (
                (week_data["number"] - 1) * data["max_sessions_per_week"]
            ) + workout_data["workout_order"]
            day = PlanDay.objects.create(
                plan_week=week,
                day_index=absolute_day,
                workout_order=workout_data["workout_order"],
                title=workout_data["title"],
                priority=workout_data["priority"],
                priority_order=workout_data["priority_order"],
                description=workout_data["goal"],
                duration=workout_data["duration"],
                duration_minutes=parse_minutes(workout_data["duration"]),
                day_type=workout_data["day_type"],
                intensity=workout_data["intensity"],
                rpe_target=f"{workout_data['fatigue_score']}/10",
                goal=workout_data["goal"],
                fatigue_score=workout_data["fatigue_score"],
                primary_focus=workout_data["goal"],
                secondary_focus=week_data["focus"],
                coach_note=workout_data["coach_note"],
                nutrition=nutrition_for(data["name"], workout_data),
                supplements={
                    "protein": "Center meals around quality protein.",
                    "electrolytes": "Use electrolytes for long or sweat-heavy sessions.",
                    "creatine": "Creatine monohydrate 3-5g daily when strength work is included.",
                },
                workout_template_id=(
                    f"{data['id']}_w{week_data['number']}_d{workout_data['workout_order']}"
                ),
            )

            for exercise_data in workout_data["exercises"]:
                name = exercise_data["name"]
                slug = exercise_slug(prefix, name)
                if slug not in exercise_cache:
                    meta = exercise_meta(
                        exercise_data["category"],
                        workout_data["day_type"],
                        workout_data["fatigue_score"],
                    )
                    defaults = {
                        "category": exercise_data["category"],
                        "movement_pattern": meta["movement_pattern"],
                        "primary_muscles": meta["primary_muscles"],
                        "secondary_muscles": meta["secondary_muscles"],
                        "equipment": meta["equipment"],
                        "difficulty": difficulty,
                        "priority_score": meta["priority_score"],
                        "fatigue_score": meta["fatigue_score"],
                        "goal_tags": goal_tags,
                        "coaching_cues": [
                            f"Keep the focus on {plan_focus}",
                            "Control positions as fatigue rises",
                            "Stop bonus work before it compromises recovery",
                        ],
                        "common_mistakes": [
                            "Letting technique collapse under fatigue",
                            "Turning recovery work into another hard session",
                            "Adding unplanned volume outside the selected rhythm",
                        ],
                    }
                    exercise = PlanExercise.objects.filter(name=name).first()
                    if exercise is None:
                        exercise = PlanExercise.objects.filter(id=slug).first()
                    if exercise is None:
                        exercise = PlanExercise.objects.create(
                            id=slug,
                            name=name,
                            **defaults,
                        )
                    exercise_cache[slug] = exercise

                secondary = " | ".join(
                    item
                    for item in [
                        exercise_data.get("rest", ""),
                        exercise_data.get("intensity", ""),
                        exercise_data.get("notes", ""),
                    ]
                    if item
                )
                PlanDayExercise.objects.create(
                    plan_day=day,
                    exercise=exercise_cache[slug],
                    order=exercise_data["order"],
                    block="main",
                    label=name,
                    primary=exercise_data["prescription"],
                    secondary=secondary,
                    prescription={
                        "prescription": exercise_data["prescription"],
                        "rest": exercise_data.get("rest", ""),
                        "intensity": exercise_data.get("intensity", ""),
                        "notes": exercise_data.get("notes", ""),
                        "category": exercise_data["category"],
                    },
                    coach_instruction=(
                        exercise_data.get("notes", "") or workout_data["coach_note"]
                    ),
                    progression_rule=(
                        "Follow the authored master-plan progression; the selected "
                        "weekly rhythm changes visibility, not exercise construction."
                    ),
                )


def seed_new_adaptive_plans(apps, schema_editor):
    for config in PLAN_CONFIGS:
        seed_plan(apps, *config)


def remove_new_adaptive_plans(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    Plan.objects.filter(id__in=[config[0]["id"] for config in PLAN_CONFIGS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0015_refresh_lean_muscle_builder_format"),
    ]

    operations = [
        migrations.RunPython(seed_new_adaptive_plans, remove_new_adaptive_plans),
    ]
