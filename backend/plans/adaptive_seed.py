from django.utils.text import slugify

from .master_plan_data import WEEKDAY_PATTERNS


def parse_minutes(value):
    import re

    match = re.search(r"(\d+)", value or "")
    return int(match.group(1)) if match else 0


def exercise_slug(prefix, name):
    return f"{prefix}_{slugify(name).replace('-', '_')}"[:128]


def infer_body_groups(name, category):
    normalized = name.lower()
    groups = []

    def add(group):
        if group not in groups:
            groups.append(group)

    if any(token in normalized for token in ["bench", "push up", "chest", "fly"]):
        add("chest")
    if any(token in normalized for token in ["shoulder", "overhead", "lateral raise", "face pull", "push press"]):
        add("shoulders")
    if any(token in normalized for token in ["curl", "triceps", "pushdown"]):
        add("arms")
    if any(token in normalized for token in ["row", "pull up", "pull-up", "pulldown", "lat pull"]):
        add("back")
    if any(token in normalized for token in ["plank", "dead bug", "pallof", "bird dog", "core", "hollow", "carry"]):
        add("core")
    if any(token in normalized for token in ["glute", "hip thrust", "bridge"]):
        add("glutes")
    if any(
        token in normalized
        for token in [
            "squat",
            "lunge",
            "split squat",
            "step up",
            "step-up",
            "deadlift",
            "rdl",
            "calf",
            "run",
            "walk",
            "bike",
            "hinge",
        ]
    ):
        add("legs")
    if not groups and category == "run":
        add("legs")
    return groups


def exercise_meta(name, category, day_type, fatigue_score):
    body_groups = infer_body_groups(name, category)
    if category == "run":
        return {
            "movement_pattern": "running",
            "primary_muscles": body_groups or ["legs"],
            "secondary_muscles": ["calves", "core"],
            "equipment": ["bodyweight"],
            "priority_score": 8,
            "fatigue_score": max(4, fatigue_score),
        }
    if category == "strength":
        return {
            "movement_pattern": "strength",
            "primary_muscles": body_groups or ["full_body"],
            "secondary_muscles": ["core", "postural_system"],
            "equipment": ["bodyweight", "resistance_band", "weights"],
            "priority_score": 8,
            "fatigue_score": max(3, fatigue_score - 1),
        }
    if category == "conditioning":
        return {
            "movement_pattern": "conditioning",
            "primary_muscles": body_groups or ["full_body"],
            "secondary_muscles": ["aerobic_system", "core"],
            "equipment": ["bodyweight", "mixed"],
            "priority_score": 7,
            "fatigue_score": max(3, fatigue_score),
        }
    if category == "recovery" or day_type == "recovery":
        return {
            "movement_pattern": "recovery",
            "primary_muscles": body_groups or ["mobility_system"],
            "secondary_muscles": ["hips", "spine", "breathing"],
            "equipment": ["bodyweight"],
            "priority_score": 5,
            "fatigue_score": max(1, min(4, fatigue_score)),
        }
    return {
        "movement_pattern": "hybrid",
        "primary_muscles": body_groups or ["full_body"],
        "secondary_muscles": ["core"],
        "equipment": ["mixed"],
        "priority_score": 6,
        "fatigue_score": max(1, min(5, fatigue_score)),
    }


def nutrition_for(data, workout):
    hard = workout["intensity"] in {"hard", "race"} or workout["fatigue_score"] >= 8
    return {
        "title": f"{data['name']} fueling",
        "description": data["nutrition_description"],
        "bullets": [
            data["nutrition_protein"],
            data["nutrition_hard_day"] if hard else data["nutrition_easy_day"],
            "Use water consistently and add electrolytes for longer or sweat-heavy sessions.",
        ],
    }


def weekly_structure_for(sessions):
    if sessions == 3:
        return ["Three highest-return sessions", "Primary progression protected", "Recovery space preserved"]
    if sessions == 4:
        return ["Three primary sessions", "Top support session", "Recovery space preserved"]
    if sessions == 5:
        return ["Three primary sessions", "Top support session", "Dedicated recovery session"]
    return ["Three primary sessions", "Two support sessions", "Dedicated recovery session"]


def seed_adaptive_plan(apps, data, prefix, split_type, goal_tags, difficulty, plan_focus):
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
                "Workout visibility adapts to the selected weekly rhythm.",
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
                nutrition=nutrition_for(data, workout_data),
                supplements={
                    "protein": "Use food first; add a protein supplement only when it helps meet your daily target.",
                    "electrolytes": "Consider electrolytes for longer, hotter, or sweat-heavy sessions.",
                    "creatine": "Creatine monohydrate is optional when strength work is included.",
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
                        name,
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
                            "Finish with enough quality to recover for the next session",
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
