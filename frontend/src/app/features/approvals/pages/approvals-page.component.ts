import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, Subject, interval, of, switchMap, takeUntil } from "rxjs";

import { PendingUser } from "../../../core/models/auth.models";
import { AuthApiService } from "../../../core/services/auth-api.service";
import { AuthStateService } from "../../../core/services/auth-state.service";
import { PendingUsersService } from "../../../core/services/pending-users.service";
import { AppShellComponent } from "../../../shared/components/app-shell.component";

const REFRESH_INTERVAL_MS = 10000;

@Component({
  selector: "app-approvals-page",
  standalone: true,
  imports: [CommonModule, AppShellComponent],
  template: `
    <app-shell
      [user]="authState.currentUser"
      title="Access Control"
      subtitle="Approve or reject new user registrations before they access the platform."
      (logout)="logout()"
    >
      <section class="glass-panel p-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Admin Review</p>
            <h3 class="mt-2 text-2xl font-semibold text-white">Access Control</h3>
            <p class="mt-2 text-sm text-app-muted">
              Review new registrations and approve or reject access requests.
            </p>
          </div>

          <button
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            (click)="refresh(true)"
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
          <div class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400"></div>
          <p class="mt-4 text-sm text-app-muted">Loading pending users...</p>
        </div>

        <div
          *ngIf="!loading && users.length === 0"
          class="mt-6 rounded-3xl border border-white/10 bg-black/20 p-10 text-center"
        >
          <div
            class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"
          >
            OK
          </div>
          <h4 class="mt-4 text-xl font-semibold text-white">No pending users</h4>
          <p class="mt-2 text-sm text-app-muted">
            There are no pending users waiting for admin approval right now.
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
                  Status
                </th>
                <th class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.25em] text-app-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/10 bg-black/10">
              <tr *ngFor="let user of users" class="transition hover:bg-white/[0.03]">
                <td class="px-5 py-4 text-sm font-medium text-white">{{ user.name }}</td>
                <td class="px-5 py-4 text-sm text-app-muted">{{ user.email }}</td>
                <td class="px-5 py-4">
                  <span class="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                    {{ user.status }}
                  </span>
                </td>
                <td class="px-5 py-4 text-right">
                  <div class="flex justify-end gap-2">
                    <button
                      class="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      (click)="approve(user.id)"
                      [disabled]="actingId === user.id"
                    >
                      {{ actingId === user.id ? "Working..." : "Accept" }}
                    </button>
                    <button
                      class="inline-flex items-center gap-2 rounded-2xl bg-red-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      (click)="reject(user.id)"
                      [disabled]="actingId === user.id"
                    >
                      {{ actingId === user.id ? "Working..." : "Reject" }}
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
export class ApprovalsPageComponent implements OnInit, OnDestroy {
  users: PendingUser[] = [];
  loading = true;
  refreshing = false;
  errorMessage = "";
  actionMessage = "";
  actingId: number | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    public readonly authState: AuthStateService,
    private readonly authApi: AuthApiService,
    private readonly pendingUsers: PendingUsersService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.pendingUsers.refresh();
    this.loadPendingUsers(false);

    interval(REFRESH_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadPendingUsers(true));
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

  refresh(forceRefresh = true): void {
    this.loadPendingUsers(forceRefresh);
  }

  approve(userId: number): void {
    this.actingId = userId;
    this.actionMessage = "";

    this.prepareAdminSession()
      .pipe(
        switchMap(() => this.authApi.approveUser(userId)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.actionMessage = response.detail || "User approved successfully.";
          this.users = this.users.filter((user) => user.id !== userId);
          this.pendingUsers.setCount(this.users.length);
          this.errorMessage = "";
          this.actingId = null;
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(
            error,
            "Unable to approve this user.",
          );
          this.actingId = null;
        },
      });
  }

  reject(userId: number): void {
    this.actingId = userId;
    this.actionMessage = "";

    this.prepareAdminSession()
      .pipe(
        switchMap(() => this.authApi.rejectUser(userId)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.actionMessage = response.detail || "User rejected successfully.";
          this.users = this.users.filter((user) => user.id !== userId);
          this.pendingUsers.setCount(this.users.length);
          this.errorMessage = "";
          this.actingId = null;
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(
            error,
            "Unable to reject this user.",
          );
          this.actingId = null;
        },
      });
  }

  private loadPendingUsers(silent: boolean): void {
    if (silent) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }

    this.prepareAdminSession()
      .pipe(
        switchMap(() => this.authApi.getPendingUsers()),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (users) => {
          this.users = users;
          this.pendingUsers.setCount(users.length);
          this.errorMessage = "";
          this.loading = false;
          this.refreshing = false;
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(
            error,
            "Unable to load pending users.",
          );
          this.loading = false;
          this.refreshing = false;
        },
      });
  }

  private prepareAdminSession(): Observable<unknown> {
    if (!this.authApi.isLocalTestAdmin()) {
      return of(true);
    }

    return this.authApi.upgradeLocalAdminSession();
  }
}
