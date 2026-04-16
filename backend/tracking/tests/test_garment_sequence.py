import pytest
from tracking.tests.conftest import OrderFactory, GarmentFactory
from tracking.models import Garment


@pytest.mark.django_db
class TestGarmentSequenceNumbers:
    """Test the garment sequence numbering functionality."""

    def test_garment_sequence_number_display(self):
        """Test that garment display numbers work correctly with sequence numbers."""
        order = OrderFactory()

        # Create garments with specific sequence numbers
        garment1 = GarmentFactory(order=order, sequence_number=1)
        garment2 = GarmentFactory(order=order, sequence_number=5)
        garment3 = GarmentFactory(order=order, sequence_number=10)

        # Test display numbers
        assert garment1.display_number == f"{order.order_number}-G0001"
        assert garment2.display_number == f"{order.order_number}-G0005"
        assert garment3.display_number == f"{order.order_number}-G0010"

    def test_garment_sequence_number_auto_generated(self):
        """Test that garments have auto-generated sequence numbers."""
        order = OrderFactory()

        garment = GarmentFactory(order=order)

        assert garment.sequence_number is not None
        assert garment.sequence_number > 0
        assert (
            garment.display_number
            == f"{order.order_number}-G{garment.sequence_number:04d}"
        )

    def test_garment_sequence_unique_constraint(self):
        """Test that sequence numbers are unique per order."""
        order1 = OrderFactory()
        order2 = OrderFactory()

        # Can create garments with same sequence number in different orders
        garment1 = GarmentFactory(order=order1, sequence_number=1)
        garment2 = GarmentFactory(order=order2, sequence_number=1)

        assert garment1.sequence_number == 1
        assert garment2.sequence_number == 1
        assert garment1.order != garment2.order

        # Cannot create duplicate sequence number in same order
        from django.db import IntegrityError

        with pytest.raises(IntegrityError):
            GarmentFactory(order=order1, sequence_number=1)

    def test_garment_ordering(self):
        """Test that garments are ordered by sequence number."""
        order = OrderFactory()

        # Create garments in non-sequential order
        garment3 = GarmentFactory(order=order, sequence_number=3)
        garment1 = GarmentFactory(order=order, sequence_number=1)
        garment2 = GarmentFactory(order=order, sequence_number=2)

        # Query should return them in sequence order
        garments = list(Garment.objects.filter(order=order))
        assert garments == [garment1, garment2, garment3]
