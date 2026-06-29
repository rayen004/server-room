import logging

from django.conf import settings
from django.contrib.auth.signals import user_logged_in
from django.core.mail import send_mail
from django.dispatch import receiver

from .models import SensorData

logger = logging.getLogger(__name__)
TEST_MODE_RECIPIENT = "aribirayen98@gmail.com"


def get_latest_sensor_snapshot() -> tuple[str | None, str | None]:
    latest_sensor = SensorData.objects.order_by("-created_at", "-id").first()
    if latest_sensor is None:
        return None, None

    return (
        f"{float(latest_sensor.temperature):.2f}",
        f"{float(latest_sensor.humidity):.2f}",
    )


def send_login_test_mode_email(user) -> None:
    temperature, humidity = get_latest_sensor_snapshot()
    if temperature is None or humidity is None:
        conditions_block = "No sensor data available"
    else:
        conditions_block = (
            "Current server room conditions:\n"
            f"Temperature: {temperature}°C\n"
            f"Humidity: {humidity}%"
        )

    message = (
        "User login detected.\n\n"
        f"{conditions_block}\n\n"
        "(This is a test mode email.)"
    )

    send_mail(
        subject="Test Mode - Server Room Status",
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[TEST_MODE_RECIPIENT],
        fail_silently=False,
    )


@receiver(user_logged_in)
def handle_user_logged_in(sender, request, user, **kwargs) -> None:
    if not getattr(settings, "TEST_MODE", False):
        return

    try:
        send_login_test_mode_email(user)
    except Exception:
        logger.exception(
            "Failed to send test mode login email for user_id=%s.",
            user.id,
        )
