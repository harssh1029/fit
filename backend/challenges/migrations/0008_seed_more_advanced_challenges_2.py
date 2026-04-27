from django.db import migrations


A06_CHALLENGE = {
    "id": "A06",
    "order": 26,
    "card": {
        "icon": "🕐",
        "name": "The 16-Minute Test",
        "body_map_tags": ["Chest", "Legs", "Core"],
        "short_description": "4 blocks. 4 minutes each. No rest between.",
        "level": "advanced",
        "level_index": 6,
        "status": "locked",
    },
    "detail": {
        "quote": "4 exercises. 4 minutes each. No rest between blocks.",
        "format": "Continuous AMRAP Blocks",
        "duration_days": 1,
        "difficulty": 4,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "4 × 4-Minute AMRAP — No Rest",
                "exercises": [
                    {"name": "Block 1 — Push-ups", "reps_or_time": "4 min AMRAP"},
                    {"name": "Block 2 — Squats", "reps_or_time": "4 min AMRAP"},
                    {"name": "Block 3 — Burpees", "reps_or_time": "4 min AMRAP"},
                    {"name": "Block 4 — Plank Hold", "reps_or_time": "4 min accumulated"},
                ],
                "day_note": "NO rest between blocks. Move straight from one to the next. 16 minutes continuous.",
                "track_metric": "Record reps per block and total reps",
                "goal": "Complete all 16 minutes without quitting",
            }
        ],
        "complete_condition": "All 16 minutes completed without stopping",
        "badge_name": "16 Minutes of Hell",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 28, "level_required": "warrior"},
            {"body_part": "Legs", "min_workouts": 28, "level_required": "warrior"},
            {"body_part": "Core", "min_workouts": 28, "level_required": "warrior"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Log 28 workouts each in Chest, Legs, and Core to unlock",
    },
}


A07_CHALLENGE = {
    "id": "A07",
    "order": 27,
    "card": {
        "icon": "🧬",
        "name": "The Body Map Blitz",
        "body_map_tags": ["All Body Parts"],
        "short_description": "Every body part. One session. Your final exam.",
        "level": "advanced",
        "level_index": 7,
        "status": "locked",
    },
    "detail": {
        "quote": "Every body part. One session. Your body's final exam.",
        "format": "Full Map for Time",
        "duration_days": 1,
        "difficulty": 4,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "155 Reps — Full Map",
                "exercises": [
                    {"name": "Push-ups (Chest)", "reps_or_time": "× 25"},
                    {"name": "Pull-ups (Back)", "reps_or_time": "× 15 (inverted rows okay)"},
                    {"name": "Pike Push-ups (Shoulders)", "reps_or_time": "× 15"},
                    {"name": "Diamond Push-ups (Arms)", "reps_or_time": "× 20"},
                    {"name": "V-Ups (Core)", "reps_or_time": "× 30"},
                    {"name": "Jump Squats (Legs)", "reps_or_time": "× 30"},
                    {"name": "Hip Thrusts (Glutes)", "reps_or_time": "× 20"},
                ],
                "day_note": "Total: 155 reps. Break however you need. Every body part gets XP.",
                "track_metric": "Record total time",
                "goal": None,
            }
        ],
        "complete_condition": "All 155 reps finished",
        "badge_name": "Full Map Domination",
        "bonus": "+1 XP to every body part on your map",
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Shoulders", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Chest", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Arms", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Core", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Back", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Glutes", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Legs", "min_workouts": 20, "level_required": "warrior"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Warrior in all 7 body parts to unlock",
    },
}


