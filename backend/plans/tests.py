from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from django.contrib.auth import get_user_model

from achievements.models import UserBadge, UserLevel
from achievements.services import ensure_badge_catalog
from community.models import CommunityActivity
from insights.models import UserMetricsSnapshot
from workouts.models import SessionExercise, UserScorePeriod, UserScoreSummary, WorkoutSession

from .models import Plan, PlanDay, PlanVersion, PlanWeek, UserPlan
from .services import getVisibleWorkoutsForWeek, startUserPlan


User = get_user_model()


class PlanApiSmokeTests(APITestCase):
	def test_catalog_exposes_ten_periodized_adaptive_plans(self):
		expected_ids = {
			'busy_professional_8wk',
			'fat_loss_shred_8wk',
			'full_marathon_elite_build',
			'half_marathon_performance_build',
			'hybrid_athlete_8wk',
			'hyrox_intense_3wk',
			'lean_muscle_builder_8wk',
			'mobility_longevity_8wk',
			'movement_foundation_home_8wk',
			'strength_performance_8wk',
		}

		self.assertEqual(
			set(Plan.objects.filter(is_active=True).values_list('id', flat=True)),
			expected_ids,
		)

		for plan_id in expected_ids:
			plan = Plan.objects.get(id=plan_id)
			self.assertEqual(plan.supported_sessions_per_week, [3, 4, 5, 6])
			self.assertEqual(
				list(plan.versions.order_by('sessions_per_week').values_list('sessions_per_week', flat=True)),
				[3, 4, 5, 6],
			)
			weeks = list(plan.weeks.filter(plan_version__isnull=True).prefetch_related('days'))
			self.assertEqual(len(weeks), 8)
			for sessions_per_week in [3, 4, 5, 6]:
				self.assertTrue(
					all(
						len(getVisibleWorkoutsForWeek(week, sessions_per_week)) == sessions_per_week
						for week in weeks
					)
				)

	def test_foundation_plan_completion_updates_schedule_calendar_xp_and_metrics(self):
		user = User.objects.create_user(username='foundation-user', password='pass12345')
		plan = Plan.objects.get(id='movement_foundation_home_8wk')
		user_plan = startUserPlan(user, plan.id, 3, '2026-06-01')
		scheduled = user_plan.scheduled_workouts.order_by('order_index').first()

		self.assertIsNotNone(scheduled)
		self.assertEqual(user_plan.total_sessions, 24)
		self.assertEqual(scheduled.scheduled_date.isoformat(), '2026-06-01')

		self.client.force_authenticate(user=user)
		response = self.client.post(
			reverse('user-plan-complete-workout', kwargs={'id': user_plan.id}),
			{'scheduledWorkoutId': scheduled.id},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		scheduled.refresh_from_db()
		user_plan.refresh_from_db()
		self.assertEqual(scheduled.status, 'completed')
		self.assertEqual(user_plan.completed_sessions, 1)

		session = WorkoutSession.objects.get(user=user, user_plan=user_plan)
		self.assertEqual(session.entry_source, 'plan_workout')
		self.assertIn('legs', session.body_groups)
		self.assertIn('chest', session.body_groups)
		self.assertTrue(SessionExercise.objects.filter(session=session).exists())
		self.assertTrue(UserScoreSummary.objects.filter(user=user, career_xp__gt=0).exists())

		snapshot = UserMetricsSnapshot.objects.get(user=user)
		self.assertGreater(snapshot.total_minutes_all_time, 0)
		self.assertGreater(
			snapshot.body_battle_map_detail['groups']['legs']['sessions'],
			0,
		)

		history = self.client.get(reverse('workout-history'))
		self.assertEqual(history.status_code, 200)
		self.assertEqual(history.json()['results'][0]['status'], 'completed')
		self.assertEqual(history.json()['results'][0]['scheduled_workout_id'], scheduled.id)

	def test_complete_day_slug_fallback_marks_matching_calendar_workout_complete(self):
		user = User.objects.create_user(username='calendar-user', password='pass12345')
		plan = Plan.objects.get(id='movement_foundation_home_8wk')
		user_plan = startUserPlan(user, plan.id, 3, '2026-06-01')
		scheduled = user_plan.scheduled_workouts.select_related('plan_day__plan_week').first()

		self.assertIsNotNone(scheduled)
		self.client.force_authenticate(user=user)
		response = self.client.post(
			reverse('plan-complete-day'),
			{
				'plan_id': plan.id,
				'plan_week_number': scheduled.week_number,
				'plan_day_index': scheduled.plan_day.day_index,
			},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		scheduled.refresh_from_db()
		user_plan.refresh_from_db()
		self.assertEqual(scheduled.status, 'completed')
		self.assertEqual(user_plan.completed_sessions, 1)

		session = WorkoutSession.objects.get(user=user, user_plan=user_plan)
		self.assertEqual(session.metadata['scheduled_workout_id'], scheduled.id)

	def test_start_plan_uses_selected_training_weekdays(self):
		user = User.objects.create_user(username='schedule-user', password='pass12345')
		plan = Plan.objects.create(
			id='schedule-plan',
			name='Schedule Plan',
			level='beginner',
			duration_weeks=1,
			goal='strength',
			summary='Summary',
			audience='Everyone',
			result='Result',
			sessions_per_week=2,
			supported_sessions_per_week=[2],
		)
		version = PlanVersion.objects.create(
			id='schedule-plan-2',
			plan=plan,
			sessions_per_week=2,
			title='Schedule Plan 2',
			description='Two sessions',
			split_type='custom',
			training_days_pattern=['TUE', 'SAT'],
			total_sessions=2,
		)
		week = PlanWeek.objects.create(
			plan=plan,
			plan_version=version,
			number=1,
			title='Week 1',
			focus='Strength',
		)
		for index in range(1, 3):
			PlanDay.objects.create(
				plan_week=week,
				day_index=index,
				title=f'Day {index}',
				day_type='strength',
			)

		user_plan = startUserPlan(user, plan.id, 2, '2026-06-01', ['TUE', 'SAT'])
		dates = list(
			user_plan.scheduled_workouts.order_by('order_index').values_list(
				'scheduled_date',
				flat=True,
			)
		)

		self.assertEqual([item.isoformat() for item in dates], ['2026-06-02', '2026-06-06'])
		self.assertEqual(user_plan.training_days_pattern, ['TUE', 'SAT'])

		self.client.force_authenticate(user=user)
		response = self.client.post(
			reverse('user-plan-recalibrate', kwargs={'id': user_plan.id}),
			format='json',
		)
		self.assertEqual(response.status_code, 200)
		self.assertIn('metrics_snapshot_id', response.json())
		user_plan.refresh_from_db()
		self.assertTrue(user_plan.is_recalibrated)
		self.assertTrue(
			all(
				item.scheduled_date.weekday() in {1, 5}
				for item in user_plan.scheduled_workouts.all()
			)
		)

		with self.assertRaisesMessage(ValueError, 'Select exactly 2 distinct training days.'):
			startUserPlan(user, plan.id, 2, '2026-06-01', ['TUE'])

	def test_list_empty_ok(self):
		url = reverse('plan-list')
		response = self.client.get(url)
		self.assertEqual(response.status_code, 200)
		data = response.json()
		self.assertIn('results', data)
		# After seeding, at least the Hyrox plan should exist
		self.assertGreaterEqual(len(data['results']), 1)

	def test_detail_404_for_missing_plan(self):
		url = reverse('plan-detail', kwargs={'pk': 'nonexistent'})
		response = self.client.get(url)
		self.assertEqual(response.status_code, 404)

	def test_opt_out_clears_active_plan(self):
		user = User.objects.create_user(username='optout-user', password='pass12345')
		plan = Plan.objects.first()
		self.assertIsNotNone(plan)
		user.profile.active_plan = plan
		user.profile.save(update_fields=['active_plan'])
		user_plan = UserPlan.objects.create(
			user=user,
			plan=plan,
			is_active=True,
			status='active',
			started_at=timezone.now(),
		)

		self.client.force_authenticate(user=user)
		response = self.client.post(
			reverse('plan-opt-out'),
			{'plan_id': plan.id},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		user.profile.refresh_from_db()
		user_plan.refresh_from_db()
		self.assertIsNone(user.profile.active_plan)
		self.assertFalse(user_plan.is_active)
		self.assertEqual(user_plan.status, 'cancelled')

	def test_plan_detail_includes_authenticated_user_progress(self):
		user = User.objects.create_user(username='progress-user', password='pass12345')
		plan = Plan.objects.prefetch_related('weeks__days').first()
		self.assertIsNotNone(plan)
		started_at = timezone.now() - timedelta(days=8)
		expected_end_at = started_at + timedelta(weeks=plan.duration_weeks)
		user_plan = UserPlan.objects.create(
			user=user,
			plan=plan,
			is_active=True,
			status='active',
			started_at=started_at,
			expected_end_at=expected_end_at,
		)
		plan_day = plan.weeks.first().days.first()
		self.assertIsNotNone(plan_day)
		WorkoutSession.objects.create(
			user=user,
			plan=plan,
			user_plan=user_plan,
			status='completed',
			completed_at=timezone.now(),
			planned_week_number=plan_day.plan_week.number,
			planned_day_key=str(plan_day.day_index),
		)

		self.client.force_authenticate(user=user)
		response = self.client.get(reverse('plan-detail', kwargs={'pk': plan.id}))

		self.assertEqual(response.status_code, 200)
		progress = response.json()['user_progress']
		self.assertIsNotNone(progress)
		self.assertTrue(progress['is_active'])
		self.assertEqual(progress['status'], 'active')
		self.assertEqual(progress['completed_sessions'], 1)
		self.assertGreaterEqual(progress['total_sessions'], 1)
		self.assertGreaterEqual(progress['completion_percent'], 1)
		self.assertEqual(progress['current_week_number'], 2)

	def test_plan_detail_anonymous_progress_is_null(self):
		plan = Plan.objects.first()
		response = self.client.get(reverse('plan-detail', kwargs={'pk': plan.id}))

		self.assertEqual(response.status_code, 200)
		self.assertIsNone(response.json()['user_progress'])

	def test_complete_day_updates_xp_levels_badges_and_dashboard_state(self):
		ensure_badge_catalog()
		user = User.objects.create_user(username='plan-xp-user', password='pass12345')
		plan = Plan.objects.create(
			id='xp-plan',
			name='XP Strength Plan',
			level='beginner',
			duration_weeks=1,
			goal='strength',
			summary='Summary',
			audience='Everyone',
			result='Result',
			sessions_per_week=1,
			tags=['strength'],
		)
		week = PlanWeek.objects.create(
			plan=plan,
			number=1,
			title='Week 1',
			focus='Strength',
			highlights=[],
		)
		day = PlanDay.objects.create(
			plan_week=week,
			day_index=1,
			title='Day 1 Strength',
			description='',
			duration='45 min',
			duration_minutes=45,
			day_type='strength',
			intensity='hard',
			primary_focus='Upper Body',
		)
		user_plan = UserPlan.objects.create(
			user=user,
			plan=plan,
			is_active=True,
			status='active',
			started_at=timezone.now(),
			total_sessions=1,
		)

		self.client.force_authenticate(user=user)
		response = self.client.post(
			reverse('plan-complete-day'),
			{'plan_day_id': day.id},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		data = response.json()
		self.assertGreater(data['activity_xp'], 0)
		self.assertIn('metrics_snapshot_id', data)

		user_plan.refresh_from_db()
		self.assertEqual(user_plan.completed_sessions, 1)
		self.assertEqual(user_plan.sessions_completed, 1)
		self.assertEqual(user_plan.status, 'completed')
		self.assertFalse(user_plan.is_active)

		self.assertTrue(UserScoreSummary.objects.filter(user=user, career_xp__gt=0).exists())
		self.assertTrue(UserScorePeriod.objects.filter(user=user, period_type='weekly', activity_xp__gt=0).exists())
		self.assertTrue(UserLevel.objects.filter(user=user, career_xp__gt=0).exists())
		self.assertTrue(UserBadge.objects.filter(user=user, badge_id='first_session').exists())
		self.assertTrue(UserBadge.objects.filter(user=user, badge_id='plan_finisher').exists())

		activity = CommunityActivity.objects.get(
			user=user,
			activity_type=CommunityActivity.ACTIVITY_WORKOUT,
			title='Day 1 Strength',
		)
		earned_badges = activity.metadata.get('earned_badges') or []
		self.assertTrue(any(badge.get('id') == 'plan_finisher' for badge in earned_badges))
