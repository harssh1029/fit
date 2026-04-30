from django.db import migrations


PLAN_ID = "hyrox_intense_3wk"


EXERCISES = {
    "easy_jog": ("Easy Jog", "run", "locomotion", ["calves", "hamstrings", "glutes"], ["aerobic_system"], ["running"], 3, 3),
    "zone_2_run": ("Zone 2 Run", "run", "locomotion", ["calves", "hamstrings", "glutes"], ["aerobic_system"], ["running"], 4, 4),
    "run_intervals": ("Run Intervals", "run", "locomotion", ["calves", "quads", "glutes"], ["aerobic_system"], ["running"], 7, 7),
    "tempo_run": ("Tempo Run", "run", "locomotion", ["calves", "hamstrings", "glutes"], ["aerobic_system"], ["running"], 7, 6),
    "skierg": ("SkiErg", "erg", "hinge_pull", ["lats", "triceps", "core"], ["posterior_chain"], ["skierg"], 9, 7),
    "rowerg": ("RowErg", "erg", "hinge_pull", ["quads", "lats", "glutes"], ["core"], ["rowerg"], 7, 6),
    "sled_push": ("Sled Push", "station", "push_drive", ["quads", "glutes"], ["calves", "core"], ["sled"], 10, 9),
    "sled_pull": ("Sled Pull", "station", "pull_drive", ["lats", "glutes"], ["hamstrings", "core"], ["sled", "rope"], 9, 8),
    "wall_balls": ("Wall Balls", "station", "squat_press", ["quads", "shoulders"], ["glutes", "core"], ["wall_ball"], 10, 8),
    "burpee_broad_jumps": ("Burpee Broad Jumps", "station", "burpee_jump", ["chest", "quads"], ["shoulders", "calves"], ["bodyweight"], 10, 9),
    "farmer_carry": ("Farmer Carry", "station", "loaded_carry", ["grip", "traps"], ["core", "glutes"], ["kettlebells", "dumbbells"], 9, 7),
    "sandbag_walking_lunges": ("Sandbag Walking Lunges", "station", "loaded_lunge", ["quads", "glutes"], ["core", "hamstrings"], ["sandbag"], 10, 8),
    "push_press": ("Push Press", "strength", "vertical_press", ["shoulders", "triceps"], ["quads", "core"], ["barbell", "dumbbells"], 6, 5),
    "pull_ups": ("Pull-ups", "strength", "vertical_pull", ["lats", "biceps"], ["core"], ["pull_up_bar"], 6, 5),
    "ring_rows": ("Ring Rows", "strength", "horizontal_pull", ["lats", "upper_back"], ["biceps", "core"], ["rings"], 5, 4),
    "dead_bug": ("Dead Bug", "core", "anti_extension", ["abs"], ["hip_flexors"], ["bodyweight"], 5, 2),
    "plank": ("Plank", "core", "anti_extension", ["abs"], ["shoulders", "glutes"], ["bodyweight"], 5, 3),
    "mobility_flow": ("Mobility Flow", "recovery", "mobility", ["hips", "t_spine"], ["ankles"], ["bodyweight"], 5, 1),
    "breathing_reset": ("Breathing Reset", "recovery", "downregulation", ["diaphragm"], ["parasympathetic_system"], ["bodyweight"], 5, 1),
    "race_simulation_run": ("Race Simulation Run", "run", "compromised_locomotion", ["calves", "quads", "glutes"], ["aerobic_system"], ["running"], 10, 7),
}


def nutrition(intensity, simulation=False):
    return {
        "calories": "maintenance + 200" if intensity in {"hard", "race"} else "maintenance",
        "protein_g": "1.6-2.2 g/kg body weight",
        "carbs_g": "higher: prioritize pre- and post-session carbs" if intensity in {"hard", "race"} or simulation else "moderate: keep glycogen steady without forcing intake",
        "fat_g": "moderate; keep fats lower in the 2-3 hours before training",
        "hydration": "500-750 ml water before training; add electrolytes if heat, sweat rate, or session duration is high",
        "notes": "Arrive fueled enough to protect output quality. This block rewards repeatable work, not under-fueled suffering.",
    }


