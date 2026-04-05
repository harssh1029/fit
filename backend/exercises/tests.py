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
		# We created one exercise per body part
		self.assertGreaterEqual(len(response.data['results']), len(BODY_PART_DEFS))

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

	def test_list_muscles(self):
		response = self.client.get('/api/v1/muscles/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		# At least one muscle is returned
		self.assertGreaterEqual(len(response.data), 1)

