from datetime import timedelta
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from achievements.services import ensure_badge_catalog
from community.models import CommunityActivity
from plans.models import Plan, PlanDay, PlanWeek, UserPlan, UserScheduledWorkout
from .models import WorkoutSession
from .services import log_workout


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


class WorkoutScoringTests(APITestCase):
	def setUp(self) -> None:
		User = get_user_model()
		self.user = User.objects.create_user(
			username="score-user",
			email="score@example.com",
			password="testpass123",
		)
		self.plan = Plan.objects.create(
			id="score-plan",
			name="Score Plan",
			level="beginner",
			duration_weeks=1,
			goal="Goal",
			summary="Summary",
			audience="Everyone",
			result="Result",
			sessions_per_week=3,
		)
		self.week = PlanWeek.objects.create(
			plan=self.plan,
			number=1,
			title="Week 1",
			focus="Focus",
			highlights=[],
		)
		self.plan_day = PlanDay.objects.create(
			plan_week=self.week,
			day_index=1,
			title="Upper Strength",
			description="",
			duration="45 min",
			duration_minutes=45,
			day_type="strength",
			intensity="hard",
			primary_focus="Upper Body",
		)
		self.user_plan = UserPlan.objects.create(
			user=self.user,
			plan=self.plan,
			is_active=True,
			status="active",
			started_at=timezone.now(),
			total_sessions=1,
		)
		self.scheduled_workout = UserScheduledWorkout.objects.create(
			user_plan=self.user_plan,
			plan_day=self.plan_day,
			week_number=1,
			day_index=1,
			scheduled_date=timezone.localdate(),
			original_scheduled_date=timezone.localdate(),
			status="scheduled",
			order_index=1,
		)
		ensure_badge_catalog()

	def test_recorded_pull_workout_scores_prompt_example(self) -> None:
		result = log_workout(
			self.user,
			{
				"title": "Pull Workout",
				"entry_source": "recorded_timer",
				"trust_level": "recorded_timer",
				"mode": "strength",
				"duration_minutes": 50,
				"intensity": "hard",
				"body_groups": ["back"],
				"muscles": ["Lats", "Trapezius", "Biceps", "Forearms"],
				"exercises": [{"name": "Pull-up", "volume": "4x6", "pr": False}],
			},
		)
		self.assertEqual(result.score.activity_xp, 109)

	def test_manual_workout_scores_prompt_example(self) -> None:
		result = log_workout(
			self.user,
			{
				"title": "Manual Strength",
				"entry_source": "manual",
				"mode": "strength",
				"duration_minutes": 50,
				"intensity": "hard",
				"exercises": [{"name": "Bench press", "volume": "3x8", "pr": False}],
			},
		)
		self.assertEqual(result.score.activity_xp, 70)

	def test_third_same_day_workout_is_reduced(self) -> None:
		for index in range(3):
			result = log_workout(
				self.user,
				{
					"title": f"Session {index}",
					"entry_source": "recorded_timer",
					"mode": "cardio" if index == 2 else "strength",
					"duration_minutes": 30,
					"intensity": "moderate",
				},
			)
		self.assertLess(result.score.activity_xp, 40)

	def test_recorded_plan_workout_completes_scheduled_workout_and_feed_card(self) -> None:
		result = log_workout(
			self.user,
			{
				"title": "Upper Strength",
				"entry_source": "plan_workout",
				"scheduled_workout_id": self.scheduled_workout.id,
				"user_plan_id": self.user_plan.id,
				"plan_id": self.plan.id,
				"plan_day_id": self.plan_day.id,
				"planned_week_number": 1,
				"planned_day_key": "1",
				"mode": "strength",
				"duration_minutes": 45,
				"recorded_seconds": 2700,
				"intensity": "hard",
				"focus_label": "Upper Body",
				"body_groups": ["chest", "back"],
				"muscles": ["Chest", "Lats"],
			},
		)
		self.scheduled_workout.refresh_from_db()
		self.user_plan.refresh_from_db()
		self.assertEqual(self.scheduled_workout.status, "completed")
		self.assertEqual(self.user_plan.completed_sessions, 1)
		self.assertEqual(result.session.plan_id, self.plan.id)
		self.assertEqual(result.session.user_plan_id, self.user_plan.id)
		self.assertEqual(result.session.entry_source, "plan_workout")
		self.assertEqual(result.summary["summary"]["plan_name"], self.plan.name)
		self.assertFalse(
			CommunityActivity.objects.filter(
				user=self.user,
				activity_type=CommunityActivity.ACTIVITY_BADGE,
			).exists()
		)
		activity = CommunityActivity.objects.get(
			user=self.user,
			activity_type=CommunityActivity.ACTIVITY_WORKOUT,
			title="Upper Strength",
		)
		self.assertTrue(
			any(badge.get("id") == "plan_finisher" for badge in activity.metadata.get("earned_badges", []))
		)

	def test_workout_badge_unlock_merges_into_workout_activity(self) -> None:
		now = timezone.now()
		workouts = [
			("Upper", "strength", ["chest"]),
			("Lower", "strength", ["legs"]),
			("Core", "strength", ["core"]),
			("Conditioning", "conditioning", []),
		]
		for index, (title, mode, groups) in enumerate(workouts):
			log_workout(
				self.user,
				{
					"title": title,
					"entry_source": "recorded_timer",
					"mode": mode,
					"duration_minutes": 30,
					"intensity": "moderate",
					"body_groups": groups,
				},
				as_of=now + timedelta(days=index),
			)

		self.assertEqual(
			CommunityActivity.objects.filter(
				user=self.user,
				activity_type=CommunityActivity.ACTIVITY_BADGE,
			).count(),
			0,
		)
		activity = CommunityActivity.objects.filter(
			user=self.user,
			activity_type=CommunityActivity.ACTIVITY_WORKOUT,
			title="Conditioning",
		).first()
		self.assertIsNotNone(activity)
		badges = activity.metadata.get("earned_badges") if activity else []
		self.assertTrue(any(badge.get("id") == "balanced_athlete" for badge in badges))

	def test_workout_image_upload_and_log_persists_image_url(self) -> None:
		unauth_response = self.client.post(
			"/api/v1/workouts/images/",
			{"image": SimpleUploadedFile("blocked.jpg", b"image", content_type="image/jpeg")},
			format="multipart",
		)
		self.assertEqual(unauth_response.status_code, 401)

		self.client.force_authenticate(self.user)
		image = SimpleUploadedFile(
			"workout.jpg",
			b"\xff\xd8\xff\xe0" + b"0" * 128,
			content_type="image/jpeg",
		)
		with TemporaryDirectory() as media_root:
			with override_settings(MEDIA_ROOT=media_root):
				upload_response = self.client.post("/api/v1/workouts/images/", {"image": image}, format="multipart")
				self.assertEqual(upload_response.status_code, 201)
				image_url = upload_response.json()["image_url"]
				self.assertIn("/media/workout_images/user_", image_url)

				log_response = self.client.post(
					"/api/v1/workouts/log/",
					{
						"title": "Workout With Image",
						"entry_source": "recorded_timer",
						"mode": "strength",
						"duration_minutes": 25,
						"intensity": "moderate",
						"body_groups": ["chest"],
						"image_url": image_url,
						"image_urls": [image_url],
					},
					format="json",
				)
				self.assertEqual(log_response.status_code, 201)
				session = WorkoutSession.objects.get(id=log_response.json()["workout_session_id"])
				self.assertEqual(session.image_url, image_url)
				activity = CommunityActivity.objects.get(
					user=self.user,
					activity_type=CommunityActivity.ACTIVITY_WORKOUT,
					title="Workout With Image",
				)
				self.assertEqual(activity.metadata.get("image_url"), image_url)
				self.assertEqual(activity.metadata.get("image_urls"), [image_url])
