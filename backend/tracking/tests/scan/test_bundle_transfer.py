import pytest
from django.urls import reverse
from rest_framework import status
from tracking.models import Scanner, BundleTransfer, Garment
from tracking.models.constants import (
    ScannerType,
    BundleStatus,
    LineType,
    GarmentStatus,
)
from tracking.tests.conftest import (
    BundleFactory,
    ProductionLineFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestBundleTransfer:
    """Test the manual bundle transfer endpoint."""

    @pytest.fixture
    def setup_data(self):
        line_a = ProductionLineFactory(line_type=LineType.SEWING, name="Line A")
        line_b = ProductionLineFactory(line_type=LineType.SEWING, name="Line B")

        cutting_line = ProductionLineFactory(line_type=LineType.CUTTING)
        scanner = Scanner.objects.create(
            name="Bundle Issue Scanner",
            scanner_type=ScannerType.BUNDLE_ISSUE,
            production_line=cutting_line,
        )
        user = UserFactory(assigned_scanner=scanner)

        bundle = BundleFactory(
            status=BundleStatus.ISSUED_TO_SEWING, assigned_sewing_line=line_a
        )
        return {
            "user": user,
            "line_a": line_a,
            "line_b": line_b,
            "bundle": bundle,
        }

    def _url(self):
        return reverse("tracking:bundle-transfer")

    def test_transfer_success(self, api_client, setup_data):
        api_client.force_authenticate(user=setup_data["user"])
        response = api_client.post(
            self._url(),
            {
                "bundle_ids": [setup_data["bundle"].id],
                "sewing_line": setup_data["line_b"].id,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["transferred_count"] == 1

        setup_data["bundle"].refresh_from_db()
        assert setup_data["bundle"].assigned_sewing_line == setup_data["line_b"]

        # Audit row records from -> to and who.
        transfer = BundleTransfer.objects.get(bundle=setup_data["bundle"])
        assert transfer.from_line == setup_data["line_a"]
        assert transfer.to_line == setup_data["line_b"]
        assert transfer.created_by == setup_data["user"]

    def test_issued_at_preserved(self, api_client, setup_data):
        bundle = setup_data["bundle"]
        from django.utils import timezone

        original = timezone.now()
        bundle.issued_at = original
        bundle.save(update_fields=["issued_at"])

        api_client.force_authenticate(user=setup_data["user"])
        self._post_ok(api_client, bundle, setup_data["line_b"])

        bundle.refresh_from_db()
        assert bundle.issued_at == original

    def test_created_status_bundle_blocked(self, api_client, setup_data):
        created_bundle = BundleFactory(status=BundleStatus.CREATED)
        api_client.force_authenticate(user=setup_data["user"])
        response = api_client.post(
            self._url(),
            {
                "bundle_ids": [created_bundle.id],
                "sewing_line": setup_data["line_b"].id,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not issued to a sewing line" in response.data["error"]
        created_bundle.refresh_from_db()
        assert created_bundle.assigned_sewing_line is None

    def test_assembly_started_blocked(self, api_client, setup_data):
        """A bundle whose set already has a garment on a line is not transferable.

        Bundle.save() auto-creates the set's garment records (pending, no line);
        we simulate assembly having started by placing one on the old line.
        """
        bundle = setup_data["bundle"]
        garment = Garment.objects.filter(
            order=bundle.order,
            bundle_set_number=bundle.bundle_number_in_spread,
        ).first()
        assert garment is not None
        garment.sewing_line = setup_data["line_a"]
        garment.status = GarmentStatus.ISSUED_FOR_ASSEMBLY
        garment.save()

        api_client.force_authenticate(user=setup_data["user"])
        response = api_client.post(
            self._url(),
            {"bundle_ids": [bundle.id], "sewing_line": setup_data["line_b"].id},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "assembly already started" in response.data["error"]
        bundle.refresh_from_db()
        assert bundle.assigned_sewing_line == setup_data["line_a"]

    def test_batch_is_all_or_nothing(self, api_client, setup_data):
        """One ineligible bundle blocks the whole batch; nothing moves."""
        good = setup_data["bundle"]
        bad = BundleFactory(status=BundleStatus.CREATED)

        api_client.force_authenticate(user=setup_data["user"])
        response = api_client.post(
            self._url(),
            {
                "bundle_ids": [good.id, bad.id],
                "sewing_line": setup_data["line_b"].id,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        good.refresh_from_db()
        assert good.assigned_sewing_line == setup_data["line_a"]
        assert not BundleTransfer.objects.exists()

    def test_same_line_rejected(self, api_client, setup_data):
        api_client.force_authenticate(user=setup_data["user"])
        response = api_client.post(
            self._url(),
            {
                "bundle_ids": [setup_data["bundle"].id],
                "sewing_line": setup_data["line_a"].id,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already on" in response.data["error"]

    def test_requires_bundle_issue_scanner(self, api_client, setup_data):
        user_no_scanner = UserFactory(assigned_scanner=None)
        api_client.force_authenticate(user=user_no_scanner)
        response = api_client.post(
            self._url(),
            {
                "bundle_ids": [setup_data["bundle"].id],
                "sewing_line": setup_data["line_b"].id,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        setup_data["bundle"].refresh_from_db()
        assert setup_data["bundle"].assigned_sewing_line == setup_data["line_a"]

    def _post_ok(self, api_client, bundle, line):
        response = api_client.post(
            self._url(),
            {"bundle_ids": [bundle.id], "sewing_line": line.id},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        return response
