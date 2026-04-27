from django.db import migrations


I05_CHALLENGE = {
    "id": "I05",
    "order": 15,
    "card": {
        "icon": "🐆",
        "name": "The Predator Circuit",
        "body_map_tags": ["Full Body"],
        "short_description": "15 minutes. Hunt your limit.",
        "level": "intermediate",
        "level_index": 5,
        "status": "locked",
    },
    "detail": {
        "quote": "15 minutes. Hunt your limit.",
        "format": "AMRAP",
        "duration_days": 3,
        "difficulty": 3,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "15-Minute AMRAP",
                "exercises": [
                    {"name": "Burpees", "reps_or_time": "× 5"},
                    {"name": "Push-ups", "reps_or_time": "× 10"},
                    {"name": "Air Squats", "reps_or_time": "× 15"},
                    {"name": "Sit-ups", "reps_or_time": "× 10"},
                ],
                "day_note": "As many rounds as possible in 15 minutes.",
                "track_metric": "Record total rounds + extra reps",
                "goal": None,
            },
            {
                "day_number": 2,
                "day_type": "rest",
                "day_title": "Rest Day",
                "exercises": [],
                "day_note": None,
                "track_metric": None,
                "goal": None,
            },
            {
                "day_number": 3,
                "day_type": "test",
                "day_title": "15-Minute AMRAP — Final Test",
                "exercises": [
                    {"name": "Burpees", "reps_or_time": "× 5"},
                    {"name": "Push-ups", "reps_or_time": "× 10"},
                    {"name": "Air Squats", "reps_or_time": "× 15"},
                    {"name": "Sit-ups", "reps_or_time": "× 10"},
                ],
                "day_note": "Same circuit as Day 1.",
                "track_metric": "Record total rounds + extra reps",
                "goal": "Beat Day 1 by at least 1 full round",
            },
        ],
        "complete_condition": "Day 3 score > Day 1 score",
        "badge_name": "Apex Predator",
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
        "challenges_completed_required": 2,
        "unlock_message": "Reach Soldier in 4 body parts and complete 2 Beginner challenges to unlock",
    },
}


I06_CHALLENGE = {
    "id": "I06",
    "order": 16,
    "card": {
        "icon": "💎",
        "name": "The Core 150",
        "body_map_tags": ["Core"],
        "short_description": "150 core reps. 6 moves. Race the clock.",
        "level": "intermediate",
        "level_index": 6,
        "status": "locked",
    },
    "detail": {
        "quote": "150 core reps. 6 moves. Race the clock.",
        "format": "Fixed Reps for Time",
        "duration_days": 1,
        "difficulty": 3,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "150 Core Reps — In Order",
                "exercises": [
                    {"name": "Crunches", "reps_or_time": "× 30"},
                    {"name": "Russian Twists", "reps_or_time": "× 25 total"},
                    {"name": "Leg Raises", "reps_or_time": "× 25"},
                    {"name": "Flutter Kicks", "reps_or_time": "× 25 total"},
                    {"name": "Bicycle Crunches", "reps_or_time": "× 25 total"},
                    {"name": "V-Ups", "reps_or_time": "× 20"},
                ],
                "day_note": "Complete in this exact order. Minimize rest between exercises.",
                "track_metric": "Record total time",
                "goal": "Finish under 15 minutes",
            }
        ],
        "complete_condition": "All 150 reps done under 15 minutes",
        "badge_name": "Core Locked",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Core", "min_workouts": 14, "level_required": "soldier"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Log 14 Core workouts to unlock",
    },
}


