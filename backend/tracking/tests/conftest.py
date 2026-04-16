import pytest
import factory
from rest_framework.test import APIClient
from factory.django import DjangoModelFactory
from accounts.tests.conftest import UserFactory
from tracking.models.constants import LineType, GarmentStatus, QualityCheckStatus
from tracking.models.tracking import (
    Buyer,
    Season,
    Size,
    Color,
    Part,
    PartInventory,
    Defect,
    Spread,
    ProductionLine,
    Style,
    Order,
    Bundle,
    Garment,
    QualityCheck,
)


# --- Factories ---


class BaseNamedFactory(DjangoModelFactory):
    """Base factory for models with name field."""

    name = factory.Sequence(lambda n: f"Test Item {n}")

    class Meta:
        abstract = True


class BuyerFactory(BaseNamedFactory):
    class Meta:
        model = Buyer


class SeasonFactory(BaseNamedFactory):
    class Meta:
        model = Season


class SizeFactory(BaseNamedFactory):
    class Meta:
        model = Size

    index = factory.Sequence(lambda n: n)


class ColorFactory(BaseNamedFactory):
    class Meta:
        model = Color


class DefectFactory(BaseNamedFactory):
    class Meta:
        model = Defect


class SpreadFactory(DjangoModelFactory):
    class Meta:
        model = Spread

    number = factory.Sequence(lambda n: f"SP{n:03d}")


class ProductionLineFactory(BaseNamedFactory):
    class Meta:
        model = ProductionLine

    line_type = factory.Iterator([choice[0] for choice in LineType.choices])


class StyleFactory(BaseNamedFactory):
    class Meta:
        model = Style

    buyer = factory.SubFactory(BuyerFactory)
    season = factory.SubFactory(SeasonFactory)


class PartFactory(BaseNamedFactory):
    class Meta:
        model = Part


class OrderFactory(DjangoModelFactory):
    class Meta:
        model = Order

    order_number = factory.Sequence(lambda n: f"ORD-{n:06d}")
    style = factory.SubFactory(StyleFactory)
    size = factory.SubFactory(SizeFactory)
    color = factory.SubFactory(ColorFactory)
    quantity = factory.Faker("random_int", min=50, max=500)
    production_cutting_date = factory.Faker(
        "date_between", start_date="+1d", end_date="+30d"
    )
    delivery_date = factory.Faker("date_between", start_date="+31d", end_date="+90d")


class PartInventoryFactory(DjangoModelFactory):
    class Meta:
        model = PartInventory

    production_line = factory.SubFactory(ProductionLineFactory)
    order = factory.SubFactory(OrderFactory)
    part = factory.SubFactory(PartFactory)
    total_quantity = factory.Faker("random_int", min=10, max=100)
    issued_quantity = 0


class BundleFactory(DjangoModelFactory):
    class Meta:
        model = Bundle

    order = factory.SubFactory(OrderFactory)
    part = factory.SubFactory(PartFactory)
    spread = factory.SubFactory(SpreadFactory)
    bundle_number_in_spread = factory.Sequence(lambda n: n + 1)
    garment_quantity = factory.Faker("random_int", min=10, max=100)
    part_number_start = 1
    part_number_end = factory.LazyAttribute(
        lambda obj: obj.part_number_start + obj.garment_quantity - 1
    )


class GarmentFactory(DjangoModelFactory):
    class Meta:
        model = Garment

    order = factory.SubFactory(OrderFactory)
    sequence_number = factory.Sequence(lambda n: n + 1)
    bundle_set_number = factory.Sequence(lambda n: n + 1)
    part_number_in_bundle = factory.Sequence(lambda n: n + 1)
    status = factory.Iterator([choice[0] for choice in GarmentStatus.choices])


class QualityCheckFactory(DjangoModelFactory):
    class Meta:
        model = QualityCheck

    garment = factory.SubFactory(GarmentFactory)
    status = factory.Iterator([choice[0] for choice in QualityCheckStatus.choices])


# --- Test Data ---

BASIC_ENDPOINTS = {
    "buyer": {
        "factory": BuyerFactory,
        "create_data": {"name": "Test Buyer"},
        "update_data": {"name": "Updated Buyer"},
    },
    "season": {
        "factory": SeasonFactory,
        "create_data": {"name": "Test Season"},
        "update_data": {"name": "Updated Season"},
    },
    "size": {
        "factory": SizeFactory,
        "create_data": {"name": "XL", "index": 5},
        "update_data": {"name": "XXL", "index": 6},
    },
    "color": {
        "factory": ColorFactory,
        "create_data": {"name": "Red"},
        "update_data": {"name": "Blue"},
    },
    "part": {
        "factory": PartFactory,
        "create_data": {"name": "Test Part"},
        "update_data": {"name": "Updated Part"},
    },
    "defect": {
        "factory": DefectFactory,
        "create_data": {"name": "Stitching Issue", "description": "Loose stitching"},
        "update_data": {"name": "Color Defect", "description": "Color mismatch"},
    },
    "spread": {
        "factory": SpreadFactory,
        "create_data": {"number": "SP001"},
        "update_data": {"number": "SP002"},
        "primary_field": "number",
    },
    "productionline": {
        "factory": ProductionLineFactory,
        "create_data": {"name": "Line A", "line_type": "cutting"},
        "update_data": {"name": "Updated Line A"},
    },
}


# --- Fixtures ---


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_user():
    """Create an authenticated user."""
    return UserFactory()


@pytest.fixture
def authenticated_client(authenticated_user):
    """Create an API client with authenticated user."""
    client = APIClient()
    client.force_authenticate(user=authenticated_user)
    return client


@pytest.fixture
def basic_instances():
    """Create instances for all basic endpoints."""
    return {name: data["factory"]() for name, data in BASIC_ENDPOINTS.items()}
