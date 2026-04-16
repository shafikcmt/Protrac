from common.models import BaseModel
import logging
from django.db import models, transaction
from common.fields import OptimizedImageField
from tracking.models.constants import (
    LineType,
    ScannerType,
    BundleStatus,
    GarmentStatus,
    QualityCheckStatus,
    ScanEventType,
)
from tracking.models.helpers import (
    validate_scan_item_exclusivity,
)


class Buyer(BaseModel):
    """Buyer/client for which products are manufactured."""

    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Season(BaseModel):
    """Production seasons (e.g. Spring 2025, Fall 2025)"""

    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Size(BaseModel):
    """Standardized size reference for products"""

    name = models.CharField(max_length=20, unique=True)
    index = models.PositiveSmallIntegerField(
        default=0, help_text="Control the display order of sizes"
    )

    class Meta:
        ordering = ["index", "name"]

    def __str__(self):
        return self.name


class Color(BaseModel):
    """Standardized color reference for products"""

    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Style(BaseModel):
    """Style/product to be manufactured."""

    name = models.CharField(max_length=100)
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name="styles")
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name="styles")
    image = OptimizedImageField(upload_to="styles/", blank=True, null=True)
    parts = models.ManyToManyField("Part", related_name="styles", blank=True)
    smv_minutes = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Standard Minute Value - time required to complete one garment",
    )

    class Meta:
        unique_together = ("season", "name")
        indexes = [
            models.Index(fields=["buyer"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.season.name})"


class Part(BaseModel):
    """Part of a garment (collar, sleeves, body, etc.)."""

    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Order(BaseModel):
    """Order for a specific style, size, and color combination."""

    order_number = models.CharField(max_length=100)
    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name="orders")
    size = models.ForeignKey(
        Size, on_delete=models.CASCADE, related_name="orders_with_size"
    )
    color = models.ForeignKey(
        Color, on_delete=models.CASCADE, related_name="orders_with_color"
    )
    quantity = models.PositiveIntegerField()
    production_cutting_date = models.DateField(blank=True, null=True)
    delivery_date = models.DateField(blank=True, null=True)

    class Meta:
        unique_together = ("order_number", "size", "color")
        indexes = [
            models.Index(fields=["order_number"]),
            models.Index(fields=["production_cutting_date"]),
            models.Index(fields=["style"]),
        ]

    def __str__(self):
        return (
            f"{self.style.name} ({self.size.name}, {self.color.name}) x {self.quantity}"
        )


class ProductionLine(BaseModel):
    """Base model for all production lines."""

    name = models.CharField(max_length=100)
    line_type = models.CharField(
        max_length=20,
        choices=LineType.choices,
    )

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Save the production line and auto-create required scanners if new."""
        is_new = self.pk is None
        auto_create_scanners = kwargs.pop("auto_create_scanners", True)

        with transaction.atomic():
            super().save(*args, **kwargs)

            # Auto-create scanners for new production lines
            if is_new and auto_create_scanners:
                from tracking.services import create_scanners_for_line

                create_scanners_for_line(self)


class LineTarget(BaseModel):
    """Daily production target for a production line."""

    line = models.ForeignKey(
        ProductionLine, on_delete=models.CASCADE, related_name="targets"
    )
    date = models.DateField()
    target_quantity = models.PositiveIntegerField()
    work_hours = models.PositiveIntegerField(
        default=8, help_text="Work hours for this day"
    )
    worker_count = models.PositiveIntegerField(
        default=1, help_text="Number of workers assigned to this line for this day"
    )

    class Meta:
        unique_together = ("line", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.line.name} - {self.date} ({self.target_quantity} units)"


class PartInventory(BaseModel):
    """Tracks available parts per production line per order."""

    production_line = models.ForeignKey(
        ProductionLine,
        on_delete=models.CASCADE,
        related_name="part_inventories",
        limit_choices_to={"line_type": "sewing"},
    )
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="part_inventories"
    )
    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name="inventories")
    total_quantity = models.PositiveIntegerField(
        default=0, help_text="Total parts produced"
    )
    issued_quantity = models.PositiveIntegerField(
        default=0, help_text="Parts issued for garment assembly"
    )
    last_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the last bundle was completed for this part",
    )
    average_processing_time_minutes = models.FloatField(
        null=True,
        blank=True,
        help_text="Average time in minutes to complete one bundle for this part",
    )

    class Meta:
        unique_together = ("production_line", "order", "part")
        indexes = [
            models.Index(fields=["production_line", "order"]),
        ]

    def __str__(self):
        return (
            f"{self.production_line.name}: {self.part.name} x {self.available_quantity}"
        )

    @property
    def available_quantity(self) -> int:
        """Calculate available quantity (total - issued)."""
        return self.total_quantity - self.issued_quantity


class Scanner(BaseModel):
    """Scanner device assigned to a production line."""

    name = models.CharField(max_length=100)
    scanner_type = models.CharField(
        max_length=30,
        choices=ScannerType.choices,
    )
    production_line = models.ForeignKey(
        ProductionLine, on_delete=models.CASCADE, related_name="scanners"
    )

    class Meta:
        ordering = ["production_line", "scanner_type", "name"]

    def __str__(self):
        return self.name


class Defect(BaseModel):
    """Defect found during quality control."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Spread(BaseModel):
    """Fabric spread from which multiple bundles are cut."""

    number = models.CharField(max_length=20, unique=True, help_text="Spread identifier")

    class Meta:
        ordering = ["number"]

    def __str__(self):
        return f"Spread {self.number}"