A08_CHALLENGE = {
    "id": "A08",
    "order": 28,
    "card": {
        "icon": "🌊",
        "name": "The Wave",
        "body_map_tags": ["Chest", "Back", "Legs"],
        "short_description": "Reps rise. Reps crash. Rise again.",
        "level": "advanced",
        "level_index": 8,
        "status": "locked",
    },
    "detail": {
        "quote": "Reps rise. Reps crash. Rise again.",
        "format": "Wave Pattern",
        "duration_days": 1,
        "difficulty": 4,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "5 Waves — For Time",
                "exercises": [
                    {"name": "Wave 1 — Pull-ups + Push-ups + Squats", "reps_or_time": "1 + 3 + 5"},
                    {"name": "Wave 2 — Pull-ups + Push-ups + Squats", "reps_or_time": "2 + 6 + 10"},
                    {"name": "Wave 3 — Pull-ups + Push-ups + Squats", "reps_or_time": "3 + 9 + 15  ← PEAK"},
                    {"name": "Wave 4 — Pull-ups + Push-ups + Squats", "reps_or_time": "2 + 6 + 10"},
                    {"name": "Wave 5 — Pull-ups + Push-ups + Squats", "reps_or_time": "1 + 3 + 5"},
                ],
                "day_note": "Rest 60 sec between waves. Can't do pull-ups? Use inverted rows. Total: 9 pull-ups, 27 push-ups, 45 squats.",
                "track_metric": "Record total time",
                "goal": None,
            }
        ],
        "complete_condition": "All 5 waves finished",
        "badge_name": "Tidal Force",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 30, "level_required": "warrior"},
            {"body_part": "Back", "min_workouts": 30, "level_required": "warrior"},
            {"body_part": "Legs", "min_workouts": 30, "level_required": "warrior"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Log 30 workouts each in Chest, Back, and Legs to unlock",
    },
}


A09_CHALLENGE = {
    "id": "A09",
    "order": 29,
    "card": {
        "icon": "🏴",
        "name": "The Dark Horse",
        "body_map_tags": ["Full Body"],
        "short_description": "You don't know what's coming. Neither does your body.",
        "level": "advanced",
        "level_index": 9,
        "status": "locked",
    },
    "detail": {
        "quote": "You don't know what's coming. Neither does your body.",
        "format": "Blind Daily Reveal",
        "duration_days": 5,
        "difficulty": 4,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "Revealed on START",
                "exercises": [
                    {"name": "10-min EMOM", "reps_or_time": "3 burpees + 7 push-ups every minute"},
                ],
                "day_note": "Workout only revealed when you tap START. No previews.",
                "track_metric": "Record total rounds completed",
                "goal": None,
            },
            {
                "day_number": 2,
                "day_type": "workout",
                "day_title": "Revealed on START",
                "exercises": [
                    {"name": "50 Pull-ups for time", "reps_or_time": "any set breakdown"},
                ],
                "day_note": "Workout only revealed when you tap START.",
                "track_metric": "Record total time",
                "goal": None,
            },
            {
                "day_number": 3,
                "day_type": "rest",
                "day_title": "Revealed on START",
                "exercises": [],
                "day_note": "Even the rest day is a surprise. Tap START to reveal.",
                "track_metric": None,
                "goal": None,
            },
            {
                "day_number": 4,
                "day_type": "workout",
                "day_title": "Revealed on START",
                "exercises": [
                    {"name": "15-min AMRAP", "reps_or_time": "5 reps of 5 different exercises"},
                ],
                "day_note": "Workout only revealed when you tap START.",
                "track_metric": "Record total rounds",
                "goal": None,
            },
            {
                "day_number": 5,
                "day_type": "test",
                "day_title": "Revealed on START",
                "exercises": [
                    {"name": "The Summit", "reps_or_time": "150 reps — beat your previous time"},
                ],
                "day_note": "Workout only revealed when you tap START.",
                "track_metric": "Record total time",
                "goal": "Beat your previous Summit time",
            },
        ],
        "complete_condition": "All 5 days completed",
        "badge_name": "Dark Horse",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 35, "level_required": "beast"},
            {"body_part": "Legs", "min_workouts": 35, "level_required": "beast"},
        ],
        "challenges_completed_required": 5,
        "unlock_message": "Reach Beast in 2 body parts and complete 5 challenges to unlock",
    },
}


