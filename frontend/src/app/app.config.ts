import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter, withInMemoryScrolling } from "@angular/router";

import { appRoutes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { AuthStateService } from "./core/services/auth-state.service";
import { SessionLifecycleService } from "./core/services/session-lifecycle.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: "top" }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      deps: [AuthStateService],
      multi: true,
      useFactory: (authState: AuthStateService) => () => authState.initializeSession(),
    },
    {
      provide: APP_INITIALIZER,
      deps: [SessionLifecycleService],
      multi: true,
      useFactory: (sessionLifecycle: SessionLifecycleService) => () => sessionLifecycle.initialize(),
    },
  ],
};
