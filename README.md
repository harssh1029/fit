# FIT – Full‑Body Training Dashboard & Body Battle Map

FIT is a full‑body training OS that turns your raw workouts into a **fitness age**, a **body balance score**, and an interactive **Body Battle Map**. It is designed as a prototype suitable for YC and design‑driven events like Vibecon: opinionated, visual, and easy to demo live.

---

## 1. Product Vision

Most fitness apps either track workouts like a spreadsheet or throw generic plans at everyone.

**FIT’s bet:** if you can _see_ how your body is being trained – across time, intensity, and muscle balance – you will train more consistently and more intelligently.

We do this by:

- Collapsing training into a small set of **narrative metrics** (fitness age, race readiness, percentile, streak, time invested).
- Visualizing muscle balance with the **Body Battle Map** instead of raw logs.
- Making your week feel **planned and finite** through a training‑day calendar.

Screenshots of the current prototype live in:

- `mobile/assets/ss/` – home dashboard, metrics, body map, and exercise library views.

---

## 2. Features & Core User Flows

### 2.1 Home – “Ready to train?”

The home screen is the daily decision engine:

- Greeting with **theme toggle** (dark / light) and avatar entry point.
- **Active workout card** (e.g. “Full Rest Day – 30 min · Recovery”) with a link to see all active workouts.
- **Training Days strip** – a 7‑day week anchored on **today**, with each day tagged as Strength, Run, Hybrid, or Rest.
- **Today metrics** – compact cards for fitness age, race readiness, percentile vs peers, streak, and time invested.

Goal: in one glance the user knows _what to do today_ and _why it matters_.

### 2.2 Exercise Library

The Exercise Library is both browser and search engine:

- Top search bar: **“Search exercises”**.
- Pill filters: **Muscles**, **Level**, **Mechanic**, **Force**.
- Rich exercise cards with:
  - Hero image (e.g. `3/4 sit‑up` for ABS).
  - Short coaching description.
  - Context buttons like **“Back to body map”**.

When launched from the body figure, the library is pre‑filtered to that region (“tap where you want to train”).

### 2.3 Body Map → Exercises

- Full‑screen body figure with **Front / Back** toggle.
- Tapping a muscle selects it and enables a **View Exercises** CTA.
- This bridges anatomy, education, and programming in a single interaction.

---

## 3. Metrics

### 3.1 Fitness Age

A single number answer to: **“How old is your body, really?”**

- Big circular gauge (e.g. **16 yrs**) with:
  - Actual age vs fitness age (e.g. “8 yrs younger”).
  - Explanation line: based on heart rate, strength, flexibility & endurance.
- CTA: **Retake test** to re‑baseline.

### 3.2 Race Readiness

Event‑focused readiness score:

- Large % value (e.g. **53%**) with a phase label like **“Building base”**.
- Decomposed into three bars:
  - **Plan** – quality / difficulty of the plan.
  - **Consistency** – adherence to scheduled work.
  - **Benchmarks** – performance in key tests.

### 3.3 Percentile vs Peers

Shows how the user compares to people like them:

- Headline like **“Fitter than 66%”**.
- Short verdict (“Above average”).
- Stylized curve to give a visual feel for the distribution.

### 3.4 Streak

Behavioral metric focused on habit:

- Current streak in days (e.g. **1 day**), best streak, and a momentum multiplier.
- Copy: **“Don’t break the chain.”**

### 3.5 Time Invested

Time is converted into a narrative:

- Total training time (e.g. **7 h 44 m**).
- 30‑day and 7‑day breakdowns.
- Friendly comparison like **“Like running Mumbai → Pune”** to make volume tangible.

---

## 4. Body Battle Map

The signature feature: a **visual balance score** for the whole body.

- Card shows a front body silhouette plus a legend of major groups:
  - Shoulders, Chest, Arms, Core, Back, Glutes, Legs.
- Each row has:
  - Colored dot (rank color), label, and rank text on the right (Recruit → Soldier → Warrior → Beast → Legend).
- Active group is highlighted with a soft pill background.

An info icon opens a tooltip that explains:

- How the **balance score (0–100)** is computed from completed sessions.
- Per‑group breakdown: sessions hit + rank.
- Plain‑language description of why balance matters.

---

## 5. Design & UX

High‑signal choices that make the app feel premium and demo‑ready:

- **Dark‑first visual language** with soft, rounded cards and clear hierarchy.
- **Typography** that speaks in plain language (e.g. “Ready to train?”) with compact but readable metric captions.
- **Bottom tab navigation** for Home, Calendar, Training, and Profile so key flows are always one tap away.
- **Stateful visuals**:
  - Active training day and active Body Battle group get subtle pill highlights.
  - Info icons open contextual explanations instead of cramming text into the cards.
- **Theme toggle** that flips the entire dashboard between dark and light without breaking contrast.

These choices are tuned specifically for showing the app on stage or in a YC interview: the screenshots tell the story even before you talk.

## 6. Architecture (High‑Level)

- **Mobile** – React Native + Expo (TypeScript)
  - Screens: home dashboard, training calendar, exercise library, body map.
  - SVG‑based body map with tap targets and single‑select highlighting.
- **Backend** – Django REST API
  - Authentication and user profile.
  - Exercises (with ExerciseDB integration).
  - Workouts, plans, history, and calendar.
  - Dashboard summary endpoint that computes all metrics and Body Battle groups.

The mobile app consumes a single **dashboard summary** payload so business logic lives primarily on the server.

---

## 7. Repository Layout

- `backend/` – Django project and REST API.
- `mobile/` – React Native / Expo app.
  - `assets/ss/` – product screenshots used for demos and pitch decks.
- `docs/` – API and product notes.

This prototype is already usable as a coaching tool and a visual demo. The natural next steps are adding longer‑term trends (multi‑month balance history) and lightweight AI coaching (“what is the smallest workout I should do today to improve balance without breaking recovery?”).
