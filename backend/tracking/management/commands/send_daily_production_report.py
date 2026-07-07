from datetime import datetime

from django.core.management.base import BaseCommand, CommandError

from tracking.services.report.daily_production_mail import (
    send_daily_production_report_email,
)


class Command(BaseCommand):
    help = (
        "Send today's Daily Production Report email (all lines/buyers) to the "
        "active MailRecipient rows. Use --date to send a specific date's report."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            dest="date",
            help="Report date in YYYY-MM-DD format (defaults to today, Asia/Dhaka).",
        )

    def handle(self, *args, **options):
        report_date = None
        raw = options.get("date")
        if raw:
            try:
                report_date = datetime.strptime(raw, "%Y-%m-%d").date()
            except ValueError:
                raise CommandError(f"Invalid --date '{raw}', expected YYYY-MM-DD.")

        sent = send_daily_production_report_email(report_date=report_date)
        if sent:
            self.stdout.write(self.style.SUCCESS("Daily production report email sent."))
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Email not sent (no active 'to' recipients, or an error was "
                    "logged). Check the logs for details."
                )
            )
