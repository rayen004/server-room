import { Injectable } from "@angular/core";
import { Observable, catchError, firstValueFrom, of, tap } from "rxjs";

import { AuthResponse, AuthUser, LoginPayload } from "../models/auth.models";
import { AuthApiService } from "./auth-api.service";

@Injectable({ providedIn: "root" })
export class AuthStateService {
  private userState: AuthUser | null;
  private readyState = false;

  constructor(private readonly authApi: AuthApiService) {
    this.userState = this.authApi.getStoredUser();
  }

  async initializeSession(): Promise<void> {
    const hasAccessToken = Boolean(localStorage.getItem("access_token"));

    if (!hasAccessToken) {
      this.readyState = true;
      return;
    }

    try {
      const currentUser = await firstValueFrom(this.authApi.fetchCurrentUser());
      this.authApi.persistSession({
        access: localStorage.getItem("access_token") ?? undefined,
        refresh: localStorage.getItem("refresh_token") ?? undefined,
        user: currentUser,
      });
      this.userState = currentUser;
    } catch {
      this.authApi.clearSession();
      this.userState = null;
    } finally {
      this.readyState = true;
    }
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.authApi.loginWithTestAdminFallback(payload).pipe(
      tap((response) => {
        if (response.access && response.refresh) {
          this.authApi.persistSession(response);
        }

        this.userState = response.user;
      }),
    );
  }

  setBackendSession(response: AuthResponse): void {
    this.authApi.persistSession(response);
    this.userState = response.user;
  }

  updateCurrentUser(patch: Partial<AuthUser>): void {
    if (!this.userState) {
      return;
    }

    this.userState = { ...this.userState, ...patch };
    this.authApi.updateStoredUser(this.userState);
  }

  logout(): Observable<unknown> {
    if (this.authApi.isLocalTestAdmin()) {
      this.authApi.clearSession();
      this.userState = null;
      return of(true);
    }

    return this.authApi.logoutUser().pipe(
      catchError(() => of(true)),
      tap(() => {
        this.authApi.clearSession();
        this.userState = null;
      }),
    );
  }

  get currentUser(): AuthUser | null {
    return this.userState;
  }

  get isReady(): boolean {
    return this.readyState;
  }
}
