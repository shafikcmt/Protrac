import re

from django import forms
from django.contrib import admin, messages
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from django.shortcuts import redirect, render

from unfold.decorators import action
from unfold.widgets import (
    UnfoldAdminTextareaWidget,
    UnfoldAdminSelectWidget,
    UnfoldBooleanSwitchWidget,
)

from common.admin import BaseModelAdmin, auto_register_models
from tracking.models import (
    Size,
    Style,
    Order,
    ProductionLine,
    Scanner,
    Bundle,
    Garment,
    Scan,
    MailRecipient,
)
from tracking.models.mail import RecipientType, ReportType, ReportScheduleConfig


# --- CUSTOM ADMIN CLASSES ---


class SizeAdmin(BaseModelAdmin):
    """Custom admin for Size model with index field ordering."""

    list_display = ["name", "index", "created_at", "updated_at"]
    list_editable = ["index"]
    ordering = ["index", "name"]


class StyleAdmin(BaseModelAdmin):
    """Custom admin for Style model with image preview."""

    list_display = ["name", "buyer", "season", "created_at"]
    list_filter = ["buyer", "season"]
    search_fields = ["name", "buyer__name", "season__name"]


class OrderAdmin(BaseModelAdmin):
    """Custom admin for Order model with related info."""

    list_display = [
        "order_number",
        "style",
        "size",
        "color",
        "quantity",
        "delivery_date",
    ]
    list_filter = ["style__buyer", "style__season", "size", "color"]
    search_fields = ["order_number", "style__name"]
    date_hierarchy = "delivery_date"


class ProductionLineAdmin(BaseModelAdmin):
    """Custom admin for ProductionLine with line type filtering."""

    list_display = ["name", "line_type", "created_at"]
    list_filter = ["line_type"]
    search_fields = ["name"]


class ScannerAdmin(BaseModelAdmin):
    """Custom admin for Scanner with production line info."""

    list_display = ["name", "scanner_type", "production_line", "created_at"]
    list_filter = ["scanner_type", "production_line__line_type"]
    search_fields = ["name", "production_line__name"]


class BundleAdmin(BaseModelAdmin):
    """Custom admin for Bundle with tracking and status info."""

    list_display = [
        "tracking_code",
        "order",
        "part",
        "garment_quantity",
        "status",
        "created_at",
    ]
    list_filter = ["status", "part", "order__style__buyer"]
    search_fields = ["tracking_code", "order__order_number"]


class GarmentAdmin(BaseModelAdmin):
    """Custom admin for Garment with tracking and production info."""

    list_display = [
        "tracking_code",
        "order",
        "status",
        "sewing_line",
        "finishing_line",
        "created_at",
    ]
    list_filter = ["status", "sewing_line", "finishing_line", "order__style__buyer"]
    search_fields = ["tracking_code", "order__order_number"]


class ScanAdmin(BaseModelAdmin):
    """Custom admin for Scan with event and scanner info."""

    list_display = ["event_type", "scanner", "bundle", "garment", "created_at"]
    list_filter = ["event_type", "scanner__scanner_type", "scanner__production_line"]
    search_fields = ["bundle__tracking_code", "garment__tracking_code"]
    date_hierarchy = "created_at"


class BulkAddRecipientForm(forms.Form):
    """Intermediate form for adding many recipients in one go."""

    emails = forms.CharField(
        widget=UnfoldAdminTextareaWidget(attrs={"rows": 8}),
        help_text="One email per line or comma-separated. Both are accepted.",
    )
    recipient_type = forms.ChoiceField(
        choices=RecipientType.choices,
        initial=RecipientType.TO,
        widget=UnfoldAdminSelectWidget,
        help_text="Applies to every email in this batch.",
    )
    report_type = forms.ChoiceField(
        choices=ReportType.choices,
        initial=ReportType.DAILY_PRODUCTION,
        widget=UnfoldAdminSelectWidget,
    )
    is_active = forms.BooleanField(
        required=False,
        initial=True,
        widget=UnfoldBooleanSwitchWidget,
    )


