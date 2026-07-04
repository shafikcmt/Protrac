"""
Add indexes used by the Daily Production Report to remove sequential scans
on the hot aggregation paths (per sewing-line bundle/garment lookups and the
active-order lookup).

These indexes were already created manually on the live database. To keep the
migration safe to run everywhere (and idempotent against those manual indexes),
the database-side operations use CREATE INDEX IF NOT EXISTS while the Django
model state is kept in sync via AddIndex (SeparateDatabaseAndState).
"""

from django.db import migrations, models


CREATE_SQL = [
    # tracking_bundle (assigned_sewing_line_id, issued_at DESC, order_id)
    #   WHERE issued_at IS NOT NULL
    """
    CREATE INDEX IF NOT EXISTS bundle_active_order_idx
    ON tracking_bundle (assigned_sewing_line_id, issued_at DESC, order_id)
    WHERE issued_at IS NOT NULL;
    """,
    # tracking_bundle (assigned_sewing_line_id, order_id)
    """
    CREATE INDEX IF NOT EXISTS bundle_assigned_order_idx
    ON tracking_bundle (assigned_sewing_line_id, order_id);
    """,
    # tracking_garment (sewing_line_id, order_id)
    """
    CREATE INDEX IF NOT EXISTS garment_sewing_order_idx
    ON tracking_garment (sewing_line_id, order_id);
    """,
    # tracking_order (delivery_date)
    """
    CREATE INDEX IF NOT EXISTS order_delivery_date_idx
    ON tracking_order (delivery_date);
    """,
]

DROP_SQL = [
    "DROP INDEX IF EXISTS bundle_active_order_idx;",
    "DROP INDEX IF EXISTS bundle_assigned_order_idx;",
    "DROP INDEX IF EXISTS garment_sewing_order_idx;",
    "DROP INDEX IF EXISTS order_delivery_date_idx;",
]


class Migration(migrations.Migration):

    dependencies = [
        ("tracking", "0007_linestylecompletion"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(sql=create, reverse_sql=drop)
                for create, drop in zip(CREATE_SQL, DROP_SQL)
            ],
            state_operations=[
                migrations.AddIndex(
                    model_name="bundle",
                    index=models.Index(
                        fields=["assigned_sewing_line", "-issued_at", "order"],
                        condition=models.Q(issued_at__isnull=False),
                        name="bundle_active_order_idx",
                    ),
                ),
                migrations.AddIndex(
                    model_name="bundle",
                    index=models.Index(
                        fields=["assigned_sewing_line", "order"],
                        name="bundle_assigned_order_idx",
                    ),
                ),
                migrations.AddIndex(
                    model_name="garment",
                    index=models.Index(
                        fields=["sewing_line", "order"],
                        name="garment_sewing_order_idx",
                    ),
                ),
                migrations.AddIndex(
                    model_name="order",
                    index=models.Index(
                        fields=["delivery_date"],
                        name="order_delivery_date_idx",
                    ),
                ),
            ],
        ),
    ]
