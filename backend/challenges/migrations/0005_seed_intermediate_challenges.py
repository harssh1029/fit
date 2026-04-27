from django.db import migrations


I01_CHALLENGE = {
    "id": "I01",
    "order": 11,
    "card": {
        "icon": "🃏",
        "name": "The Deck of Pain",
        "body_map_tags": ["Full Body"],
        "short_description": "26 cards. Not 52. That's enough.",
        "level": "intermediate",
        "level_index": 1,
        "status": "locked",
    },
    "detail": {
        "quote": "26 cards. Not 52. That's enough.",
        "format": "Half Deck",
        "duration_days": 1,
        "difficulty": 3,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "26 Cards — For Time",
                "exercises": [
                    {"name": "♠ Spades = Push-ups", "reps_or_time": "card number as reps"},
                    {"name": "♥ Hearts = Squats", "reps_or_time": "card number as reps"},
                    {"name": "♦ Diamonds = Sit-ups", "reps_or_time": "card number as reps"},
                    {"name": "♣ Clubs = Lunges", "reps_or_time": "card number as reps (total)"},
                ],
                "day_note": (
                    "J/Q/K = 10 reps. Ace = 12 reps. App deals 26 random cards. "
                    "Flip one, do it, flip next. Rest only when needed."
                ),
                "track_metric": "Record total time",
                "goal": None,
            }
        ],
        "complete_condition": "All 26 cards finished",
        "badge_name": "Half Deck Down",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Shoulders", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Chest", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Arms", "min_workouts": 8, "level_required": "soldier"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Soldier in any 3 body parts to unlock",
    },
}


I02_CHALLENGE = {
    "id": "I02",
    "order": 12,
    "card": {
        "icon": "☠️",
        "name": "Death By Burpee",
        "body_map_tags": ["Full Body"],
        "short_description": "Minute 1 is a joke. Minute 8 is war.",
        "level": "intermediate",
        "level_index": 2,
        "status": "locked",
    },
    "detail": {
        "quote": "Minute 1 is a joke. Minute 8 is war.",
        "format": "EMOM Ladder",
        "duration_days": 1,
        "difficulty": 4,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "EMOM Ladder to Failure",
                "exercises": [
                    {"name": "Burpees", "reps_or_time": "+1 rep every minute"},
                ],
                "day_note": (
                    "Minute 1 = 1 burpee. Minute 2 = 2 burpees. Keep adding 1. "
                    "FAIL = can't complete reps within 60 seconds."
                ),
                "track_metric": "Record the minute you failed on",
                "goal": "Survive Minute 8 or above (36 total burpees)",
            }
        ],
        "complete_condition": "Reach Minute 8 or above",
        "badge_name": "Death Dealer",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Legs", "min_workouts": 8, "level_required": "soldier"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Soldier in Chest and Legs to unlock",
    },
}


I03_CHALLENGE = {
    "id": "I03",
    "order": 13,
    "card": {
        "icon": "🏔️",
        "name": "The Summit",
        "body_map_tags": ["Full Body"],
        "short_description": "150 reps. 5 exercises. One climb.",
        "level": "intermediate",
        "level_index": 3,
        "status": "locked",
    },
    "detail": {
        "quote": "150 reps. 5 exercises. One climb.",
        "format": "Fixed Reps for Time",
        "duration_days": 1,
        "difficulty": 3,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "150 Reps — For Time",
                "exercises": [
                    {"name": "Push-ups", "reps_or_time": "× 30"},
                    {"name": "Squats", "reps_or_time": "× 30"},
                    {"name": "Sit-ups", "reps_or_time": "× 30"},
                    {"name": "Lunges", "reps_or_time": "× 30 (15 each leg)"},
                    {"name": "Mountain Climbers", "reps_or_time": "× 30 (15 each side)"},
                ],
                "day_note": "Complete in any order. Break into any set size you want.",
                "track_metric": "Record total time",
                "goal": None,
            }
        ],
        "complete_condition": "All 150 reps completed",
        "badge_name": "Summit Reached",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Core", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Legs", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Arms", "min_workouts": 8, "level_required": "soldier"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Soldier in any 4 body parts to unlock",
    },
}


I04_CHALLENGE = {
    "id": "I04",
    "order": 14,
    "card": {
        "icon": "🔄",
        "name": "The Mini Pyramid",
        "body_map_tags": ["Chest", "Back", "Legs"],
        "short_description": "Up and back down. Simple. Not easy.",
        "level": "intermediate",
        "level_index": 4,
        "status": "locked",
    },
    "detail": {
        "quote": "Up and back down. Simple. Not easy.",
        "format": "Pyramid",
        "duration_days": 1,
        "difficulty": 3,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "Full Pyramid — For Time",
                "exercises": [
                    {"name": "Pull-ups + Push-ups + Squats", "reps_or_time": "Round 1: 1 + 2 + 3"},
                    {"name": "Pull-ups + Push-ups + Squats", "reps_or_time": "Round 2: 2 + 4 + 6"},
                    {"name": "Pull-ups + Push-ups + Squats", "reps_or_time": "Round 3: 3 + 6 + 9 ← PEAK"},
                    {"name": "Pull-ups + Push-ups + Squats", "reps_or_time": "Round 4: 2 + 4 + 6"},
                    {"name": "Pull-ups + Push-ups + Squats", "reps_or_time": "Round 5: 1 + 2 + 3"},
                ],
                "day_note": (
                    "Rest 60 sec between rounds. Can't do pull-ups? Use inverted rows. "
                    "Total: 9 pull-ups, 18 push-ups, 27 squats."
                ),
                "track_metric": "Record total time",
                "goal": None,
            }
        ],
        "complete_condition": "Full pyramid completed",
        "badge_name": "Peak and Valley",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Back", "min_workouts": 8, "level_required": "soldier"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Soldier in Chest and Back to unlock",
    },
}


def seed_intermediate_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    for data in [I01_CHALLENGE, I02_CHALLENGE, I03_CHALLENGE, I04_CHALLENGE]:
        Challenge.objects.update_or_create(id=data["id"], defaults=data)


def unseed_intermediate_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    Challenge.objects.filter(id__in=["I01", "I02", "I03", "I04"]).delete()


class Migration(migrations.Migration):

    dependencies = [("challenges", "0004_seed_more_beginner_challenges_extra")]

    operations = [
        migrations.RunPython(
            seed_intermediate_challenges, unseed_intermediate_challenges
        )
    ]
