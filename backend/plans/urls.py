from django.urls import path

from .views import CompletePlanDayView, PlanDetailView, PlanListView


urlpatterns = [
	path('plans/', PlanListView.as_view(), name='plan-list'),
	path('plans/complete-day/', CompletePlanDayView.as_view(), name='plan-complete-day'),
	path('plans/<slug:pk>/', PlanDetailView.as_view(), name='plan-detail'),
]

