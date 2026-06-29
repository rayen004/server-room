import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

type StatusTone = {
  accentClass: string;
  ringClass: string;
  labelClass: string;
};

const STATUS_MAP: Record<string, StatusTone> = {
  Normal: {
    accentClass: "bg-emerald-500",
    ringClass: "ring-emerald-500/20",
    labelClass: "text-emerald-400",
  },
  Warning: {
    accentClass: "bg-amber-500",
    ringClass: "ring-amber-500/20",
    labelClass: "text-amber-400",
  },
  Critical: {
    accentClass: "bg-red-500",
    ringClass: "ring-red-500/20",
    labelClass: "text-red-400",
  },
};

@Component({
  selector: "app-status-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel p-5 ring-1" [ngClass]="palette.ringClass">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-app-muted">System status</p>
          <p class="mt-3 text-3xl font-bold" [ngClass]="palette.labelClass">{{ status }}</p>
        </div>
        <div class="h-14 w-14 animate-pulse rounded-full" [ngClass]="palette.accentClass"></div>
      </div>
      <p class="mt-4 text-sm text-app-muted">Last updated: {{ lastUpdated }}</p>
    </div>
  `,
})
export class StatusCardComponent {
  @Input() status = "Normal";
  @Input() lastUpdated = "";

  get palette(): StatusTone {
    return STATUS_MAP[this.status] ?? STATUS_MAP["Normal"];
  }
}
