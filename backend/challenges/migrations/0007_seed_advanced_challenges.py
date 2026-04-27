from django.db import migrations


A01_CHALLENGE = {
    "id": "A01",
    "order": 21,
    "card": {
        "icon": "💀",
        "name": "The Full Murph",
        "body_map_tags": ["Chest", "Back", "Legs"],
        "short_description": "Named after a Navy SEAL. Earn it.",
        "level": "advanced",
        "level_index": 1,
        "status": "locked",
    },
    "detail": {
        "quote": "Named after a Navy SEAL. Earn it.",
        "format": "Fixed Reps for Time",
        "duration_days": 1,
        "difficulty": 5,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "Full Murph — For Time",
                "exercises": [
                    {"name": "Run", "reps_or_time": "1.6 km"},
                    {"name": "Pull-ups", "reps_or_time": "× 50"},
                    {"name": "Push-ups", "reps_or_time": "× 100"},
                    {"name": "Squats", "reps_or_time": "× 150"},
                    {"name": "Run", "reps_or_time": "1.6 km"},
                ],
                "day_note": "Suggested breakdown: 10 rounds of 5 pull-ups, 10 push-ups, 15 squats between the two runs.",
                "track_metric": "Record total time",
                "goal": "Finish under 50 minutes",
            }
        ],
        "complete_condition": "Finished under 50 minutes",
        "badge_name": "The Lieutenant",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Back", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Legs", "min_workouts": 20, "level_required": "warrior"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Warrior in Chest, Back, and Legs to unlock",
    },
}


A02_CHALLENGE = {
    "id": "A02",
    "order": 22,
    "card": {
        "icon": "🃏",
        "name": "The Full Deck",
        "body_map_tags": ["Full Body"],
        "short_description": "52 cards. Now you're ready.",
        "level": "advanced",
        "level_index": 2,
        "status": "locked",
    },
    "detail": {
        "quote": "52 cards. Now you're ready.",
        "format": "Full Deck",
        "duration_days": 1,
        "difficulty": 4,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "Full Deck — For Time",
                "exercises": [
                    {"name": "♠ Spades = Push-ups", "reps_or_time": "card number as reps"},
                    {"name": "♥ Hearts = Squats", "reps_or_time": "card number as reps"},
                    {"name": "♦ Diamonds = Sit-ups", "reps_or_time": "card number as reps"},
                    {"name": "♣ Clubs = Lunges", "reps_or_time": "card number as reps (total)"},
                    {"name": "🃏 Joker × 2 = Burpees", "reps_or_time": "× 8 each"},
                ],
                "day_note": "J/Q/K = 10 reps. Ace = 12 reps. App deals all 54 cards. Flip one, do it, flip next.",
                "track_metric": "Record total time",
                "goal": None,
            }
        ],
        "complete_condition": "Full deck of 54 cards finished",
        "badge_name": "Deck Destroyed",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Core", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Legs", "min_workouts": 20, "level_required": "warrior"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Warrior in any 3 body parts to unlock",
    },
}


A03_CHALLENGE = {
    "id": "A03",
    "order": 23,
    "card": {
        "icon": "🧗",
        "name": "The Pull-Up Century",
        "body_map_tags": ["Back", "Arms"],
        "short_description": "100 pull-ups. 5 days. Any way you want.",
        "level": "advanced",
        "level_index": 3,
        "status": "locked",
    },
    "detail": {
        "quote": "100 pull-ups. 5 days. Any way you want.",
        "format": "Volume Accumulation",
        "duration_days": 5,
        "difficulty": 4,
        "days": [
            {"day_number": 1, "day_type": "workout", "day_title": "Target 25 Pull-ups", "exercises": [{"name": "Pull-ups", "reps_or_time": "Target 25 total"}], "day_note": "Any set breakdown. Strict only — chin clears bar = 1 rep. Kipping = no rep.", "track_metric": "Log total pull-ups completed", "goal": None},
            {"day_number": 2, "day_type": "workout", "day_title": "Target 25 Pull-ups", "exercises": [{"name": "Pull-ups", "reps_or_time": "Target 25 total"}], "day_note": "Any set breakdown.", "track_metric": "Log total pull-ups completed", "goal": None},
            {"day_number": 3, "day_type": "rest", "day_title": "Rest Day", "exercises": [], "day_note": None, "track_metric": None, "goal": None},
            {"day_number": 4, "day_type": "workout", "day_title": "Target 25 Pull-ups", "exercises": [{"name": "Pull-ups", "reps_or_time": "Target 25 total"}], "day_note": "Any set breakdown.", "track_metric": "Log total pull-ups completed", "goal": None},
            {"day_number": 5, "day_type": "test", "day_title": "Final Day — Target 25 + Max Set", "exercises": [
                {"name": "Pull-ups", "reps_or_time": "Target 25 total"},
                {"name": "Max Unbroken Set", "reps_or_time": "1 attempt at end"},
            ], "day_note": "Finish your 25 reps then record your max unbroken set.", "track_metric": "Record total pull-ups + max unbroken set", "goal": None},
        ],
        "complete_condition": "100 total pull-ups logged across all days",
        "badge_name": "Vertical Limit",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Back", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Arms", "min_workouts": 20, "level_required": "warrior"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Warrior in Back and Arms to unlock",
    },
}


