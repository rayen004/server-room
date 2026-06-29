import { CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";
import { catchError, map, of } from "rxjs";

import { AuthStateService } from "../services/auth-state.service";
import { AccountsApiService } from "../services/accounts-api.service";

export const adminGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const accountsApi = inject(AccountsApiService);

  if (authState.currentUser?.is_admin) {
    return true;
  }

  return accountsApi.getRecoveryStatus().pipe(
    map((response) => (response.recovery_mode ? true : router.createUrlTree(["/"]))),
    catchError(() => of(router.createUrlTree(["/"]))),
  );
};
