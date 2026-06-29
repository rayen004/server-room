from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import AlertEvent, RFIDLog, SensorData, Task, TaskCompletion, UserApproval, UserSession


class SensorDataSerializer(serializers.ModelSerializer):
    timestamp = serializers.SerializerMethodField()

    class Meta:
        model = SensorData
        fields = ["id", "temperature", "humidity", "power", "timestamp", "created_at"]
        read_only_fields = ["id", "timestamp", "created_at"]

    def get_timestamp(self, obj: SensorData) -> str | None:
        if obj.created_at is None:
            return None

        return obj.created_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class AlertEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertEvent
        fields = [
            "id",
            "alert_type",
            "message",
            "temperature",
            "humidity",
            "threshold",
            "email_sent",
            "sms_sent",
            "created_at",
        ]


class SignupSerializer(serializers.ModelSerializer):
    name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = get_user_model()
        fields = ["id", "name", "email", "password"]

    def validate_email(self, value):
        user_model = get_user_model()
        email = value.strip().lower()

        if user_model.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with that email already exists.")

        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        name = validated_data.pop("name").strip()
        password = validated_data.pop("password")
        email = validated_data.pop("email").lower()
        user_model = get_user_model()
        username = self._build_unique_username(email, user_model)

        with transaction.atomic():
            user = user_model.objects.create_user(
                username=username,
                first_name=name,
                email=email,
                password=password,
                **validated_data,
            )
            UserApproval.objects.update_or_create(
                user=user,
                defaults={"status": UserApproval.Status.PENDING},
            )

        return user

    def _build_unique_username(self, email, user_model):
        base_username = email.split("@", 1)[0].strip().lower().replace(" ", "-") or "user"
        candidate = base_username
        suffix = 1

        while user_model.objects.filter(username__iexact=candidate).exists():
            suffix += 1
            candidate = f"{base_username}-{suffix}"

        return candidate


class PendingUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", read_only=True)
    status = serializers.CharField(source="approval.status", read_only=True)

    class Meta:
        model = get_user_model()
        fields = ["id", "name", "email", "status"]


class UserSessionSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    user_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)
    duration = serializers.SerializerMethodField()
    duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            "id",
            "user_id",
            "user_name",
            "user_email",
            "login_time",
            "logout_time",
            "duration",
            "duration_seconds",
            "status",
        ]

    def get_user_name(self, obj: UserSession) -> str:
        return obj.user.first_name or obj.user.get_username()

    def get_duration(self, obj: UserSession) -> str:
        total_seconds = self.get_duration_seconds(obj)
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)

        if hours > 0:
            return f"{hours:02}:{minutes:02}:{seconds:02}"

        return f"{minutes:02}:{seconds:02}"

    def get_duration_seconds(self, obj: UserSession) -> int:
        duration = obj.session_duration
        return max(int(duration.total_seconds()), 0)


class RFIDAuthRequestSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=32)
    door = serializers.ChoiceField(choices=["open", "closed"], required=False)

    def validate_uid(self, value):
        uid = "".join(value.strip().upper().split())
        if not uid:
            raise serializers.ValidationError("UID is required.")
        return uid


class RFIDLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFIDLog
        fields = ["id", "uid", "role", "status", "timestamp"]


class AccountUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", read_only=True)
    role = serializers.SerializerMethodField()
    status = serializers.CharField(source="approval.status", read_only=True)
    is_protected_admin = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ["id", "name", "username", "email", "role", "status", "is_protected_admin"]

    def get_role(self, obj) -> str:
        return "admin" if obj.is_staff or obj.is_superuser else "user"

    def get_is_protected_admin(self, obj) -> bool:
        from .admin_utils import is_protected_admin

        return is_protected_admin(obj)


class UpdateUserRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["admin", "user"])


class UpdateUserStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            UserApproval.Status.PENDING,
            UserApproval.Status.APPROVED,
            UserApproval.Status.REJECTED,
        ]
    )


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        user = self.context["request"].user
        validate_password(value, user=user)
        return value

    def validate(self, attrs):
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password must be different from the current password."}
            )
        return attrs


class RecoveryAdminSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)


class ActiveUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    status = serializers.CharField(source="approval.status", read_only=True)

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email", "role", "status"]

    def get_role(self, obj) -> str:
        return "ADMIN" if obj.is_staff or obj.is_superuser else "USER"


class TaskUserSummarySerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    status = serializers.CharField(source="approval.status", read_only=True)

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email", "role", "status"]

    def get_role(self, obj) -> str:
        return "ADMIN" if obj.is_staff or obj.is_superuser else "USER"


class TaskSerializer(serializers.ModelSerializer):
    user = TaskUserSummarySerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=get_user_model().objects.select_related("approval"),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "is_daily",
            "date",
            "is_completed",
            "due_date",
            "created_at",
            "updated_at",
            "user_id",
            "user",
        ]

    def validate_user(self, value):
        if value is None:
            return value

        approval = getattr(value, "approval", None)
        is_approved = approval and approval.status == UserApproval.Status.APPROVED

        if value.is_staff or value.is_superuser:
            raise serializers.ValidationError("Tasks can only be assigned to standard users.")

        if not is_approved:
            raise serializers.ValidationError("Tasks can only be assigned to approved users.")

        return value

    def validate(self, attrs):
        task = self.instance
        is_daily = attrs.get("is_daily", getattr(task, "is_daily", False))
        user = attrs.get("user", getattr(task, "user", None))

        if not is_daily and user is None:
            raise serializers.ValidationError({"user_id": "A user is required for non-daily tasks."})

        return attrs


class TodayTaskSerializer(serializers.ModelSerializer):
    is_completed = serializers.SerializerMethodField()
    assigned_to = serializers.IntegerField(source="user_id", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "is_daily",
            "date",
            "is_completed",
            "due_date",
            "created_at",
            "updated_at",
            "assigned_to",
        ]

    def get_is_completed(self, obj: Task) -> bool:
        completion_map = self.context.get("completion_map", {})
        if obj.is_daily:
            return completion_map.get(obj.id, False)

        return obj.is_completed
