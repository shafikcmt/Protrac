from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from accounts.serializers import (
    UserProfileSerializer,
    UserProfileUpdateSerializer,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView as BaseTokenObtainPairView,
    TokenRefreshView as BaseTokenRefreshView,
)


class TokenObtainPairView(BaseTokenObtainPairView):
    pass


class TokenRefreshView(BaseTokenRefreshView):
    pass


class UserProfileView(generics.RetrieveAPIView):
    """Get current user's profile information."""

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    @extend_schema(
        operation_id="get_user_profile",
        summary="Get user profile",
        description="Retrieve the current user's profile information including permissions",
        responses={
            200: OpenApiResponse(
                response=UserProfileSerializer, description="User profile data"
            ),
        },
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class UserProfileUpdateView(generics.UpdateAPIView):
    """Update current user's profile (partial update only)."""

    serializer_class = UserProfileUpdateSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch"]

    def get_object(self):
        return self.request.user

    @extend_schema(
        operation_id="update_user_profile",
        summary="Update user profile",
        description="Update user profile information (name and image only)",
        request=UserProfileUpdateSerializer,
        responses={
            200: OpenApiResponse(
                response=UserProfileSerializer, description="Updated user profile data"
            ),
            400: OpenApiResponse(description="Validation error"),
        },
    )
    def patch(self, request, *args, **kwargs):
        """Handle profile update and return full profile data."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return full profile data using the read serializer
        profile_serializer = UserProfileSerializer(instance)
        return Response(profile_serializer.data)
