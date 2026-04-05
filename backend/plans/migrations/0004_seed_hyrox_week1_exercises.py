from django.db import migrations


def seed_hyrox_week1_exercises(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    PlanWeek = apps.get_model("plans", "PlanWeek")
    PlanDay = apps.get_model("plans", "PlanDay")
    PlanDayExercise = apps.get_model("plans", "PlanDayExercise")

    try:
        plan = Plan.objects.get(id="hyrox_intense_3wk")
    except Plan.DoesNotExist:  # pragma: no cover - defensive
        return

    try:
        w1 = PlanWeek.objects.get(plan=plan, number=1)
    except PlanWeek.DoesNotExist:  # pragma: no cover - defensive
        return

    def add_day_exercises(day_index, rows):
        try:
            day = PlanDay.objects.get(plan_week=w1, day_index=day_index)
        except PlanDay.DoesNotExist:  # pragma: no cover - defensive
            return

        for order, label, primary, secondary in rows:
            PlanDayExercise.objects.update_or_create(
                plan_day=day,
                order=order,
                label=label,
                defaults={"primary": primary, "secondary": secondary},
            )

    # Day 1: Hybrid — Station Intro + Easy Run (75 min • RPE 5-6)
    add_day_exercises(
        1,
        [
            (0, "Warm Up", "10 min • Jog", "Dynamic stretch"),
            (1, "SkiErg", "3 × 250m", "Easy pace"),
            (2, "Sled Push", "4 × 25m", "M:125kg W:75kg"),
            (3, "Sled Pull", "4 × 25m", "M:100kg W:50kg"),
            (4, "Burpee Broad Jump", "3 × 10 reps", "Moderate"),
            (5, "Rowing", "2 × 500m", "Easy pace"),
            (6, "Farmers Carry", "2 × 100m", "M:24kg W:16kg"),
            (7, "Sandbag Lunge", "2 × 50m", "M:20kg W:10kg"),
            (8, "Wall Balls", "3 × 15 reps", "M:6kg W:4kg"),
            (9, "Easy Run", "20 min", "6:30-7:30/km"),
            (10, "Cool Down", "10 min • Stretch", "Static hold 30s each"),
        ],
    )

    # Day 2: Strength — Push + Pull + Core (60 min • RPE 6-7)
    add_day_exercises(
        2,
        [
            (0, "Warm Up", "8 min • Bike/Rope", "Banded pull-aparts"),
            (1, "Barbell Back Squat", "4 × 8-10", "60-70% 1RM"),
            (2, "Barbell Bent-Over Row", "4 × 8-10", "60-70% 1RM"),
            (3, "Overhead Press", "4 × 8", "60-65% 1RM"),
            (4, "Romanian Deadlift", "3 × 10", "Moderate"),
            (5, "Push-Ups", "3 × 15", "Bodyweight"),
            (6, "Plank Hold", "3 × 45 sec", "Bodyweight"),
            (7, "Farmers Hold", "3 × 45 sec", "Heaviest DBs/KBs"),
            (8, "Dead Hang", "3 × 30 sec", "Bodyweight"),
            (9, "Hanging Knee Raise", "3 × 12", "Bodyweight"),
            (10, "Russian Twist", "3 × 20", "Plate"),
            (11, "Pallof Press", "3 × 10/side", "Cable"),
            (12, "Side Plank", "3 × 30 sec/side", "Bodyweight"),
            (13, "Cool Down", "5 min • Foam Roll", "Quads/Hams/Lats"),
        ],
    )

    # Day 3: Hybrid — Tempo Run + Station Conditioning (70 min • RPE 6-7)
    add_day_exercises(
        3,
        [
            (0, "Warm Up", "10 min • Jog", "Strides × 4"),
            (1, "Easy Run", "5 min", "7:00/km"),
            (2, "Tempo Run", "15 min", "5:30-6:30/km"),
            (3, "Easy Run", "5 min", "7:00/km"),
            (4, "Run", "400m", "Tempo pace"),
            (5, "SkiErg", "500m", "2:00-2:30 pace"),
            (6, "Run", "400m", "Tempo pace"),
            (7, "Wall Balls", "25 reps", "Unbroken"),
            (8, "Run", "400m", "Tempo pace"),
            (9, "Rowing", "500m", "1:45-2:00 pace"),
            (10, "Run", "400m", "Tempo pace"),
            (11, "Burpee Broad Jump", "10 reps", "Moderate"),
            (12, "Rest", "3 min", "Between rounds"),
            (13, "Repeat 4-12", "Round 2", "Same as above"),
            (14, "Cool Down", "10 min • Walk", "Full body stretch"),
        ],
    )

    # Day 4: Active Recovery + Mobility (40 min • RPE 2-3)
    add_day_exercises(
        4,
        [
            (0, "Easy Walk/Cycle", "20 min", "Very easy"),
            (1, "90/90 Hip Stretch", "60 sec/side", "Hold"),
            (2, "Pigeon Pose", "60 sec/side", "Hold"),
            (3, "Frog Stretch", "60 sec", "Hold"),
            (4, "Hip Flexor Stretch", "60 sec/side", "Couch stretch"),
            (5, "Thoracic Rotation", "10 reps/side", "Slow"),
            (6, "Cat-Cow", "15 reps", "Slow"),
            (7, "Foam Roll", "10 min", "Full body"),
            (8, "Finger Extensions", "3 × 20", "Rubber band"),
            (9, "Wrist Circles", "15 reps/direction", "Slow"),
        ],
    )

    # Day 5: Station Strength — Sled + Carry + Lunge (65 min • RPE 7)
    add_day_exercises(
        5,
        [
            (0, "Warm Up", "10 min • Jog", "Banded walks"),
            (1, "Sled Push", "6 × 25m", "Race weight"),
            (2, "Sled Pull", "6 × 25m", "Race weight"),
            (3, "Farmers Carry", "4 × 100m", "M:28kg W:20kg"),
            (4, "Sandbag Lunge", "4 × 50m", "Race weight"),
            (5, "Bulgarian Split Squat", "3 × 10/leg", "Dumbbells"),
            (6, "Hip Thrust", "3 × 12", "Barbell"),
            (7, "Single Leg Calf Raise", "3 × 15/leg", "Bodyweight"),
            (8, "Dead Hang", "3 × 40 sec", "Max grip"),
            (9, "Hanging Leg Raise", "3 × 10", "Slow"),
            (10, "Side Plank", "3 × 30 sec/side", "Bodyweight"),
            (11, "Cool Down", "5 min • Stretch", "Hips + Legs"),
        ],
    )

    # Day 6: Long Run + Station Finisher (75 min • RPE 5-7)
    add_day_exercises(
        6,
        [
            (0, "Warm Up", "10 min • Dynamic", "Leg swings + Strides"),
            (1, "Long Easy Run", "40 min", "6:30-7:30/km"),
            (2, "Wall Balls", "50 reps", "Break as needed"),
            (3, "SkiErg", "1000m", "Moderate pace"),
            (4, "Burpee Broad Jump", "20 reps", "Steady"),
            (5, "Rowing", "1000m", "Moderate pace"),
            (6, "Cool Down", "10 min • Walk", "Full body stretch"),
        ],
    )

    # Day 7: Full Rest Day
    add_day_exercises(
        7,
        [
            (0, "OPTIONAL Light Walk", "20 min", "Very easy"),
            (1, "Foam Roll", "15 min", "Full body"),
            (2, "Static Stretch", "10 min", "Hips + Legs"),
        ],
    )


def unseed_hyrox_week1_exercises(apps, schema_editor):  # pragma: no cover - simple
    Plan = apps.get_model("plans", "Plan")
    PlanDayExercise = apps.get_model("plans", "PlanDayExercise")

    try:
        plan = Plan.objects.get(id="hyrox_intense_3wk")
    except Plan.DoesNotExist:
        return

    PlanDayExercise.objects.filter(plan_day__plan_week__plan=plan).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0003_alter_planday_description_plandayexercise"),
    ]

    operations = [
        migrations.RunPython(seed_hyrox_week1_exercises, unseed_hyrox_week1_exercises),
    ]

