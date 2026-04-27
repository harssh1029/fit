from django.db import migrations


# B02_CHALLENGE = {
#     "id": "B02",
#     "order": 2,
#     "card": {"icon": "🧱", "name": "The Wall Won't Break", "body_map_tags": ["Legs", "Core"], "short_description": "You vs. a wall. How long can you last?", "level": "beginner", "level_index": 2, "status": "unlocked"},
#     "detail": {
#         "quote": "You vs. a wall. The wall always wins — but how long can you last?",
#         "format": "Progressive Hold",
#         "duration_days": 5,
#         "difficulty": 2,
#         "days": [
#             {"day_number": 1, "day_type": "test", "day_title": "Baseline Test", "exercises": [{"name": "Wall Sit", "reps_or_time": "Max Hold"}], "day_note": "Hold as long as you can. This is your baseline.", "track_metric": "Record your max hold time", "goal": None},
#             {"day_number": 2, "day_type": "workout", "day_title": "Build", "exercises": [{"name": "Wall Sit", "reps_or_time": "× 3 sets"}], "day_note": "Hold 70% of your max each set. Rest 60 sec between sets.", "track_metric": None, "goal": None},
#             {"day_number": 3, "day_type": "rest", "day_title": "Rest Day", "exercises": [], "day_note": None, "track_metric": None, "goal": None},
#             {"day_number": 4, "day_type": "workout", "day_title": "Build", "exercises": [{"name": "Wall Sit", "reps_or_time": "× 3 sets"}], "day_note": "Hold 80% of your max each set. Rest 60 sec between sets.", "track_metric": None, "goal": None},
#             {"day_number": 5, "day_type": "test", "day_title": "Final Test", "exercises": [{"name": "Wall Sit", "reps_or_time": "Max Hold"}], "day_note": "Give everything you have.", "track_metric": "Record your max hold time", "goal": "Beat Day 1 by 15+ seconds"},
#         ],
#         "complete_condition": "Day 5 hold time > Day 1 hold time + 15 seconds",
#         "badge_name": "Wall Breaker",
#         "bonus": None,
#     },
#     "unlock": {"is_free": True, "conditions": [], "challenges_completed_required": 0, "unlock_message": "Free — available from Day 1"},
# }


# B03_CHALLENGE = {
#     "id": "B03",
#     "order": 3,
#     "card": {"icon": "⏰", "name": "The 60-Second Gauntlet", "body_map_tags": ["Full Body"], "short_description": "6 exercises. 10 seconds each. No break.", "level": "beginner", "level_index": 3, "status": "unlocked"},
#     "detail": {
#         "quote": "6 exercises. 10 seconds each. No break. Survive one full minute.",
#         "format": "Timed Circuit",
#         "duration_days": 3,
#         "difficulty": 2,
#         "days": [
#             {"day_number": 1, "day_type": "workout", "day_title": "3 Rounds", "exercises": [
#                 {"name": "Jumping Jacks", "reps_or_time": "10 sec"},
#                 {"name": "Push-ups", "reps_or_time": "10 sec"},
#                 {"name": "High Knees", "reps_or_time": "10 sec"},
#                 {"name": "Squats", "reps_or_time": "10 sec"},
#                 {"name": "Mountain Climbers", "reps_or_time": "10 sec"},
#                 {"name": "Plank Hold", "reps_or_time": "10 sec"},
#             ], "day_note": "Complete 3 rounds. Rest 60 sec between rounds.", "track_metric": None, "goal": None},
#             {"day_number": 2, "day_type": "workout", "day_title": "4 Rounds", "exercises": [
#                 {"name": "Jumping Jacks", "reps_or_time": "10 sec"},
#                 {"name": "Push-ups", "reps_or_time": "10 sec"},
#                 {"name": "High Knees", "reps_or_time": "10 sec"},
#                 {"name": "Squats", "reps_or_time": "10 sec"},
#                 {"name": "Mountain Climbers", "reps_or_time": "10 sec"},
#                 {"name": "Plank Hold", "reps_or_time": "10 sec"},
#             ], "day_note": "Complete 4 rounds. Rest 60 sec between rounds.", "track_metric": None, "goal": None},
#             {"day_number": 3, "day_type": "test", "day_title": "5 Rounds — Final Test", "exercises": [
#                 {"name": "Jumping Jacks", "reps_or_time": "10 sec"},
#                 {"name": "Push-ups", "reps_or_time": "10 sec"},
#                 {"name": "High Knees", "reps_or_time": "10 sec"},
#                 {"name": "Squats", "reps_or_time": "10 sec"},
#                 {"name": "Mountain Climbers", "reps_or_time": "10 sec"},
#                 {"name": "Plank Hold", "reps_or_time": "10 sec"},
#             ], "day_note": "Complete 5 rounds.", "track_metric": None, "goal": "No stopping mid-circuit on any round"},
#         ],
#         "complete_condition": "5 clean unbroken rounds completed on Day 3",
#         "badge_name": "Gauntlet Cleared",
#         "bonus": None,
#     },
#     "unlock": {"is_free": True, "conditions": [], "challenges_completed_required": 0, "unlock_message": "Free — available from Day 1"},
# }


