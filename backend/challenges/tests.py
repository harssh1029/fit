from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from insights.models import UserMetricsSnapshot
from community.models import CommunityActivity

from .models import (
    Challenge,
    TrainingChallenge,
    UserChallengeCompletion,
    UserChallengeEnrollment,
    UserChallengeProgress,
)


User = get_user_model()


def challenge_payload(
    challenge_id: str,
    *,
    conditions=None,
    completed_required: int = 0,
    is_free: bool = False,
):
    return {
        "id": challenge_id,
        "order": 100,
        "card": {
            "icon": "🔥",
            "name": f"Challenge {challenge_id}",
            "body_map_tags": ["Chest"],
            "short_description": "Test challenge",
            "level": "beginner",
            "level_index": 1,
            "status": "locked",
        },
        "detail": {
            "quote": "",
            "format": "Test",
            "duration_days": 1,
            "difficulty": 1,
            "days": [],
            "complete_condition": "Complete the test.",
            "badge_name": "Test",
            "bonus": None,
        },
        "unlock": {
            "is_free": is_free,
            "conditions": conditions or [],
            "challenges_completed_required": completed_required,
            "unlock_message": "Meet the requirements to unlock.",
        },
    }


def body_map_detail(*, chest_sessions: int, chest_rank: str):
    groups = {
        key: {"sessions": 0, "rank": "Recruit", "last": None, "status": "never"}
        for key in ["chest", "shoulders", "arms", "back", "core", "glutes", "legs"]
    }
    groups["chest"] = {
        "sessions": chest_sessions,
        "rank": chest_rank,
        "last": None,
        "status": "ready",
    }
    return {
        "available": True,
        "groups": groups,
        "weak_spots": [],
        "strong_spots": ["chest"],
        "balance_score": 40.0,
    }


class ChallengeUnlockApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="challenge_user",
            email="challenge@example.com",
            password="pass",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_rank_locked_challenge_cannot_be_completed(self):
        challenge = Challenge.objects.create(
            **challenge_payload(
                "T01",
                conditions=[
                    {
                        "body_part": "Chest",
                        "min_workouts": 8,
                        "level_required": "soldier",
                    }
                ],
            )
        )
        UserMetricsSnapshot.objects.create(
            user=self.user,
            body_battle_map_detail=body_map_detail(
                chest_sessions=4,
                chest_rank="Recruit",
            ),
        )

        list_response = self.client.get("/api/v1/challenges/")
        card = next(item for item in list_response.json() if item["id"] == challenge.id)
        self.assertEqual(card["card"]["status"], "locked")
        self.assertFalse(card["unlockProgress"]["isUnlocked"])

        complete_response = self.client.post(f"/api/v1/challenges/{challenge.id}/complete/")
        self.assertEqual(complete_response.status_code, 403)
        self.assertFalse(
            UserChallengeCompletion.objects.filter(
                user=self.user,
                challenge=challenge,
            ).exists()
        )

    def test_rank_progress_unlocks_and_allows_completion(self):
        challenge = Challenge.objects.create(
            **challenge_payload(
                "T02",
                conditions=[
                    {
                        "body_part": "Chest",
                        "min_workouts": 8,
                        "level_required": "soldier",
                    }
                ],
            )
        )
        UserMetricsSnapshot.objects.create(
            user=self.user,
            body_battle_map_detail=body_map_detail(
                chest_sessions=8,
                chest_rank="Soldier",
            ),
        )

        list_response = self.client.get("/api/v1/challenges/")
        card = next(item for item in list_response.json() if item["id"] == challenge.id)
        self.assertEqual(card["card"]["status"], "unlocked")
        self.assertTrue(card["unlockProgress"]["conditions"][0]["isMet"])

        complete_response = self.client.post(f"/api/v1/challenges/{challenge.id}/complete/")
        self.assertEqual(complete_response.status_code, 200)
        self.assertTrue(
            UserChallengeCompletion.objects.filter(
                user=self.user,
                challenge=challenge,
            ).exists()
        )

    def test_completed_challenge_requirement_unlocks_next_challenge(self):
        first = Challenge.objects.create(**challenge_payload("T00", is_free=True))
        next_challenge = Challenge.objects.create(
            **challenge_payload("T03", completed_required=1)
        )
        UserMetricsSnapshot.objects.create(
            user=self.user,
            body_battle_map_detail=body_map_detail(
                chest_sessions=0,
                chest_rank="Recruit",
            ),
        )

        before = self.client.get("/api/v1/challenges/")
        before_card = next(item for item in before.json() if item["id"] == next_challenge.id)
        self.assertEqual(before_card["card"]["status"], "locked")

        self.client.post(f"/api/v1/challenges/{first.id}/complete/")
        after = self.client.get("/api/v1/challenges/")
        after_card = next(item for item in after.json() if item["id"] == next_challenge.id)
        self.assertEqual(after_card["card"]["status"], "unlocked")
        self.assertEqual(after_card["unlockProgress"]["challengesCompletedCount"], 1)

    def test_completion_materializes_one_challenge_feed_post_with_badges(self):
        challenge = Challenge.objects.create(**challenge_payload("T04", is_free=True))

        for _ in range(2):
            response = self.client.post(f"/api/v1/challenges/{challenge.id}/complete/")
            self.assertEqual(response.status_code, 200)

        activities = CommunityActivity.objects.filter(
            user=self.user,
            activity_type=CommunityActivity.ACTIVITY_CHALLENGE,
            metadata__source_id=f"challenge:{challenge.id}",
        )
        self.assertEqual(activities.count(), 1)
        self.assertGreaterEqual(len(activities.get().metadata["earned_badges"]), 1)
        self.assertFalse(
            CommunityActivity.objects.filter(
                user=self.user,
                activity_type="badge",
                metadata__event_type="badge_earned",
            ).exists()
        )

        response = self.client.delete(f"/api/v1/challenges/{challenge.id}/complete/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(activities.exists())


class TrainingChallengeApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="training_user",
            email="training@example.com",
            password="pass",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_training_challenge_persists_rules(self):
        response = self.client.post(
            "/api/v1/training-challenges/",
            {
                "name": "Office Strength Month",
                "description": "Small team strength challenge",
                "requirement": "Complete 5 strength sessions",
                "duration_days": 21,
                "required_sessions": 5,
                "minimum_duration": 25,
                "reward_xp": 240,
                "eligible_workout_types": ["strength"],
                "eligible_body_parts": ["chest", "back"],
                "allowed_intensity": ["moderate", "hard"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        challenge = TrainingChallenge.objects.get(name="Office Strength Month")
        self.assertEqual(challenge.required_sessions, 5)
        self.assertEqual(challenge.minimum_duration, 25)
        self.assertEqual(challenge.reward_xp, 0)
        self.assertEqual(challenge.eligible_workout_types, ["strength"])
        self.assertEqual(challenge.eligible_body_parts, ["chest", "back"])
        self.assertEqual(challenge.start_date, timezone.localdate())
        self.assertEqual(
            (challenge.end_date - challenge.start_date).days,
            challenge.duration_days - 1,
        )

    def test_training_challenge_participants_endpoint_returns_progress(self):
        challenge = TrainingChallenge.objects.create(
            name="Core Sprint",
            description="Core training",
            requirement="3 sessions",
            required_sessions=3,
            reward_xp=120,
            created_by=self.user,
        )
        enrollment = UserChallengeEnrollment.objects.create(
            user=self.user,
            challenge=challenge,
            status=UserChallengeEnrollment.STATUS_COMPLETED,
        )
        UserChallengeProgress.objects.create(
            enrollment=enrollment,
            sessions_completed=3,
            progress_percent=100,
            points=180,
            active_days=3,
        )

        response = self.client.get(
            f"/api/v1/training-challenges/{challenge.id}/participants/"
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["participants"]), 1)
        self.assertEqual(len(body["completed"]), 1)
        self.assertEqual(body["participants"][0]["progress"]["points"], 180)
