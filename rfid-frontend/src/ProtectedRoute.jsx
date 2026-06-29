import { Navigate } from "react-router-dom";

export const AUTH_KEY = "rfid_authenticated";
export const ROLE_KEY = "rfid_role";

export function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function setAuthenticated(role) {
  localStorage.setItem(AUTH_KEY, "true");
  localStorage.setItem(ROLE_KEY, role);
  console.log("[AUTH STATE] authenticated=true role=", role);
}

export function clearAuthState() {
  console.log("[AUTH STATE] Clearing localStorage and sessionStorage");
  localStorage.clear();
  sessionStorage.clear();
}

export default function ProtectedRoute({ children }) {
  const authenticated = isAuthenticated();
  console.log("[PROTECTED ROUTE] authenticated=", authenticated);

  if (!authenticated) {
    console.log("[PROTECTED ROUTE] No auth/session. Redirecting to /");
    return <Navigate to="/" replace />;
  }

  return children;
}
