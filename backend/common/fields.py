import os
from common.services.image import ImageOptimizer
from django.db.models.signals import pre_save, pre_delete
from django.db.models.fields.files import FileField, ImageField


class AutoCleanupFieldMixin:
    """
    A mixin that automatically deletes files when either
    the file is replaced or the model is deleted.
    """

    def delete_file(self, instance, **kwargs):
        """
        Deletes the file from storage when the corresponding field is cleared or model instance is deleted.
        """
        file = getattr(instance, self.name)
        if file and hasattr(file, "path") and os.path.isfile(file.path):
            try:
                os.remove(file.path)
            except (FileNotFoundError, PermissionError) as e:
                # Log the error if needed
                print(f"Error deleting file {file.path}: {e}")

    def contribute_to_class(self, cls, name, **kwargs):
        """
        Connects signal handlers when the field is added to the model.
        """
        super().contribute_to_class(cls, name, **kwargs)

        # Connect pre_save signal to handle file replacement
        pre_save.connect(self.handle_file_replacement, sender=cls)

        # Connect pre_delete signal to handle instance deletion
        pre_delete.connect(self.handle_instance_deletion, sender=cls)

    def handle_file_replacement(self, instance, **kwargs):
        """
        Deletes the old file when a new file is uploaded.
        """
        if not instance.pk:
            return

        try:
            old_instance = instance.__class__.objects.get(pk=instance.pk)
            old_file = getattr(old_instance, self.name)
            new_file = getattr(instance, self.name)

            if old_file and old_file != new_file:
                self.delete_file(old_instance)

        except instance.__class__.DoesNotExist:
            pass

    def handle_instance_deletion(self, instance, **kwargs):
        """
        Deletes the file when the model instance is deleted.
        """
        self.delete_file(instance)


class AutoCleanupFileField(AutoCleanupFieldMixin, FileField):
    """
    A FileField that automatically deletes files when either
    the file is replaced or the model is deleted.
    """

    pass


class AutoCleanupImageField(AutoCleanupFieldMixin, ImageField):
    """
    An ImageField that automatically deletes files when either
    the file is replaced or the model is deleted.
    """

    pass


class OptimizedImageField(AutoCleanupImageField):
    def __init__(self, *args, format=None, quality=None, max_dimensions=None, **kwargs):
        self.image_format = format
        self.image_quality = quality
        self.max_dimensions = max_dimensions
        super().__init__(*args, **kwargs)

    def pre_save(self, model_instance, add):
        file = getattr(model_instance, self.attname)
        if file and not file._committed:
            optimized = ImageOptimizer.optimize_image(
                file,
                format=self.image_format,
                quality=self.image_quality,
                max_dimensions=self.max_dimensions,
            )
            setattr(model_instance, self.attname, optimized)
        return super().pre_save(model_instance, add)
