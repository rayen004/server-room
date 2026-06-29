import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { UserSession } from "../models/session.models";

@Injectable({ providedIn: "root" })
export class SessionApiService {
  constructor(private readonly http: HttpClient) {}

  fetchSessions(userId?: number | null): Observable<UserSession[]> {
    const query = typeof userId === "number" ? `?user_id=${userId}` : "";
    return this.http.get<UserSession[]>(`/api/sessions/${query}`);
  }
}
