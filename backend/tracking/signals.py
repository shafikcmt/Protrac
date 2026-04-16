from django.db.models.signals import post_delete
from django.dispatch import receiver
from tracking.models import Bundle


@receiver(post_delete, sender=Bundle)
def cleanup_garments_on_bundle_deletion(sender, instance, **kwargs):
    """
    When a bundle is deleted, clean up garments if no other bundles exist for the set.
    """
    instance.cleanup_garments_for_bundle_set()
