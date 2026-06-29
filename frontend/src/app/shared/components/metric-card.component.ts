import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
  selector: "app-metric-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel p-5">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm text-app-muted">{{ label }}</p>
          <div class="mt-3 flex items-end gap-2">
            <span class="text-3xl font-bold tracking-tight text-white">{{ value }}</span>
            <span *ngIf="unit" class="pb-1 text-sm text-app-muted">{{ unit }}</span>
          </div>
        </div>
        <div
          *ngIf="indicatorLabel; else dotIndicator"
          class="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold"
          [ngClass]="indicatorClass"
        >
          {{ indicatorLabel }}
        </div>
        <ng-template #dotIndicator>
          <div class="h-3 w-3 rounded-full" [ngClass]="accentClass"></div>
        </ng-template>
      </div>
      <p class="mt-4 text-sm text-app-muted">{{ helperText }}</p>
    </div>
  `,
})
export class MetricCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() unit = "";
  @Input() accentClass = "bg-white";
  @Input() helperText = "";
  @Input() indicatorLabel = "";
  @Input() indicatorClass = "bg-white/10 text-white";
}
