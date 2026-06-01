from django.urls import path

from .views import (
    ChallengeDetailView,
    ChallengeListView,
    CompleteChallengeView,
    TrainingChallengeJoinView,
    TrainingChallengeParticipantsView,
    TrainingChallengeSectionsView,
)

urlpatterns = [
    path("challenges/", ChallengeListView.as_view(), name="challenges-list"),
    path("training-challenges/", TrainingChallengeSectionsView.as_view(), name="training-challenges"),
    path(
        "training-challenges/<int:challenge_id>/join/",
        TrainingChallengeJoinView.as_view(),
        name="training-challenge-join",
    ),
    path(
        "training-challenges/<int:challenge_id>/participants/",
        TrainingChallengeParticipantsView.as_view(),
        name="training-challenge-participants",
    ),
    path(
        "challenges/<slug:pk>/",
        ChallengeDetailView.as_view(),
        name="challenges-detail",
    ),
    path(
        "challenges/<slug:pk>/complete/",
        CompleteChallengeView.as_view(),
        name="challenge-complete",
    ),
]
