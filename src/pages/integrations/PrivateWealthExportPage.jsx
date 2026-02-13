import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import { useAuth } from "../../auth/AuthContext.jsx";

const STORAGE_ACTIVE_SIM_BASE = "planner_active_sim_id_v1";

function keyForUser(baseKey, uid) {
  return uid ? `${baseKey}__${uid}` : `${baseKey}__anon`;
}

function normalizeTemplate(template) {
  return template === "premium" ? "premium" : "premium";
}

export default function PrivateWealthExportPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  const clientId = searchParams.get("clientId") || "";
  const template = normalizeTemplate(searchParams.get("template") || "premium");

  useEffect(() => {
    if (loading || !user || !clientId) return;

    const storageKey = keyForUser(STORAGE_ACTIVE_SIM_BASE, user.uid);
    localStorage.setItem(storageKey, clientId);
    window.location.replace(`/dashboard/overview?openExport=1&template=${encodeURIComponent(template)}`);
  }, [clientId, loading, template, user]);

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
              Nao foi possivel identificar o cliente para abrir o export premium.
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
          <h1 className="text-2xl font-bold text-text">Abrindo export premium</h1>
          <p className="text-sm text-text-muted">
            Aguarde enquanto abrimos o builder de relatorio premium.
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
