import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

import { AuthApiService } from "../../../core/services/auth-api.service";
import { AuthStateService } from "../../../core/services/auth-state.service";
import { AppShellComponent } from "../../../shared/components/app-shell.component";

interface AccountSettingsForm {
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface SystemSettingsForm {
  minTemperature: number;
  maxTemperature: number;
  humidityThreshold: number;
  alertsEnabled: boolean;
  refreshInterval: number;
}

interface AccessControlSettingsForm {
  rfidSystemName: string;
  registerCardId: string;
  assignUser: string;
  accessEnabled: boolean;
  showAccessLogs: boolean;
}

interface NotificationSettingsForm {
  emailAlertsEnabled: boolean;
  adminEmail: string;
  temperatureAlert: boolean;
  unauthorizedAccessAlert: boolean;
  alertFrequency: "Instant" | "Every 5 min" | "Hourly";
}

type SettingsSection = "account" | "system" | "access" | "notifications";

interface SettingsNavItem {
  id: SettingsSection;
  label: string;
  eyebrow: string;
  icon: string;
}

const SYSTEM_SETTINGS_KEY = "server-room-system-settings";
const ACCESS_CONTROL_SETTINGS_KEY = "server-room-access-settings";
const NOTIFICATION_SETTINGS_KEY = "server-room-notification-settings";
const ACCOUNT_SETTINGS_REQUESTS_KEY = "server-room-account-setting-requests";

@Component({
  selector: "app-settings-page",
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent],
  template: `
    <app-shell
      [user]="authState.currentUser"
      eyebrow="Configuration"
      title="Settings"
      subtitle="Manage account, thresholds, access, and alert preferences from a focused control center."
      (logout)="logout()"
    >
      <section class="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside class="glass-panel h-fit p-4">
          <div class="px-3 py-2">
            <p class="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Settings Menu</p>
            <h2 class="mt-2 text-xl font-semibold text-white">Control Panels</h2>
            <p class="mt-2 text-sm text-app-muted">
              Open one category at a time to keep the workspace focused.
            </p>
          </div>

          <nav class="mt-4 space-y-2">
            <button
              *ngFor="let item of visibleNavItems"
              type="button"
              class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition"
              [ngClass]="
                activeSection === item.id
                  ? 'bg-white/10 text-white shadow-[0_12px_32px_rgba(15,23,42,0.28)]'
                  : 'text-app-muted hover:bg-white/5 hover:text-white'
              "
              (click)="activeSection = item.id"
            >
              <span
                class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold text-cyan-300"
              >
                {{ item.icon }}
              </span>
              <span class="min-w-0">
                <span class="block text-xs uppercase tracking-[0.18em] text-app-muted">{{ item.eyebrow }}</span>
                <span class="mt-1 block text-sm font-semibold">{{ item.label }}</span>
              </span>
            </button>
          </nav>
        </aside>

        <article *ngIf="activeSection === 'account'" class="glass-panel p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Account Settings</p>
              <h2 class="mt-2 text-2xl font-semibold text-white">Identity and password</h2>
              <p class="mt-2 text-sm text-app-muted">
                Update your visible username and keep your account credentials fresh.
              </p>
            </div>
            <div class="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-right">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Signed in as</p>
              <p class="mt-1 text-sm font-semibold text-white">{{ authState.currentUser?.username }}</p>
            </div>
          </div>

          <div class="mt-6 grid gap-5">
            <div
              *ngIf="!isAdmin"
              class="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
            >
              Username changes require admin confirmation. Password changes are applied immediately after validating your current password.
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-white">New Username</label>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-cyan-400/50">
                <input
                  class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                  type="text"
                  [(ngModel)]="accountSettings.username"
                  placeholder="Enter a new username"
                />
              </div>
              <button
                class="mt-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(34,211,238,0.24)] transition hover:-translate-y-0.5"
                type="button"
                (click)="updateUsername()"
              >
                Update Username
              </button>
            </div>

            <div class="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-lg font-semibold text-white">Change Password</h3>
                  <p class="mt-1 text-sm text-app-muted">Validate your current password before confirming a new one.</p>
                </div>
                <span class="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                  Secure
                </span>
              </div>

              <div class="mt-5 grid gap-4 md:grid-cols-3">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-white">Current Password</span>
                  <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <input
                      class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                      type="password"
                      [(ngModel)]="accountSettings.currentPassword"
                      placeholder="Current password"
                    />
                  </div>
                </label>

                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-white">New Password</span>
                  <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <input
                      class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                      type="password"
                      [(ngModel)]="accountSettings.newPassword"
                      placeholder="New password"
                    />
                  </div>
                </label>

                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-white">Confirm Password</span>
                  <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <input
                      class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                      type="password"
                      [(ngModel)]="accountSettings.confirmPassword"
                      placeholder="Confirm password"
                    />
                  </div>
                </label>
              </div>

              <button
                class="mt-5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                type="button"
                (click)="updatePassword()"
              >
                Update Password
              </button>
            </div>

            <div *ngIf="accountMessage" class="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {{ accountMessage }}
            </div>
            <div *ngIf="accountError" class="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {{ accountError }}
            </div>
          </div>
        </article>

        <article *ngIf="activeSection === 'system' && isAdmin" class="glass-panel p-6">
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-emerald-300/80">System Settings</p>
            <h2 class="mt-2 text-2xl font-semibold text-white">Environment thresholds</h2>
            <p class="mt-2 text-sm text-app-muted">
              Control monitoring sensitivity and the live data refresh cadence used by the dashboard.
            </p>
          </div>

          <div class="mt-6 grid gap-4 md:grid-cols-2">
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-white">Temperature Threshold Min</span>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input class="w-full bg-transparent text-white outline-none" type="number" [(ngModel)]="systemSettings.minTemperature" />
              </div>
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-white">Temperature Threshold Max</span>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input class="w-full bg-transparent text-white outline-none" type="number" [(ngModel)]="systemSettings.maxTemperature" />
              </div>
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-white">Humidity Threshold</span>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input class="w-full bg-transparent text-white outline-none" type="number" [(ngModel)]="systemSettings.humidityThreshold" />
              </div>
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-white">Data Refresh Interval (sec)</span>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input class="w-full bg-transparent text-white outline-none" type="number" [(ngModel)]="systemSettings.refreshInterval" />
              </div>
            </label>
          </div>

          <label class="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <div>
              <p class="text-sm font-semibold text-white">Alert Activation</p>
              <p class="mt-1 text-sm text-app-muted">Turn alert monitoring on or off globally.</p>
            </div>
            <input type="checkbox" class="h-5 w-5 accent-emerald-400" [(ngModel)]="systemSettings.alertsEnabled" />
          </label>

          <button
            class="mt-5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(16,185,129,0.24)] transition hover:-translate-y-0.5"
            type="button"
            (click)="saveSystemSettings()"
          >
            Save System Settings
          </button>
          <div *ngIf="systemMessage" class="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {{ systemMessage }}
          </div>
        </article>

        <article *ngIf="activeSection === 'access' && isAdmin" class="glass-panel p-6">
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-fuchsia-300/80">Access Control Settings</p>
            <h2 class="mt-2 text-2xl font-semibold text-white">RFID and entry management</h2>
            <p class="mt-2 text-sm text-app-muted">
              Linked to your RFID system for cards, user assignment, enablement, and access-log visibility.
            </p>
          </div>

          <div class="mt-6 grid gap-4">
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-white">RFID System</span>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input class="w-full bg-transparent text-white outline-none" type="text" [(ngModel)]="accessSettings.rfidSystemName" />
              </div>
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-white">Register RFID Card</span>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input class="w-full bg-transparent text-white outline-none" type="text" [(ngModel)]="accessSettings.registerCardId" placeholder="RFID-000231" />
              </div>
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-white">Assign Card to User</span>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input class="w-full bg-transparent text-white outline-none" type="text" [(ngModel)]="accessSettings.assignUser" placeholder="username" />
              </div>
            </label>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <label class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div>
                <p class="text-sm font-semibold text-white">Enable / Disable Access</p>
                <p class="mt-1 text-sm text-app-muted">Toggle badge access globally.</p>
              </div>
              <input type="checkbox" class="h-5 w-5 accent-fuchsia-400" [(ngModel)]="accessSettings.accessEnabled" />
            </label>

            <label class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div>
                <p class="text-sm font-semibold text-white">View Access Logs</p>
                <p class="mt-1 text-sm text-app-muted">Keep log streaming visible for admins.</p>
              </div>
              <input type="checkbox" class="h-5 w-5 accent-fuchsia-400" [(ngModel)]="accessSettings.showAccessLogs" />
            </label>
          </div>

          <button
            class="mt-5 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-5 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/15"
            type="button"
            (click)="saveAccessSettings()"
          >
            Save Access Control Settings
          </button>
          <div *ngIf="accessMessage" class="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {{ accessMessage }}
          </div>
        </article>

        <article *ngIf="activeSection === 'notifications' && isAdmin" class="glass-panel p-6">
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-amber-300/80">Notification Settings</p>
            <h2 class="mt-2 text-2xl font-semibold text-white">Alert delivery rules</h2>
            <p class="mt-2 text-sm text-app-muted">
              Configure email alerts for temperature changes and unauthorized access events.
            </p>
          </div>

          <div class="mt-6 grid gap-4">
            <label class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div>
                <p class="text-sm font-semibold text-white">Enable Email Alerts</p>
                <p class="mt-1 text-sm text-app-muted">Very important for your system monitoring workflow.</p>
              </div>
              <input type="checkbox" class="h-5 w-5 accent-amber-400" [(ngModel)]="notificationSettings.emailAlertsEnabled" />
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-white">Add Admin Email</span>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input class="w-full bg-transparent text-white outline-none" type="email" [(ngModel)]="notificationSettings.adminEmail" placeholder="admin@serverroom.com" />
              </div>
            </label>

            <div class="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p class="text-sm font-semibold text-white">Choose Alert Type</p>
              <div class="mt-4 grid gap-3">
                <label class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span class="text-sm text-white">Temperature Alert</span>
                  <input type="checkbox" class="h-5 w-5 accent-amber-400" [(ngModel)]="notificationSettings.temperatureAlert" />
                </label>
                <label class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span class="text-sm text-white">Unauthorized Access</span>
                  <input type="checkbox" class="h-5 w-5 accent-amber-400" [(ngModel)]="notificationSettings.unauthorizedAccessAlert" />
                </label>
              </div>
            </div>

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-white">Alert Frequency</span>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <select class="w-full bg-transparent text-white outline-none" [(ngModel)]="notificationSettings.alertFrequency">
                  <option class="bg-slate-950 text-white" value="Instant">Instant</option>
                  <option class="bg-slate-950 text-white" value="Every 5 min">Every 5 min</option>
                  <option class="bg-slate-950 text-white" value="Hourly">Hourly</option>
                </select>
              </div>
            </label>
          </div>

          <button
            class="mt-5 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(251,191,36,0.2)] transition hover:-translate-y-0.5"
            type="button"
            (click)="saveNotificationSettings()"
          >
            Save Notification Settings
          </button>
          <div *ngIf="notificationMessage" class="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {{ notificationMessage }}
          </div>
        </article>
      </section>
    </app-shell>
  `,
})
export class SettingsPageComponent {
  readonly navItems: SettingsNavItem[] = [
    { id: "account", label: "Account Settings", eyebrow: "Identity", icon: "AC" },
    { id: "system", label: "System Settings", eyebrow: "Thresholds", icon: "SY" },
    { id: "access", label: "Access Control", eyebrow: "RFID", icon: "RF" },
    { id: "notifications", label: "Notifications", eyebrow: "Alerts", icon: "NT" },
  ];

