from typing import List
from django.db import transaction
from tracking.models.tracking import ProductionLine, Scanner
from tracking.models.constants import SCANNER_TYPE_MAPPING, ScannerType


def get_required_scanner_types(line_type: str) -> List[str]:
    """Get the required scanner types for a production line type."""
    return SCANNER_TYPE_MAPPING.get(line_type, [])


def generate_scanner_name(production_line_name: str, scanner_type: str) -> str:
    """Generate a standardized scanner name."""
    scanner_display = ScannerType(scanner_type).label
    return f"{production_line_name} - {scanner_display}"


def create_scanners_for_line(production_line: ProductionLine) -> List[Scanner]:
    """Create all required scanners for a production line based on its type."""
    required_scanner_types = get_required_scanner_types(production_line.line_type)
    created_scanners = []

    with transaction.atomic():
        for scanner_type in required_scanner_types:
            scanner_name = generate_scanner_name(production_line.name, scanner_type)

            scanner = Scanner.objects.create(
                name=scanner_name,
                scanner_type=scanner_type,
                production_line=production_line,
                created_by=production_line.created_by,
                updated_by=production_line.updated_by,
            )
            created_scanners.append(scanner)

    return created_scanners
