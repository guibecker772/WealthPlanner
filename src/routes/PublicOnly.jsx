// src/routes/PublicOnly.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx"; // ajuste o caminho se necessário

export default function PublicOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-accent font-display text-xl animate-pulse">
        Carregando...
      </div>
    );
  }

  // Se já estiver logado, não faz sentido acessar /login
  if (user) return <Navigate to="/dashboard/overview" replace />;

  return children;
}
