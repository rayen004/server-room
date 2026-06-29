import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-error-state",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-h-screen items-center justify-center px-6">
      <div class="glass-panel w-full max-w-lg p-8 text-center">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-xl text-red-400"
        >
          !
        </div>
        <h2 class="mt-6 text-2xl font-semibold text-white">Data feed unavailable</h2>
        <p class="mt-2 text-app-muted">{{ message }}</p>
        <button
          class="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          type="button"
          (click)="retry.emit()"
        >
          Retry
        </button>
      </div>
    </div>
  `,
})
export class ErrorStateComponent {
  @Input() message = "";
  @Output() readonly retry = new EventEmitter<void>();
}
