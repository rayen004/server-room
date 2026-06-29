from django.contrib.auth import get_user_model

from .models import UserApproval

MAIN_ADMIN_EMAIL = "admin@example.com"
MAIN_ADMIN_USERNAME = "admin"


def get_main_admin(user_model=None):
    user_model = user_model or get_user_model()
    return user_model.objects.filter(email__iexact=MAIN_ADMIN_EMAIL).first() or user_model.objects.filter(
        username__iexact=MAIN_ADMIN_USERNAME
    ).first()


def is_protected_admin(user) -> bool:
    if user is None:
        return False

    return user.email.lower() == MAIN_ADMIN_EMAIL or user.get_username().lower() == MAIN_ADMIN_USERNAME


def admin_count(user_model=None) -> int:
    user_model = user_model or get_user_model()
    return user_model.objects.filter(is_staff=True).count()


def ensure_main_admin(user_model=None):
    user_model = user_model or get_user_model()
    main_admin = get_main_admin(user_model)

    if main_admin is None:
        return None

    fields_to_update = []

    if not main_admin.is_staff:
        main_admin.is_staff = True
        fields_to_update.append("is_staff")

    if not main_admin.is_superuser:
        main_admin.is_superuser = True
        fields_to_update.append("is_superuser")

    if fields_to_update:
        main_admin.save(update_fields=fields_to_update)

    approval, _ = UserApproval.objects.get_or_create(user=main_admin)
    if approval.status != UserApproval.Status.APPROVED:
        approval.status = UserApproval.Status.APPROVED
        approval.save(update_fields=["status", "updated_at"])

    return main_admin


def recover_admin_for_user(user):
    user.is_staff = True
    user.is_superuser = True
    user.save(update_fields=["is_staff", "is_superuser"])

    approval, _ = UserApproval.objects.get_or_create(user=user)
    if approval.status != UserApproval.Status.APPROVED:
        approval.status = UserApproval.Status.APPROVED
        approval.save(update_fields=["status", "updated_at"])

    return user
