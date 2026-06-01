from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from workouts.models import WorkoutSession
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
		self.assertIn("training_profile", metrics)

		fitness_age = metrics["fitness_age"]
		race = metrics["race_readiness"]
		percentile = metrics["percentile_rank"]

		self.assertTrue(fitness_age.get("available"))
		self.assertIsNotNone(fitness_age.get("fitness_age_years"))

		self.assertTrue(race.get("available"))
		self.assertIsNotNone(race.get("score"))

		self.assertTrue(percentile.get("available"))
		self.assertIsNotNone(percentile.get("percentile"))

		training_profile = metrics["training_profile"]
		self.assertTrue(training_profile.get("available"))
		self.assertIn("level", training_profile)
		self.assertIn("body_focus", training_profile)
		self.assertIn("category_levels", training_profile)
		self.assertIn("comparison_metrics", training_profile)
		self.assertEqual(
			{item["metric_type"] for item in training_profile["body_focus"]},
			{"body_part"},
		)
		self.assertNotIn(
			"cardio",
			{item["key"] for item in training_profile["body_focus"]},
		)
		self.assertEqual(
			{item["metric_type"] for item in training_profile["category_levels"]},
			{"training_category"},
		)
		self.assertGreaterEqual(
			len(training_profile["comparison_metrics"].get("metrics", [])),
			1,
		)

	def test_fitness_age_has_profile_activity_estimate_without_assessment(self) -> None:
		WorkoutSession.objects.create(
			user=self.user,
			status="completed",
			completed_at=timezone.now(),
			duration_minutes=45,
			title="Starter Session",
			workout_type="strength",
			entry_source="manual",
		)
		self.client.force_authenticate(self.user)

		response = self.client.get("/api/v1/dashboard/summary/")

		self.assertEqual(response.status_code, 200)
		metrics = response.json()["metrics"]
		fitness_age = metrics["fitness_age"]
		percentile = metrics["percentile_rank"]
		self.assertTrue(fitness_age.get("available"))
		self.assertEqual(fitness_age["detail"].get("source"), "profile_activity_estimate")
		self.assertEqual(percentile["detail"].get("source"), "profile_activity_estimate")
		self.assertIsNotNone(fitness_age.get("fitness_age_years"))
		self.assertIsNotNone(percentile.get("percentile"))
