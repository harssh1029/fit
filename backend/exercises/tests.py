from rest_framework import status
from rest_framework.test import APITestCase

from .models import Exercise, MuscleGroup


BODY_PART_DEFS = [
	('neck', 'Neck', 'front'),
	('trapezius', 'Trapezius', 'both'),
	('chest', 'Chest', 'front'),
	('deltoids', 'Deltoids', 'both'),
	('biceps', 'Biceps', 'front'),
	('triceps', 'Triceps', 'back'),
	('forearms', 'Forearms', 'both'),
	('abs', 'Abs', 'front'),
	('obliques', 'Obliques', 'front'),
	('hip_flexors', 'Hip Flexors', 'front'),
	('quadriceps', 'Quadriceps', 'front'),
	('calves', 'Calves', 'both'),
	('tibialis', 'Tibialis', 'front'),
	('lats', 'Lats', 'back'),
	('lower_back', 'Lower Back', 'back'),
	('glutes', 'Glutes', 'back'),
	('hamstrings', 'Hamstrings', 'back'),
]


class ExerciseEndpointsTests(APITestCase):
	def setUp(self):
		# Create one MuscleGroup and one Exercise for each body part
		self.muscles_by_name = {}
		self.exercises_by_name = {}

		for slug, name, side in BODY_PART_DEFS:
			muscle, _ = MuscleGroup.objects.get_or_create(
				id=slug,
				defaults={
					'name': name,
					'side': side,
					'regions': [],
					'aliases': [],
				},
			)
			self.muscles_by_name[name] = muscle

			exercise, _ = Exercise.objects.get_or_create(
				id=f'{slug}_demo',
				defaults={
					'name': f'{name} Demo Exercise',
					'movement_pattern': 'test_pattern',
					'equipment': [],
					'level': 'beginner',
					'is_compound': True,
				},
			)
			exercise.primary_muscles.add(muscle)
			self.exercises_by_name[name] = exercise

		# Backwards-compatible attributes used in earlier tests
		self.chest = self.muscles_by_name['Chest']
		self.exercise = self.exercises_by_name['Chest']

	def test_list_exercises(self):
		response = self.client.get('/api/v1/exercises/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('results', response.data)
		self.assertLessEqual(len(response.data['results']), 12)
		self.assertGreaterEqual(response.data['count'], len(BODY_PART_DEFS))

	def test_list_exercises_caps_limit_for_cloud_cost(self):
		response = self.client.get('/api/v1/exercises/', {'limit': 500})
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertLessEqual(len(response.data['results']), 24)

	def test_filter_exercises_by_muscle(self):
		response = self.client.get('/api/v1/exercises/', {'muscles': 'chest'})
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		ids = {item['id'] for item in response.data['results']}
		self.assertIn('chest_demo', ids)

	def test_filter_exercises_by_multiple_muscles(self):
		response = self.client.get(
			'/api/v1/exercises/', {'muscles': 'chest,biceps,hamstrings'}
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		ids = {item['id'] for item in response.data['results']}
		self.assertIn('chest_demo', ids)
		self.assertIn('biceps_demo', ids)
		self.assertIn('hamstrings_demo', ids)

	def test_filter_exercises_for_single_body_part(self):
		response = self.client.get('/api/v1/exercises/', {'muscles': 'calves'})
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		ids = {item['id'] for item in response.data['results']}
		self.assertIn('calves_demo', ids)

	def test_list_omits_heavy_media_and_detail_includes_it(self):
		self.exercise.image_url = 'https://cdn.example.com/chest-thumb.webp'
		self.exercise.gif_url = 'https://cdn.example.com/chest-demo.gif'
		self.exercise.video_url = 'https://cdn.example.com/chest-demo.mp4'
		self.exercise.save(update_fields=['image_url', 'gif_url', 'video_url'])

		list_response = self.client.get('/api/v1/exercises/', {'muscles': 'chest'})
		item = next(
			row for row in list_response.data['results'] if row['id'] == self.exercise.id
		)
		self.assertEqual(item['thumbnail_url'], self.exercise.image_url)
		self.assertNotIn('gif_url', item)
		self.assertNotIn('video_url', item)

		detail_response = self.client.get(f'/api/v1/exercises/{self.exercise.id}/')
		self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
		self.assertEqual(detail_response.data['gif_url'], self.exercise.gif_url)
		self.assertEqual(detail_response.data['video_url'], self.exercise.video_url)

	def test_server_side_level_mechanic_and_force_filters(self):
		self.exercise.level = 'advanced'
		self.exercise.is_compound = False
		self.exercise.movement_pattern = 'push_press'
		self.exercise.save(update_fields=['level', 'is_compound', 'movement_pattern'])

		response = self.client.get(
			'/api/v1/exercises/',
			{'level': 'advanced', 'mechanic': 'isolation', 'force': 'push'},
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		ids = {item['id'] for item in response.data['results']}
		self.assertIn(self.exercise.id, ids)

	def test_alphabet_filter(self):
		response = self.client.get('/api/v1/exercises/', {'starts_with': 'c'})
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(
			all(item['name'].lower().startswith('c') for item in response.data['results'])
		)

	def test_list_muscles(self):
		response = self.client.get('/api/v1/muscles/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		# At least one muscle is returned
		self.assertGreaterEqual(len(response.data), 1)