# B04_CHALLENGE = {
#     "id": "B04",
#     "order": 4,
#     "card": {"icon": "🎲", "name": "The Dice Roll", "body_map_tags": ["Chest", "Arms", "Legs"], "short_description": "Let fate decide your reps. Roll. Do. Repeat.", "level": "beginner", "level_index": 4, "status": "locked"},
#     "detail": {
#         "quote": "Let fate decide your reps. Roll. Do. Repeat.",
#         "format": "Randomized Reps",
#         "duration_days": 3,
#         "difficulty": 2,
#         "days": [
#             {"day_number": 1, "day_type": "workout", "day_title": "Roll + 4 Rounds", "exercises": [
#                 {"name": "Push-ups", "reps_or_time": "dice × 3 reps"},
#                 {"name": "Squats", "reps_or_time": "dice × 4 reps"},
#                 {"name": "Lunges", "reps_or_time": "dice × 2 per leg"},
#                 {"name": "Plank Hold", "reps_or_time": "dice × 10 sec"},
#             ], "day_note": "App rolls 1–6 for each exercise. Complete 4 rounds.", "track_metric": "Record total time", "goal": None},
#             {"day_number": 2, "day_type": "workout", "day_title": "Roll + 5 Rounds", "exercises": [
#                 {"name": "Push-ups", "reps_or_time": "dice × 3 reps"},
#                 {"name": "Squats", "reps_or_time": "dice × 4 reps"},
#                 {"name": "Lunges", "reps_or_time": "dice × 2 per leg"},
#                 {"name": "Plank Hold", "reps_or_time": "dice × 10 sec"},
#             ], "day_note": "App rolls 1–6 for each exercise. Complete 5 rounds.", "track_metric": None, "goal": None},
#             {"day_number": 3, "day_type": "test", "day_title": "Roll + 6 Rounds — Final", "exercises": [
#                 {"name": "Push-ups", "reps_or_time": "dice × 3 reps"},
#                 {"name": "Squats", "reps_or_time": "dice × 4 reps"},
#                 {"name": "Lunges", "reps_or_time": "dice × 2 per leg"},
#                 {"name": "Plank Hold", "reps_or_time": "dice × 10 sec"},
#             ], "day_note": "App rolls 1–6 for each exercise. Complete 6 rounds.", "track_metric": "Record total time", "goal": None},
#         ],
#         "complete_condition": "All 3 days logged",
#         "badge_name": "Fate Accepted",
#         "bonus": None,
#     },
#     "unlock": {"is_free": False, "conditions": [
#         {"body_part": "Chest", "min_workouts": 2, "level_required": "recruit"},
#         {"body_part": "Arms", "min_workouts": 2, "level_required": "recruit"},
#         {"body_part": "Legs", "min_workouts": 2, "level_required": "recruit"},
#     ], "challenges_completed_required": 0, "unlock_message": "Log 2 Chest, 2 Arm, and 2 Leg workouts to unlock"},
# }


