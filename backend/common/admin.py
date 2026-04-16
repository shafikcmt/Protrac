from django.db import models
from django.contrib import admin
from django.apps import apps
from unfold.admin import (
    ModelAdmin,
    StackedInline as BaseStackedInline,
    TabularInline as BaseTabularInline,
)
from unfold.widgets import (
    UnfoldAdminSelectWidget,
    UnfoldAdminTextInputWidget,
    UnfoldAdminFileFieldWidget,
)


class BaseInlineAdmin:
    exclude = ["created_at", "updated_at", "created_by", "updated_by"]
    formfield_overrides = {
        models.CharField: {"widget": UnfoldAdminTextInputWidget},
        models.TextField: {"widget": UnfoldAdminTextInputWidget},
        models.ForeignKey: {"widget": UnfoldAdminSelectWidget},
        models.FileField: {"widget": UnfoldAdminFileFieldWidget},
    }

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


class StackedInline(BaseInlineAdmin, BaseStackedInline):
    pass


class TabularInline(BaseInlineAdmin, BaseTabularInline):
    pass


class BaseModelAdmin(ModelAdmin):
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
    exclude = ["created_by", "updated_by"]
    formfield_overrides = {
        models.CharField: {"widget": UnfoldAdminTextInputWidget},
        models.TextField: {"widget": UnfoldAdminTextInputWidget},
        models.ForeignKey: {"widget": UnfoldAdminSelectWidget},
        models.FileField: {"widget": UnfoldAdminFileFieldWidget},
    }

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


# --- AUTO REGISTRATION FUNCTIONALITY ---


def auto_register_models(
    app_names=None, admin_class=None, exclude_models=None, verbose=True
):
    """
    Automatically register all models that inherit from BaseModel with the admin.

    Args:
        app_names (list): List of app names to register models from. If None, registers from all apps.
        admin_class (class): Admin class to use for registration. Defaults to BaseModelAdmin.
        exclude_models (list): List of model names or (app_label, model_name) tuples to exclude.
        verbose (bool): Whether to print registration messages. Defaults to True.
    """
    if admin_class is None:
        admin_class = BaseModelAdmin

    if exclude_models is None:
        exclude_models = []

    # Convert string model names to (app_label, model_name) tuples for consistency
    normalized_excludes = []
    for exclude in exclude_models:
        if isinstance(exclude, str):
            # Assume it's just a model name, will match any app
            normalized_excludes.append((None, exclude.lower()))
        elif isinstance(exclude, tuple) and len(exclude) == 2:
            normalized_excludes.append((exclude[0].lower(), exclude[1].lower()))

    registered_count = 0

    for model in apps.get_models():
        app_label = model._meta.app_label
        model_name = model.__name__

        # Skip if app_names is specified and this model's app is not in the list
        if app_names and app_label not in app_names:
            continue

        # Skip if model is in exclude list
        should_exclude = False
        for exclude_app, exclude_model in normalized_excludes:
            if exclude_app is None:  # Only model name specified
                if model_name.lower() == exclude_model:
                    should_exclude = True
                    break
            else:  # Both app and model specified
                if (
                    app_label.lower() == exclude_app
                    and model_name.lower() == exclude_model
                ):
                    should_exclude = True
                    break

        if should_exclude:
            continue

        # Check if model inherits from BaseModel
        from common.models import BaseModel

        if not issubclass(model, BaseModel):
            continue

        # Skip if already registered
        if admin.site.is_registered(model):
            continue

        # Register the model
        try:
            admin.site.register(model, admin_class)
            registered_count += 1
            if verbose:
                print(
                    f"Auto-registered {app_label}.{model_name} with {admin_class.__name__}"
                )
        except admin.sites.AlreadyRegistered:
            # This shouldn't happen due to our check above, but just in case
            continue

    if verbose:
        print(f"Auto-registration completed. {registered_count} models registered.")
