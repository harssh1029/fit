from django.urls import reverse
from rest_framework.test import APITestCase


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

