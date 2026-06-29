from django.core.management.base import BaseCommand

from monitoring.admin_utils import ensure_main_admin


class Command(BaseCommand):
    help = "Restore the protected main admin account and approval status."

    def handle(self, *args, **options):
        user = ensure_main_admin()

        if user is None:
            self.stdout.write(self.style.WARNING("No protected admin account was found."))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Protected admin restored: {user.get_username()} <{user.email}>"
            )
        )
