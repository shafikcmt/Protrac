import os
import io
import logging
from PIL import Image
from django.conf import settings
from typing import Optional, Tuple
from django.core.files.base import ContentFile
import pillow_avif  # noqa (Required for AVIF support)


logger = logging.getLogger(__name__)


class ImageOptimizer:
    """Utility class for image optimization and conversion"""

    ALLOWED_FORMATS = {"webp", "avif"}
    DEFAULT_FORMAT = "webp"
    DEFAULT_QUALITY = 75
    MAX_DIMENSIONS = (1920, 1080)

    @classmethod
    def optimize_image(
        cls,
        image_field,
        format: Optional[str] = None,
        quality: Optional[int] = None,
        max_dimensions: Optional[Tuple[int, int]] = None,
    ) -> ContentFile:
        """
        Optimizes and converts images while preserving quality and transparency.

        Args:
            image_field: The uploaded image file
            format: Output format (webp/avif)
            quality: Compression quality (1-100)
            max_dimensions: Maximum (width, height) tuple
        """
        format = (
            format or getattr(settings, "IMAGE_CONVERSION_FORMAT", cls.DEFAULT_FORMAT)
        ).lower()
        quality = quality or getattr(
            settings, "IMAGE_CONVERSION_QUALITY", cls.DEFAULT_QUALITY
        )
        max_dimensions = max_dimensions or getattr(
            settings, "IMAGE_MAX_DIMENSIONS", cls.MAX_DIMENSIONS
        )

        if format not in cls.ALLOWED_FORMATS:
            format = cls.DEFAULT_FORMAT

        try:
            img = Image.open(image_field)

            # Preserve color profile and metadata
            icc_profile = img.info.get("icc_profile")
            exif = img.info.get("exif")

            # Convert color mode to support transparency
            img = (
                img.convert("RGBA")
                if img.mode in ("RGBA", "LA", "P")
                else img.convert("RGB")
            )

            # Resize if image exceeds maximum dimensions
            if img.size[0] > max_dimensions[0] or img.size[1] > max_dimensions[1]:
                img.thumbnail(max_dimensions, Image.Resampling.LANCZOS)

            # Prepare buffer for saving
            buffer = io.BytesIO()

            # Save with appropriate format and settings
            save_kwargs = {
                "quality": quality,
                "optimize": True,
            }

            if icc_profile:
                save_kwargs["icc_profile"] = icc_profile
            if exif:
                save_kwargs["exif"] = exif

            if format == "avif":
                save_kwargs["speed"] = 6  # Balance between speed and compression
                img.save(buffer, format="AVIF", **save_kwargs)
            else:
                save_kwargs["method"] = 6  # Best compression
                save_kwargs["lossless"] = (
                    img.mode == "RGBA"
                )  # Use lossless for transparent images
                img.save(buffer, format="WEBP", **save_kwargs)

            # Generate filename without nesting directories
            filename = f"{os.path.splitext(image_field.name)[0]}.{format}"

            return ContentFile(buffer.getvalue(), name=filename)

        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return image_field
