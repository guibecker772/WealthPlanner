import React, { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import { useAuth } from "../../auth/AuthContext.jsx";

const STORAGE_ACTIVE_SIM_BASE = "planner_active_sim_id_v1";

function keyForUser(baseKey, uid) {
  return uid ? `${baseKey}__${uid}` : `${baseKey}__anon`;
}

function safeRedirectPath(pathValue) {
  if (!pathValue || typeof pathValue !== "string") return "/dashboard/overview";
  const trimmed = pathValue.trim();
  const lowered = trimmed.toLowerCase();
  if (!trimmed.startsWith("/")) return "/dashboard/overview";
  if (trimmed.startsWith("//")) return "/dashboard/overview";
  if (lowered.startsWith("http://") || lowered.startsWith("https://") || lowered.startsWith("javascript:")) {
    return "/dashboard/overview";
  }
  if (trimmed.includes("\\") || trimmed.includes("\r") || trimmed.includes("\n")) {
    return "/dashboard/overview";
  }
  return trimmed;
}

export default function PrivateWealthOpenPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  const clientId = searchParams.get("clientId") || "";
  const redirectPath = useMemo(() => safeRedirectPath(searchParams.get("redirect") || "/dashboard/overview"), [searchParams]);

  useEffect(() => {
    if (loading || !user || !clientId) return;

    const storageKey = keyForUser(STORAGE_ACTIVE_SIM_BASE, user.uid);
    localStorage.setItem(storageKey, clientId);
    window.location.replace(redirectPath);
  }, [clientId, loading, redirectPath, user]);

  if (!clientId) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center px-6">
        <Card className="w-full max-w-xl" elevated>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning" />
              Cliente invalido
            </h1>
            <p className="text-sm text-text-muted">
              Nao foi possivel identificar o cliente para abrir o planejamento.
            </p>
            <Button variant="secondary" onClick={() => window.location.assign("/dashboard/overview")}>
              <ArrowLeft size={16} />
              Voltar ao overview
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center px-6">
      <Card className="w-full max-w-xl" elevated>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-text">Abrindo planejamento</h1>
          <p className="text-sm text-text-muted">
            Aguarde enquanto carregamos o cliente selecionado.
          </p>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            Redirecionando...
          </div>
        </div>
      </Card>
    </div>
  );
}
