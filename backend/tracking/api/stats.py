from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from tracking.models import Order, Style, Bundle
from tracking.models.constants import BundleStatus


class OverviewStatsSerializer(serializers.Serializer):
    """Lightweight dashboard counts for the Overview page."""

    total_orders = serializers.IntegerField()
    total_styles = serializers.IntegerField()
    total_bundles = serializers.IntegerField()
    completed_bundles = serializers.IntegerField()
    completion_rate = serializers.FloatField()


class OverviewStatsView(APIView):
    """Return aggregate counts only.

    The Overview dashboard previously fetched the full ``orders``/``styles``/
    ``bundles`` lists just to read their ``count``. With ``PAGE_SIZE`` set very
    high those endpoints serialize the entire table (multi-MB, ~24s for
    bundles), which left the dashboard stuck on "Loading...". This endpoint runs
    plain ``COUNT(*)`` queries instead so the page loads instantly.
    """

    @extend_schema(responses={200: OverviewStatsSerializer})
    def get(self, request):
        total_bundles = Bundle.objects.count()
        completed_bundles = Bundle.objects.filter(
            status=BundleStatus.COMPLETED
        ).count()
        completion_rate = (
            (completed_bundles / total_bundles * 100) if total_bundles else 0.0
        )

        data = {
            "total_orders": Order.objects.count(),
            "total_styles": Style.objects.count(),
            "total_bundles": total_bundles,
            "completed_bundles": completed_bundles,
            "completion_rate": round(completion_rate, 2),
        }

        serializer = OverviewStatsSerializer(data)
        return Response(serializer.data)
