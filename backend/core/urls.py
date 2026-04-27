"""URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/

Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import MeView, RegisterView


urlpatterns = [
		path('admin/', admin.site.urls),
		# Auth
		path('api/v1/auth/register/', RegisterView.as_view(), name='auth-register'),
		path('api/v1/auth/jwt/create/', TokenObtainPairView.as_view(), name='jwt-create'),
		path('api/v1/auth/jwt/refresh/', TokenRefreshView.as_view(), name='jwt-refresh'),
		# User profile
		path('api/v1/me/', MeView.as_view(), name='me'),
			# Domain APIs
			path('api/v1/', include('exercises.urls')),
			path('api/v1/', include('plans.urls')),
			path('api/v1/', include('insights.urls')),
			path('api/v1/', include('workouts.urls')),
			path('api/v1/', include('challenges.urls')),
]

