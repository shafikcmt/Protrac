from rest_framework import generics
from django.db.models.functions import Length
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.exceptions import ValidationError
from tracking.models import Buyer, Season, Size, Color, Part, Defect, Spread
from tracking.serializers import (
    BuyerSerializer,
    SeasonSerializer,
    SizeSerializer,
    ColorSerializer,
    PartSerializer,
    DefectSerializer,
    SpreadSerializer,
)


class BaseListCreateView(generics.ListCreateAPIView):
    """Base class for list/create views with common configuration."""

    filter_backends = [SearchFilter, OrderingFilter]
    ordering_fields = ["created_at"]
    ordering = ["created_at"]
    search_fields = ["name"]

    def perform_create(self, serializer):
        """Set the created_by field when creating an object."""
        serializer.save(created_by=self.request.user)


class BaseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Base class for detail views."""

    def perform_update(self, serializer):
        """Set the updated_by field when updating an object."""
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        """Check for related objects before deletion to prevent cascading deletions."""
        # Get the model class
        model_class = instance.__class__
        model_name = model_class.__name__.lower()

        # Define related fields to check for each model
        related_fields_map = {
            "buyer": ["styles"],
            "season": ["styles"],
            "size": ["orders_with_size"],
            "color": ["orders_with_color"],
            "part": ["bundles", "inventories"],
            "defect": ["qualitycheck_set"],
            "spread": ["bundles"],
        }

        # Check if this model type should be protected
        if model_name in related_fields_map:
            related_fields = related_fields_map[model_name]

            # Check each related field for existing objects
            for field_name in related_fields:
                try:
                    related_manager = getattr(instance, field_name)
                    if hasattr(related_manager, "exists") and related_manager.exists():
                        # Get the first few related objects for the error message
                        related_objects = list(related_manager.all()[:3])
                        object_names = [str(obj) for obj in related_objects]
                        more_count = related_manager.count() - len(object_names)

                        # Create more descriptive error messages based on the model
                        if model_name == "buyer":
                            error_msg = f"Cannot delete Buyer '{instance}' because it has {related_manager.count()} related styles: {', '.join(object_names)}"
                        elif model_name == "season":
                            error_msg = f"Cannot delete Season '{instance}' because it has {related_manager.count()} related styles: {', '.join(object_names)}"
                        elif model_name == "size":
                            error_msg = f"Cannot delete Size '{instance}' because it is used in {related_manager.count()} orders"
                        elif model_name == "color":
                            error_msg = f"Cannot delete Color '{instance}' because it is used in {related_manager.count()} orders"
                        elif model_name == "part":
                            if field_name == "bundles":
                                error_msg = f"Cannot delete Part '{instance}' because it has {related_manager.count()} related bundles"
                            else:
                                error_msg = f"Cannot delete Part '{instance}' because it is used in {related_manager.count()} inventories"
                        elif model_name == "defect":
                            error_msg = f"Cannot delete Defect '{instance}' because it has been used in {related_manager.count()} quality checks"
                        elif model_name == "spread":
                            error_msg = f"Cannot delete Spread '{instance}' because it has {related_manager.count()} related bundles: {', '.join(object_names)}"
                        else:
                            error_msg = f"Cannot delete {model_class.__name__} '{instance}' because it has related {field_name.replace('_', ' ')}: {', '.join(object_names)}"
                        if more_count > 0:
                            error_msg += f" and {more_count} more"

                        raise ValidationError(
                            {
                                "detail": error_msg,
                                "code": f"{model_name}_has_related_{field_name}",
                            }
                        )
                except AttributeError:
                    # Field doesn't exist, continue checking other fields
                    continue

        # If no related objects found, proceed with deletion
        super().perform_destroy(instance)


class BuyerListCreateView(BaseListCreateView):
    queryset = Buyer.objects.all()
    serializer_class = BuyerSerializer


class BuyerDetailView(BaseDetailView):
    queryset = Buyer.objects.all()
    serializer_class = BuyerSerializer


class SeasonListCreateView(BaseListCreateView):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer


class SeasonDetailView(BaseDetailView):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer


class SizeListCreateView(BaseListCreateView):
    queryset = Size.objects.all()
    serializer_class = SizeSerializer
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    ordering_fields = ["name", "index", "created_at"]
    ordering = ["index", "name"]
    filterset_fields = ["index"]


class SizeDetailView(BaseDetailView):
    queryset = Size.objects.all()
    serializer_class = SizeSerializer


class ColorListCreateView(BaseListCreateView):
    queryset = Color.objects.all()
    serializer_class = ColorSerializer


class ColorDetailView(BaseDetailView):
    queryset = Color.objects.all()
    serializer_class = ColorSerializer


class PartListCreateView(BaseListCreateView):
    queryset = Part.objects.all()
    serializer_class = PartSerializer


class PartDetailView(BaseDetailView):
    queryset = Part.objects.all()
    serializer_class = PartSerializer


class DefectListCreateView(BaseListCreateView):
    serializer_class = DefectSerializer
    # Register scheme: A, B … Z, then Aa, Bb … — i.e. sort by code LENGTH first,
    # then alphabetically. Model Meta.ordering (plain ["code", "name"]) can't
    # express that, so annotate the code length and order on it here. Overriding
    # `ordering` also stops the base OrderingFilter default ("created_at") from
    # clobbering this sequence. Empty codes (length 0) sort first, per spec.
    ordering = ["code_len", "code", "name"]

    def get_queryset(self):
        return Defect.objects.annotate(code_len=Length("code"))


class DefectDetailView(BaseDetailView):
    queryset = Defect.objects.all()
    serializer_class = DefectSerializer


class SpreadListCreateView(BaseListCreateView):
    queryset = Spread.objects.all()
    serializer_class = SpreadSerializer


class SpreadDetailView(BaseDetailView):
    queryset = Spread.objects.all()
    serializer_class = SpreadSerializer
