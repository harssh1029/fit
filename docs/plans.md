# Training Plans & Exercises 

This document describes how **Plans** (e.g. "Hyrox") are structured, how they reference **Exercises**, and how this structure is used by the Dashboard and other features.

---

## 1. Conceptual Layers

We separate the domain into distinct layers:

1. **Exercise** – atomic movement definition (e.g. Chest Press).
2. **WorkoutTemplate** – a reusable workout made of ordered exercises.
3. **Plan** – multi-week journey that schedules WorkoutTemplates by week/day.
4. **UserPlan** – a user enrolled in a Plan, with progress.
5. **WorkoutSession** – a concrete execution of a WorkoutTemplate by a user.

Analytics (e.g. "what you focus on each week") are computed from **Plan + WorkoutTemplate + Exercise**.

---

## 2. Exercise Entity

**Goal**: single source of truth for a movement.

Key fields (example for Chest Press):

```jsonc
{
  "id": "chest_press_barbell_flat",
  "name": "Barbell Bench Press",
  "primary_muscles": ["chest"],
  "secondary_muscles": ["triceps", "front_delts"],
  "movement_pattern": "horizontal_press",
  "equipment": ["barbell", "bench"],
  "level": "intermediate",
  "is_compound": true
}
```

Each Exercise is tagged with muscles and movement pattern, so later we can ask:
- "In Week 1 of Hyrox, how much chest vs legs are we training?"

Technique cues, video URL, common mistakes, etc. are additional fields but do not affect plan logic.

---

## 3. WorkoutTemplate

A **WorkoutTemplate** is a reusable workout that stitches together Exercises with prescriptions.

Example (Hyrox Week 1 Upper Body session):

```jsonc
{
  "id": 200,
  "name": "Hyrox Upper Body Strength",
  "estimated_duration_minutes": 45,
  "blocks": [
    {
      "type": "strength",
      "title": "Main Strength Work",
      "items": [
        {
          "exercise_id": "chest_press_barbell_flat",
          "sets": 4,
          "reps": 8,
          "target_rpe": 8
        },
        {
          "exercise_id": "pull_up",
          "sets": 4,
          "reps": 6,
          "target_rpe": 8
        }
      ]
    }
  ]
}
```

Notes:
- `exercise_id` refers back to the **Exercise** entity.
- This indirection allows a single change to an Exercise (e.g. primary_muscles) to automatically affect analytics everywhere.

---

## 4. Plan Structure (e.g. Hyrox)

A **Plan** defines weeks and assigns WorkoutTemplates to specific days.

Simplified representation:

```jsonc
{
  "id": 1,
  "name": "Hyrox 8-Week Prep",
  "duration_weeks": 8,
  "sessions_per_week_target": 4,
  "plan_weeks": [
    {
      "week_number": 1,
      "focus": "Base conditioning & strength",
      "days": [
        {
          "day_of_week": "monday",
          "label": "Upper Body Strength",
          "workout_template_id": 200
        },
        {
          "day_of_week": "wednesday",
          "label": "Engine Builder",
          "workout_template_id": 201
        }
      ]
    }
  ]
}
```

- The Plan **does not embed** full exercise details; it references WorkoutTemplates.
- WorkoutTemplates in turn reference Exercises.

---

## 5. UserPlan & WorkoutSession

- **UserPlan** links a user to Hyrox:
  - `user_id`, `plan_id`, `is_active`, `started_at`, `expected_end_at`, `status`, `sessions_completed`.
- **WorkoutSession** is a concrete execution:
  - `user_id`, `plan_id`, `workout_template_id`, timestamps, status, logged sets.

Dashboard and analytics always work via UserPlan + WorkoutSession over the static Plan/WorkoutTemplate/Exercise definitions.

---

## 6. Weekly Focus & Muscle Analytics

To compute "what you are focusing on in Week 1 of Hyrox":

1. Select `plan_weeks` where `week_number = 1`.
2. For each `day` in that week, fetch its `workout_template`.
3. For each template, iterate all `blocks.items`.
4. For each `exercise_id`, load the **Exercise** and its `primary_muscles` / `secondary_muscles`.
5. Aggregate counts or weighted volume per muscle group.

Example result for Week 1:

```jsonc
{
  "chest": 0.30,
  "back": 0.25,
  "legs": 0.20,
  "core": 0.15,
  "other": 0.10
}
```

This can be used by:
- Dashboard (e.g. "This week focuses on Upper Body & Engine"),
- Plan details screen (visual breakdown of program design),
- Future AI insights (detect overuse/underuse of a muscle group).

---

## 7. How Dashboard Uses Plan & Exercise Data

For an active Plan like Hyrox, the Dashboard:

- **Hero card**: uses Plan + UserPlan to show current week/day and today’s WorkoutTemplate name & duration.
- **Quick metrics**: uses Plan’s `sessions_per_week_target` and history from WorkoutSession.
- **Focus / insights (future)**: can use weekly muscle aggregation to say, e.g., "This week: Push dominant" or warn about imbalance.

Plan, WorkoutTemplate, and Exercise are therefore **composable building blocks** used consistently across Dashboard, Plans screen, and analytics.

---

## 8. Plan & UserPlan API Endpoints (v1 – draft)

All endpoints are under `/api/v1/` and require authentication unless stated otherwise.

- `GET /plans/`  
  List available plans. Supports filters such as `goal`, `difficulty`, `equipment`, `ordering=most_enrolled`.

- `GET /plans/{plan_id}/`  
  Full plan detail including `plan_weeks` and referenced `workout_template_id`s. Does **not** expand Exercises; clients that need exercises should follow the WorkoutTemplate + Exercise APIs.

- `GET /plans/active/`  
  Return the user’s current active `UserPlan` plus basic Plan metadata (name, duration, sessions_per_week_target).

- `POST /plans/{plan_id}/enroll/`  
  Create or update a `UserPlan` for the current user and mark it as active. Optionally accepts preferences (e.g. preferred training days).

- `GET /user-plans/`  
  List all UserPlans for the current user (past and present) with high-level progress stats.

These endpoints are consumed by:

- **Plans screen** (browsing and enrolling in plans).
- **Dashboard** (Hero card + quick metrics via `/plans/active/`).
