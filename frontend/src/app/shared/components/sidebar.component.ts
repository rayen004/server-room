import { CommonModule } from "@angular/common";
import { Component, Input, OnDestroy } from "@angular/core";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { Subject, filter, takeUntil } from "rxjs";

import { AuthUser } from "../../core/models/auth.models";
import { PendingUsersService } from "../../core/services/pending-users.service";

interface SidebarItem {
  name: string;
  icon: string;
  to: string;
  showPendingBadge?: boolean;
}

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside
      class="glass-panel fixed bottom-6 left-6 top-6 hidden w-72 flex-col justify-between p-6 lg:flex"
    >
      <div class="space-y-8">
        <div>
          <div
            class="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300"
          >
            SR
          </div>
          <h1 class="text-xl font-semibold text-white">Server Room</h1>
          <p class="mt-1 text-sm text-app-muted">Monitoring dashboard</p>
        </div>

        <nav class="space-y-3">
          <a
            *ngFor="let item of items"
            [routerLink]="item.to"
            routerLinkActive="bg-white/10 text-white"
            [routerLinkActiveOptions]="{ exact: item.to === '/' }"
            class="relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-app-muted transition hover:bg-white/5 hover:text-white"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[10px] font-semibold text-cyan-300"
            >
              {{ item.icon }}
            </span>
            <span>{{ item.name }}</span>
            <span
              *ngIf="shouldShowBadge(item)"
              class="absolute right-3 top-2 flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 text-[11px] font-bold text-white"
              [ngClass]="
                isMutedBadge(item)
                  ? 'border-emerald-300/30 bg-emerald-400/20'
                  : 'border-emerald-300/50 bg-emerald-500/90 shadow-[0_0_18px_rgba(34,197,94,0.55)] animate-badge-pulse'
              "
            >
              <span
                *ngIf="!isMutedBadge(item)"
                class="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping"
              ></span>
              <span class="relative z-10">{{ pendingCount }}</span>
            </span>
          </a>
        </nav>
      </div>

      <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p class="text-sm font-semibold text-white">Live polling</p>
        <p class="mt-1 text-sm text-app-muted">
          Dashboard and approvals refresh automatically.
        </p>
      </div>
    </aside>
  `,
})
export class SidebarComponent implements OnDestroy {
  private readonly baseItems: SidebarItem[] = [
    { name: "Dashboard", icon: "DB", to: "/" },
    { name: "Tasks", icon: "TK", to: "/tasks" },
    { name: "Logs", icon: "LG", to: "/logs" },
    { name: "Settings", icon: "ST", to: "/settings" },
  ];
  private readonly adminItems: SidebarItem[] = [
    { name: "Gestion des comptes", icon: "AC", to: "/accounts" },
    { name: "Access Control", icon: "US", to: "/access-control", showPendingBadge: true },
  ];
  items: SidebarItem[] = this.baseItems;
  pendingCount = 0;
  accessControlViewed = false;
  private readonly destroy$ = new Subject<void>();

  @Input() set user(value: AuthUser | null) {
    if (value?.is_admin) {
      this.pendingUsers.startPolling();
      this.pendingUsers.refresh();
    } else {
      this.pendingUsers.clear();
    }

    this.items = value?.is_admin
      ? [...this.baseItems, ...this.adminItems]
      : this.baseItems;
  }

  constructor(
    private readonly pendingUsers: PendingUsersService,
    private readonly router: Router,
  ) {
    this.pendingUsers.pendingCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.pendingCount = count;
        this.accessControlViewed = count === 0 ? false : this.router.url === "/access-control";
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.accessControlViewed = this.pendingCount > 0 && this.router.url === "/access-control";
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  shouldShowBadge(item: SidebarItem): boolean {
    return Boolean(item.showPendingBadge && this.pendingCount > 0);
  }

  isMutedBadge(item: SidebarItem): boolean {
    return Boolean(item.showPendingBadge && this.accessControlViewed);
  }
}
