from typing import Callable

from django.http import HttpRequest, HttpResponse


class SimpleCorsMiddleware:
	"""Very small CORS middleware for local development.

	Allows the Expo web dev server (different port) to call the Django API
	without running into browser CORS "Failed to fetch" errors.
	"""

	def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
		self.get_response = get_response

	def __call__(self, request: HttpRequest) -> HttpResponse:  # type: ignore[override]
		# Handle CORS preflight before hitting view/auth logic so that
		# authenticated endpoints (like /api/v1/me/) don't reject OPTIONS with 401.
		if request.method == "OPTIONS":
			response = HttpResponse()
		else:
			response = self.get_response(request)

		response["Access-Control-Allow-Origin"] = "*"
		response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
		response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
		return response
