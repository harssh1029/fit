from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from django.contrib.auth import get_user_model

from workouts.models import WorkoutSession

from .models import Plan, UserPlan


User = get_user_model()


class PlanApiSmokeTests(APITestCase):
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
