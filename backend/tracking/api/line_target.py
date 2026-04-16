from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from tracking.models import LineTarget
from tracking.serializers.line_target import LineTargetSerializer


class LineTargetListCreateView(generics.ListCreateAPIView):
    """List and create line targets."""

    queryset = LineTarget.objects.all()
    serializer_class = LineTargetSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["line", "date"]
    search_fields = ["line__name"]
    ordering_fields = ["date", "line__name"]
    ordering = ["-date", "line__name"]


class LineTargetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete line targets."""

    queryset = LineTarget.objects.all()
    serializer_class = LineTargetSerializer