A04_CHALLENGE = {
    "id": "A04",
    "order": 24,
    "card": {
        "icon": "🔥",
        "name": "The Century Set",
        "body_map_tags": ["Chest / Legs / Core"],
        "short_description": "100 reps. One exercise. Minimal breaks.",
        "level": "advanced",
        "level_index": 4,
        "status": "locked",
    },
    "detail": {
        "quote": "100 reps. One exercise. Minimal breaks.",
        "format": "Single Exercise Mastery",
        "duration_days": 5,
        "difficulty": 4,
        "days": [
            {"day_number": 1, "day_type": "test", "day_title": "Baseline — Max Unbroken", "exercises": [{"name": "Chosen Exercise", "reps_or_time": "Max unbroken reps"}], "day_note": "Pick one: Push-ups (Chest XP), Squats (Legs XP), Sit-ups (Core XP). Record your max unbroken number.", "track_metric": "Record max unbroken reps", "goal": None},
            {"day_number": 2, "day_type": "workout", "day_title": "Build — 60% Sets", "exercises": [{"name": "Chosen Exercise", "reps_or_time": "× 4 sets at 60% of max"}], "day_note": "Rest 90 sec between sets.", "track_metric": None, "goal": None},
            {"day_number": 3, "day_type": "rest", "day_title": "Rest Day", "exercises": [], "day_note": None, "track_metric": None, "goal": None},
            {"day_number": 4, "day_type": "workout", "day_title": "Build — 75% Sets", "exercises": [{"name": "Chosen Exercise", "reps_or_time": "× 3 sets at 75% of max"}], "day_note": "Rest 90 sec between sets.", "track_metric": None, "goal": None},
            {"day_number": 5, "day_type": "test", "day_title": "Final Test — Go for 100", "exercises": [{"name": "Chosen Exercise", "reps_or_time": "100 total reps"}], "day_note": "Max rest between breaks = 15 seconds. Count every break you take.", "track_metric": "Record total breaks taken", "goal": "Complete 100 reps — fewer breaks = higher badge tier"},
        ],
        "complete_condition": "100 total reps completed on Day 5",
        "badge_name": "Century Legend (0-2 breaks) / Century Club (3-5) / Century Survivor (6+)",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest / Legs / Core", "min_workouts": 25, "level_required": "warrior"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Log 25 workouts in your chosen body part to unlock",
    },
}


A05_CHALLENGE = {
    "id": "A05",
    "order": 25,
    "card": {
        "icon": "⚔️",
        "name": "The Spartan 15",
        "body_map_tags": ["Full Body"],
        "short_description": "5 stations. After each one — 15 burpees.",
        "level": "advanced",
        "level_index": 5,
        "status": "locked",
    },
    "detail": {
        "quote": "Fail a Spartan obstacle? 30 burpees. Here you fail nothing — you just do all of it.",
        "format": "Station Circuit",
        "duration_days": 1,
        "difficulty": 5,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "5 Stations + 15 Burpees Each",
                "exercises": [
                    {"name": "Station 1 — Squats", "reps_or_time": "× 30"},
                    {"name": "Burpee Penalty", "reps_or_time": "× 15"},
                    {"name": "Station 2 — Push-ups", "reps_or_time": "× 20"},
                    {"name": "Burpee Penalty", "reps_or_time": "× 15"},
                    {"name": "Station 3 — Pull-ups", "reps_or_time": "× 15"},
                    {"name": "Burpee Penalty", "reps_or_time": "× 15"},
                    {"name": "Station 4 — Lunges", "reps_or_time": "× 30 total"},
                    {"name": "Burpee Penalty", "reps_or_time": "× 15"},
                    {"name": "Station 5 — Dips", "reps_or_time": "× 20"},
                    {"name": "Burpee Penalty", "reps_or_time": "× 15"},
                ],
                "day_note": "Total: 75 burpees + 115 other reps = 190 reps.",
                "track_metric": "Record total time",
                "goal": None,
            }
        ],
        "complete_condition": "All 5 stations and all 75 burpees completed",
        "badge_name": "Spartan Forged",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Back", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Core", "min_workouts": 20, "level_required": "warrior"},
            {"body_part": "Legs", "min_workouts": 20, "level_required": "warrior"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Warrior in any 4 body parts to unlock",
    },
}


def seed_advanced_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    for data in [A01_CHALLENGE, A02_CHALLENGE, A03_CHALLENGE, A04_CHALLENGE, A05_CHALLENGE]:
        Challenge.objects.update_or_create(id=data["id"], defaults=data)


def unseed_advanced_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    Challenge.objects.filter(id__in=["A01", "A02", "A03", "A04", "A05"]).delete()


class Migration(migrations.Migration):

    dependencies = [("challenges", "0006_seed_more_intermediate_challenges")]

    operations = [
        migrations.RunPython(
            seed_advanced_challenges, unseed_advanced_challenges
        )
    ]
