import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { AuthUser } from "../../core/models/auth.models";

@Component({
  selector: "app-top-navbar",
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="glass-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-app-muted">{{ eyebrow }}</p>
        <h2 class="mt-1 text-2xl font-semibold text-white">{{ title }}</h2>
        <p *ngIf="subtitle" class="mt-2 text-sm text-app-muted">{{ subtitle }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          class="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-app-muted transition hover:text-white"
          type="button"
          aria-label="Notifications"
        >
          <span class="text-lg">!</span>
        </button>

        <div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/20 font-semibold text-cyan-300"
          >
            {{ initials }}
          </div>
          <div class="hidden sm:block">
            <p class="text-sm font-semibold text-white">{{ label }}</p>
            <p class="text-xs text-app-muted">{{ roleLabel }}</p>
          </div>
          <span class="text-xs text-app-muted">v</span>
        </div>

        <button
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          type="button"
          (click)="logout.emit()"
        >
          Logout
        </button>
      </div>
    </header>
  `,
})
export class TopNavbarComponent {
  @Input() user: AuthUser | null = null;
  @Input({ required: true }) title!: string;
  @Input() eyebrow = "Infrastructure";
  @Input() subtitle = "";
  @Output() readonly logout = new EventEmitter<void>();

  get initials(): string {
    return (
      this.user?.name?.slice(0, 2).toUpperCase() ||
      this.user?.username?.slice(0, 2).toUpperCase() ||
      this.user?.email?.slice(0, 2).toUpperCase() ||
      "SR"
    );
  }

  get label(): string {
    return this.user?.name || this.user?.username || this.user?.email || "Authenticated User";
  }

  get roleLabel(): string {
    return this.user?.is_admin ? "Administrator" : "Approved user";
  }
}
