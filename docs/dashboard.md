# Dashboard Page – Functional & API Specification (v1)

## 1. Purpose
The Dashboard is the **home screen** of the mobile app. In a few seconds it should answer:
- What should I do today?
- How am I progressing this week?
- What have I done recently and what is my next milestone?

The Dashboard **does not own data**. It composes information from domain services:
- Accounts (user, profile)
- Plans (plans, plan days, user-plan relationships)
- Workouts (sessions, sets, stats)
- Quick Workouts (contextual short workouts)
- Badges (achievements, streaks)
- Insights / AI (readiness, goal projections)

---

## 2. Main Endpoint

**Endpoint**: `GET /api/v1/dashboard/summary/`

- **Auth**: Required (current user).
- **Query params**:
  - `date` (optional, `YYYY-MM-DD`), default = today in user timezone.
  - `timezone` (optional) if client wants to override stored timezone.
- **Response**: single JSON object composing all sections:

```jsonc
{
  "hero": { ... },
  "metrics": { ... },
  "quick_workouts": [ ... ],
  "recent_activity": [ ... ],
  "calendar": { ... },
  "ai_estimation": { ... },
  "badge_preview": { ... }
}
```

Mobile should generally call **only this endpoint** when opening the Dashboard. Other screens (plans, history, achievements) use the underlying domain APIs directly.

---

## 3. Hero – Active Journey / Today’s Focus

**Goal**: Show the primary action for today (start/continue workout) plus plan context.

### 3.1 Response Shape
```jsonc
"hero": {
  "title": "Today’s Workout – Chest & Triceps",
  "subtext": "Week 3 • Day 2 · 45 min",
  "plan_progress_pct": 42,
  "has_active_session": true,
  "active_session_id": 501,
  "today_plan_workout_id": 301,
  "actions": {
    "primary": "continue",   // "start" | "continue" | "none"
    "secondary": "reschedule"
  },
  "state_reason": "active_session" // e.g. "no_active_plan", "rest_day"
}
```

### 3.2 Data & Logic
- **Sources**: `UserPlan`, `Plan` (with `plan_weeks` / `days`), `WorkoutTemplate`, `WorkoutSession`.
- Steps:
  1. Find active `UserPlan` (if none, `plan_progress_pct=null`, `primary="none"`).
  2. Compute plan progress = completed plan workouts / total plan workouts.
  3. Resolve today’s plan workout (for `date`) by walking:
     `UserPlan.current_plan` → `Plan.plan_weeks` → `PlanDay` for today → `WorkoutTemplate`.
  4. Check for active `WorkoutSession` (`status=in_progress`).
  5. Build `title` (from plan workout name or generic) and `subtext` (week, day, duration).

---

## 4. Quick Metrics Strip

**Goal**: 3–4 tiles summarising this week.

### 4.1 Response Shape
```jsonc
"metrics": {
  "weekly_sessions_completed": 3,
  "weekly_sessions_target": 4,
  "weekly_training_minutes": 135,
  "readiness_score": 7.2,
  "current_streak_days": 5
}
```

### 4.2 Data & Logic
- **Sources**: `WorkoutSession`, `Profile/UserPlan`, `Insights/AI`, `Badges/Streaks`.
- Count completed workouts and sum duration for the current week.
- Weekly target from profile or active plan.
- Readiness from insights service (can be rule based in v1).
- Streak = consecutive days with at least one completed workout.

Tiles are tapable; taps open deeper analytics screens using dedicated domain APIs (not this endpoint).

---

## 5. Quick Workout Card

**Goal**: Provide 1‑tap contextual workouts (e.g. Travel, After Office, No Equipment).

### 5.1 Response Shape
```jsonc
"quick_workouts": [
  {
    "id": 10,
    "label": "Travel workout",
    "tag": "travel",
    "estimated_duration": 20,
    "target_muscles": ["full_body"],
    "equipment": ["bodyweight"]
  }
]
```

### 5.2 Data & Logic
- **Sources**: `QuickWorkout` model or tagged plan workout templates.
- Filter by user equipment, goal, and context to pick 2–3 options.
- Starting a quick workout is **not** done by this endpoint; the app calls `POST /api/v1/workouts/start/` with `quick_workout_id` when user taps.

