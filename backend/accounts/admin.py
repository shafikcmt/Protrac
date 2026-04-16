from accounts.models import User
from django.contrib import admin
from unfold.admin import ModelAdmin
from django.contrib.auth.models import Group
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm


# --- UNREGISTER DEFAULT ADMIN CLASSES ---


admin.site.unregister(Group)


# --- REGISTER ADMIN CLASSES ---


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm

    # Add scanner fields to the user admin
    list_display = BaseUserAdmin.list_display + (
        "assigned_scanner",
        "get_scanner_type",
        "get_production_line",
        "can_perform_tracking",
    )
    list_filter = BaseUserAdmin.list_filter + (
        "assigned_scanner__scanner_type",
        "assigned_scanner__production_line",
        ("assigned_scanner", admin.RelatedOnlyFieldListFilter),
    )
    search_fields = BaseUserAdmin.search_fields + ("assigned_scanner__name",)
    # Reorganize fieldsets to include scanner information
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "email", "image")}),
        (
            "Scanner Assignment",
            {
                "fields": ("assigned_scanner",),
                "description": (
                    "Scanner assignment determines which tracking operations this user can perform. "
                    "Only users with assigned scanners can perform tracking operations."
                ),
                "classes": ("wide",),
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Important dates",
            {
                "fields": ("last_login", "date_joined"),
                "classes": ("collapse",),
            },
        ),
    )

    # Add scanner to add_fieldsets for new users
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "password1", "password2"),
            },
        ),
        (
            "Personal info",
            {
                "classes": ("wide",),
                "fields": ("first_name", "last_name", "email", "image"),
            },
        ),
        (
            "Scanner Assignment",
            {
                "classes": ("wide",),
                "fields": ("assigned_scanner",),
                "description": "Assign a scanner to enable tracking operations for this user.",
            },
        ),
        (
            "Permissions",
            {
                "classes": ("wide", "collapse"),
                "fields": ("is_active", "is_staff", "is_superuser", "groups"),
            },
        ),
    )

    def get_scanner_type(self, obj):
        """Display scanner type in admin list."""
        if obj.assigned_scanner:
            return obj.assigned_scanner.get_scanner_type_display()
        return "-"

    get_scanner_type.short_description = "Scanner Type"
    get_scanner_type.admin_order_field = "assigned_scanner__scanner_type"

    def get_production_line(self, obj):
        """Display production line in admin list."""
        if obj.assigned_scanner:
            return obj.assigned_scanner.production_line.name
        return "-"

    get_production_line.short_description = "Production Line"
    get_production_line.admin_order_field = "assigned_scanner__production_line__name"

    def can_perform_tracking(self, obj):
        """Display if user can perform tracking operations."""
        return obj.can_perform_tracking

    can_perform_tracking.short_description = "Can Track"
    can_perform_tracking.boolean = True


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass
