from django.db import migrations
from django.utils.text import slugify

from plans.master_plan_data import WEEKDAY_PATTERNS, fullMarathonEliteMasterPlan


def parse_minutes(value):
    import re

    match = re.search(r"(\d+)", value or "")
    return int(match.group(1)) if match else 0


def exercise_slug(name):
    return f"marathon_{slugify(name).replace('-', '_')}"[:128]


def exercise_meta(category, fatigue_score):
    if category in {"run", "cardio"}:
        return {
            "movement_pattern": "locomotion",
            "primary_muscles": ["calves", "quads", "glutes"],
            "secondary_muscles": ["hamstrings", "hip_flexors", "aerobic_system"],
            "equipment": ["running"],
            "priority_score": 10,
            "fatigue_score": max(3, fatigue_score - 1),
        }
    if category == "strength":
        return {
            "movement_pattern": "running_strength",
            "primary_muscles": ["glutes", "hamstrings", "quads"],
            "secondary_muscles": ["calves", "core"],
            "equipment": ["weights"],
            "priority_score": 8,
            "fatigue_score": max(3, fatigue_score - 1),
        }
    if category in {"core", "prehab"}:
        return {
            "movement_pattern": "stability",
            "primary_muscles": ["core", "hips"],
            "secondary_muscles": ["glutes", "adductors"],
            "equipment": ["bodyweight"],
            "priority_score": 7,
            "fatigue_score": max(2, fatigue_score - 3),
        }
    if category in {"plyometric", "skill"}:
        return {
            "movement_pattern": "running_economy",
            "primary_muscles": ["calves", "feet", "glutes"],
            "secondary_muscles": ["core", "hamstrings"],
            "equipment": ["bodyweight"],
            "priority_score": 8,
            "fatigue_score": max(2, fatigue_score - 2),
        }
    if category == "nutrition":
        return {
            "movement_pattern": "fueling",
            "primary_muscles": ["aerobic_system"],
            "secondary_muscles": [],
            "equipment": ["nutrition"],
            "priority_score": 8,
            "fatigue_score": 1,
        }
    return {
        "movement_pattern": "recovery",
        "primary_muscles": ["aerobic_system"],
        "secondary_muscles": ["core"],
        "equipment": ["bodyweight"],
        "priority_score": 5,
        "fatigue_score": max(1, min(4, fatigue_score)),
    }


def nutrition_for(workout):
    hard = workout["intensity"] in {"hard", "race"} or workout["fatigue_score"] >= 8
    long_run = workout["workout_order"] == 5
    return {
        "title": "Marathon performance fueling",
        "description": "Fuel for adaptation and rehearse race-day execution.",
        "bullets": [
            "Use carbohydrates before quality sessions and long runs.",
            "Practice race gels and fluids during long runs." if long_run else "Keep hydration steady and protein consistent.",
            "Add electrolytes for hard, hot, or long sessions." if hard or long_run else "Keep recovery meals simple and consistent.",
        ],
    }


def seed_marathon_plan(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    PlanVersion = apps.get_model("plans", "PlanVersion")
    PlanWeek = apps.get_model("plans", "PlanWeek")
    PlanDay = apps.get_model("plans", "PlanDay")
    PlanExercise = apps.get_model("plans", "PlanExercise")
    PlanDayExercise = apps.get_model("plans", "PlanDayExercise")

    data = fullMarathonEliteMasterPlan
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
                "8-week Full Marathon Elite Build master plan."
            ),
            is_default=sessions == 4,
            is_premium=sessions in {5, 6},
            split_type="adaptive_marathon_master",
            training_days_pattern=WEEKDAY_PATTERNS[sessions],
            total_sessions=sessions * data["duration_weeks"],
            weekly_structure=[
                "P1 threshold, marathon-pace, and long-run sessions",
                "P2 lower-body durability" if sessions >= 4 else "Essential race-specific work",
                "Recovery and economy support" if sessions >= 5 else "Recovery protected",
            ],
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
                nutrition=nutrition_for(workout_data),
                supplements={
                    "electrolytes": "Use electrolytes for long, hot, or high-sweat runs.",
                    "carbohydrate": "Practice race-day carbohydrate sources during long runs.",
                    "magnesium": "Optional at night if it supports sleep quality.",
                },
                workout_template_id=f"{data['id']}_w{week_data['number']}_d{workout_data['workout_order']}",
            )

            for exercise_data in workout_data["exercises"]:
                name = exercise_data["name"]
                slug = exercise_slug(name)
                if slug not in exercise_cache:
                    meta = exercise_meta(
                        exercise_data["category"],
                        workout_data["fatigue_score"],
                    )
                    defaults = {
                        "category": exercise_data["category"],
                        "movement_pattern": meta["movement_pattern"],
                        "primary_muscles": meta["primary_muscles"],
                        "secondary_muscles": meta["secondary_muscles"],
                        "equipment": meta["equipment"],
                        "difficulty": "advanced",
                        "priority_score": meta["priority_score"],
                        "fatigue_score": meta["fatigue_score"],
                        "goal_tags": ["marathon", "race_prep", "endurance_performance"],
                        "coaching_cues": [
                            "Protect cadence",
                            "Stay tall under fatigue",
                            "Fuel before the work becomes urgent",
                        ],
                        "common_mistakes": [
                            "Opening too fast",
                            "Skipping fueling practice",
                            "Letting posture collapse late",
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
                    else:
                        for key, value in defaults.items():
                            setattr(exercise, key, value)
                        exercise.save(update_fields=[*defaults.keys()])
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
                    coach_instruction=exercise_data.get("notes", "")
                    or workout_data["coach_note"],
                    progression_rule=(
                        "Follow the authored marathon progression; do not add "
                        "extra work outside the selected rhythm."
                    ),
                )


def remove_marathon_plan(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    Plan.objects.filter(id=fullMarathonEliteMasterPlan["id"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0011_cleanup_adaptive_plan_db"),
    ]

    operations = [
        migrations.RunPython(seed_marathon_plan, remove_marathon_plan),
    ]
