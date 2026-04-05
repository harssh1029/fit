# Plans Backend & Frontend Integration - COMPLETE ✅

## Summary

The backend and frontend are now fully aligned for the Plans feature. Users can:
- View all available training plans from the database
- See their active plan highlighted
- View detailed plan information including weeks and days
- All data comes from the Django REST API (no more static data)

---

## Backend Endpoints

### 1. **List All Plans**
```
GET /api/v1/plans/
```
Returns all plans with weeks and days nested.

**Response:**
```json
[
  {
    "id": "hyrox_intense_3wk",
    "name": "Hyrox Intense",
    "level": "advanced",
    "duration_weeks": 3,
    "goal": "Peak performance for Hyrox competition",
    "summary": "7 sessions per week...",
    "audience": "Advanced athletes...",
    "result": "Competition-ready fitness...",
    "sessions_per_week": 7,
    "weeks": [
      {
        "id": 1,
        "number": 1,
        "title": "Foundation & Assessment",
        "focus": "Establish baseline fitness...",
        "highlights": ["..."],
        "days": [
          {
            "id": 1,
            "day_index": 1,
            "title": "Full Body Strength",
            "description": "...",
            "duration": "60m",
            "day_type": "strength",
            "nutrition": {...},
            "supplements": {...}
          }
        ]
      }
    ]
  }
]
```

### 2. **Get Plan Details**
```
GET /api/v1/plans/{planId}/
```
Returns a single plan with full nested data.

### 3. **User Profile (with active_plan_id)**
```
GET /api/v1/me/
```
Returns user profile including which plan is active.

**Response:**
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "profile": {
    "display_name": "Test User",
    "height_cm": null,
    "weight_kg": null,
    "timezone": "UTC",
    "active_plan_id": "hyrox_intense_3wk"
  }
}
```

### 4. **Update Active Plan**
```
PATCH /api/v1/me/
```
**Request Body:**
```json
{
  "active_plan_id": "hyrox_intense_3wk"
}
```

---

## Frontend Changes

### PlansScreen
- **Before:** Used `SAMPLE_PLANS` static data
- **After:** Calls `usePlans()` hook to fetch from `/api/v1/plans/`
- Shows loading spinner while fetching
- Displays error if API fails
- Highlights user's active plan (from `profile.active_plan_id`)
- Maps over real plans to display `PlanCard` components

### PlanDetailScreenV2
- **Before:** Used `PLAN_DETAIL_WEEKS` static data
- **After:** Calls `usePlanDetail(planId)` to fetch from `/api/v1/plans/{planId}/`
- Shows loading/error states
- Renders weeks and days from the API response
- Fully dynamic based on database content

---

## How to Test

### 1. Start Backend Server
```bash
cd backend
source venv/bin/activate  # if using virtual environment
python manage.py runserver
```

### 2. Access Django Admin
```
http://localhost:8000/admin/
```
- **Create superuser** (if not done):
  ```bash
  python manage.py createsuperuser
  ```
- Login and navigate to **Plans** section
- You should see "Hyrox Intense" plan with 3 weeks and 21 days

### 3. Test API Endpoints
```bash
# List all plans
curl http://localhost:8000/api/v1/plans/

# Get specific plan
curl http://localhost:8000/api/v1/plans/hyrox_intense_3wk/

# Get user profile (requires authentication)
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8000/api/v1/me/
```

### 4. Run Mobile App
```bash
cd mobile
npm start
# or expo start
```
- Navigate to **Plans** tab
- You should see the Hyrox Intense plan loaded from the API
- Click to view details - all weeks/days come from database

---

## Database Seeded Data

The migration `0002_seed_hyrox_intense.py` has already created:
- 1 Plan: "Hyrox Intense" (3 weeks, 7 sessions/week, advanced)
- 3 Weeks with titles, focus areas, and highlights
- 21 Days with full nutrition and supplement data for Week 1

---

## Next Steps (Optional)

1. **Implement Plan Switching:** Add UI button to PATCH `/api/v1/me/` with new `active_plan_id`
2. **Add More Plans:** Create additional plans in Django admin or via migration
3. **Track Progress:** Add completion tracking for days/weeks
4. **Nutrition Details:** Link nutrition data to separate screens

---

✅ **Backend and Frontend are fully aligned and working with live API data!**

