import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSimulationsSync } from "../hooks/useSimulationsSync";

import SettingsPage from "./SettingsPage";
import DashboardPage from "./DashboardPage";
// import SuccessionPage from "./SuccessionPage"; // se tiver

import FinancialEngine from "../engine/FinancialEngine";

function deepClone(obj) {
  if (obj == null) return obj;
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}

export default function PlannerContainer({ defaultClientData, viewMode, aiEnabled }) {
  const {
    activeSimulation,
    isDirty,
    saveActiveSimulation,
    markDirty,
  } = useSimulationsSync(defaultClientData);

  const [draft, setDraft] = useState(() => deepClone(activeSimulation?.data || defaultClientData));

  // quando troca de cenário, carrega o draft daquele cenário
  useEffect(() => {
    const next = deepClone(activeSimulation?.data || defaultClientData);
    setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSimulation?.id]);

  const handleUpdate = useCallback((field, value) => {
    setDraft((prev) => {
      const next = { ...(prev || {}) };
      next[field] = value;
      return next;
    });
    markDirty();
  }, [markDirty]);

  // KPIs sempre calculados no motor (isso alimenta SettingsPage PDF, etc.)
  const engineOutput = useMemo(() => {
    try {
      return FinancialEngine.run(draft || {}, false);
    } catch {
      return { kpis: {}, series: [], succession: null };
    }
  }, [draft]);

  const onSave = useCallback(() => {
    saveActiveSimulation(draft);
  }, [saveActiveSimulation, draft]);

  return (
    <div className="space-y-6">
      {/* Aqui você usa seu Sidebar/Seletor de simulações */}
      {/* Exemplo de uso: */}
      {/* <SimulationsSidebar ... /> */}

      <SettingsPage
        clientData={draft}
        kpis={engineOutput.kpis}
        handleUpdate={handleUpdate}
        readOnly={false}
        aiEnabled={aiEnabled}
        toggleAi={() => {}}
      />

      <DashboardPage
        clientData={draft}
        analysis={null}
        isStressTest={false}
        viewMode={viewMode}
        aiEnabled={aiEnabled}
      />

      {/* Se houver página de sucessão separada, garanta que ela calcule com draft */}
      {/* <SuccessionPage clientData={draft} /> */}

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5"
          onClick={onSave}
          disabled={!isDirty}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
