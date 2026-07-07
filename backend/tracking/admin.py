from django.contrib import admin
from django.conf import settings
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


class MailRecipientAdmin(BaseModelAdmin):
    """Recipients of automated report emails, managed entirely from admin."""

    list_display = ["email", "name", "recipient_type", "report_type", "is_active"]
    list_filter = ["recipient_type", "report_type", "is_active"]
    list_editable = ["is_active"]
    search_fields = ["email", "name"]


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
    ],
    verbose=settings.DEBUG,
)
