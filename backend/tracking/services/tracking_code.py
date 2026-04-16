from datetime import date
import hashlib
import uuid


def _get_date_stamp() -> str:
    """Get current date in DDMMYY format."""
    today = date.today()
    return today.strftime("%d%m%y")


def _get_tracking_code_type(tracking_code: str) -> str:
    """Determine if tracking code is for bundle or garment."""
    if len(tracking_code) != 13:
        return "invalid"

    prefix = tracking_code[0]

    if prefix == "1":
        return "bundle"
    elif prefix == "3":
        return "garment"
    else:
        return "invalid"


def _get_next_sequence_number(prefix: str, date_stamp: str) -> str:
    """Get next sequential number for the given prefix and date."""
    from tracking.models.tracking import Bundle, Garment

    # Build the pattern to search for
    pattern = f"{prefix}{date_stamp}"

    # Search only in the relevant model based on prefix
    if prefix == "1":  # Bundle codes
        existing_codes = Bundle.objects.filter(
            tracking_code__startswith=pattern
        ).values_list("tracking_code", flat=True)
    elif prefix == "3":  # Garment codes
        existing_codes = Garment.objects.filter(
            tracking_code__startswith=pattern
        ).values_list("tracking_code", flat=True)
    else:
        return "000001"

    if not existing_codes:
        return "000001"

    # Extract sequence numbers and find the highest
    max_sequence = 0
    for code in existing_codes:
        if len(code) == 13:  # Ensure it's our expected format
            try:
                sequence = int(code[-6:])  # Last 6 digits
                max_sequence = max(max_sequence, sequence)
            except ValueError:
                continue

    next_sequence = max_sequence + 1

    # Check if we've exceeded 999999
    if next_sequence > 999999:
        return _generate_fallback_sequence()

    return f"{next_sequence:06d}"


def _generate_fallback_sequence() -> str:
    """
    Generate fallback sequence using hash when numbers are exhausted.
    """
    # Create a unique string using current timestamp and random UUID
    unique_string = f"{date.today().isoformat()}{uuid.uuid4().hex}"

    # Hash it and take first 6 characters as hex
    hash_hex = hashlib.md5(unique_string.encode()).hexdigest()[:6]

    return hash_hex


def generate_bundle_tracking_code() -> str:
    """Generate tracking code for bundle."""
    prefix = "1"  # All bundles use prefix 1 now
    date_stamp = _get_date_stamp()
    sequence = _get_next_sequence_number(prefix, date_stamp)

    return f"{prefix}{date_stamp}{sequence}"


def generate_garment_tracking_code() -> str:
    """Generate tracking code for garment."""
    prefix = "3"
    date_stamp = _get_date_stamp()
    sequence = _get_next_sequence_number(prefix, date_stamp)

    return f"{prefix}{date_stamp}{sequence}"


def find_item_by_tracking_code(tracking_code: str) -> "tuple[object, str]":
    """Find bundle or garment by tracking code. Returns a tuple of (item, type)."""
    from tracking.models.tracking import Bundle, Garment

    code_type = _get_tracking_code_type(tracking_code)

    if code_type == "invalid":
        return None, "Invalid tracking code"

    try:
        if code_type == "bundle":
            item = Bundle.objects.get(tracking_code=tracking_code)
            return item, "bundle"
        elif code_type == "garment":
            item = Garment.objects.get(tracking_code=tracking_code)
            return item, "garment"
    except (Bundle.DoesNotExist, Garment.DoesNotExist):
        return None, f"{code_type.title()} not found"

    return None, "Unknown error"
