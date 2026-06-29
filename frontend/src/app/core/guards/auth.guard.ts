import { CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";

import { AuthStateService } from "../services/auth-state.service";

export const authGuard: CanActivateFn = (_route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.currentUser) {
    return true;
  }

  return router.createUrlTree(["/login"], {
    queryParams: { redirect: state.url },
  });
};
