import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Link2, Loader2 } from "lucide-react";

import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import { useAuth } from "../../auth/AuthContext.jsx";
import { db } from "../../services/firebase.js";
import { listSimulations } from "../../services/simulationsRepo.js";

const DEFAULT_ADVISOR_BASE_URL = "http://localhost:5173";

function normalizeBaseUrl(rawUrl) {
  const safeRaw = String(rawUrl || DEFAULT_ADVISOR_BASE_URL).trim();
  return safeRaw.endsWith("/") ? safeRaw.slice(0, -1) : safeRaw;
}

function getAdvisorControlBaseUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_ADVISOR_CONTROL_BASE_URL);
}

function formatUpdatedAt(value) {
  if (!value) return "Sem atualizacao";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem atualizacao";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PrivateWealthLinkPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const linkKey = searchParams.get("linkKey") || "";
  const advisorBaseUrl = useMemo(() => getAdvisorControlBaseUrl(), []);

  useEffect(() => {
    if (!user?.uid || !linkKey) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadClients = async () => {
      try {
        setLoading(true);
        setError("");
        const simulations = await listSimulations(db, user.uid);

        if (cancelled) return;

        setClients(simulations);
        if (simulations.length > 0) {
          setSelectedClientId(simulations[0].id);
        }
      } catch (loadError) {
        console.error("Erro ao carregar clientes no Private Wealth:", loadError);
        if (!cancelled) {
          setError("Nao foi possivel carregar os clientes disponiveis.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadClients();

    return () => {
      cancelled = true;
    };
  }, [linkKey, user?.uid]);

  const handleConfirmLink = () => {
    if (!linkKey || !selectedClientId) return;

    setSubmitting(true);
    const callbackUrl = `${advisorBaseUrl}/integrations/pw/callback?linkKey=${encodeURIComponent(linkKey)}&pwClientId=${encodeURIComponent(selectedClientId)}`;
    window.location.assign(callbackUrl);
  };

  if (!linkKey) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center px-6">
        <Card className="w-full max-w-xl" elevated>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-text">Vincular cliente</h1>
            <p className="text-sm text-text-muted">
              O link de vinculacao esta ausente. Volte ao Advisor Control e tente novamente.
            </p>
            <Button
              variant="secondary"
              onClick={() => window.location.assign(advisorBaseUrl)}
            >
              <ArrowLeft size={16} />
              Voltar ao Advisor Control
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-xl" elevated>
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <Link2 size={20} className="text-accent" />
              Vincular cliente
            </h1>
            <p className="text-sm text-text-muted">
              Selecione o cliente no Private Wealth para concluir o vinculo com o Advisor Control.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              Carregando clientes...
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium text-text-muted" htmlFor="pw-client-select">
                Cliente no Private Wealth
              </label>
              <select
                id="pw-client-select"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="w-full rounded-xl px-4 py-3 bg-surface-1 border border-border text-text focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
                disabled={clients.length === 0}
              >
                {clients.length === 0 && <option value="">Nenhum cliente disponivel</option>}
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({formatUpdatedAt(client.updatedAt)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={handleConfirmLink}
              disabled={loading || submitting || !selectedClientId}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Vinculando...
                </>
              ) : (
                "Vincular e abrir planejamento"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.assign(advisorBaseUrl)}
            >
              <ArrowLeft size={16} />
              Voltar ao Advisor Control
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
