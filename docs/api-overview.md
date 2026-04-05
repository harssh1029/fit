# API & Flow Overview

This document gives a **high-level picture** of how the main entities and APIs connect:

- Exercises
- WorkoutTemplates
- Plans & UserPlans
- WorkoutSessions
- Dashboard

Goal: someone can read this page and understand how data flows through the system without reading every detail doc.

---

## 1. Core Entities & Relationships

Conceptual hierarchy:

- **Exercise** – atomic movement (e.g. Barbell Bench Press).
- **WorkoutTemplate** – single workout made of one or more Exercises.
- **Plan** – multi-week program that schedules WorkoutTemplates by week/day.
- **UserPlan** – a user enrolled in a Plan, with status/progress.
- **WorkoutSession** – one concrete execution of a WorkoutTemplate by a user.

Relationship chain:

`Plan → PlanWeek/PlanDay → WorkoutTemplate → Exercise`

User data hangs off that chain via:

`User → UserPlan (which Plan) → WorkoutSession (what workouts have been done)`

---

## 2. High-level Request Flow (Dashboard example)

When the mobile app opens the Dashboard, it calls:

- `GET /api/v1/dashboard/summary/`

Internally, the Dashboard service will:

1. Load the user and active **UserPlan** (`GET /plans/active/` equivalent).
2. Resolve today’s plan day and **WorkoutTemplate** from the Plan structure.
3. Check for active or recent **WorkoutSessions**.
4. Query **workouts summary** for this week (counts, minutes trained).
5. Ask the **insights/AI** service for readiness / goal projections.
6. Ask the **badges** service for the next milestone preview.
7. Optionally query **quick workouts** suitable for the user.

It then returns a **single JSON** payload structured for the Dashboard UI.

---

## 3. Endpoint Map (v1 draft)

Base path: `/api/v1/`.

### 3.1 Exercises & Muscles

- `GET /exercises/`  
- `GET /exercises/{exercise_id}/`  
- `GET /muscles/`

Used by:
- Exercise Library screen.
- 3D/body selector.
- Analytics (via internal services reading from Exercise data).

### 3.2 Plans & User Plans

- `GET /plans/`  
- `GET /plans/{plan_id}/`  
- `GET /plans/active/`  
- `POST /plans/{plan_id}/enroll/`  
- `GET /user-plans/`

Used by:
- Plans screen (browse, enroll, switch).
- Dashboard Hero + weekly targets.

### 3.3 Workouts & History

- `POST /workouts/start/`  
- `POST /workouts/{session_id}/complete/`  
- `GET /workouts/active/`  
- `GET /workouts/recent/?limit=3`  
- `GET /workouts/history/?page=1&page_size=20`  
- `GET /workouts/calendar/?from=&to=`  
- `GET /workouts/summary/?range=week|month`

Used by:
- Workout execution flows.
- Dashboard recent activity, calendar, quick metrics.

### 3.4 Quick Workouts

- `GET /quick-workouts/?context=travel,after_office`  

Used by:
- Dashboard quick workout card.

### 3.5 Badges & Milestones

- `GET /badges/mine/`  
- `GET /badges/next/`

Used by:
- Achievements screen.
- Dashboard badge preview.

### 3.6 Insights / AI

- `GET /insights/goal-estimate/`  
- `GET /insights/readiness/`

Used by:
- Dashboard AI estimation card.
- Future insights screens.

### 3.7 Dashboard

- `GET /dashboard/summary/`

Used by:
- Dashboard (home) screen only. Aggregates data from all the above domains.

---

## 4. Text Diagram (Flow)

**Entities / ownership:**

- `exercises` app → owns Exercise + MuscleGroup
- `plans` app → owns Plan + PlanWeek + PlanDay + WorkoutTemplate
- `workouts` app → owns WorkoutSession + logged sets
- `badges` app → owns Badge + UserBadge
- `insights` app → owns derived metrics and AI estimations
- `dashboard` app → owns only the `/dashboard/summary/` read model

**Data flow (simplified):**

1. User enrolls in a Plan:
   - App calls `POST /plans/{plan_id}/enroll/` → creates/updates UserPlan.
2. User starts a workout:
   - App calls `POST /workouts/start/` with `workout_template_id` (from plan or quick workout).
3. User completes workout:
   - App calls `POST /workouts/{session_id}/complete/` with logged sets.
4. Dashboard refresh:
   - App calls `GET /dashboard/summary/`.
   - Dashboard service reads:
     - UserPlan (active plan, progress)
     - WorkoutSession (recent, weekly stats, calendar)
     - Plans / WorkoutTemplates (today’s workout description)
     - Exercises (indirectly via templates for analytics, if needed)
     - Badges (next milestone)
     - Insights (AI/readiness/goal estimates).

This shared understanding of entities and endpoints is the base for all per-page specs (Dashboard, Plans screen, Exercise Library, etc.).

