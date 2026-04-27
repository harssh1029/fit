from django.db import migrations


EXERCISE_DEFS = [
    # Hyrox station-style and strength movements
    ("hyrox_sled_push", "Sled Push", ["quadriceps", "glutes"], ["hamstrings"]),
    ("hyrox_sled_pull", "Sled Pull", ["hamstrings", "glutes"], ["lats"]),
    ("hyrox_wall_balls", "Wall Balls", ["quadriceps", "deltoids"], ["glutes", "abs"]),
    ("hyrox_farmers_carry", "Farmers Carry", ["forearms", "trapezius"], ["glutes"]),
    ("hyrox_sandbag_lunge", "Sandbag Lunge", ["quadriceps", "glutes"], ["hamstrings"]),
    ("hyrox_barbell_back_squat", "Barbell Back Squat", ["quadriceps", "glutes"], []),
    ("hyrox_barbell_bent_over_row", "Barbell Bent-Over Row", ["lats", "biceps"], []),
    ("hyrox_overhead_press", "Overhead Press", ["deltoids", "triceps"], []),
    ("hyrox_romanian_deadlift", "Romanian Deadlift", ["hamstrings", "glutes"], []),
    ("hyrox_push_ups", "Push-Ups", ["chest", "triceps"], ["deltoids"]),
    ("hyrox_plank_hold", "Plank Hold", ["abs", "obliques"], []),
    ("hyrox_dead_hang", "Dead Hang", ["forearms", "lats"], []),
    ("hyrox_hanging_knee_raise", "Hanging Knee Raise", ["abs"], ["hip_flexors"]),
    ("hyrox_hanging_leg_raise", "Hanging Leg Raise", ["abs"], ["hip_flexors"]),
    ("hyrox_russian_twist", "Russian Twist", ["obliques"], []),
    ("hyrox_pallof_press", "Pallof Press", ["obliques"], ["abs"]),
    ("hyrox_side_plank", "Side Plank", ["obliques"], []),
    ("hyrox_bulgarian_split_squat", "Bulgarian Split Squat", ["quadriceps", "glutes"], []),
    ("hyrox_hip_thrust", "Hip Thrust", ["glutes"], ["hamstrings"]),
    ("hyrox_single_leg_calf_raise", "Single Leg Calf Raise", ["calves"], []),
    ("hyrox_ski_erg", "SkiErg", ["lats", "deltoids"], ["abs"]),
    ("hyrox_rowing", "Rowing", ["lats", "quadriceps"], ["hamstrings"]),
    ("hyrox_burpee_broad_jump", "Burpee Broad Jump", ["quadriceps", "glutes"], ["deltoids"]),
]


def seed_hyrox_bodymap_exercises(apps, schema_editor):
    MuscleGroup = apps.get_model("exercises", "MuscleGroup")
    Exercise = apps.get_model("exercises", "Exercise")

    muscles_by_slug = {m.id: m for m in MuscleGroup.objects.all()}

    for ex_id, name, primary_slugs, secondary_slugs in EXERCISE_DEFS:
        # Create the exercise if it does not already exist.
        ex, created = Exercise.objects.get_or_create(
            id=ex_id,
            defaults={
                "name": name,
                "movement_pattern": "other",
                "equipment": [],
                "level": "beginner",
                "is_compound": True,
                "is_featured": False,
                "source": "internal",
                "body_part": "",
                "target": "",
                "secondary_targets": [],
                "video_url": "",
                "gif_url": "",
                "image_url": "",
                "instructions": [],
                "description": "",
            },
        )
        # Even if the exercise already existed (e.g. imported from ExerciseDB),
        # we only apply muscle relationships when we know the slugs.
        primary = [muscles_by_slug[s] for s in primary_slugs if s in muscles_by_slug]
        secondary = [
            muscles_by_slug[s] for s in secondary_slugs if s in muscles_by_slug
        ]
        if primary:
            ex.primary_muscles.set(primary)
        if secondary:
            ex.secondary_muscles.set(secondary)


def unseed_hyrox_bodymap_exercises(apps, schema_editor):  # pragma: no cover - simple
    Exercise = apps.get_model("exercises", "Exercise")
    ids = [ex_id for ex_id, _, _, _ in EXERCISE_DEFS]
    Exercise.objects.filter(id__in=ids).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("exercises", "0007_remove_demo_exercises"),
    ]

    operations = [
        migrations.RunPython(
            seed_hyrox_bodymap_exercises, unseed_hyrox_bodymap_exercises
        ),
    ]
