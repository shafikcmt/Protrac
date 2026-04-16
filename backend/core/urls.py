from django.contrib import admin
from django.conf import settings
from django.urls import path, include
from common import urls as common_urls
from accounts import urls as accounts_urls
from tracking import urls as tracking_urls
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Admin interface
    path("admin/", admin.site.urls),
    # Schema generation and Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger",
    ),
    # Common app URLs
    path("api/common/", include(common_urls)),
    # Accounts app URLs
    path("api/accounts/", include(accounts_urls)),
    # Tracking app URLs
    path("api/tracking/", include(tracking_urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
