from django.urls import path

from .views import (
	ExerciseDetailView,
	ExerciseImportFromExerciseDBView,
	ExerciseListView,
	MuscleGroupListView,
)


urlpatterns = [
	path(
		'exercises/import-from-external/',
		ExerciseImportFromExerciseDBView.as_view(),
		name='exercise-import-external',
	),
	path('exercises/', ExerciseListView.as_view(), name='exercise-list'),
	path('exercises/<slug:pk>/', ExerciseDetailView.as_view(), name='exercise-detail'),
	path('muscles/', MuscleGroupListView.as_view(), name='muscle-list'),
]
