import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, Subject, interval, of, switchMap, takeUntil } from "rxjs";

import { AccountUser } from "../../../core/models/account.models";
import { AuthApiService } from "../../../core/services/auth-api.service";
import { AuthStateService } from "../../../core/services/auth-state.service";
import { AccountsApiService } from "../../../core/services/accounts-api.service";
import { PendingUsersService } from "../../../core/services/pending-users.service";
import { AppShellComponent } from "../../../shared/components/app-shell.component";

const ACCOUNTS_REFRESH_MS = 10000;

@Component({
  selector: "app-accounts-page",
  standalone: true,
  imports: [CommonModule, AppShellComponent],
  template: `
    <app-shell
      [user]="authState.currentUser"
      title="Gestion des comptes"
      subtitle="Admin-only control panel for user roles, access status, and account cleanup."
      (logout)="logout()"
    >
      <section class="glass-panel p-6">
        <div
          *ngIf="recoveryMode"
          class="mb-6 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5"
        >
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-amber-300/80">Recovery Mode</p>
              <h3 class="mt-2 text-xl font-semibold text-white">No admin account is currently active</h3>
              <p class="mt-2 text-sm text-app-muted">
                Use recovery to promote the current logged-in user back to admin and restore system access.
              </p>
            </div>

            <button
              class="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              (click)="activateRecovery()"
              [disabled]="actingId !== null"
            >
              Restore Admin Access
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-amber-300/80">Administration</p>
            <h3 class="mt-2 text-2xl font-semibold text-white">Gestion des comptes</h3>
            <p class="mt-2 text-sm text-app-muted">
              Manage user roles, approval status, and account lifecycle from one place.
            </p>
          </div>

          <button
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            (click)="loadUsers(true)"
            [disabled]="refreshing"
          >
            {{ refreshing ? "Refreshing..." : "Refresh" }}
          </button>
        </div>

        <div
          *ngIf="actionMessage"
          class="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {{ actionMessage }}
        </div>

        <div
          *ngIf="errorMessage"
          class="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {{ errorMessage }}
        </div>

        <div *ngIf="loading" class="mt-6 rounded-3xl border border-white/10 bg-black/20 p-10 text-center">
          <div class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-amber-400"></div>
          <p class="mt-4 text-sm text-app-muted">Loading user accounts...</p>
        </div>

        <div
          *ngIf="!loading && users.length === 0"
          class="mt-6 rounded-3xl border border-white/10 bg-black/20 p-10 text-center"
        >
          <h4 class="text-xl font-semibold text-white">No accounts found</h4>
          <p class="mt-2 text-sm text-app-muted">
            New signups and approved users will appear here automatically.
          </p>
        </div>

        <div *ngIf="!loading && users.length > 0" class="mt-6 overflow-hidden rounded-3xl border border-white/10">
          <table class="min-w-full divide-y divide-white/10">
            <thead class="bg-white/5">
              <tr>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Name
                </th>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Email
                </th>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Role
                </th>
                <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Status
                </th>
                <th class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/10 bg-black/10">
              <tr *ngFor="let user of users" class="transition hover:bg-white/[0.03]">
                <td class="px-5 py-4 text-sm font-medium text-white">{{ user.name || "Unnamed user" }}</td>
                <td class="px-5 py-4 text-sm text-app-muted">{{ user.email }}</td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                    [ngClass]="
                      user.role === 'admin'
                        ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                        : 'border-white/10 bg-white/5 text-app-muted'
                    "
                  >
                    {{ user.role }}
                  </span>
                  <span
                    *ngIf="isProtected(user)"
                    class="ml-2 inline-flex rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-200"
                  >
                    Protected Admin
                  </span>
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                    [ngClass]="statusClass(user.status)"
                  >
                    {{ user.status }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <div class="flex flex-wrap justify-end gap-2">
                    <button
                      *ngIf="!isProtected(user)"
                      class="rounded-2xl px-3 py-2 text-xs font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      [ngClass]="user.role === 'admin' ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-400 hover:bg-emerald-300'"
                      [disabled]="actingId === user.id"
                      (click)="toggleRole(user)"
                    >
                      {{ actingId === user.id ? "Working..." : user.role === "admin" ? "Make User" : "Make Admin" }}
                    </button>

                    <button
                      *ngIf="!isProtected(user) && user.status !== 'approved'"
                      class="rounded-2xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      [disabled]="actingId === user.id"
                      (click)="updateStatus(user.id, 'approved')"
                    >
                      Approve
                    </button>

                    <button
                      *ngIf="!isProtected(user) && user.status !== 'rejected'"
                      class="rounded-2xl bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      [disabled]="actingId === user.id"
                      (click)="updateStatus(user.id, 'rejected')"
                    >
                      Reject
                    </button>

                    <button
                      *ngIf="!isProtected(user)"
                      class="rounded-2xl bg-red-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      [disabled]="actingId === user.id || isCurrentUser(user)"
                      (click)="deleteUser(user.id)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </app-shell>
  `,
})
export class AccountsPageComponent implements OnInit, OnDestroy {
  users: AccountUser[] = [];
  loading = true;
  refreshing = false;
  errorMessage = "";
  actionMessage = "";
  actingId: number | null = null;
  recoveryMode = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    public readonly authState: AuthStateService,
    private readonly authApi: AuthApiService,
    private readonly accountsApi: AccountsApiService,
    private readonly pendingUsers: PendingUsersService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadRecoveryStatus();

