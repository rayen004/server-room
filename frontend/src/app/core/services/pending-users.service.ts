import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject, EMPTY, Observable, Subject, catchError, interval, of, startWith, switchMap, takeUntil, tap } from "rxjs";

import { PendingUser } from "../models/auth.models";
import { AuthApiService } from "./auth-api.service";

const PENDING_USERS_POLL_MS = 8000;

@Injectable({ providedIn: "root" })
export class PendingUsersService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly pendingCountState = new BehaviorSubject<number>(0);
  private pollingStarted = false;

  readonly pendingCount$ = this.pendingCountState.asObservable();

  constructor(private readonly authApi: AuthApiService) {}

  startPolling(): void {
    if (this.pollingStarted) {
      return;
    }

    this.pollingStarted = true;

    interval(PENDING_USERS_POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.prepareAdminSession()),
        switchMap(() => this.authApi.getPendingUsers()),
        tap((users) => this.pendingCountState.next(users.length)),
        catchError((error) => {
          console.error("pending users badge error", error);
          this.pendingCountState.next(0);
          return EMPTY;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  refresh(): void {
    this.prepareAdminSession()
      .pipe(
        switchMap(() => this.authApi.getPendingUsers()),
        tap((users) => this.pendingCountState.next(users.length)),
        catchError((error) => {
          console.error("pending users badge refresh error", error);
          return of([] as PendingUser[]);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  setCount(count: number): void {
    this.pendingCountState.next(count);
  }

  clear(): void {
    this.pendingCountState.next(0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private prepareAdminSession(): Observable<unknown> {
    if (!this.authApi.isLocalTestAdmin()) {
      return of(true);
    }

    return this.authApi.upgradeLocalAdminSession();
  }
}
