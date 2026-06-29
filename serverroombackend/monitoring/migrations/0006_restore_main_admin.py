from django.db import migrations


def restore_main_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserApproval = apps.get_model("monitoring", "UserApproval")

    user = User.objects.filter(email__iexact="admin@example.com").first() or User.objects.filter(
        username__iexact="admin"
    ).first()

    if user is None:
        return

    fields_to_update = []

    if not user.is_staff:
        user.is_staff = True
        fields_to_update.append("is_staff")

    if not user.is_superuser:
        user.is_superuser = True
        fields_to_update.append("is_superuser")

    if fields_to_update:
        user.save(update_fields=fields_to_update)

    approval, _ = UserApproval.objects.get_or_create(user=user)
    if approval.status != "approved":
        approval.status = "approved"
        approval.save(update_fields=["status", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0005_usersession"),
    ]

    operations = [
        migrations.RunPython(restore_main_admin, migrations.RunPython.noop),
    ]
