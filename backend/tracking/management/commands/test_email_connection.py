import smtplib

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Open a raw SMTP connection using the project's EMAIL_* settings and "
        "verify login, so SMTP connectivity/credentials can be checked in "
        "isolation without generating or sending the full report."
    )

    def handle(self, *args, **options):
        host = settings.EMAIL_HOST
        port = int(settings.EMAIL_PORT)
        use_tls = settings.EMAIL_USE_TLS
        user = settings.EMAIL_HOST_USER
        password = settings.EMAIL_HOST_PASSWORD
        timeout = getattr(settings, "EMAIL_TIMEOUT", 30)

        if not host:
            self.stderr.write(
                self.style.ERROR("EMAIL_HOST is not set — check your .env / settings.")
            )
            return

        self.stdout.write(
            f"Connecting to {host}:{port} (TLS={use_tls}, timeout={timeout}s) "
            f"as {user or '<no user>'} ..."
        )

        server = None
        try:
            server = smtplib.SMTP(host, port, timeout=timeout)
            server.ehlo()
            if use_tls:
                server.starttls()
                server.ehlo()
                self.stdout.write(self.style.SUCCESS("STARTTLS negotiated OK."))
            if user and password:
                server.login(user, password)
                self.stdout.write(self.style.SUCCESS("SMTP login OK."))
            else:
                self.stdout.write(
                    self.style.WARNING(
                        "No EMAIL_HOST_USER/PASSWORD set — skipped login step."
                    )
                )
            self.stdout.write(
                self.style.SUCCESS(f"SMTP connection to {host}:{port} succeeded.")
            )
        except Exception as exc:  # noqa: BLE001 — report any failure clearly
            self.stderr.write(
                self.style.ERROR(
                    f"SMTP connection FAILED: {type(exc).__name__}: {exc}"
                )
            )
        finally:
            if server is not None:
                try:
                    server.quit()
                except Exception:  # noqa: BLE001 — nothing useful to do on close error
                    pass
