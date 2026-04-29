from django.urls import path

from .views import ChallengeDetailView, ChallengeListView, CompleteChallengeView

urlpatterns = [
    path("challenges/", ChallengeListView.as_view(), name="challenges-list"),
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
