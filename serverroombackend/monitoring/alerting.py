import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail, get_connection, EmailMessage
from django.utils import timezone

from .models import AlertEvent, SensorData

logger = logging.getLogger("monitoring.alerting")


def evaluate_sensor_alerts(sensor_data: SensorData) -> None:
    logger.info(
        "Evaluating sensor alert for reading id=%s temp=%.2f humidity=%.2f",
        sensor_data.id,
        float(sensor_data.temperature),
        float(sensor_data.humidity),
    )
    checks = [
        (
            AlertEvent.AlertType.TEMPERATURE,
            float(sensor_data.temperature),
            float(settings.ALERT_TEMPERATURE_THRESHOLD),
            "High Temperature",
        ),
        (
            AlertEvent.AlertType.HUMIDITY,
            float(sensor_data.humidity),
            float(settings.ALERT_HUMIDITY_THRESHOLD),
            "High Humidity",
        ),
    ]

    for alert_type, current_value, threshold, label in checks:
        logger.info(
            "Checking %s alert: current_value=%.2f threshold=%.2f",
            alert_type,
            current_value,
            threshold,
        )
        if current_value <= threshold:
            logger.info("%s alert not triggered because value is below threshold.", alert_type)
            continue

        if _is_in_cooldown(alert_type):
            logger.info("Skipping %s alert due to cooldown.", alert_type)
            continue

        message = (
            f"{label} detected in the server room. "
            f"Temperature: {float(sensor_data.temperature):.2f} C, "
            f"Humidity: {float(sensor_data.humidity):.2f}%%, "
            f"Threshold: {threshold:.2f}."
        )

        email_sent = send_alert_email(label, message)
        logger.info("%s alert email_sent=%s", alert_type, email_sent)

        AlertEvent.objects.create(
            alert_type=alert_type,
            message=message,
            temperature=sensor_data.temperature,
            humidity=sensor_data.humidity,
            threshold=threshold,
            email_sent=email_sent,
            sms_sent=False,
            sensor_data=sensor_data,
        )


def _is_in_cooldown(alert_type: str) -> bool:
    cooldown_seconds = int(settings.ALERT_COOLDOWN_SECONDS)
    cutoff = timezone.now() - timedelta(seconds=cooldown_seconds)
    return AlertEvent.objects.filter(alert_type=alert_type, created_at__gte=cutoff).exists()


def send_alert_email(subject: str, message: str) -> bool:
    """Send alert using Django SMTP settings. Uses explicit connection and EmailMessage
    to ensure authentication is used. Returns True when at least one recipient accepted the message.
    """
    recipients = [email for email in settings.ALERT_EMAIL_RECIPIENTS if email]
    logger.info(
        "Preparing email alert subject=%s recipients=%s host=%s port=%s tls=%s user_configured=%s password_configured=%s",
        subject,
        recipients,
        settings.EMAIL_HOST,
        settings.EMAIL_PORT,
        settings.EMAIL_USE_TLS,
        bool(settings.EMAIL_HOST_USER),
        bool(settings.EMAIL_HOST_PASSWORD),
    )

    if not recipients or not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
        logger.info("Skipping email alert because SMTP settings are incomplete.")
        return False

    try:
        # Build explicit connection to ensure credentials and TLS options are used
        connection = get_connection(
            host=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT,
            username=settings.EMAIL_HOST_USER,
            password=settings.EMAIL_HOST_PASSWORD,
            use_tls=settings.EMAIL_USE_TLS,
            timeout=getattr(settings, "EMAIL_TIMEOUT", None),
            fail_silently=False,
        )

        email = EmailMessage(
            subject=f"[Server Room Alert] {subject}",
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipients,
            connection=connection,
        )

        delivered_count = email.send(fail_silently=False)
        logger.info("EmailMessage.send completed with delivered_count=%s", delivered_count)
        print(f"[ALERT EMAIL] subject={subject} delivered_count={delivered_count}")
        return delivered_count > 0
    except Exception as exc:
        logger.exception("Failed to send alert email: %s", exc)
        print(f"[ALERT EMAIL ERROR] {exc}")
        return False


def send_test_alert_email() -> bool:
    message = (
        "This is a test email from the Server Room Monitoring alert system. "
        "If you received this message, Gmail SMTP is configured correctly."
    )
    return send_alert_email("Test Alert", message)