# NOTE: To keep this migration compact (<150 lines), B05–B09 can be added in a
# follow-up migration using the same pattern if desired.
B05_CHALLENGE = {
  "id": "B05",
  "order": 5,
  "card": {
    "icon": "🪨",
    "name": "The Dead Hang Dare",
    "body_map_tags": ["Back", "Arms", "Core"],
    "short_description": "Gravity is your enemy. Hold on.",
    "level": "beginner",
    "level_index": 5,
    "status": "locked"
  },
  "detail": {
    "quote": "Gravity is your enemy. Hold on.",
    "format": "Progressive Hold",
    "duration_days": 5,
    "difficulty": 2,
    "days": [
      {
        "day_number": 1,
        "day_type": "test",
        "day_title": "Baseline Test",
        "exercises": [
          { "name": "Dead Hang", "reps_or_time": "Max Hold" }
        ],
        "day_note": "Even 10 seconds is fine. This is your starting point.",
        "track_metric": "Record your max hold time",
        "goal": "null"
      },
      {
        "day_number": 2,
        "day_type": "workout",
        "day_title": "Build",
        "exercises": [
          { "name": "Dead Hang", "reps_or_time": "× 4 sets" }
        ],
        "day_note": "Hold 50% of your max each set. Rest 90 sec between sets.",
        "track_metric": "null",
        "goal": "null"
      },
      {
        "day_number": 3,
        "day_type": "workout",
        "day_title": "Build",
        "exercises": [
          { "name": "Dead Hang", "reps_or_time": "× 4 sets" }
        ],
        "day_note": "Hold 60% of your max each set. Rest 90 sec between sets.",
        "track_metric": "null",
        "goal": "null"
      },
      {
        "day_number": 4,
        "day_type": "rest",
        "day_title": "Rest Day",
        "exercises": [],
        "day_note": "null",
        "track_metric": "null",
        "goal": "null"
      },
      {
        "day_number": 5,
        "day_type": "test",
        "day_title": "Final Test",
        "exercises": [
          { "name": "Dead Hang", "reps_or_time": "Max Hold" }
        ],
        "day_note": "Give everything.",
        "track_metric": "Record your max hold time",
        "goal": "Beat Day 1 by 10+ seconds"
      }
    ],
    "complete_condition": "Day 5 hold time > Day 1 hold time + 10 seconds",
    "badge_name": "Gravity Denied",
    "bonus": "null"
  },
  "unlock": {
    "is_free": False,
    "conditions": [
      { "body_part": "Back", "min_workouts": 3, "level_required": "recruit" },
      { "body_part": "Arms", "min_workouts": 3, "level_required": "recruit" }
    ],
    "challenges_completed_required": 0,
    "unlock_message": "Log 3 Back and 3 Arm workouts to unlock"
  }
}

