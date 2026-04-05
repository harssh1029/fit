from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile
from .serializers import ProfileSerializer, RegisterSerializer, UserSerializer


User = get_user_model()


class MeView(APIView):
	"""Return and update the authenticated user's profile.

	GET  /api/v1/me/   -> user + profile
	PATCH /api/v1/me/  -> partial update of profile fields
	"""

	permission_classes = [IsAuthenticated]

	def get(self, request):
		user: User = request.user
		profile, _ = Profile.objects.get_or_create(user=user)
		data = {
			'id': user.id,
			'username': user.get_username(),
			'email': user.email,
			'profile': ProfileSerializer(profile).data,
		}
		return Response(data)

	def patch(self, request):
		user: User = request.user
		profile, _ = Profile.objects.get_or_create(user=user)
		serializer = ProfileSerializer(profile, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		data = {
			'id': user.id,
			'username': user.get_username(),
			'email': user.email,
			'profile': serializer.data,
		}
		return Response(data)


class RegisterView(APIView):
	"""Register a new user and return JWT tokens.

	POST /api/v1/auth/register/
	"""

	permission_classes = [AllowAny]

	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()

		refresh = RefreshToken.for_user(user)
		data = {
			'user': UserSerializer(user).data,
			'access': str(refresh.access_token),
			'refresh': str(refresh),
		}
		return Response(data, status=status.HTTP_201_CREATED)