SUPPLEMENTS = {
    "creatine": "Creatine monohydrate 3-5g daily.",
    "electrolytes": "Use electrolytes on hard, long, or sweaty sessions.",
    "magnesium": "Magnesium at night to support sleep and recovery.",
    "caffeine": "Optional before hard sessions if tolerated; keep it away from late training.",
}


def p(**kwargs):
    return {key: value for key, value in kwargs.items() if value not in (None, "", [])}


def run(label, distance=None, duration=None, intensity=None, notes=None):
    return ("race_simulation_run", label, p(distance=distance, duration=duration, intensity=intensity, notes=notes))


VERSIONS = [
    {
        "id": "hyrox_intense_3wk_3d",
        "sessions": 3,
        "title": "HYROX Intense - 3 Days/Week",
        "description": "Time-efficient advanced HYROX prep for serious users who can train only three days per week. Sessions are denser and combine strength, running, and station work.",
        "is_default": False,
        "is_premium": True,
        "split_type": "hyrox_dense_hybrid",
        "pattern": ["MON", "WED", "FRI"],
        "total": 9,
        "structure": ["Lower Stations + Aerobic Control", "Intervals + Upper Engine", "Compromised Running / Simulation"],
        "weeks": [
            {
                "title": "Build the Engine",
                "focus": "Build mechanics, aerobic control, and controlled HYROX-specific volume.",
                "coach": "Every rep should look like it belongs in a race. Keep the lid on early intensity so Week 2 has somewhere to go.",
                "theme": "Controlled volume with clean station mechanics.",
                "highlights": ["Station technique under light fatigue", "Easy running after loaded work", "No junk volume"],
                "days": [
                    ("Lower Stations + Aerobic Control", 75, "hybrid_strength_run", "moderate", "7/10", "Lower station economy", "Aerobic control", "Keep the running easy. The goal is to control heart rate after station fatigue, not destroy the legs.", [
                        ("easy_jog", "Easy Jog Warm-up", p(duration="10 min", intensity="Zone 2", notes="Nasal-breathing pace if possible.")),
                        ("sled_push", "Sled Push", p(sets=4, distance="20m", intensity="RPE 7", rest="90 sec")),
                        ("sandbag_walking_lunges", "Sandbag Walking Lunges", p(sets=4, reps="20 steps", intensity="controlled pace")),
                        ("farmer_carry", "Farmer Carry", p(sets=4, distance="40m", intensity="heavy but unbroken")),
                        ("zone_2_run", "Zone 2 Run", p(duration="20 min", intensity="conversational pace")),
                        ("plank", "Plank", p(sets=3, duration="45 sec")),
                    ]),
                    ("Intervals + Upper Engine", 70, "run_upper_engine", "hard", "8/10", "Running repeatability", "Upper-body station output", "This session should feel uncomfortable but controlled. Do not turn intervals into all-out sprints.", [
                        ("skierg", "SkiErg Technique Warm-up", p(duration="8 min", intensity="easy technique")),
                        ("run_intervals", "Run Intervals", p(sets=6, distance="400m", intensity="RPE 8", rest="90 sec")),
                        ("skierg", "SkiErg", p(sets=5, distance="500m", intensity="race pace", rest="90 sec")),
                        ("push_press", "Push Press", p(sets=4, reps=8, intensity="moderate-heavy")),
                        ("pull_ups", "Pull-ups or Ring Rows", p(sets=4, reps=10, notes="Scale to crisp reps.")),
                        ("dead_bug", "Dead Bug", p(sets=3, reps="12/side")),
                    ]),
                    ("Compromised Running", 85, "compromised_running", "hard", "8/10", "Running under station fatigue", "Pacing discipline", "Learn to run while tired. This is one of the most important HYROX skills.", [
                        ("easy_jog", "Easy Jog Warm-up", p(duration="10 min")),
                        run("Run", "1 km", intensity="controlled race rhythm")[0:3],
                        ("wall_balls", "Wall Balls", p(reps=50, notes="Break before form collapses.")),
                        run("Run", "1 km", intensity="settle quickly")[0:3],
                        ("burpee_broad_jumps", "Burpee Broad Jumps", p(distance="40m", notes="Low, patient cadence.")),
                        run("Run", "1 km", intensity="strong but sustainable")[0:3],
                        ("farmer_carry", "Farmer Carry", p(sets=3, distance="60m")),
                    ]),
                ],
            },
            {
                "title": "Build Pressure",
                "focus": "Increase density, lactate tolerance, and repeatability under race-specific fatigue.",
                "coach": "This is the pressure week. Hold standards when breathing gets loud.",
                "theme": "Harder repeats with controlled recoveries.",
                "highlights": ["Higher station density", "More interval volume", "Repeatable compromised rounds"],
                "days": [
                    ("Lower Stations + Aerobic Control", 80, "hybrid_strength_run", "hard", "8/10", "Lower station resilience", "Aerobic recovery between efforts", "Pressure rises this week, but the intent stays precise: powerful stations followed by calm running mechanics.", [
                        ("easy_jog", "Easy Jog Warm-up", p(duration="10 min", intensity="easy")),
                        ("sled_push", "Sled Push", p(sets=5, distance="20m", intensity="RPE 8", rest="90 sec")),
                        ("sandbag_walking_lunges", "Sandbag Walking Lunges", p(sets=5, reps="20 steps")),
                        ("farmer_carry", "Farmer Carry", p(sets=5, distance="50m")),
                        ("zone_2_run", "Zone 2 Run", p(duration="25 min", intensity="controlled aerobic")),
                        ("plank", "Plank", p(sets=4, duration="45 sec")),
                    ]),
                    ("Intervals + Upper Engine", 78, "run_upper_engine", "hard", "8/10", "Interval durability", "SkiErg race rhythm", "The extra volume only works if rep one and rep last look related. Keep the recoveries honest.", [
                        ("skierg", "SkiErg Technique Warm-up", p(duration="8 min")),
                        ("run_intervals", "Run Intervals", p(sets=8, distance="400m", intensity="RPE 8", rest="90 sec")),
                        ("skierg", "SkiErg", p(sets=6, distance="500m", intensity="race pace", rest="90 sec")),
                        ("push_press", "Push Press", p(sets=5, reps=6, intensity="heavier than Week 1")),
                        ("pull_ups", "Pull-ups or Ring Rows", p(sets=5, reps=8)),
                        ("dead_bug", "Dead Bug", p(sets=3, reps="15/side")),
                    ]),
                    ("Compromised Running Pressure", 90, "compromised_running", "hard", "8/10", "Repeatability", "Lactate management", "This week teaches pressure management. The goal is repeatability, not one heroic round.", [
                        ("race_simulation_run", "4 Rounds: Run", p(sets=4, distance="1 km", rest="2 min between rounds if needed")),
                        ("wall_balls", "4 Rounds: Wall Balls", p(sets=4, reps=60)),
                        ("burpee_broad_jumps", "4 Rounds: Burpee Broad Jumps", p(sets=4, distance="50m")),
                    ]),
                ],
            },
            {
                "title": "Race Sharpening",
                "focus": "Sharpen race performance while reducing unnecessary fatigue.",
                "coach": "Leave each session feeling more confident, not more depleted.",
                "theme": "Race-specific intent with trimmed volume.",
                "highlights": ["Race effort touches", "Lower total volume", "Confidence-focused simulation"],
                "days": [
                    ("Lower Stations Sharpening", 65, "hybrid_strength_run", "moderate", "7/10", "Station sharpness", "Leg freshness", "Hit race-quality reps and get out. This is not the week to prove fitness with extra work.", [
                        ("easy_jog", "Easy Jog Warm-up", p(duration="8 min")),
                        ("sled_push", "Sled Push", p(sets=3, distance="30m", intensity="race effort", rest="2 min")),
                        ("farmer_carry", "Farmer Carry", p(sets=3, distance="60m")),
                        ("sandbag_walking_lunges", "Sandbag Walking Lunges", p(sets=3, reps="20 steps")),
                        ("easy_jog", "Easy Run", p(duration="15 min", intensity="easy")),
                        ("mobility_flow", "Mobility Flow", p(duration="10 min")),
                    ]),
                    ("Race Pace Intervals + Upper Touch", 60, "run_upper_engine", "moderate", "7/10", "Race pace rhythm", "Upper-body freshness", "Sharp does not mean frantic. Lock into race pace, breathe, and finish with control.", [
                        ("run_intervals", "Run", p(sets=4, distance="800m", intensity="race pace", rest="2 min")),
                        ("skierg", "SkiErg", p(sets=4, distance="500m", intensity="race pace", rest="90 sec")),
                        ("push_press", "Push Press", p(sets=3, reps=6, intensity="smooth moderate")),
                        ("breathing_reset", "Breathing Reset", p(duration="5 min")),
                    ]),
                    ("Mini Race Simulation", 75, "hyrox_simulation", "hard", "8/10", "Race confidence", "Execution under fatigue", "Finish confident. This should sharpen you, not ruin recovery.", [
                        ("race_simulation_run", "Run", p(distance="1 km")),
                        ("skierg", "SkiErg", p(distance="750m", intensity="race pace")),
                        ("race_simulation_run", "Run", p(distance="1 km")),
                        ("sled_push", "Sled Push", p(sets=3, distance="20m", intensity="race effort")),
                        ("race_simulation_run", "Run", p(distance="1 km")),
                        ("wall_balls", "Wall Balls", p(reps=75, notes="Planned breaks only.")),
                    ]),
                ],
            },
        ],
    },
    {
        "id": "hyrox_intense_3wk_4d",
        "sessions": 4,
        "title": "HYROX Intense - 4 Days/Week",
        "description": "Recommended balanced HYROX race-prep structure with better separation between running, station work, and simulation.",
        "is_default": True,
        "is_premium": False,
        "split_type": "hyrox_balanced_hybrid",
        "pattern": ["MON", "TUE", "THU", "SAT"],
        "total": 12,
        "structure": ["Lower Strength + Easy Run", "Upper Engine + Intervals", "Compromised Running", "HYROX Simulation"],
        "weeks": [],
    },
]


