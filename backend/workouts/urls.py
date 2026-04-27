from django.urls import path

from .views import FullWorkoutHistoryView, WorkoutHistoryView


urlpatterns = [
	path(
		"workouts/history/",
		WorkoutHistoryView.as_view(),
		name="workout-history",
	),
		path(
			"workouts/all-history/",
			FullWorkoutHistoryView.as_view(),
			name="workout-full-history",
		),
]
