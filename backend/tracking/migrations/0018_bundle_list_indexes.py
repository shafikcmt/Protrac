"""
Add indexes used by the Bundle list endpoint.

The list view orders by -created_at by default and exposes status (alone and
together with order) as column filters, none of which were indexed.

Index-only migration: no column is added, altered or removed, and no data is
read or written.
"""

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tracking", "0017_linestylecompletion_source_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddIndex(
            model_name="bundle",
            index=models.Index(
                fields=["-created_at"], name="bundle_created_at_desc_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="bundle",
            index=models.Index(fields=["status"], name="bundle_status_idx"),
        ),
        migrations.AddIndex(
            model_name="bundle",
            index=models.Index(
                fields=["order", "status"], name="bundle_order_status_idx"
            ),
        ),
    ]
