from django.urls import path

from .views import (
	CustomWorkoutView,
	FullWorkoutHistoryView,
	WorkoutDraftDetailView,
	WorkoutDraftListCreateView,
	WorkoutHistoryView,
	WorkoutImageUploadView,
	WorkoutLogView,
)


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
		"workouts/log/",
		WorkoutLogView.as_view(),
		name="workout-log",
	),
	path(
		"workouts/images/",
		WorkoutImageUploadView.as_view(),
		name="workout-image-upload",
	),
	path(
		"workouts/drafts/",
		WorkoutDraftListCreateView.as_view(),
		name="workout-drafts",
	),
	path(
		"workouts/drafts/<int:draft_id>/",
		WorkoutDraftDetailView.as_view(),
		name="workout-draft-detail",
	),
	path(
		"workouts/all-history/",
		FullWorkoutHistoryView.as_view(),
		name="workout-full-history",
	),
]
