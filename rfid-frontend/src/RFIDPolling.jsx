import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAuthState, setAuthenticated } from "./ProtectedRoute.jsx";

const API_BASE_URL = "http://192.168.22.46:8000/api";

export default function RFIDPolling() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastHandledScanRef = useRef("");

  useEffect(() => {
    console.log("[ROUTE] Current path:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    console.log("[RFID GLOBAL POLL] Starting /api/last-scan/ polling every 1 second");

    const pollLastScan = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/last-scan/`);
        const data = await response.json();
        console.log("[RFID GLOBAL POLL] Response:", response.status, data);

        if (!response.ok) {
          console.warn("[RFID GLOBAL POLL] Backend returned non-OK response");
          return;
        }

        const scanKey = `${data.uid || ""}-${data.status || ""}-${data.role || ""}-${data.door || ""}`;
        if (!data.uid || data.status === "idle" || scanKey === lastHandledScanRef.current) {
          return;
        }

        lastHandledScanRef.current = scanKey;

        if (data.status === "logged_out") {
          console.log("[RFID LOGOUT] logged_out detected:", data);
          clearAuthState();
          console.log("[RFID LOGOUT] Forcing hard redirect to /");
          window.location.href = "/";
          return;
        }

        if (data.status === "authorized" && data.door === "open") {
          setAuthenticated(data.role);

          if (data.role === "admin") {
            console.log("[RFID REDIRECT] Admin authorized. Navigating to /admin-dashboard");
            navigate("/admin-dashboard", { replace: true });
            return;
          }

          if (data.role === "user") {
            console.log("[RFID REDIRECT] User authorized. Navigating to /user-dashboard");
            navigate("/user-dashboard", { replace: true });
            return;
          }
        }

        if (data.status === "denied") {
          console.log("[RFID REDIRECT] Access denied. Navigating to /access-denied");
          clearAuthState();
          navigate("/access-denied", { replace: true });
        }
      } catch (error) {
        console.error("[RFID GLOBAL POLL] Error while polling last scan:", error);
      }
    };

    pollLastScan();
    const intervalId = window.setInterval(pollLastScan, 1000);

    return () => {
      console.log("[RFID GLOBAL POLL] Stopping polling interval");
      window.clearInterval(intervalId);
    };
  }, [navigate]);

  return null;
}
