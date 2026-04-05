from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from plans.models import Plan, PlanDay, PlanWeek, UserPlan
from .models import WorkoutSession


class WorkoutHistoryViewTests(APITestCase):
	def setUp(self) -> None:
		User = get_user_model()
		self.user = User.objects.create_user(
			username="history-user",
			email="history@example.com",
			password="testpass123",
		)

		self.plan = Plan.objects.create(
			id="test-plan",
			name="Test Plan",
			level="beginner",
			duration_weeks=1,
			goal="Goal",
			summary="Summary",
			audience="Everyone",
			result="Result",
			sessions_per_week=3,
		)
		self.week1 = PlanWeek.objects.create(
			plan=self.plan,
			number=1,
			title="Week 1",
			focus="Focus",
			highlights=[],
		)
		self.day1 = PlanDay.objects.create(
			plan_week=self.week1,
			day_index=1,
			title="Day 1 Strength",
			description="",
			duration="45 min",
			day_type="strength",
			workout_template_id="w1_d1",
		)
		self.day2 = PlanDay.objects.create(
			plan_week=self.week1,
			day_index=2,
			title="Day 2 Cardio",
			description="",
			duration="30 min",
			day_type="cardio",
			workout_template_id="w1_d2",
		)

		# User started the plan 3 days ago so both day 1 and day 2 are in the past.
		start = timezone.now().date() - timedelta(days=3)
		started_at = timezone.make_aware(
			timezone.datetime.combine(start, timezone.datetime.min.time()),
			timezone.get_current_timezone(),
		)
		self.user_plan = UserPlan.objects.create(
			user=self.user,
			plan=self.plan,
			is_active=True,
			status="active",
			started_at=started_at,
		)

		# Create a completed session for day 1 only.
		completed_at = timezone.now() - timedelta(days=2)
		WorkoutSession.objects.create(
			user=self.user,
			plan=self.plan,
			user_plan=self.user_plan,
			status="completed",
			completed_at=completed_at,
			planned_week_number=self.week1.number,
			planned_day_key=str(self.day1.day_index),
		)

	def test_history_requires_authentication(self) -> None:
		url = "/api/v1/workouts/history/"
		response = self.client.get(url)
		self.assertEqual(response.status_code, 401)

	def test_history_returns_completed_and_missed_days(self) -> None:
		self.client.force_authenticate(self.user)
		url = "/api/v1/workouts/history/?limit=10"
		response = self.client.get(url)
		self.assertEqual(response.status_code, 200)
		data = response.json()
		self.assertIn("results", data)
		results = data["results"]
		# At least two entries: one completed (day 1) and one missed (day 2).
		self.assertGreaterEqual(len(results), 2)

		statuses_by_title = {item["title"]: item["status"] for item in results}
		self.assertEqual(statuses_by_title.get("Day 1 Strength"), "completed")
		self.assertEqual(statuses_by_title.get("Day 2 Cardio"), "missed")

