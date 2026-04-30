from django.urls import path

from .views import (
    ActiveUserPlanView,
    CheckMissedWorkoutsView,
    CompletePlanDayView,
    CompleteScheduledWorkoutView,
    OptOutPlanView,
    PlanDetailView,
    PlanListView,
    RecalibrateUserPlanView,
    StartUserPlanView,
)


urlpatterns = [
    path('plans/', PlanListView.as_view(), name='plan-list'),
    path('plans/complete-day/', CompletePlanDayView.as_view(), name='plan-complete-day'),
    path('plans/opt-out/', OptOutPlanView.as_view(), name='plan-opt-out'),
    path('plans/<slug:pk>/', PlanDetailView.as_view(), name='plan-detail'),
    path('user-plans/start', StartUserPlanView.as_view(), name='user-plan-start'),
    path('user-plans/active', ActiveUserPlanView.as_view(), name='user-plan-active'),
    path(
        'user-plans/<int:id>/complete-workout',
        CompleteScheduledWorkoutView.as_view(),
        name='user-plan-complete-workout',
    ),
    path(
        'user-plans/<int:id>/check-missed',
        CheckMissedWorkoutsView.as_view(),
        name='user-plan-check-missed',
    ),
    path(
        'user-plans/<int:id>/recalibrate',
        RecalibrateUserPlanView.as_view(),
        name='user-plan-recalibrate',
    ),
]