B06_CHALLENGE = {
  "id": "B06",
  "order": 6,
  "card": {
    "icon": "💀",
    "name": "Death By Push-Up Lite",
    "body_map_tags": ["Chest", "Arms", "Shoulders"],
    "short_description": "It starts easy. It doesn't stay easy.",
    "level": "beginner",
    "level_index": 6,
    "status": "locked"
  },
  "detail": {
    "quote": "It starts easy. It doesn't stay easy.",
    "format": "EMOM Ladder",
    "duration_days": 1,
    "difficulty": 3,
    "days": [
      {
        "day_number": 1,
        "day_type": "workout",
        "day_title": "EMOM Ladder to Failure",
        "exercises": [
          { "name": "Push-ups", "reps_or_time": "+1 rep every minute" }
        ],
        "day_note": "Minute 1 = 1 push-up. Minute 2 = 2 push-ups. Keep adding 1 per minute. FAIL = can't complete reps within 60 seconds.",
        "track_metric": "Record the minute you failed on",
        "goal": "Survive Minute 8 or above (36 total push-ups)"
      }
    ],
    "complete_condition": "Reach Minute 8 or above",
    "badge_name": "Death Delayed",
    "bonus": "null"
  },
  "unlock": {
    "is_free": False,
    "conditions": [
      { "body_part": "Chest", "min_workouts": 5, "level_required": "recruit" },
      { "body_part": "Arms", "min_workouts": 5, "level_required": "recruit" }
    ],
    "challenges_completed_required": 0,
    "unlock_message": "Log 5 Chest and 5 Arm workouts to unlock"
  }
}

B07_CHALLENGE = {
  "id": "B07",
  "order": 7,
  "card": {
    "icon": "🫁",
    "name": "The Breath Test",
    "body_map_tags": ["Core", "Legs"],
    "short_description": "Control your breath. Control the workout.",
    "level": "beginner",
    "level_index": 7,
    "status": "locked"
  },
  "detail": {
    "quote": "Control your breath. Control the workout.",
    "format": "Tempo + Hold",
    "duration_days": 4,
    "difficulty": 2,
    "days": [
      {
        "day_number": 1,
        "day_type": "workout",
        "day_title": "3 Rounds — 20 sec Planks",
        "exercises": [
          { "name": "Squats", "reps_or_time": "× 5 (4 sec down, 4 sec up)" },
          { "name": "Plank Hold", "reps_or_time": "20 sec" },
          { "name": "Lunges", "reps_or_time": "× 5 per leg (3 sec down, 3 sec up)" },
          { "name": "Plank Hold", "reps_or_time": "20 sec" }
        ],
        "day_note": "3 rounds. Rest 60 sec between rounds.",
        "track_metric": "null",
        "goal": "null"
      },
      {
        "day_number": 2,
        "day_type": "workout",
        "day_title": "3 Rounds — 30 sec Planks",
        "exercises": [
          { "name": "Squats", "reps_or_time": "× 5 (4 sec down, 4 sec up)" },
          { "name": "Plank Hold", "reps_or_time": "30 sec" },
          { "name": "Lunges", "reps_or_time": "× 5 per leg (3 sec down, 3 sec up)" },
          { "name": "Plank Hold", "reps_or_time": "30 sec" }
        ],
        "day_note": "3 rounds. Rest 60 sec between rounds.",
        "track_metric": "null",
        "goal": "null"
      },
      {
        "day_number": 3,
        "day_type": "rest",
        "day_title": "Rest Day",
        "exercises": [],
        "day_note": "null",
        "track_metric": "null",
        "goal": "null"
      },
      {
        "day_number": 4,
        "day_type": "test",
        "day_title": "3 Rounds — 40 sec Planks — Final",
        "exercises": [
          { "name": "Squats", "reps_or_time": "× 7 (4 sec down, 4 sec up)" },
          { "name": "Plank Hold", "reps_or_time": "40 sec" },
          { "name": "Lunges", "reps_or_time": "× 7 per leg (3 sec down, 3 sec up)" },
          { "name": "Plank Hold", "reps_or_time": "40 sec" }
        ],
        "day_note": "3 rounds. Rest 60 sec between rounds. +2 reps added to all exercises.",
        "track_metric": "null",
        "goal": "Complete without breaking tempo on any rep"
      }
    ],
    "complete_condition": "Day 4 completed without breaking tempo",
    "badge_name": "Controlled Chaos",
    "bonus": "null"
  },
  "unlock": {
    "is_free": False,
    "conditions": [
      { "body_part": "Core", "min_workouts": 5, "level_required": "recruit" },
      { "body_part": "Legs", "min_workouts": 5, "level_required": "recruit" }
    ],
    "challenges_completed_required": 0,
    "unlock_message": "Log 5 Core and 5 Leg workouts to unlock"
  }
}