class MailRecipientAdmin(BaseModelAdmin):
    """Recipients of automated report emails, managed entirely from admin."""

    list_display = ["email", "name", "recipient_type", "report_type", "is_active"]
    list_filter = ["recipient_type", "report_type", "is_active"]
    list_editable = ["is_active"]
    search_fields = ["email", "name"]

    # Changelist-level "Bulk add" button (Unfold renders it at the top). The URL
    # is auto-registered by Unfold from url_path; the single add/edit form is
    # untouched.
    actions_list = ["bulk_add_recipients"]

    @action(
        description="Bulk add recipients",
        url_path="bulk-add",
        icon="group_add",
    )
    def bulk_add_recipients(self, request):
        if request.method == "POST":
            form = BulkAddRecipientForm(request.POST)
            if form.is_valid():
                recipient_type = form.cleaned_data["recipient_type"]
                report_type = form.cleaned_data["report_type"]
                is_active = form.cleaned_data["is_active"]

                # Split on newlines and commas, trim, drop empties.
                tokens = [
                    t.strip()
                    for t in re.split(r"[\n,]+", form.cleaned_data["emails"])
                    if t.strip()
                ]

                validate_email = EmailValidator()
                added = skipped = invalid = 0
                for token in tokens:
                    try:
                        validate_email(token)
                    except ValidationError:
                        invalid += 1
                        continue
                    # Skip an exact (email, recipient_type, report_type) match.
                    # A just-created row is found here too, so duplicates within
                    # the same paste are also skipped rather than re-created.
                    if MailRecipient.objects.filter(
                        email=token,
                        recipient_type=recipient_type,
                        report_type=report_type,
                    ).exists():
                        skipped += 1
                        continue
                    MailRecipient.objects.create(
                        email=token,
                        recipient_type=recipient_type,
                        report_type=report_type,
                        is_active=is_active,
                        created_by=request.user,
                    )
                    added += 1

                self.message_user(
                    request,
                    f"{added} added, {skipped} skipped (duplicate), {invalid} invalid.",
                    messages.SUCCESS,
                )
                return redirect("admin:tracking_mailrecipient_changelist")
        else:
            form = BulkAddRecipientForm()

        context = {
            **self.admin_site.each_context(request),
            "title": "Bulk add mail recipients",
            "opts": self.model._meta,
            "form": form,
        }
        return render(
            request, "admin/tracking/mailrecipient/bulk_add.html", context
        )


class ReportScheduleConfigAdmin(BaseModelAdmin):
    """
    Singleton schedule config for automated report emails. Number fields and the
    boolean toggle are auto-styled by Unfold's ModelAdmin (FORMFIELD_OVERRIDES),
    like the rest of the admin — no explicit widgets needed here.
    """

    list_display = [
        "report_type",
        "send_hour",
        "send_minute",
        "is_enabled",
        "updated_at",
    ]

    def has_add_permission(self, request):
        # Singleton: block adding a second daily_production row once one exists.
        if ReportScheduleConfig.objects.filter(
            report_type=ReportType.DAILY_PRODUCTION
        ).exists():
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        # Never delete — the scheduler always needs a config to read.
        return False


# --- ADMIN REGISTRATION ---
# Models with custom admin classes
admin.site.register(Size, SizeAdmin)
admin.site.register(Style, StyleAdmin)
admin.site.register(Order, OrderAdmin)
admin.site.register(ProductionLine, ProductionLineAdmin)
admin.site.register(Scanner, ScannerAdmin)
admin.site.register(Bundle, BundleAdmin)
admin.site.register(Garment, GarmentAdmin)
admin.site.register(Scan, ScanAdmin)
admin.site.register(MailRecipient, MailRecipientAdmin)
admin.site.register(ReportScheduleConfig, ReportScheduleConfigAdmin)

# Auto-register remaining models from tracking app with BaseModelAdmin
# This will register all models that inherit from BaseModel and are not already registered
auto_register_models(
    app_names=["tracking"],
    admin_class=BaseModelAdmin,
    exclude_models=[
        "Size",
        "Style",
        "Order",
        "ProductionLine",
        "Scanner",
        "Bundle",
        "Garment",
        "Scan",
        "MailRecipient",
        "ReportScheduleConfig",
    ],
    verbose=settings.DEBUG,
)