---

## 6. Recent Activity

**Goal**: Show last 3 completed workouts with a highlight.

### 6.1 Response Shape
```jsonc
"recent_activity": [
  {
    "session_id": 501,
    "name": "Chest & Triceps Power",
    "completed_at": "2025-03-19T17:20:00Z",
    "duration_minutes": 58,
    "main_highlight": "New PR: 80kg bench",
    "plan_name": "Hypertrophy Max"
  }
]
```

### 6.2 Data & Logic
- **Sources**: `WorkoutSession` (+ optional `WorkoutStats`).
- Query last N (default 3) completed sessions ordered by `completed_at DESC`.
- Derive `main_highlight` from PRs or total volume, else generic text.
- Empty list if user has never completed a workout.

---

## 7. Calendar Progress

**Goal**: Show workout/non‑workout days for the current week.

### 7.1 Response Shape
```jsonc
"calendar": {
  "range_start": "2025-03-17",
  "range_end": "2025-03-23",
  "days": [
    { "date": "2025-03-17", "workouts": 1 },
    { "date": "2025-03-18", "workouts": 0 }
  ]
}
```

### 7.2 Data & Logic
- **Source**: `WorkoutSession`.
- Determine week range using user timezone, count completed workouts per day.
- Full calendar screen will call a dedicated calendar API; Dashboard only shows current week slice.

---

## 8. AI Estimation Card

**Goal**: One high‑value predictive insight (e.g. ETA to a strength goal).

### 8.1 Response Shape
```jsonc
"ai_estimation": {
  "headline": "At this pace, you'll reach 80kg bench by Aug 20.",
  "eta_date": "2025-08-20",
  "confidence": 0.78,
  "type": "goal_projection"
}
```

### 8.2 Data & Logic
- **Source**: `insights` / `ai` service.
- Inputs: workout history, plan, strength logs.
- v1 may be rule‑based; later replaced by ML.
- If not enough data or service unavailable, field can be `null`.

---

## 9. Milestone / Badge Preview

**Goal**: Show the *next* badge the user is closest to earning.

### 9.1 Response Shape
```jsonc
"badge_preview": {
  "badge_id": 30,
  "name": "3-week streak",
  "description": "Complete at least 3 workouts per week for 3 weeks.",
  "progress_pct": 85,
  "workouts_left": 1
}
```

### 9.2 Data & Logic
- **Sources**: `Badge`, `UserBadge`, streak/progress calculators.
- Exclude already earned badges; compute progress for candidates and choose the highest.
- `badge_preview` may be `null` if there are no configured badges.

---

## 10. Related Domain Endpoints (rough map)

The Dashboard summary endpoint composes data from these domain APIs (v1 draft paths):

- **Plans / UserPlan**  
  - `GET /api/v1/plans/active/` 
  - `GET /api/v1/plans/{plan_id}/` (for structure: weeks/days/templates)

- **Workouts**  
  - `GET /api/v1/workouts/active/`  
  - `GET /api/v1/workouts/recent/?limit=3`  
  - `GET /api/v1/workouts/calendar/?from=&to=`  
  - `GET /api/v1/workouts/summary/?range=week`

- **Quick Workouts**  
  - `GET /api/v1/quick-workouts/?context=travel,after_office`

- **Badges / Milestones**  
  - `GET /api/v1/badges/next/`  
  - `GET /api/v1/badges/mine/`

- **Insights / AI**  
  - `GET /api/v1/insights/goal-estimate/`  
  - `GET /api/v1/insights/readiness/`

`GET /api/v1/dashboard/summary/` may call these internally (or use services built on top of them) but exposes **one merged response** to the client.

---

## 11. Non‑Functional Notes

- All Dashboard endpoints require authentication.
- Target backend latency for `/dashboard/summary` < 300 ms; cache non‑critical parts if needed.
- Date and week calculations must respect user timezone (from profile or `timezone` param).
- Endpoint is versioned under `/api/v1/`; breaking changes should use a new version path.
