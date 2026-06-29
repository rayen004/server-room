import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { AccountUser, ActiveUser } from "../models/account.models";

@Injectable({ providedIn: "root" })
export class AccountsApiService {
  constructor(private readonly http: HttpClient) {}

  getRecoveryStatus(): Observable<{ has_admin: boolean; recovery_mode: boolean }> {
    return this.http.get<{ has_admin: boolean; recovery_mode: boolean }>("/api/recovery/status/");
  }

  promoteRecoveryAdmin(email?: string): Observable<{ detail: string; user: AccountUser }> {
    return this.http.post<{ detail: string; user: AccountUser }>("/api/recovery/promote-admin/", email ? { email } : {});
  }

  fetchActiveUsers(): Observable<ActiveUser[]> {
    return this.http.get<ActiveUser[]>("/api/users/");
  }

  fetchUsers(): Observable<AccountUser[]> {
    return this.http.get<AccountUser[]>("/api/users/?scope=accounts");
  }

  updateRole(userId: number, role: "admin" | "user"): Observable<{ detail: string; user: AccountUser }> {
    return this.http.put<{ detail: string; user: AccountUser }>(`/api/users/${userId}/role/`, { role });
  }

  updateStatus(
    userId: number,
    status: "pending" | "approved" | "rejected",
  ): Observable<{ detail: string; user: AccountUser }> {
    return this.http.put<{ detail: string; user: AccountUser }>(`/api/users/${userId}/status/`, { status });
  }

  deleteUser(userId: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`/api/users/${userId}/`);
  }
}
