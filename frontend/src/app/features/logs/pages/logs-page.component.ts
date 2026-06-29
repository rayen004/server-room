import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Observable, Subject, interval, of, switchMap, takeUntil } from "rxjs";

import { ActiveUser } from "../../../core/models/account.models";
import { UserSession } from "../../../core/models/session.models";
import { AccountsApiService } from "../../../core/services/accounts-api.service";
import { AuthApiService } from "../../../core/services/auth-api.service";
import { AuthStateService } from "../../../core/services/auth-state.service";
import { SessionApiService } from "../../../core/services/session-api.service";
import { AppShellComponent } from "../../../shared/components/app-shell.component";

const SESSION_REFRESH_MS = 10000;
const DURATION_TICK_MS = 1000;

@Component({
  selector: "app-logs-page",
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent],
  template: `
    <app-shell
      [user]="authState.currentUser"
      title="Session Logs"
      subtitle="Track each login session individually with live per-session durations."
      (logout)="logout()"
    >
      <section class="glass-panel p-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Audit Trail</p>
            <h3 class="mt-2 text-2xl font-semibold text-white">User Sessions</h3>
            <p class="mt-2 text-sm text-app-muted">
              Every login creates its own row with its own duration and status.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label *ngIf="authState.currentUser?.is_admin" class="block min-w-[16rem]">
              <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-app-muted">User</span>
              <div
                class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition duration-200 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
              >
                <span class="text-cyan-300">U</span>
                <select
                  class="w-full bg-transparent text-sm text-white outline-none"
                  [(ngModel)]="selectedUserId"
                  (ngModelChange)="onUserFilterChange($event)"
                >
                  <option class="bg-slate-950 text-white" [ngValue]="null">All users</option>
                  <option
                    *ngFor="let user of filterableUsers"
                    class="bg-slate-950 text-white"
                    [ngValue]="user.id"
                  >
                    {{ user.username }}
                  </option>
                </select>
              </div>
            </label>

            <button
              class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              (click)="loadSessions(true)"
              [disabled]="refreshing"
            >
              {{ refreshing ? "Refreshing..." : "Refresh" }}
            </button>
          </div>
        </div>

        <div
          *ngIf="errorMessage"
          class="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {{ errorMessage }}
        </div>

        <div *ngIf="loading" class="mt-6 rounded-3xl border border-white/10 bg-black/20 p-10 text-center">
          <div class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400"></div>
          <p class="mt-4 text-sm text-app-muted">Loading session history...</p>
        </div>

        <div
          *ngIf="!loading && sessions.length === 0"
          class="mt-6 rounded-3xl border border-white/10 bg-black/20 p-10 text-center"
        >
          <h4 class="text-xl font-semibold text-white">No sessions recorded yet</h4>
          <p class="mt-2 text-sm text-app-muted">
            User login history will appear here after the first authenticated session.
          </p>
        </div>

        <div *ngIf="!loading && sessions.length > 0" class="mt-6 overflow-hidden rounded-3xl border border-white/10">
          <table class="min-w-full divide-y divide-white/10">
            <thead class="bg-white/5">
              <tr>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Session ID
                </th>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  User
                </th>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Login Time
                </th>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Logout Time
                </th>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Duration
                </th>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Status
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/10 bg-black/10">
              <tr *ngFor="let session of sessions" class="transition hover:bg-white/[0.03]">
                <td class="px-5 py-4 text-sm font-mono text-cyan-200/90">#{{ session.id }}</td>
                <td class="px-5 py-4">
                  <p class="text-sm font-semibold text-white">{{ session.user_name }}</p>
                  <p class="mt-1 text-xs text-app-muted">{{ session.user_email }}</p>
                </td>
                <td class="px-5 py-4 text-sm text-app-muted">{{ formatDateTime(session.login_time) }}</td>
                <td class="px-5 py-4 text-sm text-app-muted">
                  {{ session.logout_time ? formatDateTime(session.logout_time) : "Still active" }}
                </td>
                <td class="px-5 py-4 text-sm font-medium text-white">
                  {{ formatDuration(session) }}
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                    [ngClass]="
                      session.status === 'ACTIVE'
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                        : 'border-slate-400/30 bg-slate-400/10 text-slate-300'
                    "
                  >
                    {{ session.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </app-shell>
  `,
})
export class LogsPageComponent implements OnInit, OnDestroy {
  sessions: UserSession[] = [];
  allUsers: ActiveUser[] = [];
  loading = true;
  refreshing = false;
  errorMessage = "";
  selectedUserId: number | null = null;
  private now = Date.now();
  private readonly destroy$ = new Subject<void>();

