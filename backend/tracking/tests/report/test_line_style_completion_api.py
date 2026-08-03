"""POST /reports/line-style-completion/ is idempotent.

"Mark Complete" is an operator *intent*, not an insert. The auto-completion
triggers (``tracking.services.line_completion``) may already have written an
AUTO row for the same line+order, and a completion recorded today does not hide
anything until tomorrow (``line_visibility.get_completed_order_ids``) — so the
row is still on the report, still offering the button. That click used to fail
the model's ``unique_together`` validation with
``{"non_field_errors": ["The fields production_line, order must make a unique
set."]}``. It now upgrades the existing row to MANUAL instead.
"""

import pytest
from django.urls import reverse
from rest_framework import status

from tracking.models import LineStyleCompletion
from tracking.models.constants import CompletionSource, LineType
from tracking.tests.conftest import ProductionLineFactory, OrderFactory


@pytest.mark.django_db
class TestLineStyleCompletionIdempotentPost:
    @pytest.fixture
    def scenario(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)
        return {"line": line, "order": order}

    def _post(self, client, line, order):
        return client.post(
            reverse("tracking:line-style-completion-list-create"),
            {"production_line": line.id, "order": order.id, "notes": ""},
            format="json",
        )

    def test_first_completion_creates_and_returns_201(
        self, authenticated_client, scenario
    ):
        response = self._post(
            authenticated_client, scenario["line"], scenario["order"]
        )

        assert response.status_code == status.HTTP_201_CREATED
        completion = LineStyleCompletion.objects.get(
            production_line=scenario["line"], order=scenario["order"]
        )
        assert completion.source == CompletionSource.MANUAL

    def test_post_over_existing_auto_row_upgrades_to_manual(
        self, authenticated_client, authenticated_user, scenario
    ):
        """The reported bug: an AUTO row already exists -> 200, not 400."""
        line, order = scenario["line"], scenario["order"]
        auto = LineStyleCompletion.objects.create(
            production_line=line,
            order=order,
            source=CompletionSource.AUTO,
            completed_by=None,
            notes="Auto-completed: fully output when a new style was assigned.",
        )
        original_created_at = LineStyleCompletion.objects.get(pk=auto.pk).created_at

        response = self._post(authenticated_client, line, order)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["source"] == CompletionSource.MANUAL

        # No duplicate row — the unique constraint is untouched and still holds.
        assert (
            LineStyleCompletion.objects.filter(
                production_line=line, order=order
            ).count()
            == 1
        )

        auto.refresh_from_db()
        assert auto.source == CompletionSource.MANUAL
        assert auto.completed_by == authenticated_user
        # created_at bounds effectivity (a completion hides from the day AFTER it
        # was recorded). Re-stamping it would push an already-hiding style back
        # onto the report for another day.
        assert auto.created_at == original_created_at
        # The original auto-completion reason survives as an audit trail when the
        # request carries no notes of its own.
        assert auto.notes.startswith("Auto-completed:")

    def test_repeated_manual_post_is_idempotent(
        self, authenticated_client, scenario
    ):
        line, order = scenario["line"], scenario["order"]

        first = self._post(authenticated_client, line, order)
        second = self._post(authenticated_client, line, order)

        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_200_OK
        assert (
            LineStyleCompletion.objects.filter(
                production_line=line, order=order
            ).count()
            == 1
        )
