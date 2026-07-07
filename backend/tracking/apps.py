import logging
import os
import sys

from django.apps import AppConfig

logger = logging.getLogger("tracking.scheduler")

# Daily send time (Asia/Dhaka). Placeholder default — adjust as needed.
DAILY_REPORT_HOUR = 18
DAILY_REPORT_MINUTE = 0


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

        KNOWN LIMITATION (production): under gunicorn with multiple workers, each
        worker process runs ready() and would start its own scheduler → duplicate
        emails. This is safe for single-worker / dev use only. A proper production
        setup should run the scheduler in exactly one process — e.g. a dedicated
        management command under OS cron, or a --preload + leader-election pattern.
        We deliberately do not solve that here; revisit before multi-worker deploy.
        """
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
            from apscheduler.triggers.cron import CronTrigger

            scheduler = BackgroundScheduler(timezone=pytz.timezone("Asia/Dhaka"))
            scheduler.add_job(
                _run_daily_production_report_job,
                trigger=CronTrigger(
                    hour=DAILY_REPORT_HOUR, minute=DAILY_REPORT_MINUTE
                ),
                id="daily_production_report_email",
                replace_existing=True,
                max_instances=1,
                coalesce=True,
            )
            scheduler.start()
            # Keep a reference so the scheduler isn't garbage-collected.
            self._scheduler = scheduler
            logger.info(
                "Daily production report scheduler started (%02d:%02d Asia/Dhaka).",
                DAILY_REPORT_HOUR, DAILY_REPORT_MINUTE,
            )
        except Exception:  # noqa: BLE001 — a scheduler failure must not block startup
            logger.exception("Failed to start the daily production report scheduler.")


def _run_daily_production_report_job():
    """Cron entry point — thin wrapper so the send logic stays in the service."""
    from tracking.services.report.daily_production_mail import (
        send_daily_production_report_email,
    )

    send_daily_production_report_email()
