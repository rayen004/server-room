export type TaskStatus = "To Do" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export interface TaskUser {
  id: number;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "approved" | "pending" | "rejected";
}

export interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  is_daily: boolean;
  date: string;
  is_completed: boolean;
  due_date: string;
  created_at: string;
  updated_at: string;
  assigned_to?: number | null;
  user_id: number | null;
  user: TaskUser | null;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date: string;
  user_id: number;
}

export interface UpdateTaskPayload {
  id: number;
  status?: TaskStatus;
  is_completed?: boolean;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
  user_id?: number;
}
