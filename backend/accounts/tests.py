from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


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


class AuthFlowTests(APITestCase):
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