  constructor(
    public readonly authState: AuthStateService,
    private readonly accountsApi: AccountsApiService,
    private readonly authApi: AuthApiService,
    private readonly sessionApi: SessionApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadSessions(false);

    interval(SESSION_REFRESH_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadSessions(true));

    interval(DURATION_TICK_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.now = Date.now();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.authState.logout().pipe(takeUntil(this.destroy$)).subscribe({
      complete: () => {
        void this.router.navigateByUrl("/login");
      },
    });
  }

  loadSessions(silent: boolean): void {
    if (silent) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }

    this.prepareSession()
      .pipe(
        switchMap(() => this.sessionApi.fetchSessions(this.selectedUserId)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (sessions) => {
          this.sessions = sessions;
          this.logSessionDurations(sessions);
          this.syncAvailableUsers(sessions);
          this.errorMessage = "";
          this.loading = false;
          this.refreshing = false;
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(
            error,
            "Unable to load session history.",
          );
          this.loading = false;
          this.refreshing = false;
        },
      });
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  }

  formatDuration(session: UserSession): string {
    const loginTime = new Date(session.login_time).getTime();
    const endTime =
      session.status === "CLOSED" && session.logout_time
        ? new Date(session.logout_time).getTime()
        : this.now;
    const totalSeconds = Math.max(Math.floor((endTime - loginTime) / 1000), 0);
    return this.formatDurationFromSeconds(totalSeconds);
  }

  onUserFilterChange(userId: number | null): void {
    this.selectedUserId = userId;
    this.loadSessions(true);
  }

  get filterableUsers(): ActiveUser[] {
    return this.allUsers;
  }

  private formatDurationFromSeconds(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }

  private syncAvailableUsers(sessions: UserSession[]): void {
    const missingUsers = sessions
      .filter((session) => !this.allUsers.some((user) => user.id === session.user_id))
      .map((session) => ({
        id: session.user_id,
        username: session.user_name,
        email: session.user_email,
        role: "USER" as const,
        status: "approved" as const,
      }));

    if (missingUsers.length) {
      const byId = new Map<number, ActiveUser>(this.allUsers.map((user) => [user.id, user]));
      for (const user of missingUsers) {
        byId.set(user.id, user);
      }
      this.allUsers = Array.from(byId.values()).sort((left, right) =>
        left.username.localeCompare(right.username) || left.email.localeCompare(right.email),
      );
    }
  }

  private logSessionDurations(sessions: UserSession[]): void {
    for (const session of sessions) {
      const loginTime = new Date(session.login_time).getTime();
      const endTime =
        session.status === "CLOSED" && session.logout_time
          ? new Date(session.logout_time).getTime()
          : this.now;
      const duration = this.formatDurationFromSeconds(
        Math.max(Math.floor((endTime - loginTime) / 1000), 0),
      );

      console.log(session.login_time, session.logout_time, duration);
    }
  }

  private prepareSession(): Observable<unknown> {
    if (!this.authApi.isLocalTestAdmin()) {
      return of(true);
    }

    return this.authApi.upgradeLocalAdminSession();
  }

  private loadUsers(): void {
    this.accountsApi
      .fetchActiveUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.allUsers = users;
        },
        error: () => {
          this.allUsers = [];
        },
      });
  }
}
