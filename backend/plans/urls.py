from django.urls import path

from .views import CompletePlanDayView, OptOutPlanView, PlanDetailView, PlanListView


urlpatterns = [
	path('plans/', PlanListView.as_view(), name='plan-list'),
	path('plans/complete-day/', CompletePlanDayView.as_view(), name='plan-complete-day'),
	path('plans/opt-out/', OptOutPlanView.as_view(), name='plan-opt-out'),
	path('plans/<slug:pk>/', PlanDetailView.as_view(), name='plan-detail'),
]
