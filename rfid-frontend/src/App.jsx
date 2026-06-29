import React from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RFIDPolling from "./RFIDPolling.jsx";

function RFIDLogin() {
  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="Primary">
        <Link to="/">RFID Auth</Link>
        <Link to="/admin-dashboard">Admin</Link>
        <Link to="/user-dashboard">User</Link>
      </nav>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">RFID Login</p>
          <h1>Scan your card</h1>
          <p>Waiting for RFID scan...</p>
        </div>
        <div className="scanner">
          <span />
        </div>
      </section>
    </main>
  );
}

function Dashboard({ role }) {
  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="Primary">
        <Link to="/">RFID Auth</Link>
        <Link to="/admin-dashboard">Admin</Link>
        <Link to="/user-dashboard">User</Link>
      </nav>

      <section className="dashboard">
        <p className="eyebrow">{role} dashboard</p>
        <h1>{role === "admin" ? "Administrator Access" : "User Access"}</h1>
        <div className="dashboard-grid">
          <article className="status-card">
            <strong>RFID login successful</strong>
            <span>Redirect completed from Django last scan polling.</span>
          </article>
        </div>
      </section>
    </main>
  );
}

function AccessDeniedPage() {
  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="Primary">
        <Link to="/">RFID Auth</Link>
      </nav>

      <section className="denied">
        <p className="eyebrow">Access denied</p>
        <h1>Credential not recognized</h1>
        <p>The latest RFID scan was denied by Django.</p>
        <Link className="button-link" to="/">Back to RFID login</Link>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <>
      <RFIDPolling />
      <Routes>
        <Route path="/" element={<RFIDLogin />} />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <Dashboard role="admin" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute>
              <Dashboard role="user" />
            </ProtectedRoute>
          }
        />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
