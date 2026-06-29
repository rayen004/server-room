from django.core.management.base import BaseCommand, CommandError

from monitoring.alerting import send_test_alert_email


class Command(BaseCommand):
    help = "Send a test alert email using the configured SMTP settings."

    def handle(self, *args, **options):
        sent = send_test_alert_email()

        if not sent:
            raise CommandError(
                "Test email was not sent. Check EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, "
                "and ALERT_EMAIL_RECIPIENTS in your environment."
            )

        self.stdout.write(self.style.SUCCESS("Test alert email sent successfully."))