I07_CHALLENGE = {
    "id": "I07",
    "order": 17,
    "card": {
        "icon": "⚡",
        "name": "The Lightning Round",
        "body_map_tags": ["Chest", "Legs", "Core"],
        "short_description": "Tabata. 2 rounds. 8 minutes of pain.",
        "level": "intermediate",
        "level_index": 7,
        "status": "locked",
    },
    "detail": {
        "quote": "Tabata. 2 rounds. 8 minutes of pain.",
        "format": "Tabata",
        "duration_days": 3,
        "difficulty": 3,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "2 Tabata Rounds",
                "exercises": [
                    {"name": "Round 1A — Push-ups", "reps_or_time": "20 sec on / 10 sec off × 8"},
                    {"name": "Round 1B — Squats", "reps_or_time": "20 sec on / 10 sec off × 8"},
                    {"name": "Round 2A — Mountain Climbers", "reps_or_time": "20 sec on / 10 sec off × 8"},
                    {"name": "Round 2B — Burpees", "reps_or_time": "20 sec on / 10 sec off × 8"},
                ],
                "day_note": "Rounds 1A and 1B alternate each 20 sec. Same for 2A and 2B. 2 min rest between Round 1 and Round 2.",
                "track_metric": "Record total reps per round",
                "goal": None,
            },
            {
                "day_number": 2,
                "day_type": "rest",
                "day_title": "Rest Day",
                "exercises": [],
                "day_note": None,
                "track_metric": None,
                "goal": None,
            },
            {
                "day_number": 3,
                "day_type": "test",
                "day_title": "2 Tabata Rounds — Final Test",
                "exercises": [
                    {"name": "Round 1A — Push-ups", "reps_or_time": "20 sec on / 10 sec off × 8"},
                    {"name": "Round 1B — Squats", "reps_or_time": "20 sec on / 10 sec off × 8"},
                    {"name": "Round 2A — Mountain Climbers", "reps_or_time": "20 sec on / 10 sec off × 8"},
                    {"name": "Round 2B — Burpees", "reps_or_time": "20 sec on / 10 sec off × 8"},
                ],
                "day_note": "Same as Day 1.",
                "track_metric": "Record total reps per round",
                "goal": "Beat Day 1 total reps",
            },
        ],
        "complete_condition": "Day 3 total reps > Day 1 total reps",
        "badge_name": "Lightning Strike",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Chest", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Legs", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Core", "min_workouts": 8, "level_required": "soldier"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Soldier in Chest, Legs, and Core to unlock",
    },
}


I08_CHALLENGE = {
    "id": "I08",
    "order": 18,
    "card": {
        "icon": "🪢",
        "name": "The Grip Test",
        "body_map_tags": ["Arms", "Back"],
        "short_description": "Hold on. That's the whole challenge.",
        "level": "intermediate",
        "level_index": 8,
        "status": "locked",
    },
    "detail": {
        "quote": "Hold on. That's the whole challenge.",
        "format": "Progressive Hold",
        "duration_days": 5,
        "difficulty": 3,
        "days": [
            {
                "day_number": 1,
                "day_type": "test",
                "day_title": "Baseline Test",
                "exercises": [{"name": "Dead Hang", "reps_or_time": "Max Hold"}],
                "day_note": None,
                "track_metric": "Record your max hold time",
                "goal": None,
            },
            {
                "day_number": 2,
                "day_type": "rest",
                "day_title": "Rest Day",
                "exercises": [],
                "day_note": None,
                "track_metric": None,
                "goal": None,
            },
            {
                "day_number": 3,
                "day_type": "workout",
                "day_title": "Build",
                "exercises": [{"name": "Dead Hang", "reps_or_time": "× 4 sets"}],
                "day_note": "Hold 50% of your max each set. Rest 90 sec between sets.",
                "track_metric": None,
                "goal": None,
            },
            {
                "day_number": 4,
                "day_type": "rest",
                "day_title": "Rest Day",
                "exercises": [],
                "day_note": None,
                "track_metric": None,
                "goal": None,
            },
            {
                "day_number": 5,
                "day_type": "test",
                "day_title": "Final Test",
                "exercises": [{"name": "Dead Hang", "reps_or_time": "Max Hold"}],
                "day_note": None,
                "track_metric": "Record your max hold time",
                "goal": "Beat Day 1 by 10+ seconds",
            },
        ],
        "complete_condition": "Day 5 hold time > Day 1 hold time + 10 seconds",
        "badge_name": "Grip Reaper",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Arms", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Back", "min_workouts": 14, "level_required": "soldier"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Soldier in Arms and log 14 Back workouts to unlock",
    },
}


