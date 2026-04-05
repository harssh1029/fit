# Exercises & Exercise Library

This document describes the **Exercise** entity, its data shape ("body"), and the main API endpoints for the Exercise Library and muscle-based queries.

---

## 1. Exercise Concept

An **Exercise** is the atomic building block of training plans and workouts. It answers:
- What is the movement?
- Which muscles does it train?
- What equipment and level does it require?

Exercises are **referenced** from WorkoutTemplates by `exercise_id`, never duplicated.

---

## 2. Exercise Data Shape (v1)

Minimal JSON representation of an Exercise:

```jsonc
{
  "id": "chest_press_barbell_flat",
  "name": "Barbell Bench Press",
  "primary_muscles": ["chest"],
  "secondary_muscles": ["triceps", "front_delts"],
  "movement_pattern": "horizontal_press",
  "equipment": ["barbell", "bench"],
  "level": "intermediate",          // beginner | intermediate | advanced
  "is_compound": true,
  "video_url": "https://...",       // optional
  "image_url": "https://...",       // optional thumbnail
  "description": "Press the bar from chest height..." // optional long text
}
```

Notes:
- `primary_muscles` and `secondary_muscles` are used for analytics (weekly focus per plan, target muscles for quick workouts, 3D body selector, etc.).
- `movement_pattern` helps group exercises (e.g. horizontal_press, squat, hinge, vertical_pull).
- Media fields are optional and mostly for the Exercise Library UI.

---

## 3. Muscles & Body Map

To support the 3D/body selector and filters, we maintain a separate **MuscleGroup** catalog.

Example muscle JSON:

```jsonc
{
  "id": "chest",
  "name": "Chest",
  "side": "front",          // front | back | both
  "regions": ["upper_body"],
  "aliases": ["pectorals", "pecs"]
}
```

The front-end 3D model / body map uses these IDs to map taps to `primary_muscles` filters.

---

## 4. Exercise Library Endpoints (v1 

Base path: `/api/v1/` (auth required).

### 4.1 List / Search Exercises

- `GET /exercises/`
  - **Query params** (all optional):
    - `muscles`: comma-separated muscle IDs (e.g. `chest,shoulders`).
    - `equipment`: comma-separated equipment tags (e.g. `barbell,dumbbells`).
    - `level`: `beginner|intermediate|advanced`.
    - `search`: free text (name/alias).
    - `limit`, `offset` for pagination.
  - **Use cases**:
    - Exercise Library screen.
    - Body map selection → e.g. `GET /exercises?muscles=chest,front_delts`.

### 4.2 Exercise Detail

- `GET /exercises/{exercise_id}/`
  - Returns full Exercise body (fields from section 2).
  - Used when user opens exercise detail from library or from a workout.

### 4.3 Muscles List

- `GET /muscles/`
  - Returns list of MuscleGroup objects.
  - Used by the client to build the 3D/body map and filters.

---

## 5. How Exercises Connect to Plans & Dashboard

- **WorkoutTemplate** stores only `exercise_id` references.
- **Plan** references `WorkoutTemplate` IDs for each week/day.
- To compute weekly or per-session focus (e.g. chest vs legs):
  1. Find relevant WorkoutTemplates from Plan.
  2. For each template, collect all `exercise_id`s.
  3. Load Exercises and aggregate their `primary_muscles` / `secondary_muscles`.

Dashboard and analytics never duplicate exercise data; they always resolve it through this chain:

`Plan → PlanWeek/PlanDay → WorkoutTemplate → Exercise`

