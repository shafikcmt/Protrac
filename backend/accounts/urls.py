from django.urls import path
from accounts.api import (
    TokenObtainPairView,
    TokenRefreshView,
    UserProfileView,
    UserProfileUpdateView,
)

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh-token/", TokenRefreshView.as_view(), name="refresh-token"),
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path(
        "profile/update/", UserProfileUpdateView.as_view(), name="user-profile-update"
    ),
]
