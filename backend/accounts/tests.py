from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from challenges.models import TrainingChallenge, UserChallengeCompletion, UserChallengeEnrollment
from community.models import CommunityActivity
from insights.models import FitnessAssessment, UserMetricsSnapshot
from workouts.models import WorkoutSession


class MeEndpointTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username='testuser', email='test@example.com', password='testpass123'
		)

	def test_me_requires_authentication(self):
		response = self.client.get('/api/v1/me/')
		self.assertIn(
			response.status_code,
			(status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
		)

	def test_me_returns_user_and_profile_for_authenticated_user(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.get('/api/v1/me/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['username'], 'testuser')
		self.assertIn('profile', response.data)
		self.assertIn('timezone', response.data['profile'])

	def test_profile_picture_upload_is_persisted_and_exposed(self):
		self.client.force_authenticate(user=self.user)
		image = SimpleUploadedFile('avatar.jpg', b'profile-image-bytes', content_type='image/jpeg')
		with TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
			response = self.client.post('/api/v1/profiles/me/avatar/', {'image': image}, format='multipart')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.user.profile.refresh_from_db()
		self.assertTrue(self.user.profile.avatar_url.startswith('/media/profile_images/'))

		me_response = self.client.get('/api/v1/me/')
		self.assertEqual(me_response.data['profile']['avatar_url'], self.user.profile.avatar_url)

		summary_response = self.client.get('/api/v1/profiles/me/summary/')
		self.assertEqual(summary_response.data['public_card']['avatarUrl'], self.user.profile.avatar_url)

	def test_profile_summary_exposes_joined_training_challenges(self):
		self.client.force_authenticate(user=self.user)
		challenge = TrainingChallenge.objects.create(
			name='Seven day rhythm',
			requirement='Complete three training sessions',
		)
		UserChallengeEnrollment.objects.create(user=self.user, challenge=challenge)

		response = self.client.get('/api/v1/profiles/me/summary/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['joined_challenges'][0]['name'], 'Seven day rhythm')
		self.assertEqual(response.data['joined_challenges'][0]['progressPercent'], 0)

	def test_profile_posts_page_returns_full_activity_cards(self):
		self.client.force_authenticate(user=self.user)
		activity = CommunityActivity.objects.create(
			user=self.user,
			activity_type=CommunityActivity.ACTIVITY_WORKOUT,
			title='Morning strength',
			occurred_at=timezone.now(),
		)

		response = self.client.get('/api/v1/profiles/me/posts/?limit=10')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['results'][0]['id'], activity.id)
		self.assertIn('savedByMe', response.data['results'][0])


class AuthFlowTests(APITestCase):
	def test_register_validation_catches_account_errors_without_creating_user(self):
		User = get_user_model()
		User.objects.create_user(
			username='taken',
			email='taken@example.com',
			password='StrongPass123!',
		)

		response = self.client.post(
			'/api/v1/auth/register/validate/',
			{
				'username': 'taken',
				'email': 'taken@example.com',
				'password': 'short',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('username', response.data)
		self.assertIn('email', response.data)
		self.assertIn('password', response.data)
		self.assertEqual(User.objects.count(), 1)

	def test_register_validation_accepts_valid_account_without_creating_user(self):
		User = get_user_model()
		response = self.client.post(
			'/api/v1/auth/register/validate/',
			{
				'username': 'available',
				'email': 'available@example.com',
				'password': 'StrongPass123!',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data, {'ok': True})
		self.assertEqual(User.objects.count(), 0)

	def test_register_then_login_and_fetch_me(self):
		# Register
		register_payload = {
			'username': 'newuser',
			'email': 'new@example.com',
			'password': 'StrongPass123!',
		}
		reg_response = self.client.post('/api/v1/auth/register/', register_payload, format='json')
		self.assertEqual(reg_response.status_code, status.HTTP_201_CREATED)
		self.assertIn('access', reg_response.data)
		self.assertIn('refresh', reg_response.data)

		# Login via JWT obtain pair
		login_payload = {
			'username': 'newuser',
			'password': 'StrongPass123!',
		}
		login_resp = self.client.post('/api/v1/auth/jwt/create/', login_payload, format='json')
		self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
		access = login_resp.data['access']

		# Use access token with /me/
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
		me_resp = self.client.get('/api/v1/me/')
		self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
		self.assertEqual(me_resp.data['username'], 'newuser')
		self.assertIn('profile', me_resp.data)

	def test_register_with_onboarding_creates_starting_profile(self):
		register_payload = {
			'username': 'profiled',
			'email': 'profiled@example.com',
			'password': 'StrongPass123!',
			'onboarding': {
				'version': 1,
				'ageYears': 31,
				'gender': 'other',
				'heightCm': 178,
				'weightKg': 76,
				'waistCm': 84,
				'fitnessLevel': 'consistent',
				'workoutsPerWeek': 4,
				'maxPushups': 32,
				'runMinutes': 28,
				'restingHeartRate': 64,
				'canTouchToes': 'almost',
				'sleepHours': 7,
				'goals': ['strength', 'stay_fit'],
				'trainingPreferences': {
					'preferredDaysPerWeek': 4,
					'sessionLengthMinutes': 45,
					'equipment': ['bodyweight', 'dumbbells'],
				},
				'restrictions': {
					'avoidMovements': ['knee_sensitive'],
				},
			},
		}

		response = self.client.post('/api/v1/auth/register/', register_payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertIn('metrics_snapshot_id', response.data)

		User = get_user_model()
		user = User.objects.get(username='profiled')
		profile = user.profile
		self.assertEqual(profile.gender, 'other')
		self.assertEqual(profile.fitness_level, 'consistent')
		self.assertEqual(profile.fitness_goals, ['strength', 'stay_fit'])
		self.assertEqual(profile.training_preferences['preferredDaysPerWeek'], 4)
		self.assertEqual(profile.training_restrictions['avoidMovements'], ['knee_sensitive'])
		self.assertEqual(profile.onboarding_version, 1)
		self.assertIsNotNone(profile.onboarding_completed_at)

		assessment = FitnessAssessment.objects.get(user=user)
		self.assertEqual(assessment.source, 'registration_onboarding')
		self.assertEqual(assessment.age_years, 31)
		self.assertEqual(assessment.gender, 'other')
		self.assertEqual(assessment.max_pushups, 32)

		snapshot = UserMetricsSnapshot.objects.get(user=user)
		self.assertEqual(
			snapshot.fitness_age_detail.get('source'),
			'registration_onboarding_estimate',
		)
		self.assertEqual(snapshot.fitness_age_detail.get('confidence'), 'medium')
		self.assertEqual(
			snapshot.body_battle_map_detail.get('source'),
			'registration_onboarding_estimate',
		)
		self.assertEqual(WorkoutSession.objects.filter(user=user).count(), 0)
		self.assertEqual(UserChallengeCompletion.objects.filter(user=user).count(), 0)

		self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
		dashboard = self.client.get('/api/v1/dashboard/summary/')
		self.assertEqual(dashboard.status_code, status.HTTP_200_OK)
		metrics = dashboard.data['metrics']
		self.assertTrue(metrics['fitness_age']['available'])
		self.assertTrue(metrics['percentile_rank']['available'])
		self.assertTrue(metrics['body_battle_map']['available'])
