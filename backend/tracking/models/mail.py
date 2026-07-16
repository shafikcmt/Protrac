from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common.models import BaseModel

__all__ = [
    "MailRecipient",
    "RecipientType",
    "ReportType",
    "ReportScheduleConfig",
]


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


class ReportScheduleConfig(BaseModel):
    """
    Singleton (per report_type) schedule for an automated report email, editable
    from Django admin. Saving a row live-reschedules the APScheduler job — no
    server restart needed. ``is_enabled`` pauses the scheduled email without
    deleting recipients.
    """

    report_type = models.CharField(
        max_length=32,
        choices=ReportType.choices,
        default=ReportType.DAILY_PRODUCTION,
        unique=True,
        help_text="Which automated report this schedule controls.",
    )
    send_hour = models.PositiveSmallIntegerField(
        default=18,
        validators=[MinValueValidator(0), MaxValueValidator(23)],
        help_text="Hour of day to send (0-23, Asia/Dhaka).",
    )
    send_minute = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(59)],
        help_text="Minute of the hour to send (0-59).",
    )
    is_enabled = models.BooleanField(
        default=True,
        help_text="Turn off to pause the scheduled email entirely.",
    )

    class Meta:
        verbose_name = "Report Schedule"
        verbose_name_plural = "Report Schedule"

    def __str__(self) -> str:
        state = "on" if self.is_enabled else "off"
        return (
            f"{self.get_report_type_display()} @ "
            f"{self.send_hour:02d}:{self.send_minute:02d} ({state})"
        )