class Bundle(BaseModel):
    """Bundle of parts for a specific order."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="bundles")
    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name="bundles")
    spread = models.ForeignKey(
        Spread,
        on_delete=models.CASCADE,
        related_name="bundles",
        help_text="Fabric spread this bundle was cut from",
    )
    bundle_number_in_spread = models.PositiveIntegerField(
        help_text="Bundle set number within the spread"
    )
    garment_quantity = models.PositiveIntegerField(
        default=1, help_text="Number of garments this bundle can produce"
    )
    part_number_start = models.PositiveIntegerField(
        help_text="Starting part number in the range (e.g., 1)"
    )
    part_number_end = models.PositiveIntegerField(
        help_text="Ending part number in the range (e.g., 10)"
    )
    tracking_code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        help_text="Unique tracking code for this bundle",
    )
    status = models.CharField(
        max_length=20,
        choices=BundleStatus.choices,
        default=BundleStatus.CREATED,
    )
    assigned_sewing_line = models.ForeignKey(
        ProductionLine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bundles",
        limit_choices_to={"line_type": "sewing"},
        help_text="Sewing line where this bundle is assigned",
    )
    issued_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this bundle was issued to sewing line.",
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this bundle was completed.",
    )
    fifo_violation_flag = models.BooleanField(
        default=False,
        help_text="Whether this bundle violates FIFO completion order.",
    )
    fifo_violation_details = models.JSONField(
        null=True,
        blank=True,
        help_text="Details about FIFO violations when bundle was completed.",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["spread", "bundle_number_in_spread", "part"],
                name="unique_bundle_per_spread_part",
            ),
        ]
        indexes = [
            models.Index(fields=["spread", "bundle_number_in_spread"]),
            models.Index(fields=["order", "part"]),
        ]

    @property
    def display_bundle_number(self) -> str:
        """Get display-friendly bundle number (e.g., SP001-001-COLLAR)."""
        return f"{self.spread.number}-{self.bundle_number_in_spread:03d}-{self.part.name.upper()}"

    @property
    def part_range_display(self) -> str:
        """Get display-friendly part range (e.g., 1-10)."""
        if self.part_number_start == self.part_number_end:
            return str(self.part_number_start)
        return f"{self.part_number_start}-{self.part_number_end}"

    def __str__(self):
        return f"{self.part.name} x {self.garment_quantity} ({self.part_range_display})"

    def save(self, *args, **kwargs):
        """Auto-generate tracking code and create garments for bundle set."""
        # Generate tracking code if not provided
        if not self.tracking_code:
            from tracking.services import generate_bundle_tracking_code

            self.tracking_code = generate_bundle_tracking_code()

        # Determine if this is a new bundle
        is_new = self.pk is None

        # Save the bundle
        super().save(*args, **kwargs)

        # Create garments for the bundle set if this is a new bundle
        if is_new:
            logging.getLogger(__name__).debug(
                "bundle.save.new: id=%s order_id=%s spread=%s bundle_no=%s part=%s qty=%s",
                getattr(self, "id", None),
                getattr(self.order, "id", None),
                getattr(self.spread, "number", None),
                self.bundle_number_in_spread,
                getattr(self.part, "name", None),
                self.garment_quantity,
            )
            self.create_garments_for_bundle_set()

    def create_garments_for_bundle_set(self):
        """Create garments for this bundle's bundle set."""
        from tracking.models.helpers import create_garments_for_bundle_set

        # Pass spread and this bundle to avoid cross-spread collisions
        create_garments_for_bundle_set(
            order=self.order,
            spread=self.spread,
            bundle_set_number=self.bundle_number_in_spread,
            primary_bundle=self,
        )

    def cleanup_garments_for_bundle_set(self):
        """Clean up garments when bundle is deleted."""
        # Check if there are any other bundles with the same bundle_set_number in the same spread
        remaining_bundles = Bundle.objects.filter(
            order=self.order,
            spread=self.spread,
            bundle_number_in_spread=self.bundle_number_in_spread,
        ).exists()

        # If no bundles remain for this bundle set, delete the garments
        if not remaining_bundles:
            # Delete garments only from this spread (via primary_bundle relation)
            self.order.garments.filter(
                primary_bundle__spread=self.spread,
                bundle_set_number=self.bundle_number_in_spread,
            ).delete()


