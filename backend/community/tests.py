from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from workouts.models import WorkoutSession
from workouts.services import log_workout, score_completed_workout

from .models import (
	ActivityComment,
	ActivityLike,
	ActivitySave,
	CommunityActivity,
	CommunityGroup,
	GroupChallenge,
	GroupChallengeProgress,
	GroupMembership,
	UserFollow,
)
from .services import materialize_challenge_activity


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

	def test_challenge_activity_materializer_collapses_duplicate_sources(self) -> None:
		source_id = "challenge:T01"
		for index in range(2):
			CommunityActivity.objects.create(
				user=self.user,
				activity_type=CommunityActivity.ACTIVITY_CHALLENGE,
				title=f"Old challenge post {index}",
				metadata={"source_id": source_id, "preserved": True},
				occurred_at=timezone.now() - timedelta(minutes=index),
			)

		activity = materialize_challenge_activity(
			self.user,
			source_id=source_id,
			title="Completed Test Challenge",
			metadata={"event_type": "challenge_completed"},
		)

		self.assertEqual(
			CommunityActivity.objects.filter(
				user=self.user,
				activity_type=CommunityActivity.ACTIVITY_CHALLENGE,
				metadata__source_id=source_id,
			).count(),
			1,
		)
		self.assertEqual(activity.title, "Completed Test Challenge")
		self.assertTrue(activity.metadata["preserved"])

	def test_activity_comment_owner_can_edit_and_delete(self) -> None:
		result = log_workout(
			self.user,
			{
				"title": "Commented Workout",
				"entry_source": "manual",
				"mode": "strength",
				"duration_minutes": 30,
				"intensity": "moderate",
			},
		)
		activity = CommunityActivity.objects.get(metadata__source_id=f"workout:{result.session.id}")
		comment = ActivityComment.objects.create(activity=activity, user=self.user, body="Nice")
		UserFollow.objects.create(follower=self.other, following=self.user)

		self.client.force_authenticate(self.other)
		forbidden = self.client.patch(
			f"/api/v1/community/activity/{activity.id}/comments/{comment.id}/",
			{"body": "Changed"},
			format="json",
		)
		self.assertEqual(forbidden.status_code, 403)

		self.client.force_authenticate(self.user)
		updated = self.client.patch(
			f"/api/v1/community/activity/{activity.id}/comments/{comment.id}/",
			{"body": "Updated"},
			format="json",
		)
		self.assertEqual(updated.status_code, 200)
		self.assertEqual(updated.json()["body"], "Updated")
		deleted = self.client.delete(f"/api/v1/community/activity/{activity.id}/comments/{comment.id}/")
		self.assertEqual(deleted.status_code, 204)
		self.assertFalse(ActivityComment.objects.filter(id=comment.id).exists())

	def test_activity_save_is_idempotent_and_lists_saved_posts(self) -> None:
		UserFollow.objects.create(follower=self.user, following=self.other)
		result = log_workout(
			self.other,
			{
				"title": "Saved Pull Day",
				"entry_source": "manual",
				"mode": "strength",
				"duration_minutes": 35,
				"intensity": "hard",
			},
		)
		activity = CommunityActivity.objects.get(metadata__source_id=f"workout:{result.session.id}")
		self.client.force_authenticate(self.user)

		for _ in range(2):
			response = self.client.post(f"/api/v1/community/activity/{activity.id}/save/")
			self.assertEqual(response.status_code, 200)
			self.assertTrue(response.json()["saved"])
		self.assertEqual(ActivitySave.objects.filter(activity=activity, user=self.user).count(), 1)

		feed = self.client.get("/api/v1/community/activity/")
		self.assertEqual(feed.status_code, 200)
		self.assertTrue(feed.json()[0]["savedByMe"])

		saved = self.client.get("/api/v1/community/saved/?limit=1")
		self.assertEqual(saved.status_code, 200)
		self.assertEqual(saved.json()["results"][0]["id"], activity.id)
		self.assertTrue(saved.json()["results"][0]["savedByMe"])
		self.assertIsNone(saved.json()["nextCursor"])

		response = self.client.delete(f"/api/v1/community/activity/{activity.id}/save/")
		self.assertEqual(response.status_code, 200)
		self.assertFalse(response.json()["saved"])
		self.assertFalse(ActivitySave.objects.filter(activity=activity, user=self.user).exists())

	def test_feed_includes_followed_and_shared_group_activity_without_leaking_private_groups(self) -> None:
		third = get_user_model().objects.create_user(
			username="group-only-user",
			email="group-only@example.com",
			password="testpass123",
		)
		UserFollow.objects.create(follower=self.user, following=self.other)
		followed_activity = CommunityActivity.objects.create(
			user=self.other,
			activity_type=CommunityActivity.ACTIVITY_WORKOUT,
			title="Followed workout",
			occurred_at=timezone.now(),
		)
		group = CommunityGroup.objects.create(name="Shared private group", owner=third, privacy="private")
		GroupMembership.objects.create(group=group, user=self.user, status=GroupMembership.STATUS_ACTIVE)
		GroupMembership.objects.create(group=group, user=third, status=GroupMembership.STATUS_ACTIVE)
		group_activity = CommunityActivity.objects.create(
			user=third,
			activity_type=CommunityActivity.ACTIVITY_GROUP,
			title="Shared group note",
			metadata={"group_id": group.id},
			occurred_at=timezone.now(),
		)
		hidden_group = CommunityGroup.objects.create(name="Hidden group", owner=third, privacy="private")
		hidden_activity = CommunityActivity.objects.create(
			user=third,
			activity_type=CommunityActivity.ACTIVITY_GROUP,
			title="Hidden note",
			metadata={"group_id": hidden_group.id},
			occurred_at=timezone.now(),
		)

		self.client.force_authenticate(self.user)
		response = self.client.get("/api/v1/community/activity/")
		self.assertEqual(response.status_code, 200)
		ids = {item["id"] for item in response.json()}
		self.assertIn(followed_activity.id, ids)
		self.assertIn(group_activity.id, ids)
		self.assertNotIn(hidden_activity.id, ids)

	def test_group_challenge_progress_is_completed_and_idempotent(self) -> None:
		group = CommunityGroup.objects.create(name="Challenge Crew", owner=self.user)
		GroupMembership.objects.create(
			group=group,
			user=self.user,
			role=GroupMembership.ROLE_MEMBER,
			status=GroupMembership.STATUS_ACTIVE,
		)
		today = timezone.localdate()
		challenge = GroupChallenge.objects.create(
			group=group,
			created_by=self.user,
			title="Upper Body Push",
			eligible_workout_types=["strength"],
			eligible_body_parts=["upper_body"],
			min_duration=10,
			max_daily_entries=1,
			required_sessions=1,
			completion_bonus=25,
			start_date=today - timedelta(days=1),
			end_date=today + timedelta(days=7),
		)
		result = log_workout(
			self.user,
			{
				"title": "Upper Challenge Workout",
				"entry_source": "recorded_timer",
				"mode": "strength",
				"duration_minutes": 30,
				"intensity": "moderate",
				"body_groups": ["chest"],
			},
		)

		progress = GroupChallengeProgress.objects.get(challenge=challenge, user=self.user)
		self.assertEqual(progress.qualifying_workout_ids, [result.session.id])
		self.assertEqual(progress.recorded_workouts, 1)
		self.assertEqual(progress.manual_logs, 0)
		self.assertIsNotNone(progress.completed_at)
		points = progress.points
		self.assertTrue(
			CommunityActivity.objects.filter(
				user=self.user,
				activity_type=CommunityActivity.ACTIVITY_CHALLENGE,
				metadata__source_id=f"group_challenge:{challenge.id}:{self.user.id}",
			).exists()
		)

		score_completed_workout(result.session, as_of=result.session.completed_at)
		progress.refresh_from_db()
		self.assertEqual(progress.qualifying_workout_ids, [result.session.id])
		self.assertEqual(progress.recorded_workouts, 1)
		self.assertEqual(progress.points, points)
		self.assertEqual(
			CommunityActivity.objects.filter(
				user=self.user,
				activity_type=CommunityActivity.ACTIVITY_CHALLENGE,
				metadata__source_id=f"group_challenge:{challenge.id}:{self.user.id}",
			).count(),
			1,
		)

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
