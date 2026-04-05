# Django Admin Access Guide

## Create a Superuser Account

If you haven't created an admin account yet, follow these steps:

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Activate Virtual Environment (if applicable)
```bash
source venv/bin/activate
```

### Step 3: Create Superuser
```bash
python manage.py createsuperuser
```

You'll be prompted for:
- **Username:** Choose any username (e.g., `admin`, `yourusername`)
- **Email address:** Your email (optional, can be left blank)
- **Password:** Choose a strong password
- **Password (again):** Confirm your password

**Example:**
```
Username: admin
Email address: admin@example.com
Password: ********
Password (again): ********
Superuser created successfully.
```

---

## Access Django Admin

### Step 1: Start the Django Server
```bash
cd backend
python manage.py runserver
```

You should see:
```
Starting development server at http://127.0.0.1:8000/
```

### Step 2: Open Admin in Browser
Navigate to:
```
http://localhost:8000/admin/
```

### Step 3: Login
Use the username and password you created above.

---

## What You'll See in Admin

Once logged in, you'll see these sections:

### 📋 **Accounts**
- **Profiles:** User profile data (display name, height, weight, timezone, active plan)
- **Users:** Django user accounts

### 🏋️ **Exercises**
- **Exercises:** Exercise library with details
- **Muscles:** Muscle groups

### 📅 **Plans**
- **Plans:** Training plans (you should see "Hyrox Intense" here)
- **Plan weeks:** Individual weeks within plans
- **Plan days:** Individual days with workouts, nutrition, supplements

---

## Managing Plans in Admin

### View the Hyrox Intense Plan

1. Click on **Plans** under the Plans section
2. You'll see the seeded plan: **Hyrox Intense**
3. Click on it to edit

### Plan Details You Can Edit:
- ID (slug)
- Name
- Level (beginner/intermediate/advanced)
- Duration (weeks)
- Sessions per week
- Goal, Summary, Audience, Result

### Viewing Weeks
- Click on **Plan weeks** to see all weeks
- Filter by plan to see only Hyrox weeks
- Edit titles, focus areas, and highlights

### Viewing Days
- Click on **Plan days** to see all days
- Each day has:
  - Day index (1-21 for Hyrox)
  - Title (e.g., "Full Body Strength")
  - Duration (e.g., "60m")
  - Day type (strength/cardio/recovery)
  - **Nutrition JSON** (meal plan for the day)
  - **Supplements JSON** (supplement schedule)

---

## Linking a Plan to Your User Profile

### Option 1: Via Admin UI
1. Go to **Accounts > Profiles**
2. Find your user's profile
3. Edit it
4. In the **Active plan** dropdown, select "Hyrox Intense"
5. Click **Save**

### Option 2: Via API (Mobile App)
```bash
curl -X PATCH http://localhost:8000/api/v1/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active_plan_id": "hyrox_intense_3wk"}'
```

---

## Troubleshooting

### Can't Login?
- **Forgot password?** Run: `python manage.py changepassword <username>`
- **Account doesn't exist?** Create one: `python manage.py createsuperuser`

### Server Not Running?
```bash
cd backend
python manage.py runserver
```

### Database Missing?
```bash
cd backend
python manage.py migrate
```

---

## Security Note

⚠️ **Never commit your superuser credentials to version control!**

The superuser account has full access to the database. In production, use strong passwords and enable additional security measures.

---

✅ You're all set to manage plans via Django Admin!

