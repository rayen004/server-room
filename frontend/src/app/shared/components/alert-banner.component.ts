import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
  selector: "app-alert-banner",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <div
        *ngIf="temperatureAlert"
        class="rounded-3xl border border-red-400/30 bg-red-500/15 px-5 py-4 shadow-[0_0_24px_rgba(239,68,68,0.25)]"
      >
        <p class="text-sm font-semibold text-red-100">High Temperature Alert</p>
        <p class="mt-1 text-sm text-red-100/90">
          Current temperature is {{ temperature.toFixed(1) }}°C. Threshold exceeded at 40°C.
        </p>
      </div>

      <div
        *ngIf="humidityAlert"
        class="rounded-3xl border border-red-400/30 bg-red-500/15 px-5 py-4 shadow-[0_0_24px_rgba(239,68,68,0.25)]"
      >
        <p class="text-sm font-semibold text-red-100">High Humidity Alert</p>
        <p class="mt-1 text-sm text-red-100/90">
          Current humidity is {{ humidity.toFixed(0) }}%. Threshold exceeded at 70%.
        </p>
      </div>

      <div
        *ngIf="!temperatureAlert && !humidityAlert"
        class="glass-panel flex items-start gap-4 p-5"
      >
        <div class="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <span class="text-sm font-semibold">OK</span>
        </div>

        <div>
          <p class="text-sm font-semibold text-white">Environment stable</p>
          <p class="mt-1 text-sm text-app-muted">
            All monitored values are within normal limits. Current values are
            {{ temperature.toFixed(1) }}°C and {{ humidity.toFixed(0) }}%.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class AlertBannerComponent {
  @Input() temperature = 0;
  @Input() humidity = 0;
  @Input() temperatureAlert = false;
  @Input() humidityAlert = false;
}
