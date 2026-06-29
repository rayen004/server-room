import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Subject, forkJoin, of, timer } from "rxjs";
import { catchError, switchMap, takeUntil } from "rxjs/operators";

import { ActiveUser } from "../../../core/models/account.models";
import { TaskItem, TaskPriority, TaskStatus } from "../../../core/models/task.models";
import { AccountsApiService } from "../../../core/services/accounts-api.service";
import { AuthStateService } from "../../../core/services/auth-state.service";
import { TasksApiService } from "../../../core/services/tasks-api.service";
import { AppShellComponent } from "../../../shared/components/app-shell.component";

type UserTone = "blue" | "green" | "purple" | "orange";

interface TaskDraft {
  title: string;
  description: string;
  userId: number | null;
  priority: TaskPriority;
  dueDate: string;
}

interface BoardColumn {
  status: TaskStatus;
  accentClass: string;
  badgeClass: string;
}

@Component({
  selector: "app-tasks-page",
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent],
  template: `
    <app-shell
      [user]="authState.currentUser"
      eyebrow="Operations"
      title="Task Management"
      subtitle="Assign and track live user tasks"
      (logout)="logout()"
    >
      <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div class="glass-panel p-5">
          <div class="flex flex-wrap items-center gap-3">
            <div
              class="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200"
            >
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.85)]"></span>
              Live
            </div>
            <p class="text-sm text-app-muted">
              {{ isAdmin ? 'Admin view with full task assignment access.' : 'Showing only tasks assigned to your username.' }}
            </p>
          </div>

          <div
            *ngIf="errorMessage"
            class="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {{ errorMessage }}
          </div>

          <div class="mt-5 grid gap-4 lg:grid-cols-3">
            <label class="block">
              <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-app-muted">User</span>
              <div
                class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition duration-200 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
              >
                <span class="text-cyan-300">U</span>
                <select
                  class="w-full bg-transparent text-sm text-white outline-none"
                  [(ngModel)]="userFilter"
                  (ngModelChange)="handleUserFilterChange()"
                >
                  <option class="bg-slate-950 text-white" value="all">All users</option>
                  <option
                    *ngFor="let user of filterableUsers"
                    class="bg-slate-950 text-white"
                    [value]="user.id"
                  >
                    {{ user.username }}
                  </option>
                </select>
              </div>
            </label>

            <label class="block">
              <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-app-muted">Status</span>
              <div
                class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition duration-200 focus-within:border-emerald-400/50 focus-within:shadow-[0_0_0_4px_rgba(52,211,153,0.12)]"
              >
                <span class="text-emerald-300">S</span>
                <select
                  class="w-full bg-transparent text-sm text-white outline-none"
                  [(ngModel)]="statusFilter"
                >
                  <option class="bg-slate-950 text-white" value="all">All statuses</option>
                  <option
                    *ngFor="let column of columns"
                    class="bg-slate-950 text-white"
                    [value]="column.status"
                  >
                    {{ column.status }}
                  </option>
                </select>
              </div>
            </label>

            <label class="block">
              <span class="mb-2 block text-xs uppercase tracking-[0.22em] text-app-muted">Search</span>
              <div
                class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition duration-200 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
              >
                <span class="text-cyan-300">?</span>
                <input
                  class="w-full bg-transparent text-sm text-white outline-none placeholder:text-app-muted"
                  type="text"
                  [(ngModel)]="searchTerm"
                  placeholder="Search tasks, usernames, priorities..."
                />
              </div>
            </label>
          </div>
        </div>

        <button
          *ngIf="isAdmin"
          class="rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(45,212,191,0.25)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(45,212,191,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          [disabled]="loading || !allUsers.length"
          (click)="openNewTaskModal()"
        >
          + New Task
        </button>
      </section>

      <section *ngIf="loading" class="glass-panel p-8 text-center text-sm text-app-muted">
        Loading users and tasks...
      </section>

      <section *ngIf="!loading" class="glass-panel p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Daily Operations</p>
            <h2 class="mt-2 text-2xl font-semibold text-white">Today's Tasks</h2>
            <p class="mt-2 text-sm text-app-muted">
              {{
                isAdmin && selectedUserName
                  ? "Viewing today's checklist progress for " + selectedUserName + "."
                  : "Shared server room checklist refreshed each day for the whole team."
              }}
            </p>
          </div>
          <span class="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            {{ visibleTodayTasks.length }} items
          </span>
        </div>

        <div class="mt-5 grid gap-3 lg:grid-cols-2">
          <label
            *ngFor="let task of visibleTodayTasks"
            class="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition duration-300 hover:border-white/15"
          >
            <input
              class="mt-1 h-5 w-5 rounded border-white/20 bg-slate-950 text-emerald-400"
              type="checkbox"
              [checked]="task.is_completed"
              [disabled]="isAdmin"
              (change)="toggleTodayTask(task, $any($event.target).checked)"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3
                  class="text-sm font-semibold"
                  [ngClass]="task.is_completed ? 'text-app-muted line-through' : 'text-white'"
                >
                  {{ task.title }}
                </h3>
                <span
                  class="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  [ngClass]="priorityClass(task.priority)"
                >
                  {{ task.priority }}
                </span>
              </div>
              <p
                class="mt-2 text-sm leading-6"
                [ngClass]="task.is_completed ? 'text-app-muted line-through' : 'text-app-muted'"
              >
                {{ task.description }}
              </p>
            </div>
          </label>

          <div
            *ngIf="!visibleTodayTasks.length"
            class="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-app-muted lg:col-span-2"
          >
            No daily tasks available for today.
          </div>
        </div>
      </section>

      <section *ngIf="!loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          *ngFor="let user of visibleUsers"
          class="glass-panel p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.45)]"
        >
          <div class="flex items-start justify-between gap-3">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold"
              [ngClass]="avatarClass(userTone(user.id))"
            >
              {{ userInitial(user.username) }}
            </div>
            <span
              class="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
              [ngClass]="tagClass(userTone(user.id))"
            >
              {{ userTag(user) }}
            </span>
          </div>

          <h3 class="mt-5 text-lg font-semibold text-white">{{ user.username }}</h3>
          <p class="mt-1 text-xs uppercase tracking-[0.18em] text-app-muted">{{ user.role }}</p>
          <p class="mt-3 text-sm text-app-muted">
            {{ assignedTaskCount(user.id) }} tasks assigned
          </p>
        </article>

        <article
          *ngIf="!visibleUsers.length"
          class="glass-panel p-6 text-center text-sm text-app-muted md:col-span-2 xl:col-span-4"
        >
          No approved users are available for task assignment right now.
        </article>
      </section>

      <section *ngIf="!loading" class="grid gap-5 xl:grid-cols-3">
        <article
          *ngFor="let column of columns"
          class="glass-panel flex min-h-[30rem] flex-col p-5"
          [class.ring-1]="dragOverStatus === column.status"
          [class.ring-cyan-300/40]="dragOverStatus === column.status"
          (dragover)="handleColumnDragOver($event, column.status)"
          (dragleave)="handleColumnDragLeave(column.status)"
          (drop)="handleDrop($event, column.status)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span
                class="h-3 w-3 rounded-full"
                [ngClass]="column.accentClass"
              ></span>
              <div>
                <h3 class="text-lg font-semibold text-white">{{ column.status }}</h3>
                <p class="mt-1 text-xs uppercase tracking-[0.2em] text-app-muted">Task column</p>
              </div>
            </div>

            <span
              class="rounded-full border px-3 py-1 text-xs font-semibold text-white"
              [ngClass]="column.badgeClass"
            >
              {{ tasksForStatus(column.status).length }}
            </span>
          </div>

          <div class="mt-5 flex-1 space-y-4">
            <div
              *ngFor="let task of tasksForStatus(column.status)"
              class="rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.3)] transition duration-300 hover:-translate-y-0.5 hover:border-white/15"
              [class.opacity-80]="draggedTaskId === task.id"
              [draggable]="canMutateTask(task)"
              (dragstart)="handleDragStart(task.id)"
              (dragend)="handleDragEnd()"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h4 class="text-base font-semibold text-white">{{ task.title }}</h4>
                  <p class="mt-2 text-sm leading-6 text-app-muted">{{ task.description }}</p>
                </div>
                <span
                  class="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  [ngClass]="priorityClass(task.priority)"
                >
                  {{ task.priority }}
                </span>
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                  [ngClass]="tagClass(userTone(task.user_id ?? 0))"
                >
                  {{ task.user ? userTag(task.user) : 'UNASSIGNED' }}
                </span>
                <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-app-muted">
                  {{ task.user?.username ?? 'Unassigned' }}
                </span>
                <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-app-muted">
                  Due {{ formatDueDate(task.due_date) }}
                </span>
              </div>
            </div>

            <div
              *ngIf="!tasksForStatus(column.status).length"
              class="flex h-full min-h-40 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-app-muted"
            >
              No tasks in {{ column.status.toLowerCase() }} for the current filter set.
            </div>
          </div>
        </article>
      </section>
    </app-shell>

    <div
      *ngIf="showTaskModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm"
      (click)="closeTaskModal()"
    >
      <div
        class="glass-panel w-full max-w-2xl rounded-[2rem] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.7)]"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.28em] text-emerald-300/75">Task Assignment</p>
            <h2 class="mt-2 text-2xl font-semibold text-white">Create new task</h2>
            <p class="mt-2 text-sm text-app-muted">Assign work to a live approved user and place it directly on the board.</p>
          </div>

          <button
            class="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-app-muted transition hover:text-white"
            type="button"
            (click)="closeTaskModal()"
          >
            X
          </button>
        </div>

        <form class="mt-6 grid gap-5 md:grid-cols-2" (ngSubmit)="createTask()">
          <label class="block md:col-span-2">
            <span class="mb-2 block text-sm font-medium text-white">Task title</span>
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-cyan-400/50 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]">
              <input
                class="w-full bg-transparent text-white outline-none placeholder:text-app-muted"
                type="text"
                [(ngModel)]="taskDraft.title"
                name="title"
                placeholder="Prepare weekly cooling report"
              />
            </div>
          </label>

          <label class="block md:col-span-2">
            <span class="mb-2 block text-sm font-medium text-white">Description</span>
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-cyan-400/50 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]">
              <textarea
                class="min-h-28 w-full resize-none bg-transparent text-white outline-none placeholder:text-app-muted"
                [(ngModel)]="taskDraft.description"
                name="description"
                placeholder="Add a concise description for the assigned user."
              ></textarea>
            </div>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-white">Assign to user</span>
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-emerald-400/50 focus-within:shadow-[0_0_0_4px_rgba(52,211,153,0.12)]">
              <select
                class="w-full bg-transparent text-white outline-none"
                [(ngModel)]="taskDraft.userId"
                name="userId"
              >
                <option
                  *ngFor="let user of allUsers"
                  class="bg-slate-950 text-white"
                  [ngValue]="user.id"
                >
                  {{ user.username }}
                </option>
              </select>
            </div>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-white">Priority</span>
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-emerald-400/50 focus-within:shadow-[0_0_0_4px_rgba(52,211,153,0.12)]">
              <select
                class="w-full bg-transparent text-white outline-none"
                [(ngModel)]="taskDraft.priority"
                name="priority"
              >
                <option class="bg-slate-950 text-white" value="Low">Low</option>
                <option class="bg-slate-950 text-white" value="Medium">Medium</option>
                <option class="bg-slate-950 text-white" value="High">High</option>
              </select>
            </div>
          </label>

          <label class="block md:col-span-2">
            <span class="mb-2 block text-sm font-medium text-white">Due date</span>
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-cyan-400/50 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]">
              <input
                class="w-full bg-transparent text-white outline-none"
                type="date"
                [(ngModel)]="taskDraft.dueDate"
                name="dueDate"
              />
            </div>
          </label>

          <div
            *ngIf="taskFormError"
            class="md:col-span-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {{ taskFormError }}
          </div>

          <div class="md:col-span-2 flex justify-end">
            <button
              class="rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(45,212,191,0.25)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(45,212,191,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              [disabled]="submittingTask"
            >
              {{ submittingTask ? "Assigning..." : "Assign Task" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TasksPageComponent implements OnInit, OnDestroy {
  readonly columns: BoardColumn[] = [
    {
      status: "To Do",
      accentClass: "bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.7)]",
      badgeClass: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
    },
    {
      status: "In Progress",
      accentClass: "bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.7)]",
      badgeClass: "border-amber-300/30 bg-amber-400/10 text-amber-200",
    },
    {
      status: "Completed",
      accentClass: "bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.7)]",
      badgeClass: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
    },
  ];

  allUsers: ActiveUser[] = [];
  tasks: TaskItem[] = [];
  todayTasks: TaskItem[] = [];
  userFilter = "all";
  statusFilter: TaskStatus | "all" = "all";
  searchTerm = "";
  showTaskModal = false;
  loading = true;
  submittingTask = false;
  taskFormError = "";
  errorMessage = "";
  draggedTaskId: number | null = null;
  dragOverStatus: TaskStatus | null = null;
  private readonly destroy$ = new Subject<void>();

  taskDraft: TaskDraft = this.createDefaultDraft();

  constructor(
    public readonly authState: AuthStateService,
    private readonly accountsApi: AccountsApiService,
    private readonly tasksApi: TasksApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    timer(0, 5000)
      .pipe(
        switchMap(() =>
          forkJoin({
            users: this.accountsApi.fetchActiveUsers(),
            tasks: this.tasksApi.fetchTasks(this.requestedTaskUserId),
            todayTasks: this.tasksApi.fetchTodayTasks(this.requestedTodayUserId).pipe(catchError(() => of([]))),
          }),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ users, tasks, todayTasks }) => {
          this.allUsers = users;
          this.tasks = tasks;
          this.todayTasks = todayTasks;
          this.loading = false;
          this.errorMessage = "";
          this.ensureValidUserFilter();
          this.ensureDraftUser();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = "Unable to load live users or tasks.";
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isAdmin(): boolean {
    return Boolean(this.authState.currentUser?.is_admin);
  }

  get visibleUsers(): ActiveUser[] {
    if (this.isAdmin && this.userFilter === "all") {
      return this.allUsers;
    }

    const selectedUserId = this.selectedUserId;
    if (selectedUserId !== null) {
      return this.allUsers.filter((user) => user.id === selectedUserId);
    }

    return this.allUsers.filter((user) => user.id === this.currentUserId);
  }

  get filterableUsers(): ActiveUser[] {
    if (this.isAdmin) {
      return this.allUsers;
    }

    return this.visibleUsers;
  }

  get visibleTasks(): TaskItem[] {
    return this.tasks.filter((task) => {
      const matchesUser = this.userFilter === "all" || String(task.user_id) === this.userFilter;
      const matchesStatus = this.statusFilter === "all" || task.status === this.statusFilter;
      const searchValue = [
        task.title,
        task.description,
        task.priority,
        task.status,
        task.user?.username ?? "",
        task.user?.email ?? "",
        task.user ? this.userTag(task.user) : "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !this.searchTerm.trim() || searchValue.includes(this.searchTerm.trim().toLowerCase());

      return matchesUser && matchesStatus && matchesSearch;
    });
  }

  get visibleTodayTasks(): TaskItem[] {
    return this.todayTasks.filter((task) => {
      const searchValue = [task.title, task.description, task.date]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !this.searchTerm.trim() || searchValue.includes(this.searchTerm.trim().toLowerCase());

      return matchesSearch;
    });
  }

  assignedTaskCount(userId: number): number {
    return this.tasks.filter((task) => task.user_id === userId).length;
  }

  tasksForStatus(status: TaskStatus): TaskItem[] {
    return this.visibleTasks.filter((task) => task.status === status);
  }

  openNewTaskModal(): void {
    this.taskFormError = "";
    this.taskDraft = this.createDefaultDraft();
    this.showTaskModal = true;
  }

  closeTaskModal(): void {
    this.showTaskModal = false;
    this.taskFormError = "";
    this.submittingTask = false;
  }

  handleUserFilterChange(): void {
    this.ensureValidUserFilter();
    this.refreshAssignedTasks();
    this.refreshTodayTasks();
  }

  createTask(): void {
    if (!this.isAdmin || this.submittingTask) {
      return;
    }

    if (
      !this.taskDraft.title.trim() ||
      !this.taskDraft.description.trim() ||
      !this.taskDraft.userId ||
      !this.taskDraft.dueDate
    ) {
      this.taskFormError = "Please complete all fields before assigning the task.";
      return;
    }

    this.submittingTask = true;
    this.taskFormError = "";

    this.tasksApi
      .createTask({
        title: this.taskDraft.title.trim(),
        description: this.taskDraft.description.trim(),
        user_id: this.taskDraft.userId,
        priority: this.taskDraft.priority,
        due_date: this.taskDraft.dueDate,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (task) => {
          this.tasks = [task, ...this.tasks];
          this.closeTaskModal();
        },
        error: () => {
          this.submittingTask = false;
          this.taskFormError = "Unable to assign this task right now.";
        },
      });
  }

  handleDragStart(taskId: number): void {
    this.draggedTaskId = taskId;
  }

  handleDragEnd(): void {
    this.draggedTaskId = null;
    this.dragOverStatus = null;
  }

  handleColumnDragOver(event: DragEvent, status: TaskStatus): void {
    event.preventDefault();
    if (this.draggedTaskId !== null && this.canMutateTaskById(this.draggedTaskId)) {
      this.dragOverStatus = status;
    }
  }

  handleColumnDragLeave(status: TaskStatus): void {
    if (this.dragOverStatus === status) {
      this.dragOverStatus = null;
    }
  }

  handleDrop(event: DragEvent, status: TaskStatus): void {
    event.preventDefault();

    if (this.draggedTaskId === null) {
      return;
    }

    const task = this.tasks.find((item) => item.id === this.draggedTaskId);
    if (!task || !this.canMutateTask(task) || task.status === status) {
      this.handleDragEnd();
      return;
    }

    this.tasksApi
      .updateTask({ id: task.id, status })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTask) => {
          this.syncTask(updatedTask);
          this.errorMessage = "";
          this.handleDragEnd();
        },
        error: () => {
          this.errorMessage = "Unable to update task status right now.";
          this.handleDragEnd();
        },
      });
  }

  toggleTodayTask(task: TaskItem, checked: boolean): void {
    if (this.isAdmin) {
      return;
    }

    if (task.is_completed === checked) {
      return;
    }

    const previousTask = { ...task };
    const optimisticTask: TaskItem = {
      ...task,
      is_completed: checked,
      status: checked ? "Completed" : "To Do",
    };
    this.syncTask(optimisticTask);

    this.tasksApi
      .completeTask(task.id, checked)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTask) => {
          this.syncTask(updatedTask);
          this.errorMessage = "";
        },
        error: (error) => {
          console.error("Failed to update today's task", {
            taskId: task.id,
            isCompleted: checked,
            error,
          });
          this.syncTask(previousTask);
          this.errorMessage = "Unable to update today's task right now.";
        },
      });
  }

  userInitial(username: string): string {
    return username.trim().charAt(0).toUpperCase() || "U";
  }

  userTag(user: Pick<ActiveUser, "id" | "username">): string {
    const normalized = user.username.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "USER";
    return `${normalized}-${user.id}`;
  }

  userTone(userId: number): UserTone {
    return (["blue", "green", "purple", "orange"] as const)[userId % 4];
  }

  avatarClass(tone: UserTone): string {
    return {
      blue: "bg-cyan-400/15 text-cyan-200",
      green: "bg-emerald-400/15 text-emerald-200",
      purple: "bg-fuchsia-400/15 text-fuchsia-200",
      orange: "bg-orange-400/15 text-orange-200",
    }[tone];
  }

  tagClass(tone: UserTone): string {
    return {
      blue: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
      green: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
      purple: "border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-200",
      orange: "border-orange-300/30 bg-orange-400/10 text-orange-200",
    }[tone];
  }

  priorityClass(priority: TaskPriority): string {
    return {
      Low: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
      Medium: "border-amber-300/30 bg-amber-400/10 text-amber-200",
      High: "border-red-300/30 bg-red-400/10 text-red-200",
    }[priority];
  }

  formatDueDate(value: string): string {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  }

  logout(): void {
    this.authState.logout().subscribe({
      complete: () => {
        void this.router.navigateByUrl("/login");
      },
    });
  }

  canMutateTask(task: TaskItem): boolean {
    return task.is_daily || this.isAdmin || task.user_id === this.currentUserId;
  }

  private canMutateTaskById(taskId: number): boolean {
    const task = this.tasks.find((item) => item.id === taskId);
    return Boolean(task && this.canMutateTask(task));
  }

  private ensureValidUserFilter(): void {
    if (this.userFilter === "all") {
      return;
    }

    const exists = this.filterableUsers.some((user) => String(user.id) === this.userFilter);
    if (!exists) {
      this.userFilter = "all";
    }
  }

  private ensureDraftUser(): void {
    if (this.taskDraft.userId && this.allUsers.some((user) => user.id === this.taskDraft.userId)) {
      return;
    }

    this.taskDraft.userId = this.allUsers[0]?.id ?? null;
  }

  private createDefaultDraft(): TaskDraft {
    return {
      title: "",
      description: "",
      userId: this.allUsers[0]?.id ?? null,
      priority: "Medium",
      dueDate: new Date().toISOString().slice(0, 10),
    };
  }

  private get currentUserId(): number | null {
    const value = Number(this.authState.currentUser?.id);
    return Number.isFinite(value) ? value : null;
  }

  private get selectedUserId(): number | null {
    if (this.userFilter === "all") {
      return null;
    }

    const value = Number(this.userFilter);
    return Number.isFinite(value) ? value : null;
  }

  get selectedUserName(): string | null {
    const selectedUserId = this.selectedUserId;
    if (selectedUserId === null) {
      return null;
    }

    return this.allUsers.find((user) => user.id === selectedUserId)?.username ?? null;
  }

  private get requestedTaskUserId(): number | undefined {
    if (!this.isAdmin) {
      return undefined;
    }

    return this.selectedUserId ?? undefined;
  }

  private get requestedTodayUserId(): number | undefined {
    if (!this.isAdmin) {
      return undefined;
    }

    return this.selectedUserId ?? undefined;
  }

  private syncTask(updatedTask: TaskItem): void {
    if (updatedTask.is_daily) {
      this.todayTasks = this.todayTasks.map((item) => (item.id === updatedTask.id ? updatedTask : item));
      return;
    }

    this.tasks = this.tasks.map((item) => (item.id === updatedTask.id ? updatedTask : item));
  }

  private refreshAssignedTasks(): void {
    this.tasksApi
      .fetchTasks(this.requestedTaskUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.tasks = tasks;
          this.errorMessage = "";
        },
        error: () => {
          this.errorMessage = "Unable to load filtered tasks right now.";
        },
      });
  }

  private refreshTodayTasks(): void {
    this.tasksApi
      .fetchTodayTasks(this.requestedTodayUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.todayTasks = tasks;
          this.errorMessage = "";
        },
        error: () => {
          this.errorMessage = "Unable to load today's tasks right now.";
        },
      });
  }
}
