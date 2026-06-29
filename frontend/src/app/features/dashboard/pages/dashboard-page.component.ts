import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subject, catchError, forkJoin, interval, of, takeUntil } from "rxjs";

import { AlertRecord, MetricHistoryPoint, SensorPoint, SensorRecord } from "../../../core/models/sensor.models";
import { AuthStateService } from "../../../core/services/auth-state.service";
import { SensorApiService } from "../../../core/services/sensor-api.service";
import { AlertBannerComponent } from "../../../shared/components/alert-banner.component";
import { AppShellComponent } from "../../../shared/components/app-shell.component";
import { MetricCardComponent } from "../../../shared/components/metric-card.component";
import { SensorChartComponent } from "../../../shared/components/sensor-chart.component";

const UPDATE_INTERVAL_MS = 5000;
const MAX_POINTS = 20;
const FALLBACK_DATA: SensorPoint[] = [
  { time: "10:00", temperature: 22.1, humidity: 45, power: 118.4 },
  { time: "10:03", temperature: 22.4, humidity: 46, power: 119.8 },
  { time: "10:06", temperature: 22.8, humidity: 47, power: 121.2 },
  { time: "10:09", temperature: 23.1, humidity: 48, power: 122.7 },
  { time: "10:12", temperature: 23.5, humidity: 49, power: 124.1 },
  { time: "10:15", temperature: 23.9, humidity: 50, power: 126.5 },
  { time: "10:18", temperature: 24.2, humidity: 52, power: 128.9 },
  { time: "10:21", temperature: 24.6, humidity: 53, power: 130.4 },
  { time: "10:24", temperature: 25, humidity: 55, power: 132.8 },
  { time: "10:27", temperature: 25.4, humidity: 56, power: 134.6 },
  { time: "10:30", temperature: 25.8, humidity: 58, power: 136.1 },
  { time: "10:33", temperature: 26.1, humidity: 59, power: 137.4 },
  { time: "10:36", temperature: 26.5, humidity: 60, power: 139.2 },
  { time: "10:39", temperature: 26.8, humidity: 61, power: 140.5 },
  { time: "10:42", temperature: 27, humidity: 62, power: 141.6 },
  { time: "10:45", temperature: 27.3, humidity: 63, power: 142.9 },
  { time: "10:48", temperature: 27.6, humidity: 64, power: 143.8 },
  { time: "10:51", temperature: 27.8, humidity: 65, power: 144.4 },
  { time: "10:54", temperature: 28, humidity: 66, power: 145.1 },
  { time: "10:57", temperature: 28.2, humidity: 67, power: 145.7 },
];

