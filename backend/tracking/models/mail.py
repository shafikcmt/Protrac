from django.db import models

from common.models import BaseModel

__all__ = ["MailRecipient", "RecipientType", "ReportType"]


class RecipientType(models.TextChoices):
    TO = "to", "To"
    CC = "cc", "Cc"


class ReportType(models.TextChoices):
    DAILY_PRODUCTION = "daily_production", "Daily Production"


class MailRecipient(BaseModel):
    """
    A single email recipient for an automated report, managed via Django admin.

    Rows are split into To / Cc by ``recipient_type`` at send time. ``report_type``
    lets one table serve several future reports without a new model; only active
    rows for the matching report are used.
    """

    email = models.EmailField()
    name = models.CharField(
        max_length=150,
        blank=True,
        help_text="Optional human label, e.g. 'Production Manager'.",
    )
    recipient_type = models.CharField(
        max_length=2,
        choices=RecipientType.choices,
        default=RecipientType.TO,
        help_text="Whether this address goes in the To or Cc field.",
    )
    report_type = models.CharField(
        max_length=32,
        choices=ReportType.choices,
        default=ReportType.DAILY_PRODUCTION,
        help_text="Which automated report this recipient should receive.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive recipients are skipped when sending.",
    )

    class Meta:
        verbose_name = "Mail Recipient"
        verbose_name_plural = "Mail Recipients"
        ordering = ["report_type", "recipient_type", "email"]

    def __str__(self) -> str:
        label = f" ({self.name})" if self.name else ""
        return f"{self.email}{label} [{self.get_recipient_type_display()}]"
