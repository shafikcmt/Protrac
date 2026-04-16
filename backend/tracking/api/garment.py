from tracking.models import Garment
from rest_framework import generics
from tracking.serializers import GarmentSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django_filters.rest_framework import DjangoFilterBackend


@extend_schema(
    parameters=[
        OpenApiParameter(
            "bundle_ids",
            str,
            description="Comma-separated bundle IDs to filter garments by (e.g., '1,2,3')",
        ),
    ],
)
class GarmentListView(generics.ListAPIView):
    """List garments."""

    queryset = Garment.objects.select_related(
        "order__style", "order__size", "order__color", "primary_bundle"
    ).all()
    serializer_class = GarmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        "order",
        "order__order_number",
        "status",
        "primary_bundle",
    ]

    def get_queryset(self):
        """Filter garments by bundle IDs if provided."""
        queryset = super().get_queryset()

        # Filter by bundle IDs if provided
        bundle_ids = self.request.query_params.get("bundle_ids")
        if bundle_ids:
            try:
                # Parse comma-separated bundle IDs
                bundle_id_list = [
                    int(id.strip()) for id in bundle_ids.split(",") if id.strip()
                ]
                if bundle_id_list:
                    # Filter garments where primary_bundle is in the provided list
                    queryset = queryset.filter(primary_bundle_id__in=bundle_id_list)
            except ValueError:
                # Invalid bundle IDs format - return empty queryset
                queryset = queryset.none()

        return queryset


class GarmentDetailView(generics.RetrieveAPIView):  # Changed from BaseDetailView
    """Retrieve garment details."""

    queryset = Garment.objects.select_related(
        "order__style", "order__size", "order__color"
    ).all()
    serializer_class = GarmentSerializer
