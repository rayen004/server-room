from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class SensorData(models.Model):
    temperature = models.DecimalField(max_digits=5, decimal_places=2)
    humidity = models.DecimalField(max_digits=5, decimal_places=2)
    power = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Sensor data"
        verbose_name_plural = "Sensor data"

    def __str__(self) -> str:
        return (
            f"SensorData(temp={self.temperature}, humidity={self.humidity}, power={self.power}, "
            f"created_at={self.created_at:%Y-%m-%d %H:%M:%S})"
        )


class AlertEvent(models.Model):
    class AlertType(models.TextChoices):
        TEMPERATURE = "TEMPERATURE", "Temperature"
        HUMIDITY = "HUMIDITY", "Humidity"

    alert_type = models.CharField(max_length=32, choices=AlertType.choices, db_index=True)
    message = models.TextField()
    temperature = models.DecimalField(max_digits=5, decimal_places=2)
    humidity = models.DecimalField(max_digits=5, decimal_places=2)
    threshold = models.DecimalField(max_digits=5, decimal_places=2)
    email_sent = models.BooleanField(default=False)
    sms_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    sensor_data = models.ForeignKey(
        "SensorData",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Alert event"
        verbose_name_plural = "Alert events"

    def __str__(self) -> str:
        return f"{self.alert_type} alert at {self.created_at:%Y-%m-%d %H:%M:%S}"


class UserApproval(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="approval",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User approval"
        verbose_name_plural = "User approvals"

    def __str__(self) -> str:
        return f"{self.user.get_username()} ({self.status})"

    @property
    def is_approved(self) -> bool:
        return self.status == self.Status.APPROVED


class UserSession(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Closed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    login_time = models.DateTimeField(auto_now_add=True, db_index=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    class Meta:
        ordering = ["-login_time"]
        verbose_name = "User session"
        verbose_name_plural = "User sessions"

    def __str__(self) -> str:
        return f"{self.user.get_username()} ({self.status})"

    def close(self) -> None:
        if self.status == self.Status.CLOSED and self.logout_time:
            return

        self.logout_time = timezone.now()
        self.status = self.Status.CLOSED
        self.save(update_fields=["logout_time", "status"])

    @property
    def session_duration(self):
        if self.status == self.Status.CLOSED and self.logout_time:
            return self.logout_time - self.login_time

        return timezone.now() - self.login_time


class RFIDUser(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        USER = "user", "User"

    uid = models.CharField(max_length=32, unique=True, db_index=True)
    username = models.CharField(max_length=150)
    role = models.CharField(max_length=16, choices=Role.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["username", "uid"]
        verbose_name = "RFID user"
        verbose_name_plural = "RFID users"

    def __str__(self) -> str:
        return f"{self.username} ({self.uid})"


class RFIDLog(models.Model):
    class Status(models.TextChoices):
        AUTHORIZED = "authorized", "Authorized"
        DENIED = "denied", "Denied"

    uid = models.CharField(max_length=32, db_index=True)
    role = models.CharField(max_length=16, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "RFID log"
        verbose_name_plural = "RFID logs"

    def __str__(self) -> str:
        return f"{self.uid} - {self.status}"


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "To Do", "To Do"
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"

    class Priority(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TODO,
        db_index=True,
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    is_daily = models.BooleanField(default=False, db_index=True)
    date = models.DateField(default=timezone.localdate, db_index=True)
    is_completed = models.BooleanField(default=False, db_index=True)
    due_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "due_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["title", "date"],
                condition=models.Q(is_daily=True),
                name="unique_daily_task_per_title_date",
            )
        ]

    def __str__(self) -> str:
        if self.user_id:
            return f"{self.title} -> {self.user.get_username()}"

        return self.title

    @property
    def assigned_to(self):
        return self.user

    @assigned_to.setter
    def assigned_to(self, value):
        self.user = value


class TaskCompletion(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="task_completions",
    )
    task = models.ForeignKey(
        "Task",
        on_delete=models.CASCADE,
        related_name="completions",
    )
    is_completed = models.BooleanField(default=False, db_index=True)
    date = models.DateField(default=timezone.localdate, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "task", "date"],
                name="unique_task_completion_per_user_task_date",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user.get_username()} -> {self.task_id} ({self.is_completed})"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def ensure_user_approval(sender, instance, created, **kwargs):
    if not created:
        return

    UserApproval.objects.get_or_create(
        user=instance,
        defaults={
            "status": (
                UserApproval.Status.APPROVED
                if instance.is_staff or instance.is_superuser
                else UserApproval.Status.PENDING
            )
        },
    )
