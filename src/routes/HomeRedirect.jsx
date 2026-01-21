// src/routes/HomeRedirect.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-accent font-display text-xl animate-pulse">
        Carregando...
      </div>
    );
  }

  return user ? <Navigate to="/dashboard/overview" replace /> : <Navigate to="/login" replace />;
}
