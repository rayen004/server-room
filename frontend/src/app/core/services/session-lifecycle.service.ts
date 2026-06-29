import { Injectable } from "@angular/core";

import { AuthApiService } from "./auth-api.service";

@Injectable({ providedIn: "root" })
export class SessionLifecycleService {
  private initialized = false;

  constructor(private readonly authApi: AuthApiService) {}

  initialize(): void {
    if (this.initialized || typeof window === "undefined") {
      return;
    }

    this.initialized = true;
    window.addEventListener("beforeunload", () => {
      this.authApi.closeSessionOnUnload();
    });
  }
}
