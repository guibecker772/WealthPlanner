// src/routes/PublicOnly.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

function toSafePath(value) {
  if (!value || typeof value !== "string") return "/dashboard/overview";
  if (!value.startsWith("/")) return "/dashboard/overview";
  return value;
}

export default function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-accent font-display text-xl animate-pulse">
        Carregando...
      </div>
    );
  }

  const stateFrom = typeof location.state?.from === "string" ? location.state.from : null;
  const returnToParam = new URLSearchParams(location.search).get("returnTo");
  const redirectTarget = toSafePath(stateFrom || returnToParam);

  if (user) return <Navigate to={redirectTarget} replace />;

  return children;
}