A10_CHALLENGE = {
    "id": "A10",
    "order": 30,
    "card": {
        "icon": "👑",
        "name": "The Final Boss",
        "body_map_tags": ["All Body Parts"],
        "short_description": "3 challenges. 4 days. Everything you've built toward.",
        "level": "advanced",
        "level_index": 10,
        "status": "locked",
    },
    "detail": {
        "quote": "3 challenges. 3 days. This is what you've been building toward.",
        "format": "Challenge Marathon",
        "duration_days": 4,
        "difficulty": 5,
        "days": [
            {
                "day_number": 1,
                "day_type": "test",
                "day_title": "The Core 150",
                "exercises": [
                    {"name": "Crunches", "reps_or_time": "× 30"},
                    {"name": "Russian Twists", "reps_or_time": "× 25 total"},
                    {"name": "Leg Raises", "reps_or_time": "× 25"},
                    {"name": "Flutter Kicks", "reps_or_time": "× 25 total"},
                    {"name": "Bicycle Crunches", "reps_or_time": "× 25 total"},
                    {"name": "V-Ups", "reps_or_time": "× 20"},
                ],
                "day_note": "Complete in order.",
                "track_metric": "Record total time",
                "goal": "Beat your previous Core 150 time",
            },
            {
                "day_number": 2,
                "day_type": "test",
                "day_title": "Death By Burpee",
                "exercises": [
                    {"name": "Burpees", "reps_or_time": "+1 rep every minute"},
                ],
                "day_note": "EMOM ladder. Add 1 burpee per minute until failure.",
                "track_metric": "Record the minute you failed on",
                "goal": "Survive Minute 10 or above",
            },
            {
                "day_number": 3,
                "day_type": "rest",
                "day_title": "Mandatory Rest Day",
                "exercises": [],
                "day_note": "No skipping. Your body needs this.",
                "track_metric": None,
                "goal": None,
            },
            {
                "day_number": 4,
                "day_type": "test",
                "day_title": "The Body Map Blitz",
                "exercises": [
                    {"name": "Push-ups (Chest)", "reps_or_time": "× 25"},
                    {"name": "Pull-ups (Back)", "reps_or_time": "× 15"},
                    {"name": "Pike Push-ups (Shoulders)", "reps_or_time": "× 15"},
                    {"name": "Diamond Push-ups (Arms)", "reps_or_time": "× 20"},
                    {"name": "V-Ups (Core)", "reps_or_time": "× 30"},
                    {"name": "Jump Squats (Legs)", "reps_or_time": "× 30"},
                    {"name": "Hip Thrusts (Glutes)", "reps_or_time": "× 20"},
                ],
                "day_note": "Every score must match or beat your previous attempt.",
                "track_metric": "Record total time",
                "goal": "Beat your previous Body Map Blitz time",
            },
        ],
        "complete_condition": "All 3 workout days completed with scores matching or beating previous attempts",
        "badge_name": "👑 FINAL BOSS DEFEATED",
        "bonus": "Rare badge — displayed permanently on profile",
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 35, "level_required": "beast"},
            {"body_part": "Back", "min_workouts": 35, "level_required": "beast"},
            {"body_part": "Legs", "min_workouts": 35, "level_required": "beast"},
        ],
        "challenges_completed_required": 8,
        "unlock_message": "Reach Beast in 3 body parts and complete 8 challenges to unlock",
    },
}


def seed_more_advanced_challenges_2(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    for data in [A06_CHALLENGE, A07_CHALLENGE, A08_CHALLENGE, A09_CHALLENGE, A10_CHALLENGE]:
        Challenge.objects.update_or_create(id=data["id"], defaults=data)


def unseed_more_advanced_challenges_2(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    Challenge.objects.filter(id__in=["A06", "A07", "A08", "A09", "A10"]).delete()


class Migration(migrations.Migration):

    dependencies = [("challenges", "0007_seed_advanced_challenges")]

    operations = [
        migrations.RunPython(
            seed_more_advanced_challenges_2, unseed_more_advanced_challenges_2
        )
    ]