  activeSection: SettingsSection = "account";
  accountSettings: AccountSettingsForm = {
    username: this.authState.currentUser?.username ?? "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };

  systemSettings: SystemSettingsForm = this.readStoredSettings<SystemSettingsForm>(SYSTEM_SETTINGS_KEY, {
    minTemperature: 18,
    maxTemperature: 30,
    humidityThreshold: 70,
    alertsEnabled: true,
    refreshInterval: 5,
  });

  accessSettings: AccessControlSettingsForm = this.readStoredSettings<AccessControlSettingsForm>(ACCESS_CONTROL_SETTINGS_KEY, {
    rfidSystemName: "Main Server Room RFID",
    registerCardId: "",
    assignUser: "",
    accessEnabled: true,
    showAccessLogs: true,
  });

  notificationSettings: NotificationSettingsForm = this.readStoredSettings<NotificationSettingsForm>(NOTIFICATION_SETTINGS_KEY, {
    emailAlertsEnabled: true,
    adminEmail: this.authState.currentUser?.email ?? "",
    temperatureAlert: true,
    unauthorizedAccessAlert: true,
    alertFrequency: "Instant",
  });

  accountMessage = "";
  accountError = "";
  systemMessage = "";
  accessMessage = "";
  notificationMessage = "";

  get isAdmin(): boolean {
    return Boolean(this.authState.currentUser?.is_admin);
  }

  get visibleNavItems(): SettingsNavItem[] {
    if (this.isAdmin) {
      return this.navItems;
    }

    return this.navItems.filter((item) => item.id === "account");
  }

  constructor(
    public readonly authState: AuthStateService,
    private readonly authApi: AuthApiService,
    private readonly router: Router,
  ) {}

  logout(): void {
    this.authState.logout().subscribe({
      complete: () => {
        void this.router.navigateByUrl("/login");
      },
    });
  }

  updateUsername(): void {
    const username = this.accountSettings.username.trim();
    this.accountMessage = "";
    this.accountError = "";

    if (!username) {
      this.accountError = "Please enter a username before updating it.";
      return;
    }

    if (!this.isAdmin) {
      this.storeAccountRequest({
        type: "username",
        requested_value: username,
        requested_by: this.authState.currentUser?.username ?? "user",
        requested_at: new Date().toISOString(),
        status: "pending-admin-confirmation",
      });
      this.accountMessage = "Username change request sent. Please wait for admin confirmation.";
      return;
    }

    this.authState.updateCurrentUser({ username, name: username });
    this.accountMessage = "Username updated successfully.";
  }

  updatePassword(): void {
    this.accountMessage = "";
    this.accountError = "";

    if (!this.accountSettings.currentPassword || !this.accountSettings.newPassword || !this.accountSettings.confirmPassword) {
      this.accountError = "Please complete all password fields.";
      return;
    }

    if (this.accountSettings.newPassword !== this.accountSettings.confirmPassword) {
      this.accountError = "New password and confirmation do not match.";
      return;
    }

    this.authApi
      .changePassword({
        current_password: this.accountSettings.currentPassword,
        new_password: this.accountSettings.newPassword,
      })
      .subscribe({
        next: (response) => {
          this.accountSettings.currentPassword = "";
          this.accountSettings.newPassword = "";
          this.accountSettings.confirmPassword = "";
          this.accountMessage = response.detail;
        },
        error: (error) => {
          this.accountError = this.authApi.getApiErrorMessage(
            error,
            "Unable to update password.",
          );
        },
      });
  }

  saveSystemSettings(): void {
    localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(this.systemSettings));
    this.systemMessage = "System settings saved.";
  }

  saveAccessSettings(): void {
    localStorage.setItem(ACCESS_CONTROL_SETTINGS_KEY, JSON.stringify(this.accessSettings));
    this.accessMessage = "Access control settings saved.";
  }

  saveNotificationSettings(): void {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.notificationSettings));
    this.notificationMessage = "Notification settings saved.";
  }

  private readStoredSettings<T>(key: string, fallback: T): T {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    try {
      return { ...fallback, ...(JSON.parse(rawValue) as T) };
    } catch {
      return fallback;
    }
  }

  private storeAccountRequest(request: Record<string, string>): void {
    const rawValue = localStorage.getItem(ACCOUNT_SETTINGS_REQUESTS_KEY);
    let requests: Record<string, string>[] = [];

    if (rawValue) {
      try {
        requests = JSON.parse(rawValue) as Record<string, string>[];
      } catch {
        requests = [];
      }
    }

    requests = [request, ...requests];
    localStorage.setItem(ACCOUNT_SETTINGS_REQUESTS_KEY, JSON.stringify(requests));
  }
}
