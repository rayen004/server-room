import { Component, EventEmitter, Input, Output } from "@angular/core";

import { AuthUser } from "../../core/models/auth.models";
import { SidebarComponent } from "./sidebar.component";
import { TopNavbarComponent } from "./top-navbar.component";

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [SidebarComponent, TopNavbarComponent],
  template: `
    <div class="min-h-screen p-4 md:p-6">
      <app-sidebar [user]="user" />

      <main class="space-y-6 lg:ml-[20rem]">
        <app-top-navbar
          [user]="user"
          [title]="title"
          [eyebrow]="eyebrow"
          [subtitle]="subtitle"
          (logout)="logout.emit()"
        />

        <ng-content />
      </main>
    </div>
  `,
})
export class AppShellComponent {
  @Input({ required: true }) user!: AuthUser | null;
  @Input({ required: true }) title!: string;
  @Input() eyebrow = "Infrastructure";
  @Input() subtitle = "";
  @Output() readonly logout = new EventEmitter<void>();
}
