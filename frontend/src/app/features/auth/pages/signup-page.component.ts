import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { RouterLink } from "@angular/router";

import { AuthApiService } from "../../../core/services/auth-api.service";

@Component({
  selector: "app-signup-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-bg px-6 py-10">
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_30%)]"
      ></div>

      <div class="glass-panel relative w-full max-w-lg p-8 shadow-glow">
        <p class="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Access Request</p>
        <h1 class="mt-3 text-3xl font-semibold text-white">Create account</h1>
        <p class="mt-2 text-sm text-app-muted">
          New users can sign up here, then wait for an administrator to approve access.
        </p>

        <form class="mt-8 space-y-5" [formGroup]="form" (ngSubmit)="submit()">
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-white">Name</span>
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
                <path d="M15 19v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 19v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <input
                class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                type="text"
                formControlName="name"
                placeholder="Jane Doe"
              />
            </div>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-white">Email</span>
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
                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                <path d="m3 7 9 6 9-6"></path>
              </svg>
              <input
                class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                type="email"
                formControlName="email"
                placeholder="jane@example.com"
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
                placeholder="Choose a secure password"
              />
              <button
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-muted transition duration-200 hover:bg-white/5 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                type="button"
                (click)="togglePasswordVisibility('password')"
                [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
              >
                <svg
                  *ngIf="!showPassword; else passwordVisibleIcon"
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
                <ng-template #passwordVisibleIcon>
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

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-white">Confirm Password</span>
            <div
              class="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition duration-200 focus-within:border-emerald-400/50 focus-within:bg-white/8 focus-within:shadow-[0_0_0_4px_rgba(52,211,153,0.12)]"
              [class.border-red-500/40]="showPasswordMismatch"
              [class.shadow-[0_0_0_4px_rgba(248,113,113,0.12)]]="showPasswordMismatch"
              [class.border-emerald-400/50]="showPasswordMatchSuccess"
              [class.shadow-[0_0_0_4px_rgba(52,211,153,0.12)]]="showPasswordMatchSuccess"
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
                <path d="m9 12 2 2 4-4"></path>
                <path d="M12 3 4 7v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V7l-8-4Z"></path>
              </svg>
              <input
                class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                [type]="showConfirmPassword ? 'text' : 'password'"
                formControlName="confirmPassword"
                placeholder="Re-enter your password"
              />
              <div class="flex items-center gap-1">
                <span
                  *ngIf="showPasswordMatchSuccess"
                  class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-200 transition duration-200"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m5 12 5 5L20 7"></path>
                  </svg>
                </span>
                <button
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-muted transition duration-200 hover:bg-white/5 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  type="button"
                  (click)="togglePasswordVisibility('confirm')"
                  [attr.aria-label]="showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'"
                >
                  <svg
                    *ngIf="!showConfirmPassword; else confirmVisibleIcon"
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
                  <ng-template #confirmVisibleIcon>
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
            </div>
            <p
              *ngIf="showPasswordMismatch"
              class="mt-2 text-sm text-red-300 transition duration-200"
            >
              Passwords do not match
            </p>
            <p
              *ngIf="showPasswordMatchSuccess"
              class="mt-2 text-sm text-emerald-300 transition duration-200"
            >
              Passwords match
            </p>
          </label>

          <div
            *ngIf="successMessage"
            class="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          >
            {{ successMessage }}
          </div>

          <div
            *ngIf="errorMessage"
            class="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {{ errorMessage }}
          </div>

          <button
            class="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            [disabled]="loading || form.invalid"
          >
            {{ loading ? "Submitting..." : "Request access" }}
          </button>
        </form>

        <p class="mt-5 text-sm text-app-muted">
          Already approved?
          <a routerLink="/login" class="text-cyan-300 transition hover:text-cyan-200">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  `,
})
export class SignupPageComponent {
  readonly form = this.formBuilder.nonNullable.group({
    name: ["", [Validators.required]],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    confirmPassword: ["", [Validators.required]],
  }, {
    validators: this.passwordsMatchValidator(),
  });

  loading = false;
  errorMessage = "";
  successMessage = "";
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authApi: AuthApiService,
  ) {}

  get showPasswordMismatch(): boolean {
    const confirmControl = this.form.controls.confirmPassword;

    return Boolean(
      this.form.hasError("passwordMismatch") &&
        confirmControl.value &&
        (confirmControl.touched || confirmControl.dirty),
    );
  }

  get showPasswordMatchSuccess(): boolean {
    const { password, confirmPassword } = this.form.getRawValue();
    const confirmControl = this.form.controls.confirmPassword;

    return Boolean(
      password &&
        confirmPassword &&
        !this.form.hasError("passwordMismatch") &&
        confirmControl.valid &&
        (confirmControl.touched || confirmControl.dirty),
    );
  }

  togglePasswordVisibility(field: "password" | "confirm"): void {
    if (field === "password") {
      this.showPassword = !this.showPassword;
      return;
    }

    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    const { name, email, password } = this.form.getRawValue();

    this.authApi
      .signupUser({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      .subscribe({
        next: (response) => {
          this.successMessage =
            response.message ||
            "Your account is pending approval by admin";
          this.form.reset({
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
          });
          this.showPassword = false;
          this.showConfirmPassword = false;
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = this.authApi.getApiErrorMessage(
            error,
            "Unable to create your account right now.",
          );
          this.loading = false;
        },
      });
  }

  private passwordsMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get("password")?.value ?? "";
      const confirmPassword = control.get("confirmPassword")?.value ?? "";

      if (!password || !confirmPassword) {
        return null;
      }

      return password === confirmPassword ? null : { passwordMismatch: true };
    };
  }
}