    interval(ACCOUNTS_REFRESH_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadRecoveryStatus(true));
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

  loadUsers(silent: boolean): void {
    if (this.recoveryMode && !this.authState.currentUser?.is_admin) {
      this.loading = false;
      this.refreshing = false;
      this.users = [];
      return;
    }

    if (silent) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }

    this.prepareAdminSession()
      .pipe(
        switchMap(() => this.accountsApi.fetchUsers()),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (users) => {
          this.users = users;
          this.recoveryMode = false;
          this.pendingUsers.setCount(users.filter((user) => user.status === "pending").length);
          this.errorMessage = "";
          this.loading = false;
          this.refreshing = false;
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(error, "Unable to load users.");
          this.loading = false;
          this.refreshing = false;
        },
      });
  }

  toggleRole(user: AccountUser): void {
    const nextRole = user.role === "admin" ? "user" : "admin";
    this.actingId = user.id;
    this.actionMessage = "";

    this.prepareAdminSession()
      .pipe(
        switchMap(() => this.accountsApi.updateRole(user.id, nextRole)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.users = this.users.map((item) => (item.id === user.id ? response.user : item));
          this.actionMessage = response.detail;
          this.actingId = null;
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(
            error,
            "Unable to update this role.",
          );
          this.actingId = null;
        },
      });
  }

  updateStatus(userId: number, status: "pending" | "approved" | "rejected"): void {
    this.actingId = userId;
    this.actionMessage = "";

    this.prepareAdminSession()
      .pipe(
        switchMap(() => this.accountsApi.updateStatus(userId, status)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.users = this.users.map((user) => (user.id === userId ? response.user : user));
          this.pendingUsers.setCount(this.users.filter((user) => user.status === "pending").length);
          this.actionMessage = response.detail;
          this.actingId = null;
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(
            error,
            "Unable to update this status.",
          );
          this.actingId = null;
        },
      });
  }

  deleteUser(userId: number): void {
    this.actingId = userId;
    this.actionMessage = "";

    this.prepareAdminSession()
      .pipe(
        switchMap(() => this.accountsApi.deleteUser(userId)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.users = this.users.filter((user) => user.id !== userId);
          this.pendingUsers.setCount(this.users.filter((user) => user.status === "pending").length);
          this.actionMessage = response.detail;
          this.actingId = null;
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(
            error,
            "Unable to delete this user.",
          );
          this.actingId = null;
        },
      });
  }

  activateRecovery(): void {
    this.actingId = Number(this.authState.currentUser?.id ?? 0) || -1;
    this.actionMessage = "";
    this.errorMessage = "";

    this.accountsApi.promoteRecoveryAdmin(this.authState.currentUser?.email).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.actionMessage = response.detail;
        this.recoveryMode = false;
        this.loadUsers(false);
      },
      error: (error) => {
        this.errorMessage = this.authApi.getApiErrorMessage(
          error,
          "Unable to activate recovery mode.",
        );
        this.actingId = null;
      },
    });
  }

  statusClass(status: AccountUser["status"]): string {
    if (status === "approved") {
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    }

    if (status === "rejected") {
      return "border-red-400/30 bg-red-400/10 text-red-300";
    }

    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }

  isCurrentUser(user: AccountUser): boolean {
    return user.id === this.authState.currentUser?.id;
  }

  isProtected(user: AccountUser): boolean {
    return user.is_protected_admin;
  }

  private prepareAdminSession(): Observable<unknown> {
    if (!this.authApi.isLocalTestAdmin()) {
      return of(true);
    }

    return this.authApi.upgradeLocalAdminSession();
  }

  private loadRecoveryStatus(silent = false): void {
    this.accountsApi.getRecoveryStatus().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.recoveryMode = response.recovery_mode;
        if (!response.recovery_mode || this.authState.currentUser?.is_admin) {
          this.loadUsers(silent);
        } else {
          this.loading = false;
          this.refreshing = false;
          this.users = [];
          this.errorMessage = "";
        }
      },
      error: () => {
        this.recoveryMode = false;
        this.loadUsers(silent);
      },
    });
  }
}
