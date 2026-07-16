import logging
import os
import sys

from django.apps import AppConfig

logger = logging.getLogger("tracking.scheduler")

# Module-level handle to the running scheduler so the post_save signal handler
# (and anything else in this process) can reach it to live-reschedule the job.
_scheduler = None


class TrackingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tracking"

    def ready(self):
        """Import signals and (for server processes only) start the scheduler."""
        import tracking.signals  # noqa

        self._maybe_start_scheduler()

    def _maybe_start_scheduler(self):
        """
        Start the in-app APScheduler daily job — but only for real server
        processes, and only once.

        Guards:
          * One-off management commands (migrate, test, shell, makemigrations,
            the manual send command, …) must NOT start a background scheduler, so
            we start only for `runserver` or gunicorn.
          * `runserver`'s autoreloader imports apps twice: the parent watcher has
            RUN_MAIN unset, the worker child has RUN_MAIN="true". We start only in
            the child so the job isn't registered twice in dev.

        The actual send time comes from the ReportScheduleConfig admin row (via
        reschedule_daily_production_job), so it can be changed live without a
        restart; a post_save signal re-applies it whenever the row is saved.

        KNOWN LIMITATION (production): under gunicorn with multiple workers, each
        worker process runs ready() and would start its own scheduler → duplicate
        emails, and a config change is only seen by the worker that handled the
        save. This is safe for single-worker / dev use only. A proper production
        setup should run the scheduler in exactly one process — e.g. a dedicated
        management command under OS cron, or a --preload + leader-election pattern.
        We deliberately do not solve that here; revisit before multi-worker deploy.
        """
        global _scheduler

        argv0 = sys.argv[0] if sys.argv else ""
        is_runserver = "runserver" in sys.argv
        is_gunicorn = "gunicorn" in argv0
        if not (is_runserver or is_gunicorn):
            return

        # Avoid the runserver autoreloader double-start (gunicorn doesn't set
        # RUN_MAIN, so this only gates the dev server).
        if is_runserver and os.environ.get("RUN_MAIN") != "true":
            return

        try:
            import pytz
            from apscheduler.schedulers.background import BackgroundScheduler

            from tracking.services.report.daily_production_mail import (
                reschedule_daily_production_job,
            )

            scheduler = BackgroundScheduler(timezone=pytz.timezone("Asia/Dhaka"))
            scheduler.start()
            _scheduler = scheduler
            # Keep a reference on the AppConfig too so it isn't GC'd.
            self._scheduler = scheduler

            # Add the job from the current ReportScheduleConfig row (falls back to
            # 18:00 if the row/table isn't ready yet).
            reschedule_daily_production_job(scheduler)

            # Re-apply the schedule whenever the admin saves the config row.
            self._connect_reschedule_signal()

            logger.info("Daily production report scheduler started.")
        except Exception:  # noqa: BLE001 — a scheduler failure must not block startup
            logger.exception("Failed to start the daily production report scheduler.")

    def _connect_reschedule_signal(self):
        """Wire ReportScheduleConfig saves to a live reschedule of the job."""
        from django.db.models.signals import post_save

        from tracking.models.mail import ReportScheduleConfig

        post_save.connect(
            _reschedule_on_config_save,
            sender=ReportScheduleConfig,
            dispatch_uid="reschedule_daily_production_on_config_save",
        )


def _reschedule_on_config_save(sender, instance, **kwargs):
    """post_save receiver — re-apply the schedule from the saved config row."""
    if _scheduler is None:
        return
    from tracking.services.report.daily_production_mail import (
        reschedule_daily_production_job,
    )

    reschedule_daily_production_job(_scheduler)


def _run_daily_production_report_job():
    """Cron entry point — thin wrapper so the send logic stays in the service."""
    from tracking.services.report.daily_production_mail import (
        send_daily_production_report_email,
    )

    send_daily_production_report_email()
