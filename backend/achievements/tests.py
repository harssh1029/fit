from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from achievements.models import Badge, CategoryLevel, FeaturedBadge, LeaderboardResult, UserBadge, UserLevel
from achievements.services import award_badge, close_leaderboard_period, ensure_badge_catalog
from challenges.models import TrainingChallenge, UserChallengeEnrollment
from challenges.services import enroll_user_in_training_challenge
from community.models import CommunityActivity
from workouts.models import UserScorePeriod
from workouts.services import log_workout


class AchievementFlowTests(APITestCase):
	def setUp(self) -> None:
		User = get_user_model()
		self.user = User.objects.create_user(username='ach-user', email='ach@example.com', password='testpass123')
		ensure_badge_catalog()

	def test_workout_updates_level_category_and_badge_idempotently(self) -> None:
		log_workout(
			self.user,
			{
				'title': 'Strength Session',
				'entry_source': 'recorded_timer',
				'mode': 'strength',
				'duration_minutes': 35,
				'intensity': 'moderate',
				'body_groups': ['chest'],
			},
		)
		self.assertTrue(UserLevel.objects.filter(user=self.user, career_xp__gt=0).exists())
		self.assertTrue(CategoryLevel.objects.filter(user=self.user, category='strength', xp__gt=0).exists())
		self.assertEqual(UserBadge.objects.filter(user=self.user, badge_id='first_session').count(), 1)

		session = self.user.workout_sessions.first()
		from achievements.services import evaluate_workout_achievements

		evaluate_workout_achievements(session, session.score_record, as_of=session.completed_at)
		self.assertEqual(UserBadge.objects.filter(user=self.user, badge_id='first_session').count(), 1)

	def test_periodic_leaderboard_badges_repeat_by_period_key(self) -> None:
		start = timezone.localdate() - timedelta(days=timezone.localdate().weekday() + 7)
		end = start + timedelta(days=6)
		UserScorePeriod.objects.create(
			user=self.user,
			period_type='weekly',
			period_start=start,
			period_end=end,
			leaderboard_score=500,
		)
		close_leaderboard_period('weekly', start, end)
		self.assertTrue(LeaderboardResult.objects.filter(user=self.user, rank=1).exists())
		self.assertTrue(UserBadge.objects.filter(user=self.user, badge_id='weekly_champion').exists())

		next_start = start + timedelta(days=7)
		next_end = next_start + timedelta(days=6)
		UserScorePeriod.objects.create(
			user=self.user,
			period_type='weekly',
			period_start=next_start,
			period_end=next_end,
			leaderboard_score=600,
		)
		close_leaderboard_period('weekly', next_start, next_end)
		self.assertEqual(UserBadge.objects.filter(user=self.user, badge_id='weekly_champion').count(), 2)

	def test_profile_pins_are_limited_to_three(self) -> None:
		for index in range(4):
			log_workout(
				self.user,
				{
					'title': f'Session {index}',
					'entry_source': 'recorded_timer',
					'mode': 'strength',
					'duration_minutes': 20,
					'intensity': 'moderate',
					'body_groups': ['chest' if index % 2 == 0 else 'back'],
					'pr': 'Best set' if index == 1 else '',
				},
				as_of=timezone.now() + timedelta(days=index),
			)
		ids = list(UserBadge.objects.filter(user=self.user).values_list('id', flat=True)[:4])
		self.client.force_authenticate(self.user)
		response = self.client.post('/api/v1/achievements/badges/pins/', {'user_badge_ids': ids}, format='json')
		self.assertEqual(response.status_code, 200)
		self.assertLessEqual(FeaturedBadge.objects.filter(user=self.user).count(), 3)

	def test_public_profile_does_not_expose_raw_body_scores(self) -> None:
		log_workout(
			self.user,
			{
				'title': 'Leg Session',
				'entry_source': 'recorded_timer',
				'mode': 'strength',
				'duration_minutes': 30,
				'intensity': 'moderate',
				'body_groups': ['legs'],
			},
		)
		self.client.force_authenticate(self.user)
		response = self.client.get(f'/api/v1/profiles/{self.user.id}/public/')
		self.assertEqual(response.status_code, 200)
		self.assertNotIn('body_part_scores', str(response.json()))

	def test_non_workout_badge_source_creates_feed_activity(self) -> None:
		badge = Badge.objects.get(id='plan_finisher')
		award_badge(self.user, badge, source_type='plan', source_id='1')
		self.assertTrue(
			CommunityActivity.objects.filter(
				user=self.user,
				activity_type=CommunityActivity.ACTIVITY_BADGE,
				metadata__badge_id='plan_finisher',
			).exists()
		)

	def test_joined_upper_body_challenge_progresses_from_upper_body_workout(self) -> None:
		challenge = TrainingChallenge.objects.create(
			name='Upper Body Test',
			requirement='30 upper-body workouts',
			duration_days=30,
			required_sessions=30,
			eligible_workout_types=['strength'],
			eligible_body_parts=['upper_body'],
			minimum_duration=10,
			is_official=True,
			visibility=TrainingChallenge.VISIBILITY_OFFICIAL,
			status=TrainingChallenge.STATUS_ACTIVE,
		)
		enrollment = enroll_user_in_training_challenge(self.user, challenge)
		log_workout(
			self.user,
			{
				'title': 'Upper Body',
				'entry_source': 'recorded_timer',
				'mode': 'strength',
				'duration_minutes': 30,
				'intensity': 'moderate',
				'body_groups': ['chest', 'back'],
			},
		)
		enrollment.refresh_from_db()
		self.assertEqual(enrollment.progress.sessions_completed, 1)
		self.assertEqual(enrollment.status, UserChallengeEnrollment.STATUS_ACTIVE)
