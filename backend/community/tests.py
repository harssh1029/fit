from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from workouts.models import WorkoutSession
from workouts.services import log_workout

from .models import ActivityLike, CommunityActivity, CommunityGroup, GroupMembership, UserFollow


class CommunityApiTests(APITestCase):
	def setUp(self) -> None:
		User = get_user_model()
		self.user = User.objects.create_user(
			username="community-user",
			email="community@example.com",
			password="testpass123",
		)
		self.other = User.objects.create_user(
			username="other-user",
			email="other@example.com",
			password="testpass123",
		)

	def test_activity_like_counts_are_serialized(self) -> None:
		log_workout(
			self.user,
			{
				"title": "Feed Workout",
				"entry_source": "manual",
				"mode": "strength",
				"duration_minutes": 30,
				"intensity": "moderate",
			},
		)
		self.client.force_authenticate(self.user)
		response = self.client.get("/api/v1/community/activity/")
		self.assertEqual(response.status_code, 200)
		activity_id = response.json()[0]["id"]

		like_response = self.client.post(f"/api/v1/community/activity/{activity_id}/like/")
		self.assertEqual(like_response.status_code, 200)
		self.assertTrue(ActivityLike.objects.filter(activity_id=activity_id, user=self.user).exists())

		response = self.client.get("/api/v1/community/activity/")
		self.assertEqual(response.status_code, 200)
		item = response.json()[0]
		self.assertTrue(item["likedByMe"])
		self.assertEqual(item["likesCount"], 1)

	def test_group_admin_required_to_remove_members(self) -> None:
		group = CommunityGroup.objects.create(name="Private Squad", owner=self.user, privacy="private")
		GroupMembership.objects.create(
			group=group,
			user=self.user,
			role=GroupMembership.ROLE_ADMIN,
			status=GroupMembership.STATUS_ACTIVE,
		)
		GroupMembership.objects.create(
			group=group,
			user=self.other,
			role=GroupMembership.ROLE_MEMBER,
			status=GroupMembership.STATUS_ACTIVE,
		)

		self.client.force_authenticate(self.other)
		response = self.client.post(
			f"/api/v1/community/groups/{group.id}/remove-member/",
			{"user_id": self.user.id},
			format="json",
		)
		self.assertEqual(response.status_code, 403)

	def test_today_activity_requires_auth(self) -> None:
		response = self.client.get("/api/v1/community/today-activity/")
		self.assertEqual(response.status_code, 401)

	def test_today_activity_only_includes_followed_users_today(self) -> None:
		third = get_user_model().objects.create_user(
			username="not-followed",
			email="not-followed@example.com",
			password="testpass123",
		)
		UserFollow.objects.create(follower=self.user, following=self.other)
		log_workout(
			self.other,
			{
				"title": "Pull Day",
				"entry_source": "manual",
				"mode": "strength",
				"duration_minutes": 30,
				"intensity": "hard",
				"focus_label": "Upper Body",
			},
		)
		log_workout(
			third,
			{
				"title": "Leg Day",
				"entry_source": "manual",
				"mode": "strength",
				"duration_minutes": 30,
				"intensity": "moderate",
			},
		)
		CommunityActivity.objects.create(
			user=self.other,
			activity_type=CommunityActivity.ACTIVITY_WORKOUT,
			title="Yesterday Workout",
			occurred_at=timezone.now() - timedelta(days=1),
		)

		self.client.force_authenticate(self.user)
		response = self.client.get("/api/v1/community/today-activity/")
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(len(payload), 1)
		self.assertEqual(payload[0]["user"]["id"], self.other.id)
		self.assertEqual(payload[0]["type"], "workout_completed")
		self.assertEqual(payload[0]["title"], "Pull Day")
		self.assertIn("Upper Body", payload[0]["subtitle"])
		self.assertFalse(payload[0]["is_live"])
		self.assertIsNone(payload[0]["live_duration_seconds"])

	def test_today_activity_live_workout_has_higher_priority(self) -> None:
		UserFollow.objects.create(follower=self.user, following=self.other)
		log_workout(
			self.other,
			{
				"title": "Completed Session",
				"entry_source": "manual",
				"mode": "strength",
				"duration_minutes": 30,
				"intensity": "moderate",
			},
		)
		WorkoutSession.objects.create(
			user=self.other,
			status="in_progress",
			title="Live Pull Day",
			workout_type="strength",
			focus_label="Upper Body",
			is_public=True,
		)

		self.client.force_authenticate(self.user)
		response = self.client.get("/api/v1/community/today-activity/")
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertGreaterEqual(len(payload), 2)
		self.assertEqual(payload[0]["type"], "workout_started")
		self.assertTrue(payload[0]["is_live"])
		self.assertGreater(payload[0]["priority_score"], payload[1]["priority_score"])
