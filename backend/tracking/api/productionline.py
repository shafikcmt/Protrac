from rest_framework import generics
from rest_framework.exceptions import ValidationError
from tracking.models import ProductionLine, Scanner
from tracking.api import BaseListCreateView, BaseDetailView
from tracking.serializers import (
    ProductionLineSerializer,
    ScannerListSerializer,
)


class ProductionLineListCreateView(BaseListCreateView):
    """List all production lines or create a new production line."""

    queryset = ProductionLine.objects.all()
    serializer_class = ProductionLineSerializer
    search_fields = ["name", "line_type"]
    filterset_fields = ["line_type"]
    ordering_fields = ["name", "line_type", "created_at"]


class ProductionLineDetailView(BaseDetailView):
    """Retrieve, update or delete a production line."""

    queryset = ProductionLine.objects.all()
    serializer_class = ProductionLineSerializer

    def perform_destroy(self, instance):
        """Prevent deletion of production lines that have related data."""
        # Check for assigned bundles
        if instance.bundles.exists():
            bundles_count = instance.bundles.count()
            raise ValidationError(
                {
                    "detail": f"Cannot delete Production Line '{instance.name}' because it has {bundles_count} assigned bundles.",
                    "code": "production_line_has_bundles",
                }
            )

        # Check for part inventories
        if instance.part_inventories.exists():
            inventories_count = instance.part_inventories.count()
            raise ValidationError(
                {
                    "detail": f"Cannot delete Production Line '{instance.name}' because it has {inventories_count} part inventories.",
                    "code": "production_line_has_inventories",
                }
            )

        # Check for produced garments
        if instance.produced_garments.exists():
            garments_count = instance.produced_garments.count()
            raise ValidationError(
                {
                    "detail": f"Cannot delete Production Line '{instance.name}' because it has {garments_count} produced garments.",
                    "code": "production_line_has_garments",
                }
            )

        # Check for finished garments
        if instance.finished_garments.exists():
            finished_count = instance.finished_garments.count()
            raise ValidationError(
                {
                    "detail": f"Cannot delete Production Line '{instance.name}' because it has {finished_count} finished garments.",
                    "code": "production_line_has_finished_garments",
                }
            )

        # Check for scanners
        if instance.scanners.exists():
            scanners_count = instance.scanners.count()
            raise ValidationError(
                {
                    "detail": f"Cannot delete Production Line '{instance.name}' because it has {scanners_count} associated scanners.",
                    "code": "production_line_has_scanners",
                }
            )

        super().perform_destroy(instance)


class ScannerListView(generics.ListAPIView):
    """List all scanners (read-only)."""

    queryset = Scanner.objects.select_related("production_line").all()
    serializer_class = ScannerListSerializer
