from pathlib import Path

from django.db import migrations, models


BODY_PART_PRIMARY = {
    "back": ["lats", "trapezius", "lower_back"],
    "cardio": ["quadriceps", "glutes", "abs"],
    "chest": ["chest"],
    "lower_arms": ["forearms"],
    "lower_legs": ["calves", "tibialis"],
    "neck": ["neck"],
    "shoulders": ["deltoids"],
    "upper_arms": ["biceps", "triceps"],
    "upper_legs": ["quadriceps", "hamstrings", "glutes"],
    "waist": ["abs", "obliques"],
}

BODY_PART_LABELS = {
    "back": "Back",
    "cardio": "Cardio",
    "chest": "Chest",
    "lower_arms": "Lower arms",
    "lower_legs": "Lower legs",
    "neck": "Neck",
    "shoulders": "Shoulders",
    "upper_arms": "Upper arms",
    "upper_legs": "Upper legs",
    "waist": "Core",
}

EQUIPMENT_KEYWORDS = [
    ("barbell", "barbell"),
    ("dumbbell", "dumbbell"),
    ("kettlebell", "kettlebell"),
    ("cable", "cable"),
    ("resistance_band", "resistance band"),
    ("band", "resistance band"),
    ("smith", "smith machine"),
    ("lever", "machine"),
    ("sled", "sled"),
    ("medicine_ball", "medicine ball"),
    ("stability_ball", "stability ball"),
    ("exercise_ball", "exercise ball"),
    ("bosu", "bosu ball"),
    ("trap_bar", "trap bar"),
    ("ez_bar", "ez bar"),
    ("roller", "foam roller"),
    ("rope", "rope"),
    ("weighted", "weight"),
    ("assisted", "assisted machine"),
    ("bike", "bike"),
]

PUSH_WORDS = ["press", "push", "dip", "squat", "lunge", "extension", "raise"]
PULL_WORDS = ["row", "pull", "curl", "chin", "deadlift", "shrug", "pulldown"]
HOLD_WORDS = ["hold", "carry", "plank", "hang", "stretch", "pose"]
ISOLATION_WORDS = [
    "curl",
    "extension",
    "raise",
    "fly",
    "stretch",
    "rotation",
    "abduction",
    "adduction",
]
ADVANCED_WORDS = [
    "snatch",
    "clean",
    "jerk",
    "muscle_up",
    "planche",
    "pistol",
    "plyo",
    "jump",
]
INTERMEDIATE_WORDS = [
    "barbell",
    "smith",
    "cable",
    "weighted",
    "lever",
    "kettlebell",
    "single_leg",
]


def title_from_stem(stem):
    parts = stem.split("_")
    if parts and parts[0].isdigit():
        parts = parts[1:]
    words = [
        part
        for part in parts
        if part not in {"male", "female", "v", "pov"} and not part.isdigit()
    ]
    text = " ".join(words).replace("ez ", "EZ ")
    return text.title().strip()


def infer_equipment(key):
    found = []
    for token, label in EQUIPMENT_KEYWORDS:
        if token in key and label not in found:
            found.append(label)
    return found or ["bodyweight"]


def infer_level(key):
    if any(word in key for word in ADVANCED_WORDS):
        return "advanced"
    if any(word in key for word in INTERMEDIATE_WORDS):
        return "intermediate"
    return "beginner"


def infer_movement(key):
    tags = []
    if any(word in key for word in PUSH_WORDS):
        tags.append("push")
    if any(word in key for word in PULL_WORDS):
        tags.append("pull")
    if any(word in key for word in HOLD_WORDS):
        tags.append("hold")
    return " ".join(tags) if tags else "other"


def is_compound(key):
    return not any(word in key for word in ISOLATION_WORDS)


