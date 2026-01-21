// src/pages/ScenariosPage.jsx
import React from "react";
import { useOutletContext } from "react-router-dom";
import { GitBranch, Info } from "lucide-react";
import ContributionTimelineCard from "../components/scenarios/ContributionTimelineCard";
import CashInEventsCard from "../components/scenarios/CashInEventsCard";
import TrackingCard from "../components/scenarios/TrackingCard";

export default function ScenariosPage() {
  const ctx = useOutletContext() || {};
  const {
    clientData,
    updateField,
    readOnly,
    scenarioId,
    trackingByScenario,
    setTrackingByScenario,
  } = ctx;

  if (!clientData || typeof updateField !== "function") {
    return (
      <div className="p-6 rounded-2xl border border-border bg-surface/40 text-text-secondary">
        Dados do cenário indisponíveis no momento.
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-text-primary tracking-wide flex items-center gap-2">
            <GitBranch size={24} className="text-accent" />
            Construção de Cenários
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Modele eventos futuros (aportes temporários, heranças, resgates) e acompanhe mês a mês o que aconteceu na prática.
          </p>
        </div>
      </div>

      <div className="bg-accent-subtle/50 border border-accent/20 p-4 rounded-xl flex gap-3 items-start text-sm text-text-secondary">
        <Info size={20} className="text-accent shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <b>Nota:</b> As alterações de “Simulação” impactam o gráfico e KPIs do Dashboard.
          O “Acompanhamento” permite comparar <b>Plano vs Real</b> por cenário.
        </p>
      </div>

      {/* SIMULAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ContributionTimelineCard clientData={clientData} updateField={updateField} readOnly={readOnly} />
        <CashInEventsCard clientData={clientData} updateField={updateField} readOnly={readOnly} />
      </div>

      {/* ACOMPANHAMENTO */}
      <TrackingCard
        scenarioId={scenarioId}
        clientData={clientData}
        trackingByScenario={trackingByScenario}
        setTrackingByScenario={setTrackingByScenario}
        readOnly={readOnly}
      />
    </div>
  );
}
