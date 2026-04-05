# Workouts & Logging Flow

This document describes how **WorkoutSessions** and per-exercise completion are designed, and how they link together with **Plans**, **WorkoutTemplates** and **Exercises** to represent per-user progress.

---

## 1. Conceptual Chain (recap)

Static (shared) definitions:
- **Exercise** – atomic movement (see `docs/exercises.md`).
- **WorkoutTemplate** – blueprint of a single workout composed of Exercises.
- **Plan** – multi-week program that schedules WorkoutTemplates.

Per-user state:
- **UserPlan** – which plan the user is enrolled in and high-level progress.
- **WorkoutSession** – each actual workout a user performs.
- **SessionExercise** – per-exercise completion status inside a WorkoutSession (we do **not** track individual sets in v1).

Relationship:

`Plan → PlanWeek/PlanDay → WorkoutTemplate → Exercise`

`User → UserPlan → WorkoutSession → SessionExercise`

---

## 2. WorkoutSession (per-user workout instance)

Represents a **single workout attempt** (planned or quick).

Minimal fields (conceptual JSON):

```jsonc
{
  "id": 5001,
  "user_id": 42,
  "plan_id": 1,                  // null for non-plan workouts
  "user_plan_id": 100,            // optional but useful
  "workout_template_id": 200,
  "planned_week_number": 1,       // optional, denormalised
  "planned_day_key": "w1_mon",   // optional identifier of plan day
  "status": "in_progress",       // in_progress | completed | cancelled
  "started_at": "2025-03-20T17:00:00Z",
  "completed_at": null,
  "duration_minutes": null
}
```

Notes:
- Many users can have sessions pointing to the **same** `workout_template_id` (e.g. Hyrox Week 1 Monday), but `WorkoutSession` is always user-specific.
- Denormalised fields like `planned_week_number` help analytics (easier queries for "all Week 1 sessions" etc.).

---

## 3. SessionExercise (per-user, per-exercise completion)

In v1 we do **not** log every set. Instead, we:
- Show the user each exercise with prescribed sets/reps (from the WorkoutTemplate), and
- Give them a single "Mark exercise complete" toggle.

A `SessionExercise` captures that completion at the exercise level:

```jsonc
{
  "id": 9001,
  "session_id": 5001,
  "exercise_id": "chest_press_barbell_flat",
  "sets_prescribed": 4,        // copied from template for convenience
  "reps_prescribed": 8,
  "is_completed": true,
  "completed_at": "2025-03-20T17:25:00Z"
}
```

Notes:
- `exercise_id` refers back to the **Exercise** entity.
- The UI uses `sets_prescribed` / `reps_prescribed` as instructions only; we do not track each set.
- For an in-progress session we can tell "which exercises are left" by checking `is_completed=false`.

---

## 4. User Flows

### 4.1 Start a planned workout (from a Plan)

1. Frontend knows the user has an active `UserPlan` and today’s `workout_template_id` (via Plan structure).
2. User taps **Start Workout** on Dashboard or Plan screen.
3. App calls:
   - `POST /api/v1/workouts/start/`

   Example request body:
   ```jsonc
   {
     "plan_id": 1,
     "user_plan_id": 100,
     "workout_template_id": 200,
     "planned_week_number": 1,
     "planned_day_key": "w1_mon"
   }
   ```

4. Backend creates a new `WorkoutSession` with `status="in_progress"` and returns it to client.

### 4.2 Start a quick workout (not tied to plan)

Similar pattern, but without `plan_id`:

```jsonc
{
  "quick_workout_id": 10,
  "workout_template_id": 210
}
```

`plan_id` and `user_plan_id` will be null. The rest of the flow is identical.

### 4.3 Marking exercises complete and completing session

v1 (simple): we only track **which exercises in the workout were completed**, not each set.

- `POST /api/v1/workouts/{session_id}/complete/`

  Request body (simplified):
  ```jsonc
  {
    "completed_exercises": [
      "chest_press_barbell_flat",
      "pull_up"
    ]
  }
  ```

Backend:
- Creates or updates `SessionExercise` rows for the given `exercise_id`s with `is_completed=true`.
- Optionally creates rows with `is_completed=false` for exercises that were prescribed but not listed as completed (for analytics).
- Marks the `WorkoutSession` as `completed`, sets `completed_at` and `duration_minutes`.

We can extend later with incremental endpoints (e.g. `PATCH /workouts/{session_id}/exercises/{exercise_id}`) if we want real-time toggling, but v1 can batch everything at the end.

### 4.4 Resume an active workout

If the app crashes or user leaves mid-workout:

- `GET /api/v1/workouts/active/` returns the latest `WorkoutSession` where `status="in_progress"`.
- Client can then reconstruct the UI from stored sets (if we choose to persist partial sets) or from its own local state.

---

## 5. Workouts Endpoints (v1 draft)

Base path: `/api/v1/` (all require auth).

- `POST /workouts/start/`  
  Start a new WorkoutSession (planned or quick). Returns session metadata.

- `GET /workouts/active/`  
  Return current in-progress session for the user, if any.

- `POST /workouts/{session_id}/complete/`  
  Complete a session and persist which exercises were completed.

- `GET /workouts/{session_id}/`  
  Get details of a specific session (template reference + per-exercise completion + stats).

- `GET /workouts/recent/?limit=3`  
  List most recent completed WorkoutSessions for the user.

- `GET /workouts/history/?page=&page_size=`  
  Paginated list of historical sessions.

- `GET /workouts/calendar/?from=&to=`  
  Aggregate count of completed workouts per day over a date range.

- `GET /workouts/summary/?range=week|month`  
  Weekly/monthly aggregates used by Dashboard metrics.

---

## 6. How this links back to Plans & Dashboard

- Dashboard **Hero card** uses:
  - `UserPlan` + Plan + WorkoutTemplate to decide what today should be.
  - `WorkoutSession` with `status="in_progress"` to offer **Continue**.

- Dashboard **Quick metrics & calendar** use:
  - `GET /workouts/summary/` and `GET /workouts/calendar/` for counts & minutes.

- Dashboard **Recent activity** uses:
  - `GET /workouts/recent/`.

- Analytics / AI use:
  - `WorkoutSession` + `SessionExercise` + Plan context to understand how user is actually following the program and what they focus on.

