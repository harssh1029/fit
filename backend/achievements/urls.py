from django.urls import path

from .views import AchievementSummaryView, BadgeCatalogView, FeaturedBadgePinsView


urlpatterns = [
	path('achievements/me/', AchievementSummaryView.as_view(), name='achievements-me'),
	path('achievements/badges/', BadgeCatalogView.as_view(), name='achievements-badges'),
	path('achievements/badges/pins/', FeaturedBadgePinsView.as_view(), name='achievements-badge-pins'),
]
