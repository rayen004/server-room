import { Routes } from "@angular/router";

import { adminGuard } from "./core/guards/admin.guard";
import { authGuard } from "./core/guards/auth.guard";
import { guestGuard } from "./core/guards/guest.guard";

export const appRoutes: Routes = [
  {
    path: "login",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/pages/login-page.component").then(
        (module) => module.LoginPageComponent,
      ),
  },
  {
    path: "signup",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/pages/signup-page.component").then(
        (module) => module.SignupPageComponent,
      ),
  },
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/dashboard/pages/dashboard-page.component").then(
        (module) => module.DashboardPageComponent,
      ),
  },
  {
    path: "logs",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/logs/pages/logs-page.component").then(
        (module) => module.LogsPageComponent,
      ),
  },
  {
    path: "tasks",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/tasks/pages/tasks-page.component").then(
        (module) => module.TasksPageComponent,
      ),
  },
  {
    path: "settings",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/settings/pages/settings-page.component").then(
        (module) => module.SettingsPageComponent,
      ),
  },
  {
    path: "accounts",
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import("./features/accounts/pages/accounts-page.component").then(
        (module) => module.AccountsPageComponent,
      ),
  },
  {
    path: "access-control",
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import("./features/approvals/pages/approvals-page.component").then(
        (module) => module.ApprovalsPageComponent,
      ),
  },
  {
    path: "users",
    pathMatch: "full",
    redirectTo: "access-control",
  },
  {
    path: "**",
    redirectTo: "",
  },
];
