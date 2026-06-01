from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
	LoginTokenObtainPairView,
	MeView,
	ProfileAvatarUploadView,
	ProfileFollowersView,
	ProfileFollowingView,
	ProfilePostsView,
	ProfileSummaryView,
	PublicProfileView,
	RegisterValidationView,
	RegisterView,
)


urlpatterns = [
	path('admin/', admin.site.urls),
	path('api/v1/auth/register/validate/', RegisterValidationView.as_view(), name='auth-register-validate'),
	path('api/v1/auth/register/', RegisterView.as_view(), name='auth-register'),
	path('api/v1/auth/jwt/create/', LoginTokenObtainPairView.as_view(), name='jwt-create'),
	path('api/v1/auth/jwt/refresh/', TokenRefreshView.as_view(), name='jwt-refresh'),
	path('api/v1/me/', MeView.as_view(), name='me'),
	path('api/v1/profiles/me/avatar/', ProfileAvatarUploadView.as_view(), name='profile-avatar-upload'),
	path('api/v1/profiles/me/posts/', ProfilePostsView.as_view(), name='profile-posts'),
	path('api/v1/profiles/me/summary/', ProfileSummaryView.as_view(), name='profile-summary'),
	path('api/v1/profiles/<int:user_id>/public/', PublicProfileView.as_view(), name='profile-public'),
	path('api/v1/profiles/<int:user_id>/followers/', ProfileFollowersView.as_view(), name='profile-followers'),
	path('api/v1/profiles/<int:user_id>/following/', ProfileFollowingView.as_view(), name='profile-following'),
	path('api/v1/', include('exercises.urls')),
	path('api/v1/', include('plans.urls')),
	path('api/v1/', include('insights.urls')),
	path('api/v1/', include('workouts.urls')),
	path('api/v1/', include('challenges.urls')),
	path('api/v1/', include('community.urls')),
	path('api/v1/', include('achievements.urls')),
]

if settings.DEBUG:
	urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
