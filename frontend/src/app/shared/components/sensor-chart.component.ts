import { CommonModule } from "@angular/common";
import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";

import { MetricHistoryPoint } from "../../core/models/sensor.models";

@Component({
  selector: "app-sensor-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel p-5">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
          <p class="text-sm text-app-muted">{{ subtitle }}</p>
        </div>
        <div class="rounded-full border border-white/10 px-3 py-1 text-xs text-app-muted">
          {{ badgeLabel }}
        </div>
      </div>

      <div class="relative h-80 rounded-3xl border border-white/5 bg-black/10 p-4">
        <svg viewBox="0 0 640 260" class="h-full w-full overflow-visible">
          <defs>
            <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.25" />
              <stop offset="100%" [attr.stop-color]="color" stop-opacity="1" />
            </linearGradient>
          </defs>

          <g stroke="rgba(255,255,255,0.07)">
            <line x1="40" y1="30" x2="600" y2="30" />
            <line x1="40" y1="130" x2="600" y2="130" />
            <line x1="40" y1="230" x2="600" y2="230" />
          </g>

          <polyline
            fill="none"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            [attr.stroke]="'url(#' + gradientId + ')'"
            [attr.points]="linePoints"
          />

          <circle
            *ngIf="lastPoint"
            [attr.cx]="lastPoint.x"
            [attr.cy]="lastPoint.y"
            r="6"
            [attr.fill]="color"
            stroke="#06070A"
            stroke-width="3"
          />
        </svg>

        <div class="absolute inset-x-4 bottom-3 flex justify-between text-xs text-app-muted">
          <span>{{ firstLabel }}</span>
          <span>{{ middleLabel }}</span>
          <span>{{ lastLabel }}</span>
        </div>
      </div>
    </div>
  `,
})
export class SensorChartComponent implements OnChanges {
  @Input({ required: true }) title!: string;
  @Input() data: MetricHistoryPoint[] = [];
  @Input() subtitle = "Near real-time sensor trend";
  @Input() badgeLabel = "Updated live";
  @Input() chartId = "";
  @Input() color = "#38BDF8";
  @Input() unit = "";
  linePoints = "";
  lastPoint: { x: number; y: number } | null = null;
  firstLabel = "--:--";
  middleLabel = "--:--";
  lastLabel = "--:--";

  get gradientId(): string {
    const source = this.chartId || this.title;
    return `${source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-gradient`;
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.data.length) {
      this.linePoints = "";
      this.lastPoint = null;
      this.firstLabel = "--:--";
      this.middleLabel = "--:--";
      this.lastLabel = "--:--";
      return;
    }

    const values = this.data.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    this.linePoints = this.data
      .map((point, index) => {
        const x = 40 + (560 * index) / Math.max(this.data.length - 1, 1);
        const normalized = (point.value - min) / range;
        const y = 230 - normalized * 180;
        return `${x},${y}`;
      })
      .join(" ");

    const index = this.data.length - 1;
    const point = this.data[index];
    this.lastPoint = {
      x: 40 + (560 * index) / Math.max(this.data.length - 1, 1),
      y: 230 - ((point.value - min) / range) * 180,
    };
    this.firstLabel = this.data[0]?.time ?? "--:--";
    this.middleLabel = this.data[Math.floor(this.data.length / 2)]?.time ?? "--:--";
    this.lastLabel = this.data[this.data.length - 1]?.time ?? "--:--";
  }
}
