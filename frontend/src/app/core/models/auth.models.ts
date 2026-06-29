export interface AuthUser {
  id: number | string;
  name: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  status: "pending" | "approved" | "rejected";
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  id: number;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  message: string;
}

export interface PendingUser {
  id: number;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
}

export interface AuthResponse {
  access?: string;
  refresh?: string;
  session_id?: number;
  user: AuthUser;
  isLocalAdminFallback?: boolean;
}

export interface RFIDLogEvent {
  id: number;
  uid: string;
  role: "admin" | "user" | "";
  status: "authorized" | "denied";
  timestamp: string;
}

export interface RFIDSessionResponse extends AuthResponse {
  status: "authorized";
  role: "admin" | "user";
  redirect: string;
  openDoor: boolean;
}
