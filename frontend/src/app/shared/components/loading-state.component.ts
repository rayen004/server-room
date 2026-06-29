import { Component } from "@angular/core";

@Component({
  selector: "app-loading-state",
  standalone: true,
  template: `
    <div class="flex min-h-screen items-center justify-center px-6">
      <div class="glass-panel w-full max-w-lg p-8 text-center">
        <div
          class="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400"
        ></div>
        <h2 class="mt-6 text-2xl font-semibold text-white">Loading telemetry</h2>
        <p class="mt-2 text-app-muted">Fetching the latest server room sensor readings.</p>
      </div>
    </div>
  `,
})
export class LoadingStateComponent {}