# The four-day version keeps the same coaching progression with cleaner separation.
VERSIONS[1]["weeks"] = [
    {
        "title": "Build the Engine",
        "focus": "Build engine, station mechanics, and controlled volume without blunting quality.",
        "coach": "Separate the qualities and keep every day purposeful: lower stations, upper engine, compromised running, then simulation.",
        "theme": "Controlled exposure across all race demands.",
        "highlights": ["Balanced weekly rhythm", "First simulation exposure", "Clean running mechanics"],
        "days": [
            ("Lower Strength + Easy Run", 75, "hybrid_strength_run", "moderate", "7/10", "Lower station strength", "Aerobic control", "Power the stations, then prove you can run easy after them.", [
                ("easy_jog", "Easy Jog", p(duration="10 min")),
                ("sled_push", "Sled Push", p(sets=4, distance="20m", intensity="RPE 7", rest="90 sec")),
                ("sandbag_walking_lunges", "Sandbag Walking Lunges", p(sets=4, reps="20 steps")),
                ("farmer_carry", "Farmer Carry", p(sets=4, distance="40m")),
                ("zone_2_run", "Zone 2 Run", p(duration="20 min")),
                ("mobility_flow", "Mobility Flow", p(duration="8 min")),
            ]),
            ("Upper Engine + Intervals", 70, "run_upper_engine", "hard", "8/10", "Run intervals", "Upper engine", "Strong outputs, no panic. Keep all 400s within a tight pace band.", [
                ("skierg", "SkiErg Warm-up", p(duration="8 min")),
                ("run_intervals", "Run Intervals", p(sets=6, distance="400m", intensity="RPE 8", rest="90 sec")),
                ("skierg", "SkiErg", p(sets=5, distance="500m", intensity="race pace", rest="90 sec")),
                ("push_press", "Push Press", p(sets=4, reps=8)),
                ("pull_ups", "Pull-ups/Ring Rows", p(sets=4, reps=10)),
                ("dead_bug", "Dead Bug", p(sets=3, reps="12/side")),
            ]),
            ("Compromised Run", 80, "compromised_running", "hard", "8/10", "Station-to-run transitions", "Fatigue control", "The skill is the first 200m after each station. Settle quickly.", [
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("wall_balls", "Wall Balls", p(reps=50)),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("burpee_broad_jumps", "Burpee Broad Jumps", p(distance="40m")),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("farmer_carry", "Farmer Carry", p(sets=3, distance="50m")),
            ]),
            ("HYROX Simulation Circuit", 90, "hyrox_simulation", "hard", "8/10", "Race sequencing", "Confidence", "Treat this as rehearsal. Smooth transitions beat emotional surges.", [
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("skierg", "SkiErg", p(distance="750m")),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("sled_push", "Sled Push", p(sets=3, distance="20m")),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("wall_balls", "Wall Balls", p(reps=75)),
                ("breathing_reset", "Breathing Reset", p(duration="5 min")),
            ]),
        ],
    },
    {
        "title": "Build Pressure",
        "focus": "Increase race-specific density and challenge decision-making under fatigue.",
        "coach": "The work is harder, but the standard is still control. Do not trade mechanics for drama.",
        "theme": "Higher pressure with disciplined pacing.",
        "highlights": ["More station volume", "Longer simulation", "Repeatable hard running"],
        "days": [
            ("Lower Strength + Easy Run", 80, "hybrid_strength_run", "hard", "8/10", "Lower station durability", "Aerobic reset", "Absorb the extra station work, then keep the run genuinely aerobic.", [
                ("easy_jog", "Easy Jog", p(duration="10 min")),
                ("sled_push", "Sled Push", p(sets=5, distance="20m", intensity="RPE 8")),
                ("sandbag_walking_lunges", "Sandbag Lunges", p(sets=5, reps="20 steps")),
                ("farmer_carry", "Farmer Carry", p(sets=5, distance="50m")),
                ("zone_2_run", "Zone 2 Run", p(duration="25 min")),
            ]),
            ("Upper Engine + Intervals", 78, "run_upper_engine", "hard", "8/10", "Repeat speed", "Upper station output", "Be brave enough to stay controlled. The final reps matter most.", [
                ("skierg", "SkiErg Warm-up", p(duration="8 min")),
                ("run_intervals", "Run Intervals", p(sets=8, distance="400m", intensity="RPE 8", rest="90 sec")),
                ("skierg", "SkiErg", p(sets=6, distance="500m", intensity="race pace")),
                ("push_press", "Push Press", p(sets=5, reps=6)),
                ("pull_ups", "Pull-ups/Ring Rows", p(sets=5, reps=8)),
            ]),
            ("Compromised Run Pressure", 90, "compromised_running", "hard", "8/10", "Pressure management", "Burpee-wall ball tolerance", "Repeatability beats one heroic round.", [
                ("race_simulation_run", "4 Rounds: Run", p(sets=4, distance="1 km", rest="2 min if needed")),
                ("wall_balls", "4 Rounds: Wall Balls", p(sets=4, reps=60)),
                ("burpee_broad_jumps", "4 Rounds: Burpee Broad Jumps", p(sets=4, distance="50m")),
            ]),
            ("Long Simulation", 100, "hyrox_simulation", "race", "9/10", "Race-specific endurance", "Transition discipline", "This is the biggest rehearsal. Hold back early so the final wall balls are composed.", [
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("skierg", "SkiErg", p(distance="1000m")),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("sled_push", "Sled Push", p(sets=4, distance="20m")),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("farmer_carry", "Farmer Carry", p(distance="80m")),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("wall_balls", "Wall Balls", p(reps=100)),
            ]),
        ],
    },
    {
        "title": "Race Sharpening",
        "focus": "Reduce unnecessary volume, sharpen rhythm, and build race-day confidence.",
        "coach": "Nothing sloppy, nothing extra. Finish the week sharper than you started it.",
        "theme": "Lower volume, high intent, confident execution.",
        "highlights": ["Race-pace touches", "Light compromised circuit", "Controlled final simulation"],
        "days": [
            ("Lower Station Sharpening", 65, "hybrid_strength_run", "moderate", "7/10", "Station sharpness", "Recovery protection", "Race effort means crisp, not desperate.", [
                ("easy_jog", "Easy Jog", p(duration="8 min")),
                ("sled_push", "Sled Push", p(sets=3, distance="30m", intensity="race effort")),
                ("sandbag_walking_lunges", "Sandbag Lunges", p(sets=3, reps="20 steps")),
                ("farmer_carry", "Farmer Carry", p(sets=3, distance="60m")),
                ("easy_jog", "Easy Run", p(duration="15 min")),
                ("mobility_flow", "Mobility Flow", p(duration="10 min")),
            ]),
            ("Race Pace Intervals", 60, "run_upper_engine", "moderate", "7/10", "Race pace rhythm", "Core control", "Keep the 800s smooth. You should finish knowing the pace is available.", [
                ("run_intervals", "Run", p(sets=4, distance="800m", intensity="race pace")),
                ("skierg", "SkiErg", p(sets=4, distance="500m")),
                ("push_press", "Push Press", p(sets=3, reps=6)),
                ("dead_bug", "Dead Bug", p(sets=3, reps="12/side")),
            ]),
            ("Light Compromised Circuit", 55, "compromised_running", "moderate", "6/10", "Transition rhythm", "Freshness", "Move well and leave gas in the tank.", [
                ("race_simulation_run", "Run", p(distance="800m")),
                ("wall_balls", "Wall Balls", p(reps=40)),
                ("race_simulation_run", "Run", p(distance="800m")),
                ("burpee_broad_jumps", "Burpee Broad Jumps", p(distance="30m")),
                ("race_simulation_run", "Run", p(distance="800m")),
                ("breathing_reset", "Breathing Reset", p(duration="5 min")),
            ]),
            ("Controlled Race Simulation", 85, "hyrox_simulation", "hard", "8/10", "Race confidence", "Execution", "Controlled, sharp, confident. Do not chase exhaustion this close to the end.", [
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("skierg", "SkiErg", p(distance="750m")),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("sled_push", "Sled Push", p(sets=3, distance="20m")),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("farmer_carry", "Farmer Carry", p(distance="60m")),
                ("race_simulation_run", "Run", p(distance="1 km")),
                ("wall_balls", "Wall Balls", p(reps=75)),
            ]),
        ],
    },
]