def simple_target(body_part, name):
    lowered = name.lower()
    if "biceps" in lowered or "curl" in lowered:
        return "biceps"
    if "triceps" in lowered or "extension" in lowered or "kickback" in lowered:
        return "triceps"
    if "calf" in lowered:
        return "calves"
    if "hamstring" in lowered or "leg curl" in lowered:
        return "hamstrings"
    if "glute" in lowered or "hip thrust" in lowered or "bridge" in lowered:
        return "glutes"
    if "oblique" in lowered or "twist" in lowered:
        return "obliques"
    if "ab" in lowered or "crunch" in lowered or "plank" in lowered:
        return "abs"
    return BODY_PART_LABELS.get(body_part, body_part.replace("_", " ")).lower()


def build_description(name, body_part, equipment):
    target = simple_target(body_part, name)
    equipment_text = ", ".join(equipment)
    return (
        f"{name} is a {target} exercise using {equipment_text}. "
        "Use a controlled tempo, stay aligned, and move through a comfortable "
        "range of motion."
    )


def build_instructions(name):
    return [
        f"Set up for {name} with your body stable and the working muscles ready.",
        "Brace your core, keep your joints stacked, and start the movement under control.",
        "Move through the main range without rushing, bouncing, or losing posture.",
        "Return to the start position smoothly and reset before the next rep.",
    ]


def build_common_mistakes():
    return [
        "Using momentum instead of controlled movement.",
        "Letting posture or joint alignment drift during the rep.",
        "Chasing range or load before the movement feels stable.",
    ]


def seed_local_exercise_gifs(apps, schema_editor):
    Exercise = apps.get_model("exercises", "Exercise")
    MuscleGroup = apps.get_model("exercises", "MuscleGroup")
    db_alias = schema_editor.connection.alias

    dataset_root = Path(__file__).resolve().parents[3] / "dataset_gifs_by_name"
    if not dataset_root.exists():
        return

    muscles = {m.id: m for m in MuscleGroup.objects.using(db_alias).all()}
    Exercise.objects.using(db_alias).all().delete()

    for gif_path in sorted(dataset_root.glob("*/*.gif")):
        body_part = gif_path.parent.name
        stem = gif_path.stem
        name = title_from_stem(stem)
        if not name:
            continue

        key = stem.lower()
        equipment = infer_equipment(key)
        primary = [
            muscles[slug]
            for slug in BODY_PART_PRIMARY.get(body_part, [])
            if slug in muscles
        ]
        if not primary and muscles:
            primary = [next(iter(muscles.values()))]

        rel_path = f"{body_part}/{gif_path.name}"
        obj = Exercise.objects.using(db_alias).create(
            id=f"local_{body_part}_{stem}"[:128],
            name=name,
            movement_pattern=infer_movement(key),
            equipment=equipment,
            level=infer_level(key),
            is_compound=is_compound(key),
            is_featured=False,
            source="local_gif_dataset",
            body_part=BODY_PART_LABELS.get(body_part, body_part.replace("_", " ")),
            target=simple_target(body_part, name),
            secondary_targets=[],
            video_url="",
            gif_url=f"/api/v1/exercise-gifs/{rel_path}",
            image_url="",
            instructions=build_instructions(name),
            common_mistakes=build_common_mistakes(),
            guideline=(
                "Keep every rep controlled and stop if you cannot maintain clean alignment."
            ),
            description=build_description(name, body_part, equipment),
        )
        obj.primary_muscles.set(primary)


def reverse_seed_local_exercise_gifs(apps, schema_editor):
    Exercise = apps.get_model("exercises", "Exercise")
    Exercise.objects.using(schema_editor.connection.alias).filter(
        source="local_gif_dataset"
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("exercises", "0008_seed_hyrox_bodymap_exercises"),
    ]

    operations = [
        migrations.AddField(
            model_name="exercise",
            name="common_mistakes",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Common mistakes to avoid; list of strings.",
            ),
        ),
        migrations.AddField(
            model_name="exercise",
            name="guideline",
            field=models.TextField(
                blank=True,
                help_text="Single coaching guideline for this exercise.",
            ),
        ),
        migrations.RunPython(seed_local_exercise_gifs, reverse_seed_local_exercise_gifs),
    ]