B08_CHALLENGE = {
  "id": "B08",
  "order": 8,
  "card": {
    "icon": "🐻",
    "name": "The Animal Walk",
    "body_map_tags": ["Shoulders", "Core", "Legs"],
    "short_description": "Crawl before you run. Literally.",
    "level": "beginner",
    "level_index": 8,
    "status": "locked"
  },
  "detail": {
    "quote": "Crawl before you run. Literally.",
    "format": "Distance Based",
    "duration_days": 3,
    "difficulty": 2,
    "days": [
      {
        "day_number": 1,
        "day_type": "workout",
        "day_title": "3 Rounds",
        "exercises": [
          { "name": "Bear Crawl", "reps_or_time": "10 meters forward" },
          { "name": "Crab Walk", "reps_or_time": "10 meters backward" },
          { "name": "Frog Jumps", "reps_or_time": "10 meters forward" },
          { "name": "Inchworm Walk", "reps_or_time": "10 meters forward" }
        ],
        "day_note": "Complete 3 rounds.",
        "track_metric": "Record total time",
        "goal": "null"
      },
      {
        "day_number": 2,
        "day_type": "workout",
        "day_title": "4 Rounds",
        "exercises": [
          { "name": "Bear Crawl", "reps_or_time": "10 meters forward" },
          { "name": "Crab Walk", "reps_or_time": "10 meters backward" },
          { "name": "Frog Jumps", "reps_or_time": "10 meters forward" },
          { "name": "Inchworm Walk", "reps_or_time": "10 meters forward" }
        ],
        "day_note": "Complete 4 rounds.",
        "track_metric": "null",
        "goal": "null"
      },
      {
        "day_number": 3,
        "day_type": "test",
        "day_title": "5 Rounds — Final Test",
        "exercises": [
          { "name": "Bear Crawl", "reps_or_time": "10 meters forward" },
          { "name": "Crab Walk", "reps_or_time": "10 meters backward" },
          { "name": "Frog Jumps", "reps_or_time": "10 meters forward" },
          { "name": "Inchworm Walk", "reps_or_time": "10 meters forward" }
        ],
        "day_note": "Complete 5 rounds.",
        "track_metric": "Record total time",
        "goal": "Faster per round than Day 1"
      }
    ],
    "complete_condition": "All 3 days done and Day 3 per-round time faster than Day 1",
    "badge_name": "Beast Mode: Unlocked",
    "bonus": "null"
  },
  "unlock": {
    "is_free": False,
    "conditions": [
      { "body_part": "Shoulders", "min_workouts": 6, "level_required": "recruit" },
      { "body_part": "Core", "min_workouts": 6, "level_required": "recruit" }
    ],
    "challenges_completed_required": 0,
    "unlock_message": "Log 6 Shoulder and 6 Core workouts to unlock"
  }
}

B09_CHALLENGE = {
  "id": "B09",
  "order": 9,
  "card": {
    "icon": "🪜",
    "name": "The Ladder Down",
    "body_map_tags": ["Chest", "Legs"],
    "short_description": "Start high. Finish standing.",
    "level": "beginner",
    "level_index": 9,
    "status": "locked"
  },
  "detail": {
    "quote": "Start high. Finish standing.",
    "format": "Descending Ladder",
    "duration_days": 1,
    "difficulty": 3,
    "days": [
      {
        "day_number": 1,
        "day_type": "workout",
        "day_title": "Full Ladder",
        "exercises": [
          { "name": "Burpees", "reps_or_time": "10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1" },
          { "name": "Squats", "reps_or_time": "10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1" }
        ],
        "day_note": "Do matching reps of both exercises each round. 10+10, then 9+9, all the way to 1+1. Total: 55 burpees + 55 squats.",
        "track_metric": "Record total time",
        "goal": "null"
      }
    ],
    "complete_condition": "Full ladder finished",
    "badge_name": "Ladder Master",
    "bonus": "null"
  },
  "unlock": {
    "is_free": False,
    "conditions": [
      { "body_part": "Chest", "min_workouts": 8, "level_required": "soldier" },
      { "body_part": "Legs", "min_workouts": 8, "level_required": "soldier" }
    ],
    "challenges_completed_required": 0,
    "unlock_message": "Reach Soldier in Chest or Legs to unlock"
  }
}