def seed(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    PlanVersion = apps.get_model("plans", "PlanVersion")
    PlanWeek = apps.get_model("plans", "PlanWeek")
    PlanDay = apps.get_model("plans", "PlanDay")
    PlanExercise = apps.get_model("plans", "PlanExercise")
    PlanDayExercise = apps.get_model("plans", "PlanDayExercise")

    plan, _ = Plan.objects.update_or_create(
        id=PLAN_ID,
        defaults={
            "name": "HYROX Intense",
            "subtitle": "3-Week Race Prep Program",
            "level": "advanced",
            "goal": "hyrox_race_prep",
            "duration_weeks": 3,
            "default_sessions_per_week": 4,
            "sessions_per_week": 4,
            "summary": "Advanced HYROX race-prep program designed to improve running capacity, station efficiency, lactate tolerance, strength-endurance, and race-day confidence.",
            "audience": "Advanced athletes, gym-goers, and hybrid fitness users preparing for HYROX-style race demands.",
            "result": "Better compromised running, stronger station output, improved pacing, better race control, and higher confidence under fatigue.",
            "long_description": "This is a serious 3-week advanced HYROX preparation block. It combines structured running, sled work, wall balls, carries, lunges, SkiErg, burpees, compromised running, and race simulation. Every session has a clear purpose. The plan avoids junk volume and focuses only on training that transfers directly to HYROX performance.",
            "tags": ["hyrox", "race_prep", "hybrid_training", "conditioning", "advanced"],
            "supported_sessions_per_week": [3, 4, 5, 6],
            "is_active": True,
            "is_premium_plan": False,
        },
    )

    PlanWeek.objects.filter(plan=plan).delete()
    PlanVersion.objects.filter(plan=plan).delete()

    exercise_index = {}
    for slug, data in EXERCISES.items():
        name, category, pattern, primary, secondary, equipment, priority, fatigue = data
        exercise, _ = PlanExercise.objects.update_or_create(
            id=slug,
            defaults={
                "name": name,
                "category": category,
                "movement_pattern": pattern,
                "primary_muscles": primary,
                "secondary_muscles": secondary,
                "equipment": equipment,
                "difficulty": "advanced" if priority >= 8 else "intermediate",
                "priority_score": priority,
                "fatigue_score": fatigue,
                "goal_tags": ["hyrox", "race_prep", "hybrid_performance"],
                "coaching_cues": ["Control breathing", "Protect posture", "Make every rep repeatable"],
                "common_mistakes": ["Opening too hard", "Letting mechanics collapse under fatigue", "Ignoring transitions"],
            },
        )
        exercise_index[slug] = exercise

    for version_data in VERSIONS:
        version = PlanVersion.objects.create(
            id=version_data["id"],
            plan=plan,
            sessions_per_week=version_data["sessions"],
            title=version_data["title"],
            description=version_data["description"],
            is_default=version_data["is_default"],
            is_premium=version_data["is_premium"],
            split_type=version_data["split_type"],
            training_days_pattern=version_data["pattern"],
            total_sessions=version_data["total"],
            weekly_structure=version_data["structure"],
        )

        absolute_day = 1
        for week_number, week_data in enumerate(version_data["weeks"], start=1):
            week = PlanWeek.objects.create(
                plan=plan,
                plan_version=version,
                number=week_number,
                title=week_data["title"],
                focus=week_data["focus"],
                coach_note=week_data["coach"],
                intensity_theme=week_data["theme"],
                highlights=week_data["highlights"],
            )
            for title, duration, day_type, intensity, rpe, primary, secondary, coach, items in week_data["days"]:
                day = PlanDay.objects.create(
                    plan_week=week,
                    day_index=absolute_day,
                    title=title,
                    description=f"{primary}. {coach}",
                    duration=f"{duration} min",
                    duration_minutes=duration,
                    day_type=day_type,
                    intensity=intensity,
                    rpe_target=rpe,
                    primary_focus=primary,
                    secondary_focus=secondary,
                    coach_note=coach,
                    nutrition=nutrition(intensity, simulation=day_type == "hyrox_simulation"),
                    supplements=SUPPLEMENTS,
                    workout_template_id=f"{version.id}_w{week_number}_d{absolute_day}",
                )
                for order, (exercise_slug, label, prescription) in enumerate(items, start=1):
                    PlanDayExercise.objects.create(
                        plan_day=day,
                        exercise=exercise_index[exercise_slug],
                        order=order,
                        block="warm_up" if order == 1 and ("Warm-up" in label or "Easy Jog" in label) else "main",
                        label=label,
                        primary=", ".join(f"{key}: {value}" for key, value in prescription.items()),
                        secondary=prescription.get("notes", ""),
                        prescription=prescription,
                        coach_instruction="Execute with race-relevant posture and repeatable breathing. Stop chasing speed if mechanics degrade.",
                        progression_rule="Progress only by the planned weekly prescription; do not add extra volume inside this race-prep block.",
                    )
                absolute_day += 1

def unseed(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    PlanExercise = apps.get_model("plans", "PlanExercise")
    try:
        plan = Plan.objects.get(id=PLAN_ID)
    except Plan.DoesNotExist:
        return
    plan.versions.all().delete()
    plan.weeks.all().delete()
    for slug in EXERCISES:
        PlanExercise.objects.filter(id=slug).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0007_structured_plan_system"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