@Component({
  selector: "app-dashboard-page",
  standalone: true,
  imports: [
    CommonModule,
    AlertBannerComponent,
    AppShellComponent,
    MetricCardComponent,
    SensorChartComponent,
  ],
  template: `
    <app-shell
      [user]="authState.currentUser"
      title="Server Room Monitoring Dashboard"
      subtitle="Live environmental telemetry for your approved session."
      (logout)="logout()"
    >
      <app-alert-banner
        [temperature]="latestPoint.temperature"
        [humidity]="latestPoint.humidity"
        [temperatureAlert]="temperatureAlert"
        [humidityAlert]="humidityAlert"
      />

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <app-metric-card
          label="Temperature"
          [value]="latestPoint.temperature.toFixed(1)"
          unit="°C"
          helperText="Current temperature reading"
          indicatorLabel="T"
          indicatorClass="bg-cyan-500/15 text-cyan-300"
        />

        <app-metric-card
          label="Humidity"
          [value]="latestPoint.humidity.toFixed(0)"
          unit="%"
          helperText="Current humidity reading"
          indicatorLabel="H"
          indicatorClass="bg-emerald-500/15 text-emerald-300"
        />

        <app-metric-card
          label="Power Usage"
          [value]="latestPoint.power.toFixed(1)"
          unit="W"
          helperText="Current power consumption"
          indicatorLabel="P"
          indicatorClass="bg-amber-500/15 text-amber-300"
        />

        <div class="glass-panel p-5">
          <div class="mb-4 flex items-center justify-between">
            <p class="text-sm text-app-muted">Health status</p>
            <span class="text-white">S</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="h-3 w-3 rounded-full" [ngClass]="statusColor"></span>
            <span class="text-2xl font-bold text-white">{{ status }}</span>
          </div>
        </div>

        <app-metric-card
          label="Data source"
          [value]="dataSource"
          [helperText]="'Last updated ' + formatDateTime(lastUpdated)"
          accentClass="bg-white"
        />
      </section>

      <section class="glass-panel p-5">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-sm text-app-muted">Alert status</p>
            <h3 class="mt-2 text-xl font-semibold text-white">{{ activeAlertLabel }}</h3>
            <p class="mt-2 text-sm text-app-muted">{{ lastAlertMessage }}</p>
          </div>

          <div class="rounded-2xl border px-4 py-3 text-sm font-semibold"
               [ngClass]="activeAlertBadgeClass">
            {{ activeAlertState }}
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-3">
        <app-sensor-chart
          title="Temperature"
          subtitle="Near real-time temperature trend"
          [data]="temperatureHistory"
          chartId="temperature"
          color="#38BDF8"
          unit="°C"
        />

        <app-sensor-chart
          title="Humidity"
          subtitle="Near real-time humidity trend"
          [data]="humidityHistory"
          chartId="humidity"
          color="#22C55E"
          unit="%"
        />

        <app-sensor-chart
          title="Power Usage"
          subtitle="Near real-time power consumption trend"
          [data]="powerHistory"
          chartId="power"
          color="#F59E0B"
          unit="W"
        />
      </section>
    </app-shell>
  `,
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  latestPoint: SensorPoint = FALLBACK_DATA[FALLBACK_DATA.length - 1];
  temperatureHistory: MetricHistoryPoint[] = this.toMetricHistory(FALLBACK_DATA, "temperature");
  humidityHistory: MetricHistoryPoint[] = this.toMetricHistory(FALLBACK_DATA, "humidity");
  powerHistory: MetricHistoryPoint[] = this.toMetricHistory(FALLBACK_DATA, "power");
  lastUpdated = new Date();
  dataSource = "mock data";
  temperatureAlert = false;
  humidityAlert = false;
  latestAlert: AlertRecord | null = null;
  private latestRecordTimestamp: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    public readonly authState: AuthStateService,
    private readonly router: Router,
    private readonly sensorApi: SensorApiService,
  ) {}

  ngOnInit(): void {
    this.checkAlerts();
    this.loadSensorData();

    interval(UPDATE_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadSensorData());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get status(): "Normal" | "Warning" | "Critical" {
    if (this.latestPoint.temperature > 35 || this.latestPoint.humidity > 80) {
      return "Critical";
    }

    if (this.latestPoint.temperature > 30 || this.latestPoint.humidity > 70) {
      return "Warning";
    }

    return "Normal";
  }

  get statusColor(): string {
    if (this.status === "Critical") {
      return "bg-red-500";
    }

    if (this.status === "Warning") {
      return "bg-amber-500";
    }

    return "bg-emerald-500";
  }

  get activeAlertState(): string {
    return this.temperatureAlert || this.humidityAlert ? "Alert Active" : "Monitoring";
  }

  get activeAlertLabel(): string {
    if (this.temperatureAlert && this.humidityAlert) {
      return "High Temperature and Humidity";
    }

    if (this.temperatureAlert) {
      return "High Temperature";
    }

    if (this.humidityAlert) {
      return "High Humidity";
    }

    return "All readings within thresholds";
  }

  get lastAlertMessage(): string {
    if (this.latestAlert) {
      return this.latestAlert.message;
    }

    return "No alerts triggered yet.";
  }

  get activeAlertBadgeClass(): string {
    if (this.temperatureAlert || this.humidityAlert) {
      return "border-red-400/30 bg-red-500/10 text-red-200";
    }

    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  logout(): void {
    this.authState.logout().pipe(takeUntil(this.destroy$)).subscribe({
      complete: () => {
        void this.router.navigateByUrl("/login");
      },
    });
  }

  formatDateTime(value: Date): string {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  }

  private loadSensorData(): void {
    forkJoin({
      sensor: this.sensorApi.fetchLatestSensorData().pipe(catchError(() => of(null))),
      alert: this.sensorApi.fetchLatestAlert().pipe(catchError(() => of(null))),
    })
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe(({ sensor, alert }) => {
        this.latestAlert = alert;

        if (!sensor) {
          return;
        }

        const recordTimestamp = sensor.timestamp ?? sensor.created_at ?? null;

        if (recordTimestamp && recordTimestamp === this.latestRecordTimestamp) {
          this.checkAlerts();
          return;
        }

        const nextPoint = this.toSensorPoint(sensor);
        this.latestPoint = nextPoint;
        this.temperatureHistory = this.appendMetricPoint(this.temperatureHistory, nextPoint.time, nextPoint.temperature);
        this.humidityHistory = this.appendMetricPoint(this.humidityHistory, nextPoint.time, nextPoint.humidity);
        this.powerHistory = this.appendMetricPoint(this.powerHistory, nextPoint.time, nextPoint.power);
        this.latestRecordTimestamp = recordTimestamp;
        this.lastUpdated = recordTimestamp ? new Date(recordTimestamp) : new Date();
        this.dataSource = "ESP32 API";
        this.checkAlerts();
      });
  }

  private checkAlerts(): void {
    this.temperatureAlert = this.latestPoint.temperature > 30;
    this.humidityAlert = this.latestPoint.humidity > 70;
  }

  private formatTime(createdAt?: string): string {
    if (!createdAt) {
      return "--:--";
    }

    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(createdAt));
  }

  private toSensorPoint(record: SensorRecord): SensorPoint {
    const timestamp = record.timestamp ?? record.created_at;

    return {
      time: this.formatTime(timestamp),
      temperature: Number(record.temperature),
      humidity: Number(record.humidity),
      power: Number(record.power),
    };
  }

  private appendMetricPoint(history: MetricHistoryPoint[], time: string, value: number): MetricHistoryPoint[] {
    return [...history.slice(-(MAX_POINTS - 1)), { time, value }];
  }

  private toMetricHistory(
    points: SensorPoint[],
    key: "temperature" | "humidity" | "power",
  ): MetricHistoryPoint[] {
    return points.map((point) => ({
      time: point.time,
      value: point[key],
    }));
  }
}
