from django.urls import path

from .views import CustomWorkoutView, FullWorkoutHistoryView, WorkoutHistoryView


urlpatterns = [
	path(
		"workouts/history/",
		WorkoutHistoryView.as_view(),
		name="workout-history",
	),
	path(
		"workouts/custom/",
		CustomWorkoutView.as_view(),
		name="workout-custom",
	),
	path(
		"workouts/all-history/",
		FullWorkoutHistoryView.as_view(),
		name="workout-full-history",
	),
]
