from django.db import migrations


def seed_hyrox_weeks2_3_exercises(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    PlanWeek = apps.get_model("plans", "PlanWeek")
    PlanDay = apps.get_model("plans", "PlanDay")
    PlanDayExercise = apps.get_model("plans", "PlanDayExercise")

    try:
        plan = Plan.objects.get(id="hyrox_intense_3wk")
    except Plan.DoesNotExist:  # pragma: no cover - defensive
        return

    try:
        w2 = PlanWeek.objects.get(plan=plan, number=2)
        w3 = PlanWeek.objects.get(plan=plan, number=3)
    except PlanWeek.DoesNotExist:  # pragma: no cover - defensive
        return

    weeks = {2: w2, 3: w3}

    def add_day_exercises(week_number, day_index, rows):
        week = weeks.get(week_number)
        if not week:
            return
        try:
            day = PlanDay.objects.get(plan_week=week, day_index=day_index)
        except PlanDay.DoesNotExist:  # pragma: no cover - defensive
            return

        for order, label, primary, secondary in rows:
            PlanDayExercise.objects.update_or_create(
                plan_day=day,
                order=order,
                label=label,
                defaults={"primary": primary, "secondary": secondary},
            )

    # Week 2: Race Pace & Power
    add_day_exercises(
        2,
        8,
        [
            (0, "Warm Up", "10 min "+"Jog", "Dynamic mobility"),
            (1, "Race-Pace Intervals", "6 × 1 km", "90-95% race pace"),
            (2, "Sled Push + Pull", "4 rounds", "Heavy, controlled"),
            (3, "Cool Down", "10 min "+"Walk", "Full body stretch"),
        ],
    )

    add_day_exercises(
        2,
        9,
        [
            (0, "Warm Up", "8 min Bike/Row", "Band work"),
            (1, "Back Squat", "4 × 5", "Heavy"),
            (2, "Deadlift", "4 × 5", "Heavy"),
            (3, "Push Press", "4 × 6", "Moderate-heavy"),
            (4, "Core Finisher", "3 sets", "Carries + planks"),
        ],
    )

    add_day_exercises(
        2,
        10,
        [
            (0, "Warm Up", "10 min "+"Jog", "Strides × 4"),
            (1, "Threshold Run", "3 × 8 min", "Hard but sustainable"),
            (2, "SkiErg + Row", "4 rounds", "Race-pace efforts"),
            (3, "Cool Down", "10 min "+"Walk", "Stretch"),
        ],
    )

    add_day_exercises(
        2,
        11,
        [
            (0, "Easy Cardio", "20 min", "Very easy"),
            (1, "Hip Mobility", "10 min", "90/90, pigeon, couch"),
            (2, "Foam Roll", "10 min", "Hips, quads, calves"),
        ],
    )

    add_day_exercises(
        2,
        12,
        [
            (0, "Warm Up", "10 min", "Dynamic"),
            (1, "Wall Balls", "5 × 20 reps", "Steady"),
            (2, "Burpee Broad Jump", "4 × 10 reps", "Controlled"),
            (3, "Row/SkiErg", "4 × 500m", "Moderate-hard"),
            (4, "Strength Finisher", "3 sets", "Core + grip"),
        ],
    )

    add_day_exercises(
        2,
        13,
        [
            (0, "Warm Up", "15 min", "Jog + mobility"),
            (1, "Half Race Blocks", "4-5 blocks", "1 km run + stations"),
            (2, "Transition Practice", "Between blocks", "Race pacing"),
            (3, "Cool Down", "10-15 min", "Walk + stretch"),
        ],
    )

    add_day_exercises(
        2,
        14,
        [
            (0, "Full Rest", "No structured work", "Optional easy walk"),
            (1, "Recovery", "15-20 min", "Foam roll + stretch"),
        ],
    )

    # Week 3: Sharpen & Peak
    add_day_exercises(
        3,
        15,
        [
            (0, "Warm Up", "10 min "+"Jog", "Strides × 4"),
            (1, "Sharp Intervals", "6 × 800m", "Faster than race pace"),
            (2, "Station Combos", "3-4 rounds", "SkiErg, wall balls, runs"),
            (3, "Cool Down", "10 min", "Walk + stretch"),
        ],
    )

    add_day_exercises(
        3,
        16,
        [
            (0, "Warm Up", "8 min", "Bike/Row"),
            (1, "Squat/Deadlift", "3 × 5", "Moderate"),
            (2, "Upper Pull/Press", "3 × 8", "Moderate"),
            (3, "Core", "3 sets", "Planks + carries"),
        ],
    )

    add_day_exercises(
        3,
        17,
        [
            (0, "Warm Up", "15 min", "Jog + drills"),
            (1, "Full Race Simulation", "All 8 runs + stations", "Race effort"),
            (2, "Cool Down", "15-20 min", "Walk, stretch, refuel"),
        ],
    )

    add_day_exercises(
        3,
        18,
        [
            (0, "Full Rest", "No training", "Optional walk"),
            (1, "Recovery", "15-20 min", "Foam roll + easy mobility"),
        ],
    )

    add_day_exercises(
        3,
        19,
        [
            (0, "Shakeout Run", "20-25 min", "Easy"),
            (1, "Light Stations", "2-3 light rounds", "Technique only"),
            (2, "Mobility", "10-15 min", "Hips + shoulders"),
        ],
    )

    add_day_exercises(
        3,
        20,
        [
            (0, "Activation", "15-20 min", "Short jog + drills"),
            (1, "Race Prep", "10-15 min", "Walk course, visualize"),
        ],
    )

    add_day_exercises(
        3,
        21,
        [
            (0, "Pre-Race Warm Up", "15-20 min", "Easy jog + mobility"),
            (1, "RACE", "Hyrox event", "Full effort"),
            (2, "Post-Race", "10-20 min", "Walk, stretch, refuel"),
        ],
    )


def unseed_hyrox_weeks2_3_exercises(apps, schema_editor):  # pragma: no cover - simple
    Plan = apps.get_model("plans", "Plan")
    PlanDayExercise = apps.get_model("plans", "PlanDayExercise")

    try:
        plan = Plan.objects.get(id="hyrox_intense_3wk")
    except Plan.DoesNotExist:
        return

    PlanDayExercise.objects.filter(plan_day__plan_week__plan=plan).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0005_userplan"),
    ]

    operations = [
        migrations.RunPython(
            seed_hyrox_weeks2_3_exercises, unseed_hyrox_weeks2_3_exercises
        ),
    ]
