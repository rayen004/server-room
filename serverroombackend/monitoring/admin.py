from django.contrib import admin

from .models import RFIDLog, RFIDUser, SensorData, Task, UserApproval, UserSession


@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    list_display = ("temperature", "humidity", "power", "created_at")
    list_filter = ("created_at",)
    search_fields = ("temperature", "humidity", "power")
    ordering = ("-created_at",)


@admin.register(UserApproval)
class UserApprovalAdmin(admin.ModelAdmin):
    list_display = ("user", "status", "created_at", "updated_at")
    list_filter = ("status", "created_at", "updated_at")
    search_fields = ("user__username", "user__email", "user__first_name")
    autocomplete_fields = ("user",)


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user_name", "user_email", "login_time", "logout_time", "session_duration", "status")
    list_filter = ("status", "login_time", "logout_time")
    search_fields = ("user__first_name", "user__email", "user__username")
    autocomplete_fields = ("user",)

    @admin.display(ordering="user__first_name", description="User")
    def user_name(self, obj):
        return obj.user.first_name or obj.user.get_username()

    @admin.display(ordering="user__email", description="Email")
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description="Duration")
    def session_duration(self, obj):
        duration = obj.session_duration
        total_seconds = max(int(duration.total_seconds()), 0)
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)

        if hours > 0:
            return f"{hours}h {minutes}m {seconds}s"

        if minutes > 0:
            return f"{minutes}m {seconds}s"

        return f"{seconds}s"


@admin.register(RFIDUser)
class RFIDUserAdmin(admin.ModelAdmin):
    list_display = ("uid", "username", "role", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("uid", "username")
    ordering = ("username", "uid")


@admin.register(RFIDLog)
class RFIDLogAdmin(admin.ModelAdmin):
    list_display = ("uid", "role", "status", "timestamp")
    list_filter = ("status", "role", "timestamp")
    search_fields = ("uid", "role")
    ordering = ("-timestamp",)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "status", "priority", "is_daily", "date", "due_date")
    list_filter = ("status", "priority", "is_daily", "date", "due_date")
    search_fields = ("title", "description", "user__username", "user__email")
    autocomplete_fields = ("user",)
