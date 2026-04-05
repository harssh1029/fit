from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import FitnessAssessment, RaceBenchmark


class DashboardSummaryViewTests(APITestCase):
	def setUp(self) -> None:
		User = get_user_model()
		self.user = User.objects.create_user(
			username="metrics-user",
			email="metrics@example.com",
			password="testpass123",
		)

	def _seed_basic_metrics(self) -> None:
		"""Create minimal assessment/benchmark data so insights can compute."""

		FitnessAssessment.objects.create(
			user=self.user,
			age_years=30,
			gender="male",
			height_cm=180,
			weight_kg=80,
			waist_cm=85,
			resting_heart_rate=60,
			max_pushups=30,
			max_run_minutes=30,
			can_touch_toes="yes",
			sleep_hours=7.0,
			source="test",
		)

		RaceBenchmark.objects.create(
			user=self.user,
			run_1km_seconds=300,
			wall_balls_unbroken=40,
			sled_difficulty=3,
			energy_level=4,
			is_initial=True,
		)

	def test_dashboard_summary_requires_authentication(self) -> None:
		url = "/api/v1/dashboard/summary/"
		response = self.client.get(url)
		self.assertEqual(response.status_code, 401)

	def test_dashboard_summary_returns_quick_metrics(self) -> None:
		self._seed_basic_metrics()
		self.client.force_authenticate(self.user)

		url = "/api/v1/dashboard/summary/"
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		data = response.json()
		self.assertIn("metrics", data)

		metrics = data["metrics"]
		self.assertIn("fitness_age", metrics)
		self.assertIn("race_readiness", metrics)
		self.assertIn("percentile_rank", metrics)

		fitness_age = metrics["fitness_age"]
		race = metrics["race_readiness"]
		percentile = metrics["percentile_rank"]

		self.assertTrue(fitness_age.get("available"))
		self.assertIsNotNone(fitness_age.get("fitness_age_years"))

		self.assertTrue(race.get("available"))
		self.assertIsNotNone(race.get("score"))

		self.assertTrue(percentile.get("available"))
		self.assertIsNotNone(percentile.get("percentile"))

