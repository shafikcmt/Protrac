from django.contrib.auth.models import AbstractUser
from tracking.models import Scanner
from django.db import models


class User(AbstractUser):
    assigned_scanner = models.ForeignKey(
        Scanner,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operators",
    )
    image = models.ImageField(
        upload_to="profile_pictures/",
        null=True,
        blank=True,
        help_text="Profile picture",
    )

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    @property
    def scanner_info(self):
        """Get scanner information for this user."""
        if self.assigned_scanner:
            return {
                "id": self.assigned_scanner.id,
                "name": self.assigned_scanner.name,
                "scanner_type": self.assigned_scanner.scanner_type,
                "scanner_type_display": self.assigned_scanner.get_scanner_type_display(),
                "production_line": self.assigned_scanner.production_line.name,
                "production_line_type": self.assigned_scanner.production_line.get_line_type_display(),
            }
        return None

    @property
    def can_perform_tracking(self):
        """Check if user can perform tracking operations."""
        return self.assigned_scanner is not None

    def __str__(self):
        scanner_info = (
            f" ({self.assigned_scanner.name})" if self.assigned_scanner else ""
        )
        return f"{self.username}{scanner_info}"
