from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema
from tracking.services.scan.bundle_transfer import transfer_bundles_to_line
from tracking.serializers.scan import (
    BundleTransferRequestSerializer,
    BundleTransferResponseSerializer,
)


@extend_schema(
    tags=["scanning"],
    request=BundleTransferRequestSerializer,
    responses={200: BundleTransferResponseSerializer},
    description=(
        "Transfer one or more already-issued bundles to a different sewing line "
        "(correct a wrong-line issue). Requires a bundle-issue scanner. Only "
        "bundles with status 'issued_to_sewing' that have not started assembly "
        "can be transferred; the batch is all-or-nothing."
    ),
)
@api_view(["POST"])
def bundle_transfer(request):
    """Transfer already-issued bundles to a different sewing line."""
    serializer = BundleTransferRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        result = transfer_bundles_to_line(
            bundle_ids=serializer.validated_data["bundle_ids"],
            sewing_line=serializer.validated_data["sewing_line"],
            user=request.user,
            reason=serializer.validated_data.get("reason", ""),
        )
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
