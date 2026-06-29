import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { CreateTaskPayload, TaskItem, UpdateTaskPayload } from "../models/task.models";

@Injectable({ providedIn: "root" })
export class TasksApiService {
  constructor(private readonly http: HttpClient) {}

  fetchTasks(userId?: number): Observable<TaskItem[]> {
    const params = userId ? new HttpParams().set("user_id", String(userId)) : undefined;
    return this.http.get<TaskItem[]>("/api/tasks/", { params });
  }

  fetchTodayTasks(userId?: number): Observable<TaskItem[]> {
    const params = userId ? new HttpParams().set("user_id", String(userId)) : undefined;
    return this.http.get<TaskItem[]>("/api/tasks/today/", { params });
  }

  createTask(payload: CreateTaskPayload): Observable<TaskItem> {
    return this.http.post<TaskItem>("/api/tasks/", payload);
  }

  updateTask(payload: UpdateTaskPayload): Observable<TaskItem> {
    return this.http.patch<TaskItem>("/api/tasks/", payload);
  }

  completeTask(taskId: number, isCompleted: boolean): Observable<TaskItem> {
    return this.http.post<TaskItem>(`/api/tasks/${taskId}/complete/`, {
      is_completed: isCompleted,
    });
  }
}
