from rest_framework.exceptions import ValidationError
from tracking.models import Bundle
from rest_framework import generics, status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from tracking.api import BaseListCreateView, BaseDetailView
from django_filters.rest_framework import DjangoFilterBackend
from tracking.serializers import (
    BundleSerializer,
    BulkBundleCreateSerializer,
    BundleCreationPreviewSerializer,
    BundleCreationPreviewRequestSerializer,
    BulkBundleCreateResponseSerializer,
    SingleBundleSetCreateSerializer,
    SingleBundleSetCreateResponseSerializer,
)


@extend_schema(
    request=SingleBundleSetCreateSerializer,
    responses={
        200: BundleSerializer(many=True),
        201: SingleBundleSetCreateResponseSerializer,
    },
    parameters=[
        OpenApiParameter(
            "mother_only",
            bool,
            description="Filter to only show mother bundles",
        ),
    ],
)
class BundleListCreateView(BaseListCreateView):
    """List bundles or create bundle sets for a style."""

    queryset = Bundle.objects.select_related(
        "order__style", "order__size", "order__color", "part", "spread"
    ).all()
    serializer_class = BundleSerializer
    filter_backends = [*BaseListCreateView.filter_backends, DjangoFilterBackend]
    search_fields = [
        "tracking_code",
        "order__order_number",
        "order__style__name",
        "part__name",
    ]
    filterset_fields = [
        "order",
        "order__style",
        "part",
        "status",
        "order__size",
        "order__color",
        "spread",
    ]
    ordering_fields = [
        "tracking_code",
        "order__order_number",
        "quantity",
        "status",
        "created_at",
    ]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        """Use SingleBundleSetCreateSerializer for creating bundle sets."""
        if self.request.method == "POST":
            return SingleBundleSetCreateSerializer
        return self.serializer_class

    def get_queryset(self):
        """Filter queryset based on query parameters."""
        queryset = super().get_queryset()

        # Filter for mother bundles only if requested
        mother_only = self.request.query_params.get("mother_only", None)
        if mother_only and mother_only.lower() in ["true", "1"]:
            # Simple filter for bundles - no longer using cut_part logic
            # Just return all bundles (or add specific filtering logic if needed)
            pass

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a bundle set and return properly formatted response."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        # Use the response serializer to ensure consistent structure
        response_serializer = SingleBundleSetCreateResponseSerializer(
            {
                "bundles": result["bundles"],
                "bundle_count": result["bundle_count"],
                "bundle_number": result["bundle_number"],
                "bundle_size": result["garment_quantity"],
                "part_range": result["part_range"],
            },
            context={"request": request},
        )

        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class BundleDetailView(BaseDetailView):
    """Retrieve, update or delete a bundle."""

    queryset = Bundle.objects.select_related(
        "order__style", "order__size", "order__color", "part", "spread"
    ).all()
    serializer_class = BundleSerializer

    def perform_destroy(self, instance):
        """Prevent deletion of bundles that have scans or are in production."""
        # Check if bundle has any scans
        if instance.scans.exists():
            scans_count = instance.scans.count()
            raise ValidationError(
                {
                    "detail": f"Cannot delete Bundle '{instance.tracking_code}' because it has {scans_count} related scans. This bundle has been tracked in production.",
                    "code": "bundle_has_scans",
                }
            )

        # Check if bundle is issued to sewing or completed
        if instance.status in ["issued_to_sewing", "completed"]:
            raise ValidationError(
                {
                    "detail": f"Cannot delete Bundle '{instance.tracking_code}' because it is {instance.get_status_display()}. Only created bundles can be deleted.",
                    "code": "bundle_in_production",
                }
            )

        # Check if bundle is assigned to a sewing line
        if instance.assigned_sewing_line:
            raise ValidationError(
                {
                    "detail": f"Cannot delete Bundle '{instance.tracking_code}' because it is assigned to production line '{instance.assigned_sewing_line.name}'.",
                    "code": "bundle_assigned_to_line",
                }
            )

        super().perform_destroy(instance)


@extend_schema(
    request=BundleCreationPreviewRequestSerializer,
    responses={200: BundleCreationPreviewSerializer},
)
class BulkBundlePreviewView(generics.CreateAPIView):
    """Preview bundles that would be created for bulk creation."""

    serializer_class = BundleCreationPreviewRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Use to_representation to generate preview without saving
        preview_data = serializer.to_representation(serializer.validated_data)

        return Response(preview_data, status=status.HTTP_200_OK)


@extend_schema(
    request=BulkBundleCreateSerializer,
    responses={201: BulkBundleCreateResponseSerializer},
)
class BulkBundleCreateView(generics.CreateAPIView):
    """Create multiple bundles for all required cut parts of an order."""

    serializer_class = BulkBundleCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        # Use the response serializer to ensure consistent structure
        response_serializer = BulkBundleCreateResponseSerializer(
            {
                "bundles": result["bundles"],
                "bundle_sets": result["bundle_sets"],
                "total_bundle_count": result["total_bundle_count"],
                "total_garment_quantity": result["total_garment_quantity"],
                "distribution": result["distribution"],
            },
            context={"request": request},
        )

        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