class Garment(BaseModel):
    """Produced garment."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="garments")
    primary_bundle = models.ForeignKey(
        Bundle,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="primary_garments",
        help_text="Primary bundle this garment is associated with",
    )
    sequence_number = models.PositiveIntegerField(
        help_text="Sequential number within the order"
    )
    bundle_set_number = models.PositiveIntegerField(
        help_text="Bundle set number this garment was produced from",
        null=True,
        blank=True,
    )
    part_number_in_bundle = models.PositiveIntegerField(
        help_text="Part number within the bundle range (e.g., 5 from 1-10)",
        null=True,
        blank=True,
    )
    tracking_code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        help_text="Unique tracking code for this garment",
    )
    status = models.CharField(
        max_length=20,
        choices=GarmentStatus.choices,
        default=GarmentStatus.PENDING_ASSEMBLY,
    )
    sewing_line = models.ForeignKey(
        ProductionLine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="produced_garments",
        limit_choices_to={"line_type": "sewing"},
        help_text="Sewing line where this garment was produced",
    )
    finishing_line = models.ForeignKey(
        ProductionLine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finished_garments",
        limit_choices_to={"line_type": "finishing"},
        help_text="Finishing line where this garment was finished",
    )
    issued_for_assembly_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this garment was issued for assembly",
    )
    assembly_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this garment completed assembly (passed sewing QC)",
    )
    finishing_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this garment completed finishing (passed finishing QC)",
    )

    class Meta:
        unique_together = [("order", "sequence_number")]
        ordering = ["order", "sequence_number"]
        indexes = [
            models.Index(fields=["order", "bundle_set_number"]),
        ]

    @property
    def display_number(self) -> str:
        """Get display-friendly garment number."""
        return f"{self.order.order_number}-G{self.sequence_number:04d}"

    def __str__(self):
        return (
            f"{self.order.style.name} ({self.order.size.name}, {self.order.color.name}) "
            f"#{self.sequence_number}"
        )

    def save(self, *args, **kwargs):
        """Auto-generate tracking code."""
        if not self.tracking_code:
            from tracking.services import generate_garment_tracking_code

            self.tracking_code = generate_garment_tracking_code()
        super().save(*args, **kwargs)


class QualityCheck(BaseModel):
    """Base model for quality checks."""

    garment = models.ForeignKey(
        Garment, on_delete=models.CASCADE, related_name="quality_checks"
    )
    status = models.CharField(
        max_length=20,
        choices=QualityCheckStatus.choices,
        default=QualityCheckStatus.PASS,
    )
    defects = models.ManyToManyField(Defect, blank=True, related_name="quality_checks")

    def __str__(self):
        return f"QC for {self.garment} - {self.status}"


class Scan(BaseModel):
    """Base model for scans performed by scanners."""

    scanner = models.ForeignKey(Scanner, on_delete=models.CASCADE, related_name="scans")
    event_type = models.CharField(
        max_length=50,
        choices=ScanEventType.choices,
    )
    bundle = models.ForeignKey(Bundle, on_delete=models.CASCADE, null=True, blank=True)
    garment = models.ForeignKey(
        Garment, on_delete=models.CASCADE, null=True, blank=True
    )

    class Meta:
        ordering = ["-created_at"]

    @property
    def production_line(self) -> "ProductionLine":
        """Get production line where scan occurred."""
        return self.scanner.production_line

    @property
    def tracking_code(self) -> str | None:
        """Get tracking code of scanned item."""
        if self.bundle:
            return self.bundle.tracking_code
        elif self.garment:
            return self.garment.tracking_code
        return None

    def __str__(self):
        return f"{self.event_type} by {self.scanner.name} at {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}"

    def save(self, *args, **kwargs):
        """Validate scan item exclusivity."""

        validate_scan_item_exclusivity(self)
        super().save(*args, **kwargs)
