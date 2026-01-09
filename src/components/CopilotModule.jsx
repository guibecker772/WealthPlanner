import React from "react";
import Card from "./Card";
import useSmartCopilot from "../hooks/useSmartCopilot";

export default function CopilotModule({ clientData, kpis, isStressTest, aiEnabled }) {
  const { loading, error, result, generateDiagnosis } = useSmartCopilot({ aiEnabled });

  const handleClick = () => {
    generateDiagnosis({ clientData, kpis, isStressTest });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-extrabold text-slate-900">Smart Copilot</div>
        <div className={`text-xs font-bold px-2 py-1 rounded-full ${aiEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {aiEnabled ? "AI ON" : "AI OFF"}
        </div>
      </div>

      <div className="mt-3 text-sm text-slate-600">
        Gere um diagnóstico com base nos KPIs do plano.
      </div>

      <button
        onClick={handleClick}
        disabled={!aiEnabled || loading}
        className={`mt-4 w-full px-4 py-3 rounded-xl font-extrabold transition ${
          !aiEnabled || loading
            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        {loading ? "Gerando..." : "Gerar Diagnóstico"}
      </button>

      {error && (
        <div className="mt-3 text-sm font-semibold text-rose-600 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap">
          {result}
        </div>
      )}

      {!aiEnabled && (
        <div className="mt-3 text-xs text-slate-500">
          Ative a IA em <b>Ajustes</b> para habilitar o Copilot.
        </div>
      )}
    </Card>
  );
}
