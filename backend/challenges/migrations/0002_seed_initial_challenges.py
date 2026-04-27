from django.db import migrations


B01_CHALLENGE = {
	"id": "B01",
	"order": 1,
	"card": {
		"icon": "\ud83d\udd25",  # "🔥" emoji rendered as plain text.
		"name": "The Ground Zero",
        "body_map_tags": ["Chest", "Arms", "Core"],
        "short_description": "You start where everyone starts \\u2014 on the floor.",
        "level": "beginner",
        "level_index": 1,
        "status": "unlocked",
    },
    "detail": {
        "quote": "You start where everyone starts \\u2014 on the floor.",
        "format": "Timed AMRAP",
        "duration_days": 3,
        "difficulty": 2,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "5-Minute AMRAP",
                "exercises": [
                    {"name": "Push-ups", "reps_or_time": "× 5"},
                    {"name": "Sit-ups", "reps_or_time": "× 5"},
                    {"name": "Squats", "reps_or_time": "× 5"},
                ],
                "day_note": "Rotate continuously through all 3 exercises.",
                "track_metric": "Record total rounds completed",
                "goal": None,
            },
            {
                "day_number": 2,
                "day_type": "rest",
                "day_title": "Rest Day",
                "exercises": [],
                "day_note": "Log a 5-min stretch session.",
                "track_metric": None,
                "goal": None,
            },
            {
                "day_number": 3,
                "day_type": "test",
                "day_title": "5-Minute AMRAP \\u2014 Final Test",
                "exercises": [
                    {"name": "Push-ups", "reps_or_time": "× 5"},
                    {"name": "Sit-ups", "reps_or_time": "× 5"},
                    {"name": "Squats", "reps_or_time": "× 5"},
                ],
                "day_note": "Same circuit as Day 1.",
                "track_metric": "Record total rounds completed",
                "goal": "Beat your Day 1 round count",
            },
        ],
        "complete_condition": "Day 3 rounds > Day 1 rounds",
        "badge_name": "Day Zero Survivor",
        "bonus": None,
    },
    "unlock": {
        "is_free": True,
        "conditions": [],
        "challenges_completed_required": 0,
        "unlock_message": "Free \\u2014 available from Day 1",
    },
}


def seed_initial_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    if not Challenge.objects.filter(id=B01_CHALLENGE["id"]).exists():
        Challenge.objects.create(**B01_CHALLENGE)


def unseed_initial_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    Challenge.objects.filter(id=B01_CHALLENGE["id"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("challenges", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_initial_challenges, unseed_initial_challenges),
    ]
