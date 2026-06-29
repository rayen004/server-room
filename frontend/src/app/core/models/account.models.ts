export interface ActiveUser {
  id: number;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "approved" | "pending" | "rejected";
}

export interface AccountUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected";
  is_protected_admin: boolean;
}
