from django.db import migrations, models
from django.utils.text import slugify

from plans.master_plan_data import WEEKDAY_PATTERNS, hyroxIntenseMasterPlan


def parse_minutes(value):
    import re

    match = re.search(r"(\d+)", value or "")
    return int(match.group(1)) if match else 0


def exercise_slug(name):
    return f"hyrox_{slugify(name).replace('-', '_')}"[:128]


def exercise_meta(category, fatigue_score):
    if category in {"run", "cardio"}:
        return {
            "movement_pattern": "locomotion",
            "primary_muscles": ["calves", "quads", "glutes"],
            "secondary_muscles": ["hamstrings", "aerobic_system"],
            "equipment": ["running"],
            "priority_score": 9,
            "fatigue_score": max(3, fatigue_score - 1),
        }
    if category == "erg":
        return {
            "movement_pattern": "cyclical_power",
            "primary_muscles": ["lats", "quads", "glutes"],
            "secondary_muscles": ["core", "posterior_chain"],
            "equipment": ["erg"],
            "priority_score": 8,
            "fatigue_score": max(3, fatigue_score - 2),
        }
    if category == "station":
        return {
            "movement_pattern": "hyrox_station",
            "primary_muscles": ["quads", "glutes", "core"],
            "secondary_muscles": ["shoulders", "grip"],
            "equipment": ["hyrox_station"],
            "priority_score": 10,
            "fatigue_score": fatigue_score,
        }
    if category == "strength":
        return {
            "movement_pattern": "strength",
            "primary_muscles": ["quads", "glutes", "posterior_chain"],
            "secondary_muscles": ["core"],
            "equipment": ["weights"],
            "priority_score": 7,
            "fatigue_score": max(3, fatigue_score - 1),
        }
    return {
        "movement_pattern": category,
        "primary_muscles": ["core"],
        "secondary_muscles": [],
        "equipment": ["bodyweight"],
        "priority_score": 5,
        "fatigue_score": max(1, min(4, fatigue_score)),
    }


def nutrition_for(workout):
    hard = workout["intensity"] in {"hard", "race"} or workout["fatigue_score"] >= 8
    return {
        "title": "Performance fueling",
        "description": "Fuel the work without overcomplicating the day.",
        "bullets": [
            "Prioritize protein at every main meal.",
            "Use more carbohydrates before and after hard HYROX sessions." if hard else "Keep carbohydrates steady and hydration consistent.",
            "Add electrolytes for long, hot, or high-sweat sessions.",
        ],
    }


def seed_master_plan(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    PlanVersion = apps.get_model("plans", "PlanVersion")
    PlanWeek = apps.get_model("plans", "PlanWeek")
    PlanDay = apps.get_model("plans", "PlanDay")
    PlanExercise = apps.get_model("plans", "PlanExercise")
    PlanDayExercise = apps.get_model("plans", "PlanDayExercise")

    data = hyroxIntenseMasterPlan
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
            "is_premium_plan": False,
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
                "8-week HYROX Intense master plan."
            ),
            is_default=sessions == 4,
            is_premium=sessions in {5, 6},
            split_type="adaptive_hyrox_master",
            training_days_pattern=WEEKDAY_PATTERNS[sessions],
            total_sessions=sessions * data["duration_weeks"],
            weekly_structure=[
                "P1 race-specific sessions",
                "P2 strength support" if sessions >= 4 else "Dense hybrid focus",
                "Recovery exposure" if sessions >= 6 else "Recovery protected",
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
            absolute_day = ((week_data["number"] - 1) * data["max_sessions_per_week"]) + workout_data["workout_order"]
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
                    "creatine": "Creatine monohydrate 3-5g daily.",
                    "electrolytes": "Use electrolytes for hard or long sessions.",
                    "magnesium": "Optional at night to support sleep quality.",
                },
                workout_template_id=f"{data['id']}_w{week_data['number']}_d{workout_data['workout_order']}",
            )

            for exercise_data in workout_data["exercises"]:
                name = exercise_data["name"]
                slug = exercise_slug(name)
                if slug not in exercise_cache:
                    meta = exercise_meta(exercise_data["category"], workout_data["fatigue_score"])
                    defaults = {
                        "category": exercise_data["category"],
                        "movement_pattern": meta["movement_pattern"],
                        "primary_muscles": meta["primary_muscles"],
                        "secondary_muscles": meta["secondary_muscles"],
                        "equipment": meta["equipment"],
                        "difficulty": "advanced",
                        "priority_score": meta["priority_score"],
                        "fatigue_score": meta["fatigue_score"],
                        "goal_tags": ["hyrox", "race_prep", "hybrid_performance"],
                        "coaching_cues": [
                            "Control breathing",
                            "Protect posture",
                            "Make transitions deliberate",
                        ],
                        "common_mistakes": [
                            "Opening too fast",
                            "Letting mechanics collapse",
                            "Skipping planned recovery",
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
                    coach_instruction=exercise_data.get("notes", "") or workout_data["coach_note"],
                    progression_rule="Follow the authored weekly progression; do not add extra work outside the selected rhythm.",
                )


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0009_remove_legacy_plan_weeks"),
    ]

    operations = [
        migrations.AddField(
            model_name="plan",
            name="max_sessions_per_week",
            field=models.PositiveSmallIntegerField(default=6),
        ),
        migrations.AddField(
            model_name="planweek",
            name="recovery_priority",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="planday",
            name="fatigue_score",
            field=models.PositiveSmallIntegerField(default=5),
        ),
        migrations.AddField(
            model_name="planday",
            name="goal",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="planday",
            name="priority",
            field=models.CharField(
                choices=[("P1", "Priority 1"), ("P2", "Priority 2"), ("P3", "Priority 3")],
                default="P1",
                max_length=2,
            ),
        ),
        migrations.AddField(
            model_name="planday",
            name="priority_order",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="planday",
            name="workout_order",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AlterField(
            model_name="planday",
            name="day_type",
            field=models.CharField(
                choices=[
                    ("strength", "Strength"),
                    ("cardio", "Cardio"),
                    ("hybrid", "Hybrid"),
                    ("recovery", "Recovery"),
                    ("mixed", "Mixed"),
                    ("hybrid_strength_run", "Hybrid Strength Run"),
                    ("run_upper_engine", "Run Upper Engine"),
                    ("compromised_running", "Compromised Running"),
                    ("hyrox_simulation", "HYROX Simulation"),
                ],
                max_length=32,
            ),
        ),
        migrations.RunPython(seed_master_plan, migrations.RunPython.noop),
    ]
