import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, of, tap, throwError } from "rxjs";

import {
  AuthResponse,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  PendingUser,
  RFIDLogEvent,
  RFIDSessionResponse,
  SignupPayload,
  SignupResponse,
} from "../models/auth.models";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const AUTH_USER_KEY = "auth_user";
const AUTH_MODE_KEY = "auth_mode";
const SESSION_ID_KEY = "session_id";

@Injectable({ providedIn: "root" })
export class AuthApiService {
  constructor(private readonly http: HttpClient) {}

  loginUser(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>("/api/login/", payload);
  }

  loginWithTestAdminFallback(payload: LoginPayload): Observable<AuthResponse> {
    const normalizedIdentifier = payload.identifier.trim().toLowerCase();

    if (normalizedIdentifier === "admin" && payload.password === "admin123") {
      return this.loginUser(payload).pipe(
        catchError(() => {
          this.persistLocalAdminSession();
          const user = this.getStoredUser();

          if (!user) {
            return throwError(() => new Error("Unable to create local admin session."));
          }

          return of({ user, isLocalAdminFallback: true });
        }),
      );
    }

    return this.loginUser(payload);
  }

  upgradeLocalAdminSession(): Observable<AuthResponse> {
    return this.loginUser({
      identifier: "admin",
      password: "admin123",
    }).pipe(
      tap((response) => {
        if (response.access && response.refresh) {
          this.persistSession(response);
        }
      }),
    );
  }

  signupUser(payload: SignupPayload): Observable<SignupResponse> {
    return this.http.post<SignupResponse>("/api/signup/", payload).pipe(
      tap((response) => console.log("signup response", response)),
    );
  }

  fetchCurrentUser(): Observable<AuthUser> {
    return this.http.get<AuthUser>("/api/user/");
  }

  fetchRFIDEvents(limit = 5): Observable<RFIDLogEvent[]> {
    return this.http.get<RFIDLogEvent[]>(`/api/rfid-events/?limit=${limit}`);
  }

  createRFIDSession(uid: string): Observable<RFIDSessionResponse> {
    return this.http.post<RFIDSessionResponse>("/api/rfid-session/", { uid });
  }

  changePassword(payload: ChangePasswordPayload): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>("/api/user/change-password/", payload);
  }

  getPendingUsers(): Observable<PendingUser[]> {
    return this.http.get<PendingUser[]>("/api/users/pending").pipe(
      tap((response) => console.log("getPendingUsers response", response)),
    );
  }

  approveUser(userId: number): Observable<{ detail: string; user: PendingUser }> {
    return this.http.put<{ detail: string; user: PendingUser }>(
      `/api/users/${userId}/approve/`,
      {},
    );
  }

  rejectUser(userId: number): Observable<{ detail: string; user: PendingUser }> {
    return this.http.put<{ detail: string; user: PendingUser }>(
      `/api/users/${userId}/reject/`,
      {},
    );
  }

  logoutUser(sessionId?: number | null): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>("/api/logout/", {
      session_id: sessionId ?? this.getStoredSessionId(),
    });
  }

  persistSession(response: AuthResponse): void {
    if (response.access) {
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
    }

    if (response.refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
    }

    if (response.session_id) {
      localStorage.setItem(SESSION_ID_KEY, String(response.session_id));
    }

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
    localStorage.setItem(AUTH_MODE_KEY, "backend");
  }

  persistLocalAdminSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.setItem(
      AUTH_USER_KEY,
      JSON.stringify({
        id: "local-admin",
        name: "Admin",
        username: "admin",
        email: "admin",
        is_admin: true,
        status: "approved",
      } satisfies AuthUser),
    );
    localStorage.setItem(AUTH_MODE_KEY, "local-test-admin");
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_MODE_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
  }

  getStoredUser(): AuthUser | null {
    const rawUser = localStorage.getItem(AUTH_USER_KEY);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      this.clearSession();
      return null;
    }
  }

  updateStoredUser(user: AuthUser): void {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  isLocalTestAdmin(): boolean {
    return localStorage.getItem(AUTH_MODE_KEY) === "local-test-admin";
  }

  getStoredSessionId(): number | null {
    const rawValue = localStorage.getItem(SESSION_ID_KEY);

    if (!rawValue) {
      return null;
    }

    const sessionId = Number(rawValue);
    return Number.isFinite(sessionId) ? sessionId : null;
  }

  closeSessionOnUnload(): void {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const sessionId = this.getStoredSessionId();

    if (!token || !sessionId) {
      return;
    }

    void fetch("/api/logout/", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    this.clearSession();
  }

  getApiErrorMessage(error: unknown, fallbackMessage: string): string {
    const apiError = error as {
      error?: Record<string, string | string[]>;
    };
    const detail = apiError?.error?.["detail"];

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    const firstError = Object.values(apiError?.error ?? {}).find((value) =>
      Array.isArray(value) ? typeof value[0] === "string" : typeof value === "string",
    );

    if (Array.isArray(firstError) && firstError[0]) {
      return firstError[0];
    }

    if (typeof firstError === "string" && firstError.trim()) {
      return firstError;
    }

    return fallbackMessage;
  }
}