B10_CHALLENGE = {
  "id": "B10",
  "order": 10,
  "card": {
    "icon": "🧊",
    "name": "The 5-Minute Freeze",
    "body_map_tags": ["Core", "Legs", "Shoulders"],
    "short_description": "5 minutes. 5 holds. Don't move.",
    "level": "beginner",
    "level_index": 10,
    "status": "locked"
  },
  "detail": {
    "quote": "5 minutes. 5 holds. Don't move.",
    "format": "Isometric Holds",
    "duration_days": 3,
    "difficulty": 2,
    "days": [
      {
        "day_number": 1,
        "day_type": "test",
        "day_title": "Attempt — 5 Holds",
        "exercises": [
          { "name": "Plank", "reps_or_time": "1:00" },
          { "name": "Wall Sit", "reps_or_time": "1:00" },
          { "name": "Side Plank Left", "reps_or_time": "1:00" },
          { "name": "Side Plank Right", "reps_or_time": "1:00" },
          { "name": "Superman Hold", "reps_or_time": "1:00" }
        ],
        "day_note": "No rest between holds. Go through all 5 back to back.",
        "track_metric": "Record total hold time out of 5:00",
        "goal": "null"
      },
      {
        "day_number": 2,
        "day_type": "rest",
        "day_title": "Rest Day",
        "exercises": [],
        "day_note": "null",
        "track_metric": "null",
        "goal": "null"
      },
      {
        "day_number": 3,
        "day_type": "test",
        "day_title": "Final Test — 5 Holds Unbroken",
        "exercises": [
          { "name": "Plank", "reps_or_time": "1:00" },
          { "name": "Wall Sit", "reps_or_time": "1:00" },
          { "name": "Side Plank Left", "reps_or_time": "1:00" },
          { "name": "Side Plank Right", "reps_or_time": "1:00" },
          { "name": "Superman Hold", "reps_or_time": "1:00" }
        ],
        "day_note": "No rest between holds.",
        "track_metric": "Record total hold time out of 5:00",
        "goal": "Complete all 5:00 completely unbroken"
      }
    ],
    "complete_condition": "All 5 holds completed unbroken on Day 3",
    "badge_name": "Frozen Solid",
    "bonus": "null"
  },
  "unlock": {
    "is_free": False,
    "conditions": [
      { "body_part": "Core", "min_workouts": 8, "level_required": "soldier" },
      { "body_part": "Legs", "min_workouts": 8, "level_required": "soldier" }
    ],
    "challenges_completed_required": 0,
    "unlock_message": "Reach Soldier in Core and Legs to unlock"
  }
}



def seed_more_beginner_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    for data in [B05_CHALLENGE, B06_CHALLENGE, B07_CHALLENGE, B08_CHALLENGE, B09_CHALLENGE, B10_CHALLENGE]:
        if not Challenge.objects.filter(id=data["id"]).exists():
            Challenge.objects.create(**data)


def unseed_more_beginner_challenges(apps, schema_editor):
    Challenge = apps.get_model("challenges", "Challenge")
    Challenge.objects.filter(id__in=["B05", "B06", "B07", "B08", "B09", "B10"]).delete()


class Migration(migrations.Migration):

    dependencies = [("challenges", "0002_seed_initial_challenges")]

    operations = [
        migrations.RunPython(
            seed_more_beginner_challenges, unseed_more_beginner_challenges
        )
    ]
