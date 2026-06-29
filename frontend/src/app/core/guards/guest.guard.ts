import { CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";

import { AuthStateService } from "../services/auth-state.service";

export const guestGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.currentUser) {
    return true;
  }

  return router.createUrlTree(["/"]);
};
