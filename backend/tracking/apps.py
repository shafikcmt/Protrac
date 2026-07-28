import logging
import os
import sys

from django.apps import AppConfig

logger = logging.getLogger("tracking.scheduler")

# Module-level handle to the running scheduler so the post_save signal handler
# (and anything else in this process) can reach it to live-reschedule the job.
_scheduler = None

# Nightly auto-completion sweep (tracking.services.line_completion). Fixed time:
# 23:30 Asia/Dhaka — after the production day and after the 18:00 report email.
LINE_COMPLETION_SWEEP_JOB_ID = "line_completion_sweep"
SWEEP_HOUR = 23
SWEEP_MINUTE = 30


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

            # Nightly auto-completion sweep. Fixed time (not admin-configurable):
            # it has no user-visible output to time around, and 23:30 puts it
            # after the production day and after the 18:00 report email, so the
            # emailed report and the sweep never race.
            self._add_line_completion_sweep_job(scheduler)

            logger.info("Daily production report scheduler started.")
        except Exception:  # noqa: BLE001 — a scheduler failure must not block startup
            logger.exception("Failed to start the daily production report scheduler.")

    def _add_line_completion_sweep_job(self, scheduler):
        """Register the nightly auto-completion sweep at 23:30 Asia/Dhaka.

        ``replace_existing`` keeps this idempotent if ready() runs more than once.

        On the multi-worker caveat documented in _maybe_start_scheduler: each
        gunicorn worker registers its own copy, so the sweep runs up to 3x at
        23:30. That is harmless here in a way the email job's duplication is not —
        the sweep is idempotent (get_or_create on a unique (line, order), and it
        skips orders that already have a completion), so extra runs write nothing
        and simply log a zero total. It is still worth fixing centrally; see the
        note in _maybe_start_scheduler.
        """
        try:
            from apscheduler.triggers.cron import CronTrigger

            scheduler.add_job(
                _run_line_completion_sweep_job,
                trigger=CronTrigger(hour=SWEEP_HOUR, minute=SWEEP_MINUTE),
                id=LINE_COMPLETION_SWEEP_JOB_ID,
                replace_existing=True,
            )
            logger.info(
                "Line-completion sweep scheduled at %02d:%02d Asia/Dhaka.",
                SWEEP_HOUR,
                SWEEP_MINUTE,
            )
        except Exception:  # noqa: BLE001 — must not block startup
            logger.exception("Failed to schedule the line-completion sweep job.")

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


def _run_line_completion_sweep_job():
    """Cron entry point for the nightly auto-completion sweep.

    Identical to ``manage.py sweep_line_completions`` — both call the same
    service function. Exceptions are swallowed and logged: a failed sweep must
    never take down the scheduler thread (APScheduler would otherwise keep the
    job but surface the error only in its own logs).
    """
    try:
        from tracking.services.line_completion import sweep_auto_completions

        results = sweep_auto_completions()
        total = sum(len(v) for v in results.values())
        logger.info("Nightly line-completion sweep finished: %d completion(s).", total)
    except Exception:  # noqa: BLE001
        logger.exception("Nightly line-completion sweep failed.")
