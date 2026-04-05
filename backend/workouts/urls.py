from django.urls import path

from .views import WorkoutHistoryView


urlpatterns = [
	path(
		"workouts/history/",
		WorkoutHistoryView.as_view(),
		name="workout-history",
	),
]
