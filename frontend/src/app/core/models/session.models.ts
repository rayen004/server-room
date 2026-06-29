export interface UserSession {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  login_time: string;
  logout_time: string | null;
  duration: string;
  duration_seconds: number;
  status: "ACTIVE" | "CLOSED";
}
