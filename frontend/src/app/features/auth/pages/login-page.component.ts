import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

import { MetricHistoryPoint, SensorPoint } from "../../../core/models/sensor.models";
import { AuthApiService } from "../../../core/services/auth-api.service";
import { AuthStateService } from "../../../core/services/auth-state.service";
import { SensorChartComponent } from "../../../shared/components/sensor-chart.component";

const LOGIN_FALLBACK_DATA: SensorPoint[] = [
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
  selector: "app-login-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SensorChartComponent],
  template: `
    <div class="relative min-h-screen overflow-hidden bg-app-bg">
      <div
        class="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,1)_55%,rgba(3,7,18,0.98))]"
      ></div>
      <div
        class="absolute inset-0 animate-[pulse_9s_ease-in-out_infinite] bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.16),transparent_24%),radial-gradient(circle_at_75%_25%,rgba(16,185,129,0.14),transparent_20%),radial-gradient(circle_at_40%_75%,rgba(59,130,246,0.12),transparent_22%)]"
      ></div>
      <div class="absolute inset-y-0 left-[70%] hidden w-px bg-white/10 lg:block"></div>

      <div class="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,7fr)_minmax(360px,3fr)]">
        <section class="hidden px-8 py-8 lg:flex xl:px-10 xl:py-10">
          <div class="flex w-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_40px_120px_rgba(2,6,23,0.55)] backdrop-blur-md">
            <div class="flex items-start justify-between gap-6">
              <div>
                <p class="text-xs uppercase tracking-[0.38em] text-cyan-300/75">Monitoring Overview</p>
                <h1 class="mt-3 text-4xl font-semibold tracking-tight text-white">
                  Live environment insights
                </h1>
                <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300/75">
                  A focused view of server room conditions with clean telemetry cards, live trend charts,
                  and a calm operations surface.
                </p>
              </div>

              <div
                class="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.16)]"
              >
                Updated live
              </div>
            </div>

            <div class="mt-8 grid gap-4 xl:grid-cols-4">
              <article
                class="rounded-3xl border border-cyan-400/10 bg-white/[0.05] p-5 shadow-[0_20px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:shadow-[0_24px_50px_rgba(34,211,238,0.12)]"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/12 text-sm font-semibold text-cyan-200"
                  >
                    T
                  </span>
                  <span class="text-xs uppercase tracking-[0.25em] text-slate-400">Current</span>
                </div>
                <p class="mt-5 text-sm text-slate-400">Current Temperature</p>
                <p class="mt-2 text-3xl font-semibold text-white">28.5 <span class="text-lg text-cyan-200">°C</span></p>
              </article>

              <article
                class="rounded-3xl border border-emerald-400/10 bg-white/[0.05] p-5 shadow-[0_20px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-emerald-300/20 hover:shadow-[0_24px_50px_rgba(16,185,129,0.12)]"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/12 text-sm font-semibold text-emerald-200"
                  >
                    H
                  </span>
                  <span class="text-xs uppercase tracking-[0.25em] text-slate-400">Current</span>
                </div>
                <p class="mt-5 text-sm text-slate-400">Current Humidity</p>
                <p class="mt-2 text-3xl font-semibold text-white">67 <span class="text-lg text-emerald-200">%</span></p>
              </article>

              <article
                class="rounded-3xl border border-emerald-400/10 bg-white/[0.05] p-5 shadow-[0_20px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-emerald-300/20 hover:shadow-[0_24px_50px_rgba(16,185,129,0.12)]"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-sm font-semibold text-white"
                  >
                    S
                  </span>
                  <span class="flex items-center gap-2 text-xs text-emerald-200">
                    <span class="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.85)]"></span>
                    Stable
                  </span>
                </div>
                <p class="mt-5 text-sm text-slate-400">Health Status</p>
                <p class="mt-2 text-3xl font-semibold text-white">Normal</p>
              </article>

              <article
                class="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_20px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_50px_rgba(59,130,246,0.1)]"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-sm font-semibold text-slate-200"
                  >
                    D
                  </span>
                  <span class="text-xs uppercase tracking-[0.25em] text-slate-400">Mode</span>
                </div>
                <p class="mt-5 text-sm text-slate-400">Data Source</p>
                <p class="mt-2 text-3xl font-semibold capitalize text-white">mock</p>
              </article>
            </div>

            <div class="mt-6 grid flex-1 gap-5 xl:grid-cols-2">
              <app-sensor-chart
                title="Temperature"
                subtitle="Near real-time temperature trend"
                [data]="temperatureHistory"
                chartId="login-temperature"
                color="#38bdf8"
                unit="°C"
              />

              <app-sensor-chart
                title="Humidity"
                subtitle="Near real-time humidity trend"
                [data]="humidityHistory"
                chartId="login-humidity"
                color="#22c55e"
                unit="%"
              />
            </div>
          </div>
        </section>

        <section class="flex items-center justify-center px-6 py-10 sm:px-8 lg:px-10">
          <div class="glass-panel relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 p-8 shadow-[0_30px_90px_rgba(2,6,23,0.65)]">
            <div
              class="absolute inset-x-10 top-0 h-24 rounded-b-full bg-gradient-to-r from-cyan-400/10 via-emerald-400/10 to-transparent blur-3xl"
            ></div>

            <div class="relative">
              <p class="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Server Room Access</p>
              <h1 class="mt-3 text-3xl font-semibold text-white">Sign in</h1>
              <p class="mt-2 text-sm leading-6 text-app-muted">
                Approved users can access the live monitoring dashboard
              </p>

              <form class="mt-8 space-y-5" [formGroup]="form" (ngSubmit)="submit()">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-white">Username or email</span>
                  <div
                    class="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition duration-200 focus-within:border-cyan-400/50 focus-within:bg-white/8 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-5 w-5 shrink-0 text-app-muted transition group-focus-within:text-cyan-200"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                      <path d="m3 7 9 6 9-6"></path>
                    </svg>
                    <input
                      class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                      type="text"
                      formControlName="identifier"
                      placeholder="admin or admin@example.com"
                    />
                  </div>
                </label>

                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-white">Password</span>
                  <div
                    class="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition duration-200 focus-within:border-emerald-400/50 focus-within:bg-white/8 focus-within:shadow-[0_0_0_4px_rgba(52,211,153,0.12)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-5 w-5 shrink-0 text-app-muted transition group-focus-within:text-emerald-200"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                      <path d="M7 11V8a5 5 0 0 1 10 0v3"></path>
                    </svg>
                    <input
                      class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                      [type]="showPassword ? 'text' : 'password'"
                      formControlName="password"
                      placeholder="Enter your password"
                    />
                    <button
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-muted transition duration-200 hover:bg-white/5 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                      type="button"
                      (click)="showPassword = !showPassword"
                      [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
                    >
                      <svg
                        *ngIf="!showPassword; else visiblePasswordIcon"
                        viewBox="0 0 24 24"
                        class="h-5 w-5 transition duration-200 ease-out hover:scale-110"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2.06 12.34a1 1 0 0 1 0-.68C3.43 8.39 7.36 6 12 6s8.57 2.39 9.94 5.66a1 1 0 0 1 0 .68C20.57 15.61 16.64 18 12 18s-8.57-2.39-9.94-5.66Z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <ng-template #visiblePasswordIcon>
                        <svg
                          viewBox="0 0 24 24"
                          class="h-5 w-5 transition duration-200 ease-out hover:scale-110"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m3 3 18 18"></path>
                          <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83"></path>
                          <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c4.64 0 8.57 2.39 9.94 5.66a1 1 0 0 1 0 .68 11.08 11.08 0 0 1-4.25 5.09"></path>
                          <path d="M6.61 6.61A11.06 11.06 0 0 0 2.06 11.66a1 1 0 0 0 0 .68C3.43 15.61 7.36 18 12 18c1.76 0 3.38-.34 4.79-.95"></path>
                        </svg>
                      </ng-template>
                    </button>
                  </div>
                </label>

                <div
                  *ngIf="errorMessage"
                  class="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {{ errorMessage }}
                </div>

                <button
                  class="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(45,212,191,0.2)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(45,212,191,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  [disabled]="loading || form.invalid"
                >
                  {{ loading ? "Signing in..." : "Login" }}
                </button>
              </form>

              <p class="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-app-muted">
                Test admin shortcut: admin / admin123
              </p>

              <p class="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                RFID: {{ rfidStatus }}
              </p>

              <p class="mt-4 text-sm text-app-muted">
                Need access?
                <a routerLink="/signup" class="text-cyan-300 transition hover:text-cyan-200">
                  Create an account
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class LoginPageComponent implements OnInit, OnDestroy {
  readonly temperatureHistory = this.toMetricHistory(LOGIN_FALLBACK_DATA, "temperature");
  readonly humidityHistory = this.toMetricHistory(LOGIN_FALLBACK_DATA, "humidity");

  readonly form = this.formBuilder.nonNullable.group({
    identifier: ["", [Validators.required]],
    password: ["", [Validators.required]],
  });

  loading = false;
  errorMessage = "";
  showPassword = false;
  rfidStatus = "Waiting for RFID card...";
  private rfidPollTimer: number | null = null;
  private lastSeenRFIDLogId: number | null = null;
  private rfidLoginInProgress = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authApi: AuthApiService,
    private readonly authState: AuthStateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.startRFIDPolling();
  }

  ngOnDestroy(): void {
    if (this.rfidPollTimer !== null) {
      window.clearInterval(this.rfidPollTimer);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    const { identifier, password } = this.form.getRawValue();

    this.authState
      .login({
        identifier: identifier.trim(),
        password,
      })
      .subscribe({
        next: () => {
          const destination = this.route.snapshot.queryParamMap.get("redirect") || "/";
          void this.router.navigateByUrl(destination);
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(
            error,
            "Invalid username, email, or password.",
          );
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  private startRFIDPolling(): void {
    this.pollRFIDEvents();
    this.rfidPollTimer = window.setInterval(() => this.pollRFIDEvents(), 1500);
  }

  private pollRFIDEvents(): void {
    if (this.rfidLoginInProgress || this.authState.currentUser) {
      return;
    }

    this.authApi.fetchRFIDEvents(1).subscribe({
      next: (events) => {
        const latestEvent = events[0];
        if (!latestEvent) {
          return;
        }

        if (this.lastSeenRFIDLogId === null) {
          this.lastSeenRFIDLogId = latestEvent.id;
          this.rfidStatus = "Waiting for RFID card...";
          return;
        }

        if (latestEvent.id === this.lastSeenRFIDLogId) {
          return;
        }

        this.lastSeenRFIDLogId = latestEvent.id;

        if (latestEvent.status === "denied") {
          this.rfidStatus = `Access denied for UID ${latestEvent.uid}`;
          return;
        }

        this.rfidStatus = `RFID authorized for ${latestEvent.role}. Opening dashboard...`;
        this.rfidLoginInProgress = true;
        this.authApi.createRFIDSession(latestEvent.uid).subscribe({
          next: (response) => {
            this.authState.setBackendSession(response);
            void this.router.navigateByUrl(response.user.is_admin ? "/" : "/tasks");
          },
          error: (error) => {
            this.rfidLoginInProgress = false;
            this.rfidStatus = this.authApi.getApiErrorMessage(error, "RFID login failed.");
          },
        });
      },
      error: () => {
        this.rfidStatus = "RFID reader API is not reachable.";
      },
    });
  }

  private toMetricHistory(
    points: SensorPoint[],
    key: "temperature" | "humidity",
  ): MetricHistoryPoint[] {
    return points.map((point) => ({
      time: point.time,
      value: point[key],
    }));
  }
}
