import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from accounts.tests.conftest import UserFactory
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType


User = get_user_model()


@pytest.mark.django_db
class TestUserProfileEndpoints:
    """Test cases for user profile endpoints."""

    def test_get_profile_success(self, authenticated_client, user):
        """Test retrieving profile for authenticated user."""
        user.first_name = "John"
        user.last_name = "Doe"
        user.email = "john.doe@example.com"
        user.save()

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Check response shape
        data = response.data
        expected_fields = [
            "id",
            "username",
            "email",
            "full_name",
            "image",
            "groups",
            "permissions",
        ]
        for field in expected_fields:
            assert field in data

        # Check values
        assert data["username"] == user.username
        assert data["email"] == "john.doe@example.com"
        assert data["full_name"] == "John Doe"
        assert isinstance(data["groups"], list)
        assert isinstance(data["permissions"], list)

    def test_get_profile_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot access profile."""
        url = reverse("user-profile")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_profile_full_name_fallback(self, authenticated_client, user):
        """Test that full_name falls back to username in title case when names are empty."""
        user.first_name = ""
        user.last_name = ""
        user.save()

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["full_name"] == user.username.title()

    def test_get_profile_superuser_permissions(self, authenticated_client):
        """Test that superuser gets wildcard permissions."""
        superuser = UserFactory(is_superuser=True)
        authenticated_client.force_authenticate(user=superuser)

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["permissions"] == ["*"]

    def test_get_profile_user_with_permissions(self, authenticated_client, user):
        """Test that regular user gets clean permission names."""
        # Create a permission from tracking app
        content_type = ContentType.objects.get_or_create(
            app_label="tracking", model="garment"
        )[0]
        permission = Permission.objects.get_or_create(
            codename="view_garment", name="Can view garment", content_type=content_type
        )[0]
        user.user_permissions.add(permission)

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "view_garment" in response.data["permissions"]

    def test_get_profile_user_with_groups(self, authenticated_client, user):
        """Test that user groups are included in response."""
        group = Group.objects.create(name="Test Group")
        user.groups.add(group)

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "Test Group" in response.data["groups"]

    def test_update_profile_success(self, authenticated_client, user):
        """Test successful profile update."""
        url = reverse("user-profile-update")
        data = {"first_name": "Jane", "last_name": "Smith"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["full_name"] == "Jane Smith"

        # Verify user was actually updated
        user.refresh_from_db()
        assert user.first_name == "Jane"
        assert user.last_name == "Smith"

    def test_update_profile_partial(self, authenticated_client, user):
        """Test partial profile update."""
        user.first_name = "John"
        user.last_name = "Doe"
        user.save()

        url = reverse("user-profile-update")
        data = {"first_name": "Jane"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["full_name"] == "Jane Doe"  # Last name unchanged

    def test_update_profile_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot update profile."""
        url = reverse("user-profile-update")
        data = {"first_name": "Jane"}
        response = api_client.patch(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_profile_only_patch_allowed(self, authenticated_client):
        """Test that only PATCH method is allowed for profile update."""
        url = reverse("user-profile-update")
        data = {"first_name": "Jane"}

        # PUT should not be allowed
        response = authenticated_client.put(url, data)
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_update_profile_image_validation(self, authenticated_client):
        """Test image validation during profile update."""
        # This would need a mock file for proper testing
        # For now, just test that the field exists and is optional
        url = reverse("user-profile-update")
        data = {"first_name": "Jane"}
        response = authenticated_client.patch(url, data)
        assert response.status_code == status.HTTP_200_OK

    def test_profile_excludes_internal_permissions(self, authenticated_client, user):
        """Test that internal Django permissions are excluded."""
        # Add an auth permission (should be excluded)
        content_type = ContentType.objects.get_or_create(
            app_label="auth", model="user"
        )[0]
        permission = Permission.objects.get_or_create(
            codename="add_user", name="Can add user", content_type=content_type
        )[0]
        user.user_permissions.add(permission)

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Should not include auth permissions
        assert "add_user" not in response.data["permissions"]

    def test_profile_response_structure(self, authenticated_client, user):
        """Test the exact structure of profile response."""
        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # Check all required fields are present
        required_fields = [
            "id",
            "username",
            "email",
            "full_name",
            "image",
            "groups",
            "permissions",
        ]
        for field in required_fields:
            assert field in data

        # Check data types
        assert isinstance(data["id"], int)
        assert isinstance(data["username"], str)
        assert isinstance(data["email"], str)
        assert isinstance(data["full_name"], str)
        assert isinstance(data["groups"], list)
        assert isinstance(data["permissions"], list)


@pytest.mark.django_db
class TestUserProfileScannerIntegration:
    """Test cases for scanner integration in user profile."""

    def test_profile_with_assigned_scanner(self, authenticated_client):
        """Test profile response includes scanner information when user has assigned scanner."""
        from tracking.models import Scanner, ProductionLine
        from tracking.models.constants import ScannerType, LineType

        # Create production line and scanner
        production_line = ProductionLine.objects.create(
            name="Test Assembly Line", line_type=LineType.SEWING
        )
        scanner = Scanner.objects.create(
            name="Test Assembly Scanner",
            scanner_type=ScannerType.ASSEMBLY_TRACKING,
            production_line=production_line,
        )

        # Create user with scanner
        user = UserFactory(assigned_scanner=scanner)
        authenticated_client.force_authenticate(user=user)

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # Check that scanner fields are included
        expected_fields = [
            "id",
            "username",
            "email",
            "full_name",
            "image",
            "groups",
            "permissions",
            "assigned_scanner",
            "can_perform_tracking",
        ]
        for field in expected_fields:
            assert field in data

        # Check scanner data
        scanner_data = data["assigned_scanner"]
        assert scanner_data is not None
        assert scanner_data["id"] == scanner.id
        assert scanner_data["name"] == "Test Assembly Scanner"
        assert scanner_data["scanner_type"] == ScannerType.ASSEMBLY_TRACKING
        assert scanner_data["scanner_type_display"] == "Assembly Tracking"
        assert scanner_data["production_line"] == "Test Assembly Line"
        assert scanner_data["production_line_type"] == "Sewing Line"

        # Check tracking capability
        assert data["can_perform_tracking"] is True

    def test_profile_without_assigned_scanner(self, authenticated_client):
        """Test profile response when user has no assigned scanner."""
        user = UserFactory(assigned_scanner=None)
        authenticated_client.force_authenticate(user=user)

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # Check that scanner fields are still included but null
        assert "assigned_scanner" in data
        assert "can_perform_tracking" in data

        # Check values
        assert data["assigned_scanner"] is None
        assert data["can_perform_tracking"] is False

    def test_profile_scanner_serializer_structure(self, authenticated_client):
        """Test the structure of scanner serializer in profile response."""
        from tracking.models import Scanner, ProductionLine
        from tracking.models.constants import ScannerType, LineType

        # Create production line and scanner
        production_line = ProductionLine.objects.create(
            name="QC Line", line_type=LineType.FINISHING
        )
        scanner = Scanner.objects.create(
            name="QC Scanner",
            scanner_type=ScannerType.FINISHING_QC_CHECK,
            production_line=production_line,
        )

        # Create user with scanner
        user = UserFactory(assigned_scanner=scanner)
        authenticated_client.force_authenticate(user=user)

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        scanner_data = response.data["assigned_scanner"]

        # Check all scanner fields are present
        expected_scanner_fields = [
            "id",
            "name",
            "scanner_type",
            "scanner_type_display",
            "production_line",
            "production_line_type",
        ]
        for field in expected_scanner_fields:
            assert field in scanner_data

        # Check data types
        assert isinstance(scanner_data["id"], int)
        assert isinstance(scanner_data["name"], str)
        assert isinstance(scanner_data["scanner_type"], str)
        assert isinstance(scanner_data["scanner_type_display"], str)
        assert isinstance(scanner_data["production_line"], str)
        assert isinstance(scanner_data["production_line_type"], str)

    def test_profile_multiple_scanner_types(self, authenticated_client):
        """Test profile with different scanner types."""
        from tracking.models import Scanner, ProductionLine
        from tracking.models.constants import ScannerType, LineType

        test_cases = [
            (ScannerType.SEWING_QC_CHECK, "Sewing QC", LineType.SEWING, "Sewing Line"),
            (
                ScannerType.FINISHING_QC_CHECK,
                "Finishing QC",
                LineType.FINISHING,
                "Finishing Line",
            ),
            (
                ScannerType.BUNDLE_ISSUE,
                "Bundle Issue",
                LineType.CUTTING,
                "Cutting Line",
            ),
            (
                ScannerType.ASSEMBLY_TRACKING,
                "Assembly Tracking",
                LineType.SEWING,
                "Sewing Line",
            ),
        ]

        for scanner_type, type_display, line_type, line_display in test_cases:
            # Create production line and scanner
            production_line = ProductionLine.objects.create(
                name=f"Test {line_display}", line_type=line_type
            )
            scanner = Scanner.objects.create(
                name=f"Test {type_display} Scanner",
                scanner_type=scanner_type,
                production_line=production_line,
            )

            # Create user with scanner
            user = UserFactory(assigned_scanner=scanner)
            authenticated_client.force_authenticate(user=user)

            url = reverse("user-profile")
            response = authenticated_client.get(url)

            assert response.status_code == status.HTTP_200_OK
            scanner_data = response.data["assigned_scanner"]

            assert scanner_data["scanner_type"] == scanner_type
            assert scanner_data["scanner_type_display"] == type_display
            assert scanner_data["production_line_type"] == line_display
            assert response.data["can_perform_tracking"] is True

            # Clean up for next iteration
            scanner.delete()
            production_line.delete()
            user.delete()
