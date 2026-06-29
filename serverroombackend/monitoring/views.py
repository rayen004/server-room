from django.http import JsonResponse
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.signals import user_logged_in
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .admin_utils import admin_count, ensure_main_admin, is_protected_admin, recover_admin_for_user
from .alerting import evaluate_sensor_alerts
from .daily_tasks import generate_daily_tasks_for_date
from .models import AlertEvent, RFIDLog, RFIDUser, SensorData, Task, UserApproval, UserSession
from .serializers import (
    ActiveUserSerializer,
    AccountUserSerializer,
    AlertEventSerializer,
    ChangePasswordSerializer,
    PendingUserSerializer,
    RecoveryAdminSerializer,
    RFIDAuthRequestSerializer,
    RFIDLogSerializer,
    SensorDataSerializer,
    SignupSerializer,
    TaskSerializer,
    TodayTaskSerializer,
    UpdateUserRoleSerializer,
    UpdateUserStatusSerializer,
    UserSessionSerializer,
)


def home(request):
    return JsonResponse({"message": "Server Room API is working"})


RFID_ACCESS_MAP = {
    "A35F0580": {
        "username": "RFID Admin",
        "role": RFIDUser.Role.ADMIN,
        "redirect": "/admin-dashboard",
        "login_identifier": "admin",
        "password": "admin123",
    },
    "0DEC633B": {
        "username": "RFID User",
        "role": RFIDUser.Role.USER,
        "redirect": "/user-dashboard",
        "login_identifier": "aribi@gmail.com",
        "password": "rayen123",
    },
}

LAST_RFID_SCAN = {
    "status": "idle",
    "role": "",
    "uid": "",
    "redirect": "",
    "door": "",
}


class RFIDAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        global LAST_RFID_SCAN

        print("[RFID AUTH] Raw request data:", request.data)
        serializer = RFIDAuthRequestSerializer(data=request.data)
        if not serializer.is_valid():
            print("[RFID AUTH] Invalid request:", serializer.errors)
            LAST_RFID_SCAN = {
                "status": "denied",
                "role": "",
                "uid": "",
                "redirect": "",
                "door": request.data.get("door", ""),
            }
            return Response(
                {
                    "status": "denied",
                    "detail": serializer.errors,
                    "openDoor": False,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        uid = serializer.validated_data["uid"]
        door_state = serializer.validated_data.get("door", "open")
        print("[RFID AUTH] Normalized UID:", uid)
        print("[RFID AUTH] Door state:", door_state)
        access_rule = RFID_ACCESS_MAP.get(uid)

        if access_rule is None:
            RFIDLog.objects.create(uid=uid, role="", status=RFIDLog.Status.DENIED)
            LAST_RFID_SCAN = {
                "status": "denied",
                "role": "",
                "uid": uid,
                "redirect": "",
                "door": door_state,
            }
            print("[RFID AUTH] Result: denied")
            return Response({"status": "denied", "openDoor": False}, status=status.HTTP_200_OK)

        response_status = "logged_out" if door_state == "closed" else "authorized"
        redirect = access_rule["redirect"] if door_state == "open" else ""

        RFIDUser.objects.update_or_create(
            uid=uid,
            defaults={
                "username": access_rule["username"],
                "role": access_rule["role"],
            },
        )
        RFIDLog.objects.create(
            uid=uid,
            role=access_rule["role"],
            status=RFIDLog.Status.AUTHORIZED,
        )
        LAST_RFID_SCAN = {
            "status": response_status,
            "role": access_rule["role"],
            "uid": uid,
            "redirect": redirect,
            "door": door_state,
        }
        print(
            "[RFID AUTH] Result:",
            response_status,
            "role=",
            access_rule["role"],
            "redirect=",
            redirect,
            "door=",
            door_state,
        )
        print("[RFID AUTH] Current last scan:", LAST_RFID_SCAN)

        response_payload = {
            "status": response_status,
            "role": access_rule["role"],
            "uid": uid,
            "door": door_state,
        }

        if door_state == "open":
            response_payload["redirect"] = access_rule["redirect"]

        return Response(response_payload, status=status.HTTP_200_OK)


class LastRFIDScanView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        print("[RFID LAST SCAN] Returning:", LAST_RFID_SCAN)
        return Response(LAST_RFID_SCAN, status=status.HTTP_200_OK)


class RFIDSessionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        print("[RFID SESSION] Raw request data:", request.data)
        serializer = RFIDAuthRequestSerializer(data=request.data)
        if not serializer.is_valid():
            print("[RFID SESSION] Invalid request:", serializer.errors)
            return Response(
                {
                    "status": "denied",
                    "detail": serializer.errors,
                    "openDoor": False,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        uid = serializer.validated_data["uid"]
        print("[RFID SESSION] Normalized UID:", uid)
        access_rule = RFID_ACCESS_MAP.get(uid)

        if access_rule is None:
            print("[RFID SESSION] Result: denied, unknown UID")
            return Response({"status": "denied", "openDoor": False}, status=status.HTTP_403_FORBIDDEN)

        user_model = get_user_model()
        login_identifier = access_rule["login_identifier"]
        lookup = (
            {"email__iexact": login_identifier}
            if "@" in login_identifier
            else {"username__iexact": login_identifier}
        )

        try:
            user = user_model.objects.get(**lookup)
        except user_model.DoesNotExist:
            print("[RFID SESSION] Account not found:", login_identifier)
            return Response(
                {
                    "status": "denied",
                    "detail": f"RFID account '{login_identifier}' was not found.",
                    "openDoor": False,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        authenticated_user = authenticate(
            username=user.get_username(),
            password=access_rule["password"],
        )

        if authenticated_user is None:
            print("[RFID SESSION] Invalid password for:", login_identifier)
            return Response(
                {
                    "status": "denied",
                    "detail": f"RFID password is not valid for '{login_identifier}'.",
                    "openDoor": False,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        UserApproval.objects.update_or_create(
            user=authenticated_user,
            defaults={"status": UserApproval.Status.APPROVED},
        )
        refresh = RefreshToken.for_user(authenticated_user)
        session = UserSession.objects.create(user=authenticated_user)
        print(
            "[RFID SESSION] Result: session created",
            "uid=",
            uid,
            "user=",
            authenticated_user.get_username(),
            "role=",
            access_rule["role"],
            "session_id=",
            session.id,
        )

        return Response(
            {
                "status": "authorized",
                "role": access_rule["role"],
                "redirect": access_rule["redirect"],
                "openDoor": True,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "session_id": session.id,
                "user": {
                    "id": authenticated_user.id,
                    "name": authenticated_user.first_name or authenticated_user.get_username(),
                    "username": authenticated_user.get_username(),
                    "email": authenticated_user.email,
                    "is_admin": authenticated_user.is_staff or authenticated_user.is_superuser,
                    "status": UserApproval.Status.APPROVED,
                },
            },
            status=status.HTTP_200_OK,
        )


class RFIDEventsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            limit = min(int(request.query_params.get("limit", 10)), 50)
        except ValueError:
            limit = 10
        logs = RFIDLog.objects.order_by("-timestamp")[:limit]
        print("[RFID EVENTS] Returning latest scan count:", len(logs))
        return Response(RFIDLogSerializer(logs, many=True).data)


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs["identifier"].strip()
        password = attrs["password"]
        user_model = get_user_model()

        lookup = {"email__iexact": identifier} if "@" in identifier else {"username__iexact": identifier}

        try:
            user = user_model.objects.get(**lookup)
        except user_model.DoesNotExist:
            try:
                user = user_model.objects.get(email__iexact=identifier)
            except user_model.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"detail": "No account found with that username or email."}
                ) from exc

        authenticated_user = authenticate(
            username=user.get_username(),
            password=password,
        )

        if authenticated_user is None:
            raise serializers.ValidationError(
                {"detail": "Invalid username, email, or password."}
            )

        # Safety net: never keep the system without an admin.
        ensure_main_admin(user_model)
        if admin_count(user_model) == 0:
            recover_admin_for_user(authenticated_user)

        approval, _ = UserApproval.objects.get_or_create(
            user=authenticated_user,
            defaults={
                "status": (
                    UserApproval.Status.APPROVED
                    if authenticated_user.is_staff or authenticated_user.is_superuser
                    else UserApproval.Status.PENDING
                )
            },
        )

        if approval.status == UserApproval.Status.PENDING:
            raise serializers.ValidationError(
                {"detail": "Waiting for admin approval"}
            )

        if approval.status == UserApproval.Status.REJECTED:
            raise serializers.ValidationError(
                {"detail": "Your access request was rejected by admin."}
            )

        refresh = RefreshToken.for_user(authenticated_user)
        session = UserSession.objects.create(user=authenticated_user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "session_id": session.id,
            "user": {
                "id": authenticated_user.id,
                "name": authenticated_user.first_name or authenticated_user.get_username(),
                "username": authenticated_user.get_username(),
                "email": authenticated_user.email,
                "is_admin": authenticated_user.is_staff or authenticated_user.is_superuser,
                "status": approval.status,
            },
        }


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_payload = serializer.validated_data.get("user", {})
        user = get_user_model().objects.filter(id=user_payload.get("id")).first()
        if user is not None:
            user_logged_in.send(sender=user.__class__, request=request, user=user)
        return Response(serializer.validated_data)


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        approval, _ = UserApproval.objects.get_or_create(
            user=user,
            defaults={"status": UserApproval.Status.PENDING},
        )
        return Response(
            {
                "id": user.id,
                "name": user.first_name or user.get_username(),
                "email": user.email,
                "status": approval.status,
                "message": "Your account is pending approval by admin",
            },
            status=status.HTTP_201_CREATED,
        )


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ensure_main_admin(get_user_model())
        user = request.user
        approval, _ = UserApproval.objects.get_or_create(
            user=user,
            defaults={
                "status": (
                    UserApproval.Status.APPROVED
                    if user.is_staff or user.is_superuser
                    else UserApproval.Status.PENDING
                )
            },
        )
        return Response(
            {
                "id": user.id,
                "name": user.first_name or user.get_username(),
                "username": user.get_username(),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_admin": user.is_staff or user.is_superuser,
                "status": approval.status,
            }
        )


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])

        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session = (
            UserSession.objects.filter(
            user=request.user,
            status=UserSession.Status.ACTIVE,
        )
            .order_by("-login_time", "-id")
            .first()
        )

        if not session:
            return Response({"detail": "No active session found."}, status=status.HTTP_404_NOT_FOUND)

        session.close()
        return Response(
            {
                "detail": "Session closed successfully.",
                "session": UserSessionSerializer(session).data,
            }
        )


class PendingUsersView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        user_model = get_user_model()
        pending_users = user_model.objects.filter(
            approval__status=UserApproval.Status.PENDING
        ).select_related(
            "approval"
        ).order_by(
            "date_joined",
            "first_name",
        )
        serializer = PendingUserSerializer(pending_users, many=True)
        return Response(serializer.data)


class UserSessionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = UserSession.objects.select_related("user").order_by("-login_time", "-id")
        user_id = request.query_params.get("user_id")

        if user_id:
            if not request.user.is_staff and not request.user.is_superuser and str(request.user.id) != user_id:
                return Response(
                    {"detail": "You do not have permission to view these sessions."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            sessions = sessions.filter(user_id=user_id)

        serializer = UserSessionSerializer(sessions, many=True)
        return Response(serializer.data)


class UsersListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_model = get_user_model()
        scope = request.query_params.get("scope", "").lower()

        if scope == "accounts":
            if not request.user.is_staff and not request.user.is_superuser:
                return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

            ensure_main_admin(user_model)
            users = user_model.objects.all().select_related("approval").order_by("first_name", "email", "username")
            serializer = AccountUserSerializer(users, many=True)
            return Response(serializer.data)

        users = (
            user_model.objects.filter(
                is_staff=False,
                is_superuser=False,
                approval__status=UserApproval.Status.APPROVED,
            )
            .select_related("approval")
            .order_by("username", "email")
        )
        serializer = ActiveUserSerializer(users, many=True)
        return Response(serializer.data)


class UpdateUserRoleView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def put(self, request, pk):
        user_model = get_user_model()

        try:
            user = user_model.objects.get(pk=pk)
        except user_model.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateUserRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data["role"]

        ensure_main_admin(user_model)

        if is_protected_admin(user):
            return Response({"detail": "Cannot modify main admin"}, status=status.HTTP_400_BAD_REQUEST)

        if (user.is_staff or user.is_superuser) and role != "admin" and admin_count(user_model) <= 1:
            return Response(
                {"detail": "Cannot remove the last admin"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_staff = role == "admin"
        user.is_superuser = role == "admin"
        user.save(update_fields=["is_staff", "is_superuser"])

        approval, _ = UserApproval.objects.get_or_create(user=user)
        if role == "admin" and approval.status != UserApproval.Status.APPROVED:
            approval.status = UserApproval.Status.APPROVED
            approval.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "detail": f"{user.first_name or user.get_username()} role updated successfully.",
                "user": AccountUserSerializer(user).data,
            }
        )


class UpdateUserStatusView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def put(self, request, pk):
        user_model = get_user_model()

        try:
            user = user_model.objects.get(pk=pk)
        except user_model.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateUserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ensure_main_admin(user_model)

        if is_protected_admin(user):
            return Response({"detail": "Cannot modify main admin"}, status=status.HTTP_400_BAD_REQUEST)

        approval, _ = UserApproval.objects.get_or_create(user=user)
        approval.status = serializer.validated_data["status"]
        approval.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "detail": f"{user.first_name or user.get_username()} status updated successfully.",
                "user": AccountUserSerializer(user).data,
            }
        )


class DeleteUserView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk):
        user_model = get_user_model()

        try:
            user = user_model.objects.get(pk=pk)
        except user_model.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        ensure_main_admin(user_model)

        if is_protected_admin(user):
            return Response({"detail": "Cannot modify main admin"}, status=status.HTTP_400_BAD_REQUEST)

        if user.pk == request.user.pk:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)

        if (user.is_staff or user.is_superuser) and admin_count(user_model) <= 1:
            return Response(
                {"detail": "Cannot delete the last admin"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_name = user.first_name or user.get_username()
        user.delete()
        return Response({"detail": f"{deleted_name} deleted successfully."}, status=status.HTTP_200_OK)


class UpdateUserApprovalView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def put(self, request, pk, action):
        user_model = get_user_model()
        try:
            user = user_model.objects.get(pk=pk)
        except user_model.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action not in {"approve", "reject"}:
            return Response(
                {"detail": "Unsupported action."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ensure_main_admin(user_model)

        if is_protected_admin(user):
            return Response({"detail": "Cannot modify main admin"}, status=status.HTTP_400_BAD_REQUEST)

        approval, _ = UserApproval.objects.get_or_create(user=user)
        approval.status = (
            UserApproval.Status.APPROVED
            if action == "approve"
            else UserApproval.Status.REJECTED
        )
        approval.save(update_fields=["status", "updated_at"])

        serializer = PendingUserSerializer(user)
        return Response(
            {
                "detail": (
                    f"{user.first_name or user.get_username()} approved successfully."
                    if action == "approve"
                    else f"{user.first_name or user.get_username()} rejected successfully."
                ),
                "user": serializer.data,
            }
        )


class RecoveryAdminView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_model = get_user_model()
        ensure_main_admin(user_model)

        if admin_count(user_model) > 0:
            return Response({"detail": "Recovery mode unavailable while an admin exists."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RecoveryAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data.get("email")

        if request.user.is_authenticated:
            target_user = request.user
        elif email:
            target_user = user_model.objects.filter(email__iexact=email).first()
        else:
            target_user = user_model.objects.order_by("date_joined", "id").first()

        if target_user is None:
            return Response({"detail": "No eligible user found for recovery."}, status=status.HTTP_404_NOT_FOUND)

        recover_admin_for_user(target_user)
        return Response(
            {
                "detail": f"{target_user.first_name or target_user.get_username()} has been promoted to admin.",
                "user": AccountUserSerializer(target_user).data,
            }
        )


class RecoveryStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user_model = get_user_model()
        ensure_main_admin(user_model)
        has_admin = admin_count(user_model) > 0
        return Response(
            {
                "has_admin": has_admin,
                "recovery_mode": not has_admin,
            }
        )


class SensorDataView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        latest_record = SensorData.objects.order_by("-created_at").first()

        if latest_record is None:
            return Response(
                {"detail": "No sensor data available yet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(SensorDataSerializer(latest_record).data)

    def post(self, request):
        serializer = SensorDataSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sensor_data = serializer.save()
        evaluate_sensor_alerts(sensor_data)
        return Response(SensorDataSerializer(sensor_data).data, status=status.HTTP_201_CREATED)


class LatestAlertView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        alert = AlertEvent.objects.order_by("-created_at").first()

        if alert is None:
            return Response(
                {"detail": "No alerts triggered yet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(AlertEventSerializer(alert).data)


class TasksView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tasks = Task.objects.select_related("user", "user__approval").filter(is_daily=False)

        if request.user.is_staff or request.user.is_superuser:
            user_id = request.query_params.get("user_id")
            if user_id:
                tasks = tasks.filter(user_id=user_id)
        else:
            tasks = tasks.filter(user=request.user)

        serializer = TaskSerializer(tasks.order_by("due_date", "-created_at"), many=True)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({"detail": "Only admins can assign tasks."}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data.copy()
        if "assigned_to" in payload and "user_id" not in payload:
            payload["user_id"] = payload["assigned_to"]

        serializer = TaskSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        task_id = request.data.get("id")

        if not task_id:
            return Response({"detail": "Task id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = Task.objects.select_related("user", "user__approval").get(pk=task_id)
        except Task.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        if task.is_daily:
            allowed_fields = {"is_completed", "status"}
        elif request.user.is_staff or request.user.is_superuser:
            allowed_fields = {"status", "title", "description", "priority", "due_date", "user_id"}
        else:
            if task.user_id != request.user.id:
                return Response({"detail": "You do not have permission to update this task."}, status=status.HTTP_403_FORBIDDEN)
            allowed_fields = {"status"}

        partial_data = {key: value for key, value in request.data.items() if key in allowed_fields}
        if task.is_daily:
            if "is_completed" in partial_data and "status" not in partial_data:
                partial_data["status"] = (
                    Task.Status.COMPLETED if partial_data["is_completed"] else Task.Status.TODO
                )
            elif "status" in partial_data and "is_completed" not in partial_data:
                partial_data["is_completed"] = partial_data["status"] == Task.Status.COMPLETED

        serializer = TaskSerializer(task, data=partial_data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_task = serializer.save()
        return Response(TaskSerializer(updated_task).data)


class TodayTasksView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        target_date = timezone.localdate()
        generate_daily_tasks_for_date(target_date)
        tasks = Task.objects.select_related("user", "user__approval").filter(
            is_daily=True,
            date=target_date,
        )
        completion_user = request.user
        user_id = request.query_params.get("user_id")
        if user_id and (request.user.is_staff or request.user.is_superuser):
            completion_user = get_user_model().objects.filter(pk=user_id).first() or request.user

        completion_map = {
            completion.task_id: completion.is_completed
            for completion in completion_user.task_completions.filter(task__in=tasks, date=target_date)
        }

        serializer = TodayTaskSerializer(
            tasks.order_by("is_completed", "title", "created_at"),
            many=True,
            context={"request": request, "completion_map": completion_map},
        )
        return Response(serializer.data)


class CompleteTaskView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        return self._complete(request, pk)

    def patch(self, request, pk):
        return self._complete(request, pk)

    def _complete(self, request, pk):
        try:
            task = Task.objects.select_related("user", "user__approval").get(pk=pk)
        except Task.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        is_completed = request.data.get("is_completed", True)
        if isinstance(is_completed, str):
            is_completed = is_completed.strip().lower() in {"true", "1", "yes", "on"}

        if task.is_daily:
            completion, _ = request.user.task_completions.get_or_create(
                task=task,
                date=task.date,
                defaults={"is_completed": bool(is_completed)},
            )
            if completion.is_completed != bool(is_completed):
                completion.is_completed = bool(is_completed)
                completion.save(update_fields=["is_completed", "updated_at"])

            serializer = TodayTaskSerializer(
                task,
                context={"request": request, "completion_map": {task.id: completion.is_completed}},
            )
            return Response(serializer.data, status=status.HTTP_200_OK)

        if not (request.user.is_staff or request.user.is_superuser) and task.user_id != request.user.id:
            return Response({"detail": "You do not have permission to update this task."}, status=status.HTTP_403_FORBIDDEN)

        task.is_completed = bool(is_completed)
        task.status = Task.Status.COMPLETED if task.is_completed else Task.Status.TODO
        task.save(update_fields=["is_completed", "status", "updated_at"])

        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)
