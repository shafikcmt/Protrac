"""
Django management command to generate realistic test data for ProTrac Dashboard.

This command creates realistic test data that follows the actual user workflow:
1. Basic config (buyers, seasons, parts, etc.)
2. Styles with part relationships
3. Orders (multiple size/color combos)
4. Spreads and bundle creation
5. Line targets
6. Production workflow (bundle issue → assembly → QC)

Usage:
    python manage.py generate_realistic_data
    python manage.py generate_realistic_data --clean  # Clean existing data first
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import date, timedelta
from decimal import Decimal

from tracking.models import (
    Buyer,
    Season,
    Size,
    Color,
    Part,
    Defect,
    ProductionLine,
    Scanner,
    Style,
    Order,
    Spread,
    Bundle,
    Garment,
    LineTarget,
    QualityCheck,
)
from tracking.models.constants import (
    ScannerType,
    LineType,
    QualityCheckStatus,
    BundleStatus,
    GarmentStatus,
)
from tracking.services.scan.bundle_issue import process_bundle_issue_scan
from tracking.services.scan.assembly_tracking_receive import process_part_receive_scan
from tracking.services.scan.assembly_tracking_issue import (
    process_garment_issue_for_assembly_scan,
)
from tracking.services.scan.sewing_qc import process_sewing_qc_scan

User = get_user_model()


class Command(BaseCommand):
    help = "Generate realistic test data for ProTrac Dashboard"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Clean existing data before generating new data",
        )

    def handle(self, *args, **options):
        self.stdout.write("🚀 ProTrac Realistic Data Generator")
        self.stdout.write("=" * 50)

        if options["clean"]:
            self.clean_existing_data()

        try:
            with transaction.atomic():
                self.created_data = {}
                self.setup_user()
                self.create_basic_config()
                self.create_styles()
                self.create_orders()
                self.create_spreads_and_bundles()
                self.create_line_targets()
                self.simulate_production_workflow()
                self.test_dashboard()

            self.stdout.write(
                self.style.SUCCESS(
                    "\n🎉 Realistic test data generation completed successfully!"
                )
            )
            self.print_summary()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error generating data: {str(e)}"))
            import traceback

            traceback.print_exc()

    def clean_existing_data(self):
        """Clean existing test data."""
        self.stdout.write("\n🧹 Cleaning existing data...")

        # Delete in reverse dependency order
        QualityCheck.objects.all().delete()
        Garment.objects.all().delete()
        Bundle.objects.all().delete()
        LineTarget.objects.all().delete()
        Order.objects.all().delete()
        Spread.objects.all().delete()
        Style.objects.all().delete()
        Scanner.objects.all().delete()
        ProductionLine.objects.all().delete()
        Defect.objects.all().delete()
        Part.objects.all().delete()
        Color.objects.all().delete()
        Size.objects.all().delete()
        Season.objects.all().delete()
        Buyer.objects.all().delete()

        self.stdout.write("  ✅ Existing data cleaned")

    def setup_user(self):
        """Create or get test users with scanner assignments."""
        self.stdout.write("\n🔐 Setting up test users...")

        # Create main test user
        self.user, created = User.objects.get_or_create(
            username="testuser",
            defaults={
                "email": "test@example.com",
                "first_name": "Test",
                "last_name": "User",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            self.user.set_password("testpass123")
            self.user.save()

        self.stdout.write(f"  ✅ Test user: {self.user.username}")

        # We'll create scanner-specific users after production lines are created
        self.scanner_users = {}

    def create_basic_config(self):
        """Create basic configuration data."""
        self.stdout.write("\n📋 Creating basic configuration...")

        # Buyers
        buyers_data = [{"name": "H&M"}, {"name": "Zara"}, {"name": "Nike"}]

        buyers = []
        for buyer_data in buyers_data:
            buyer = Buyer.objects.create(**buyer_data)
            buyers.append(buyer)
            self.stdout.write(f"  ✅ Buyer: {buyer.name}")

        # Seasons
        seasons_data = [
            {"name": "Spring 2025"},
            {"name": "Summer 2025"},
            {"name": "Fall 2025"},
        ]

        seasons = []
        for season_data in seasons_data:
            season = Season.objects.create(**season_data)
            seasons.append(season)
            self.stdout.write(f"  ✅ Season: {season.name}")

        # Sizes
        sizes_data = [
            {"name": "XS", "index": 1},
            {"name": "S", "index": 2},
            {"name": "M", "index": 3},
            {"name": "L", "index": 4},
            {"name": "XL", "index": 5},
        ]

        sizes = []
        for size_data in sizes_data:
            size = Size.objects.create(**size_data)
            sizes.append(size)
            self.stdout.write(f"  ✅ Size: {size.name}")

        # Colors
        colors_data = [
            {"name": "Black"},
            {"name": "White"},
            {"name": "Navy"},
            {"name": "Red"},
            {"name": "Blue"},
        ]

        colors = []
        for color_data in colors_data:
            color = Color.objects.create(**color_data)
            colors.append(color)
            self.stdout.write(f"  ✅ Color: {color.name}")

        # Parts
        parts_data = [
            {"name": "Front"},
            {"name": "Back"},
            {"name": "Sleeve"},
            {"name": "Collar"},
            {"name": "Pocket"},
        ]

        parts = []
        for part_data in parts_data:
            part = Part.objects.create(**part_data)
            parts.append(part)
            self.stdout.write(f"  ✅ Part: {part.name}")

        # Defects
        defects_data = [
            {"name": "Stitching Issue", "description": "Poor stitching quality"},
            {"name": "Fit Problem", "description": "Sizing or fit issues"},
            {
                "name": "Color Mismatch",
                "description": "Color doesn't match specification",
            },
            {"name": "Fabric Defect", "description": "Issues with fabric quality"},
            {"name": "Missing Trim", "description": "Missing buttons, zippers, etc."},
        ]

        defects = []
        for defect_data in defects_data:
            defect = Defect.objects.create(**defect_data)
            defects.append(defect)
            self.stdout.write(f"  ✅ Defect: {defect.name}")

        # Production Lines (with auto-created scanners)
        lines_data = [
            {"name": "Sewing Line 01", "line_type": LineType.SEWING},
            {"name": "Sewing Line 02", "line_type": LineType.SEWING},
            {"name": "Sewing Line 03", "line_type": LineType.SEWING},
            {"name": "Finishing Line 01", "line_type": LineType.FINISHING},
        ]

        lines = []
        for line_data in lines_data:
            line = ProductionLine.objects.create(**line_data)
            lines.append(line)
            self.stdout.write(
                f"  ✅ Production Line: {line.name} (scanners auto-created)"
            )

        self.created_data.update(
            {
                "buyers": buyers,
                "seasons": seasons,
                "sizes": sizes,
                "colors": colors,
                "parts": parts,
                "defects": defects,
                "production_lines": lines,
            }
        )

        # Create scanner-specific users after production lines are created
        self.create_scanner_users()

    def create_scanner_users(self):
        """Create users assigned to specific scanners for workflow simulation."""
        self.stdout.write("\n👥 Creating scanner-specific users...")

        # Get all scanners from sewing lines
        sewing_lines = [
            line
            for line in self.created_data["production_lines"]
            if line.line_type == LineType.SEWING
        ]

        for line in sewing_lines:
            # Create users for each scanner type on this line
            scanners = line.scanners.all()

            for scanner in scanners:
                # Create a user for this scanner
                username = f"scanner_{scanner.scanner_type}_{line.id}"
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        "email": f"{username}@example.com",
                        "first_name": scanner.get_scanner_type_display(),
                        "last_name": f"Operator {line.name}",
                        "assigned_scanner": scanner,
                    },
                )
                if created:
                    user.set_password("testpass123")
                    user.save()

                # Store user by scanner type and line for easy access
                key = f"{line.id}_{scanner.scanner_type}"
                self.scanner_users[key] = user

                self.stdout.write(
                    f"  ✅ Scanner user: {user.username} -> {scanner.name}"
                )

    def create_styles(self):
        """Create styles with part relationships."""
        self.stdout.write("\n👔 Creating styles...")

        buyers = self.created_data["buyers"]
        seasons = self.created_data["seasons"]
        parts = self.created_data["parts"]

        styles_data = [
            {
                "name": "Classic T-Shirt",
                "buyer": buyers[0],  # H&M
                "season": seasons[0],  # Spring 2025
                "smv_minutes": Decimal("12.50"),
                "parts": [parts[0], parts[1]],  # Front, Back
            },
            {
                "name": "Polo Shirt",
                "buyer": buyers[0],  # H&M
                "season": seasons[0],  # Spring 2025
                "smv_minutes": Decimal("18.75"),
                "parts": [
                    parts[0],
                    parts[1],
                    parts[2],
                    parts[3],
                ],  # Front, Back, Sleeve, Collar
            },
            {
                "name": "Casual Shirt",
                "buyer": buyers[1],  # Zara
                "season": seasons[1],  # Summer 2025
                "smv_minutes": Decimal("25.00"),
                "parts": [
                    parts[0],
                    parts[1],
                    parts[2],
                    parts[4],
                ],  # Front, Back, Sleeve, Pocket
            },
            {
                "name": "Hoodie",
                "buyer": buyers[2],  # Nike
                "season": seasons[2],  # Fall 2025
                "smv_minutes": Decimal("35.00"),
                "parts": [
                    parts[0],
                    parts[1],
                    parts[2],
                    parts[4],
                ],  # Front, Back, Sleeve, Pocket
            },
            {
                "name": "Tank Top",
                "buyer": buyers[0],  # H&M
                "season": seasons[1],  # Summer 2025
                "smv_minutes": Decimal("8.50"),
                "parts": [parts[0], parts[1]],  # Front, Back
            },
            {
                "name": "Dress Shirt",
                "buyer": buyers[1],  # Zara
                "season": seasons[0],  # Spring 2025
                "smv_minutes": Decimal("28.00"),
                "parts": [
                    parts[0],
                    parts[1],
                    parts[2],
                    parts[3],
                    parts[4],
                ],  # Front, Back, Sleeve, Collar, Pocket
            },
        ]

        styles = []
        for style_data in styles_data:
            style_parts = style_data.pop("parts")
            style = Style.objects.create(**style_data)
            style.parts.set(style_parts)
            styles.append(style)
            self.stdout.write(
                f"  ✅ Style: {style.name} (SMV: {style.smv_minutes} min)"
            )

        self.created_data["styles"] = styles

    def create_orders(self):
        """Create orders with different size/color combinations."""
        self.stdout.write("\n📦 Creating orders...")

        styles = self.created_data["styles"]
        sizes = self.created_data["sizes"]
        colors = self.created_data["colors"]

        orders = []
        order_counter = 1

        # Create multiple size/color combinations for each style
        for style in styles:  # Use all styles now
            for size in sizes[:4]:  # XS, S, M, L
                for color in colors[:3]:  # Black, White, Navy
                    order = Order.objects.create(
                        order_number=f"ORD{order_counter:04d}",
                        style=style,
                        size=size,
                        color=color,
                        quantity=300
                        + (order_counter * 25),  # Smaller quantities for more variety
                        delivery_date=date.today() + timedelta(days=30 + order_counter),
                    )

                    orders.append(order)
                    self.stdout.write(
                        f"  ✅ Order: {order.order_number} - {style.name} {size.name} {color.name} ({order.quantity} pcs)"
                    )
                    order_counter += 1

        self.created_data["orders"] = orders

    def create_spreads_and_bundles(self):
        """Create spreads and bundles."""
        self.stdout.write("\n📏 Creating spreads and bundles...")

        orders = self.created_data["orders"]

        spreads = []
        spread_counter = 1

        # Create spreads for more orders to get more variety
        for order in orders[:15]:  # First 15 orders (instead of 4)
            spread = Spread.objects.create(number=f"SP{spread_counter:03d}")
            spreads.append(spread)
            self.stdout.write(f"  ✅ Spread: {spread.number}")

            # Create bundles for this spread/order
            self.create_bundles_for_order(spread, order)
            spread_counter += 1

        self.created_data["spreads"] = spreads

    def create_bundles_for_order(self, spread, order):
        """Create bundles for a specific order."""
        self.stdout.write(f"    📦 Creating bundles for order {order.order_number}...")

        style_parts = order.style.parts.all()

        # Create more bundle sets to get higher quantities
        # Each set = 1 bundle per part = 15 pieces each (increased from 10)
        bundle_sets = 8  # Increased from 5 to 8 bundle sets
        pieces_per_bundle = 15  # Increased from 10 to 15

        for bundle_set in range(1, bundle_sets + 1):
            for part in style_parts:
                Bundle.objects.create(
                    spread=spread,
                    bundle_number_in_spread=bundle_set,
                    order=order,
                    part=part,
                    garment_quantity=pieces_per_bundle,
                    part_number_start=((bundle_set - 1) * pieces_per_bundle) + 1,
                    part_number_end=bundle_set * pieces_per_bundle,
                )
                # Garments are automatically created by the Bundle.save() method

        total_bundles = len(style_parts) * bundle_sets
        total_garments = total_bundles * pieces_per_bundle
        self.stdout.write(
            f"      ✅ Created {total_bundles} bundles ({len(style_parts)} parts × {bundle_sets} sets) = {total_garments} garments"
        )

    def create_line_targets(self):
        """Create line targets."""
        self.stdout.write("\n🎯 Creating line targets...")

        production_lines = self.created_data["production_lines"]
        sewing_lines = [
            line for line in production_lines if line.line_type == LineType.SEWING
        ]

        line_targets = []
        # Create targets starting from current UTC date to ensure consistency with dashboard
        from django.utils import timezone

        start_date = timezone.now().date()  # Use UTC date instead of local date

        # Create targets for current date and next few days
        for days_offset in range(0, 7):  # 7 days
            target_date = start_date + timedelta(days=days_offset)

            for line in sewing_lines:
                line_target, created = LineTarget.objects.get_or_create(
                    line=line,
                    date=target_date,
                    defaults={
                        "target_quantity": 600,  # Daily target
                        "work_hours": 8,
                        "worker_count": 10,
                    },
                )

                if created:
                    line_targets.append(line_target)
                    self.stdout.write(
                        f"  ✅ Target: {line.name} - {target_date} (600 pcs, 10 workers)"
                    )
                else:
                    self.stdout.write(
                        f"  ℹ️  Target already exists: {line.name} - {target_date}"
                    )

        self.created_data["line_targets"] = line_targets

    def simulate_production_workflow(self):
        """Simulate the complete production workflow."""
        self.stdout.write("\n🏭 Simulating production workflow...")

        # We need a cutting line to issue bundles to sewing lines
        # Let's create one for the simulation
        cutting_line = ProductionLine.objects.create(
            name="Cutting Line 01", line_type=LineType.CUTTING
        )

        # Create user for cutting line bundle issue scanner
        bundle_issue_scanner = cutting_line.scanners.filter(
            scanner_type=ScannerType.BUNDLE_ISSUE
        ).first()

        if bundle_issue_scanner:
            cutting_user, created = User.objects.get_or_create(
                username=f"scanner_bundle_issue_{cutting_line.id}",
                defaults={
                    "email": "cutting_operator@example.com",
                    "first_name": "Bundle Issue",
                    "last_name": f"Operator {cutting_line.name}",
                    "assigned_scanner": bundle_issue_scanner,
                },
            )
            if created:
                cutting_user.set_password("testpass123")
                cutting_user.save()

        sewing_lines = [
            line
            for line in self.created_data["production_lines"]
            if line.line_type == LineType.SEWING
        ]

        for line in sewing_lines:  # Process ALL sewing lines now
            self.stdout.write(f"\n  🔄 Simulating workflow for {line.name}...")
            # Calculate target completion for this line (60-80% of 600 = 360-480)
            target_completion = 400 + (
                hash(line.name) % 80
            )  # 400-479 garments per line
            self.simulate_line_workflow(
                line, cutting_line, cutting_user, target_completion
            )

    def simulate_line_workflow(
        self, sewing_line, cutting_line, cutting_user, target_completion
    ):
        """Simulate workflow for a sewing line using cutting line for bundle issue."""

        # Get scanners for the sewing line (only assembly and QC)
        assembly_scanner = sewing_line.scanners.filter(
            scanner_type=ScannerType.ASSEMBLY_TRACKING
        ).first()
        qc_scanner = sewing_line.scanners.filter(
            scanner_type=ScannerType.SEWING_QC_CHECK
        ).first()

        if not all([assembly_scanner, qc_scanner]):
            self.stdout.write(f"    ⚠️  Missing scanners for {sewing_line.name}")
            return

        # Get users assigned to sewing scanners
        assembly_user = self.scanner_users.get(
            f"{sewing_line.id}_{ScannerType.ASSEMBLY_TRACKING}"
        )
        qc_user = self.scanner_users.get(
            f"{sewing_line.id}_{ScannerType.SEWING_QC_CHECK}"
        )

        if not all([assembly_user, qc_user]):
            self.stdout.write(f"    ⚠️  Missing scanner users for {sewing_line.name}")
            return

        # Get more available bundles for higher completion rates
        available_bundles = Bundle.objects.filter(status=BundleStatus.CREATED).exclude(
            assigned_sewing_line__isnull=False
        )[:40]  # Get 40 available bundles (increased from 10)

        if not available_bundles:
            self.stdout.write("    ⚠️  No available bundles for this line")
            return

        # Calculate how many bundles to process based on target completion
        # Estimate ~15 garments per bundle (based on our bundle creation logic)
        bundles_needed = min(len(available_bundles), (target_completion // 15) + 1)
        bundles_to_process = available_bundles[:bundles_needed]

        self.stdout.write(
            f"    🎯 Target completion: {target_completion} garments (~{bundles_needed} bundles)"
        )

        # Step 1: Issue bundles from cutting line to sewing line
        self.stdout.write(
            f"    1️⃣ Issuing {len(bundles_to_process)} bundles from {cutting_line.name} to {sewing_line.name}..."
        )

        issued_bundles = []
        for bundle in bundles_to_process:
            try:
                process_bundle_issue_scan(
                    tracking_code=bundle.tracking_code,
                    sewing_line=sewing_line,  # Pass sewing_line object, not ID
                    user=cutting_user,  # Cutting line user issues to sewing
                )
                issued_bundles.append(bundle)
                self.stdout.write(f"      ✅ Issued bundle: {bundle.tracking_code}")
            except Exception as e:
                self.stdout.write(
                    f"      ❌ Failed to issue bundle {bundle.tracking_code}: {str(e)}"
                )

        # Step 2: Complete bundles (part receive) to create inventory
        self.stdout.write(
            f"    2️⃣ Completing {len(issued_bundles)} bundles (part receive)..."
        )

        # Get assembly tracking scanner for this sewing line (same as issue)
        receive_scanner = sewing_line.scanners.filter(
            scanner_type=ScannerType.ASSEMBLY_TRACKING
        ).first()

        receive_user = self.scanner_users.get(
            f"{sewing_line.id}_{ScannerType.ASSEMBLY_TRACKING}"
        )

        completed_bundles = []
        if receive_scanner and receive_user:
            for bundle in issued_bundles:
                try:
                    process_part_receive_scan(
                        tracking_code=bundle.tracking_code,
                        user=receive_user,
                    )
                    completed_bundles.append(bundle)
                    self.stdout.write(
                        f"      ✅ Completed bundle: {bundle.tracking_code}"
                    )
                except Exception as e:
                    self.stdout.write(
                        f"      ❌ Failed to complete bundle {bundle.tracking_code}: {str(e)}"
                    )
        else:
            self.stdout.write("    ⚠️  No assembly receive scanner/user found")

        # Step 3: Track assembly parts
        self.stdout.write("    3️⃣ Tracking assembly parts...")

        # Get garments from bundles that were issued to THIS sewing line
        line_garments = Garment.objects.filter(
            primary_bundle__assigned_sewing_line=sewing_line,
            status=GarmentStatus.PENDING_ASSEMBLY,
        )[:target_completion]  # Get up to target completion garments

        # Keep track of garments that were successfully processed for assembly
        processed_garments = []

        # Process garments for assembly - aim to process most available garments
        assembly_processed = 0
        for garment in line_garments:
            try:
                process_garment_issue_for_assembly_scan(
                    tracking_code=garment.tracking_code, user=assembly_user
                )
                processed_garments.append(garment)
                assembly_processed += 1
                if assembly_processed % 50 == 0:  # Progress indicator every 50 garments
                    self.stdout.write(
                        f"      📈 Processed {assembly_processed} garments for assembly..."
                    )
            except Exception as e:
                self.stdout.write(
                    f"      ❌ Failed to track assembly {garment.tracking_code}: {str(e)}"
                )

        self.stdout.write(
            f"      ✅ Total assembly tracked: {len(processed_garments)} garments"
        )

        # Step 4: Sewing QC - process most garments with realistic pass/fail rates
        self.stdout.write("    4️⃣ Performing sewing QC...")
        defects = self.created_data["defects"]

        qc_processed = 0
        qc_pass = 0
        qc_fail = 0
        qc_rework = 0

        # Use the garments that were successfully processed for assembly
        for i, garment in enumerate(processed_garments):
            try:
                # Realistic QC distribution: 85% pass, 10% fail, 5% rework
                rand_val = i % 100
                if rand_val < 85:  # 85% pass
                    qc_status = QualityCheckStatus.PASS
                    defect_ids = []
                    qc_pass += 1
                elif rand_val < 95:  # 10% fail (85-94)
                    qc_status = QualityCheckStatus.FAIL
                    defect_ids = [
                        defects[i % len(defects)].id
                    ]  # Rotate through defects
                    qc_fail += 1
                else:  # 5% rework (95-99)
                    qc_status = QualityCheckStatus.REWORK
                    defect_ids = [
                        defects[(i + 1) % len(defects)].id
                    ]  # Different defect
                    qc_rework += 1

                process_sewing_qc_scan(
                    tracking_code=garment.tracking_code,
                    qc_status=qc_status,
                    defect_ids=defect_ids,
                    user=qc_user,
                )
                qc_processed += 1

                # Progress indicator every 100 garments
                if qc_processed % 100 == 0:
                    self.stdout.write(f"      📊 QC processed: {qc_processed} garments")

            except Exception as e:
                self.stdout.write(
                    f"      ❌ Failed QC for {garment.tracking_code}: {str(e)}"
                )

        # Summary for this line
        self.stdout.write(
            f"      ✅ QC Summary: {qc_pass} pass, {qc_fail} fail, {qc_rework} rework (Total: {qc_processed})"
        )
        completion_rate = (
            (qc_processed / target_completion * 100) if target_completion > 0 else 0
        )
        self.stdout.write(
            f"      📊 Completion rate: {completion_rate:.1f}% ({qc_processed}/{target_completion})"
        )

    def test_dashboard(self):
        """Test the enhanced dashboard with generated data."""
        self.stdout.write("\n📊 Testing enhanced dashboard...")

        from tracking.services.sewing_dashboard_v2 import get_sewing_dashboard_v2_data

        sewing_lines = [
            line
            for line in self.created_data["production_lines"]
            if line.line_type == LineType.SEWING
        ]

        for line in sewing_lines[:1]:  # Test first line
            try:
                dashboard_data_list = get_sewing_dashboard_v2_data(
                    production_line_id=line.id
                )

                if dashboard_data_list:
                    dashboard_data = dashboard_data_list[0]
                    self.stdout.write(f"\n📈 Dashboard for {line.name}:")
                    self.stdout.write(
                        f"  Target Qty: {dashboard_data.get('target_qty', 0)}"
                    )
                    self.stdout.write(
                        f"  Pass Qty: {dashboard_data.get('pass_qty', 0)}"
                    )
                    self.stdout.write(
                        f"  Rejected Qty: {dashboard_data.get('rejected_qty', 0)}"
                    )
                    self.stdout.write(
                        f"  Efficiency: {dashboard_data.get('efficiency_percentage', 0)}%"
                    )
                    self.stdout.write(
                        f"  Line WIP: {dashboard_data.get('line_wip', 0)}"
                    )
                    self.stdout.write(
                        f"  Today's Loading: {dashboard_data.get('todays_loading', 0)}"
                    )
                    self.stdout.write(
                        f"  Hourly Data Points: {len(dashboard_data.get('hourly_data', []))}"
                    )
                    self.stdout.write(
                        f"  End Line Defects: {len(dashboard_data.get('end_line_defects', []))}"
                    )

                    self.stdout.write("  ✅ Dashboard data generated successfully!")
                else:
                    self.stdout.write("  ⚠️  No dashboard data returned")

            except Exception as e:
                self.stdout.write(f"  ❌ Dashboard test failed: {str(e)}")

    def print_summary(self):
        """Print summary of generated data."""
        self.stdout.write("\nGenerated data summary:")
        self.stdout.write(f"  - Buyers: {len(self.created_data.get('buyers', []))}")
        self.stdout.write(f"  - Seasons: {len(self.created_data.get('seasons', []))}")
        self.stdout.write(f"  - Sizes: {len(self.created_data.get('sizes', []))}")
        self.stdout.write(f"  - Colors: {len(self.created_data.get('colors', []))}")
        self.stdout.write(f"  - Parts: {len(self.created_data.get('parts', []))}")
        self.stdout.write(f"  - Defects: {len(self.created_data.get('defects', []))}")
        self.stdout.write(
            f"  - Production Lines: {len(self.created_data.get('production_lines', []))}"
        )
        self.stdout.write(f"  - Styles: {len(self.created_data.get('styles', []))}")
        self.stdout.write(f"  - Orders: {len(self.created_data.get('orders', []))}")
        self.stdout.write(f"  - Spreads: {len(self.created_data.get('spreads', []))}")
        self.stdout.write(
            f"  - Line Targets: {len(self.created_data.get('line_targets', []))}"
        )