I09_CHALLENGE = {
    "id": "I09",
    "order": 19,
    "card": {
        "icon": "🏴‍☠️",
        "name": "The Half Hero",
        "body_map_tags": ["Full Body"],
        "short_description": "Inspired by Murph. Sized for real humans.",
        "level": "intermediate",
        "level_index": 9,
        "status": "locked",
    },
    "detail": {
        "quote": "Inspired by Murph. Sized for real humans.",
        "format": "Fixed Reps for Time",
        "duration_days": 1,
        "difficulty": 4,
        "days": [
            {
                "day_number": 1,
                "day_type": "workout",
                "day_title": "Half Hero — For Time",
                "exercises": [
                    {"name": "Run", "reps_or_time": "800m (or 3 min jog)"},
                    {"name": "Pull-ups", "reps_or_time": "× 25 (inverted rows okay)"},
                    {"name": "Push-ups", "reps_or_time": "× 50"},
                    {"name": "Squats", "reps_or_time": "× 75"},
                    {"name": "Run", "reps_or_time": "800m (or 3 min jog)"},
                ],
                "day_note": "Suggested breakdown: 5 rounds of 5 pull-ups, 10 push-ups, 15 squats between the two runs.",
                "track_metric": "Record total time",
                "goal": "Finish under 35 minutes",
            }
        ],
        "complete_condition": "Finished under 35 minutes",
        "badge_name": "Half Hero",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Shoulders", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Chest", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Arms", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Core", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Back", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Glutes", "min_workouts": 8, "level_required": "soldier"},
            {"body_part": "Legs", "min_workouts": 8, "level_required": "soldier"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Soldier in all 7 body parts to unlock",
    },
}


I10_CHALLENGE = {
    "id": "I10",
    "order": 20,
    "card": {
        "icon": "🎯",
        "name": "The Pistol Protocol",
        "body_map_tags": ["Legs"],
        "short_description": "One leg. One goal. 7 days.",
        "level": "intermediate",
        "level_index": 10,
        "status": "locked",
    },
    "detail": {
        "quote": "One leg. One goal. 7 days.",
        "format": "Skill Progression",
        "duration_days": 7,
        "difficulty": 4,
        "days": [
            {"day_number": 1, "day_type": "test", "day_title": "Day 1 — Test", "exercises": [{"name": "Pistol Squat", "reps_or_time": "1 attempt each leg"}], "day_note": "Can't do it? That's expected. Start at Step 1. Can do it? Skip to Step 3.", "track_metric": None, "goal": None},
            {"day_number": 2, "day_type": "workout", "day_title": "Step 1 — Assisted Pistol", "exercises": [{"name": "Assisted Pistol Squat", "reps_or_time": "× 4 sets × 4 per leg"}], "day_note": "Hold a wall or doorframe for balance.", "track_metric": None, "goal": None},
            {"day_number": 3, "day_type": "workout", "day_title": "Step 1 — Assisted Pistol", "exercises": [{"name": "Assisted Pistol Squat", "reps_or_time": "× 4 sets × 4 per leg"}], "day_note": "Hold a wall or doorframe for balance.", "track_metric": None, "goal": None},
            {"day_number": 4, "day_type": "rest", "day_title": "Rest Day", "exercises": [], "day_note": None, "track_metric": None, "goal": None},
            {"day_number": 5, "day_type": "workout", "day_title": "Step 2 — Box Pistol", "exercises": [{"name": "Box Pistol Squat", "reps_or_time": "× 4 sets × 4 per leg"}], "day_note": "Sit down to a chair on one leg, stand up using two legs.", "track_metric": None, "goal": None},
            {"day_number": 6, "day_type": "workout", "day_title": "Step 2 — Box Pistol", "exercises": [{"name": "Box Pistol Squat", "reps_or_time": "× 4 sets × 4 per leg"}], "day_note": "Sit down to a chair on one leg, stand up using two legs.", "track_metric": None, "goal": None},
            {"day_number": 7, "day_type": "test", "day_title": "Final Test", "exercises": [{"name": "Pistol Squat", "reps_or_time": "2 attempts each leg"}], "day_note": "Any progression level counts — assisted is fine.", "track_metric": None, "goal": "Complete 2 reps each leg"},
        ],
        "complete_condition": "2 pistol squats each leg completed on Day 7",
        "badge_name": "One-Legged Legend",
        "bonus": None,
    },
    "unlock": {
        "is_free": False,
        "conditions": [
            {"body_part": "Legs", "min_workouts": 20, "level_required": "warrior"},
        ],
        "challenges_completed_required": 0,
        "unlock_message": "Reach Warrior in Legs to unlock",
    },
}


def seed_more_intermediate_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    for data in [I05_CHALLENGE, I06_CHALLENGE, I07_CHALLENGE, I08_CHALLENGE, I09_CHALLENGE, I10_CHALLENGE]:
        Challenge.objects.update_or_create(id=data["id"], defaults=data)


def unseed_more_intermediate_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    Challenge.objects.filter(id__in=["I05", "I06", "I07", "I08", "I09", "I10"]).delete()


class Migration(migrations.Migration):

    dependencies = [("challenges", "0005_seed_intermediate_challenges")]

    operations = [
        migrations.RunPython(
            seed_more_intermediate_challenges, unseed_more_intermediate_challenges
        )
    ]
