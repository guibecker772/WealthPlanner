// src/components/scenarios/ContributionTimelineCard.jsx
import React from "react";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import { Card, Button, InputField } from "../../components";
import { formatCurrencyBR } from "../../utils/format";

export default function ContributionTimelineCard({
  clientData,
  updateField,
  readOnly,
}) {
  const timeline = clientData.contributionTimeline || [];
  const baseContribution = clientData.monthlyContribution || 0;
  const currentAge = clientData.currentAge || 35;
  const endAge = clientData.contributionEndAge || 60;

  const addRange = (type = "manual") => {
    const lastEndAge =
      timeline.length > 0
        ? Math.max(...timeline.map((t) => t.endAge || 0))
        : currentAge;

    const start = Math.min(endAge - 1, lastEndAge);

    const isFinancing = type === "financing_event";
    const suggestedValue = isFinancing
      ? Math.max(0, Number(baseContribution || 0) - 2000)
      : Number(baseContribution || 0);

    const newRange = {
      id: Date.now().toString(),
      name: isFinancing ? "Pagamento de Financiamento" : "Novo Período",
      monthlyValue: suggestedValue,
      startAge: start,
      endAge: Math.min(endAge, start + 5),
      enabled: true,
      type,
    };

    updateField("contributionTimeline", [...timeline, newRange]);
  };

  const updateRange = (id, key, val) => {
    updateField(
      "contributionTimeline",
      timeline.map((t) => (t.id === id ? { ...t, [key]: val } : t))
    );
  };

  const removeRange = (id) => {
    updateField(
      "contributionTimeline",
      timeline.filter((t) => t.id !== id)
    );
  };

  const sortedTimeline = [...timeline].sort(
    (a, b) => (a.startAge || 0) - (b.startAge || 0)
  );

  return (
    <Card
      title="Linha do Tempo de Aportes & Resgates"
      action={
        !readOnly && (
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => addRange("manual")}
          >
            Adicionar Período
          </Button>
        )
      }
    >
      {!readOnly && timeline.length === 0 && (
        <div className="mb-6 bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/30 flex items-start gap-4">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold mb-1">
              Simular Impacto de Grandes Compras
            </h4>
            <p className="text-sm text-slate-300 mb-3 leading-relaxed">
              Vai financiar um imóvel ou carro? Isso geralmente reduz sua capacidade
              de aporte mensal por alguns anos.
            </p>
            <button
              onClick={() => addRange("financing_event")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              Simular Financiamento/Consórcio (Reduzir Aporte)
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
        {sortedTimeline.length === 0 ? (
          <div className="p-5 rounded-xl bg-navy-900/50 border border-white/10 text-slate-400 text-sm italic text-center">
            Atualmente, o sistema projeta apenas o aporte base de{" "}
            <b>{formatCurrencyBR(baseContribution)}/mês</b> dos {currentAge} aos{" "}
            {endAge} anos.
          </div>
        ) : (
          sortedTimeline.map((range) => {
            const monthly = Number(range.monthlyValue || 0);
            const isNegative = monthly < 0;
            const isFinancing = range.type === "financing_event";

            const containerClasses = isFinancing
              ? "border-indigo-500/30 bg-indigo-900/20"
              : isNegative
              ? "border-rose-500/30 bg-rose-900/20"
              : "border-white/10 hover:border-gold-500/30 bg-navy-900/30";

            const iconClasses = isNegative
              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
              : monthly < baseContribution
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

            return (
              <div
                key={range.id}
                className={`group border p-4 rounded-xl transition-all backdrop-blur-sm flex flex-col md:flex-row gap-5 items-start ${containerClasses}`}
              >
                <div className={`p-3 rounded-xl border shadow-sm shrink-0 ${iconClasses}`}>
                  {isNegative ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 w-full items-start">
                  <div className="md:col-span-5">
                    <InputField
                      value={range.name}
                      onChange={(v) => updateRange(range.id, "name", v)}
                      readOnly={readOnly}
                      placeholder="Nome do período"
                      inputClassName="font-bold text-base bg-transparent border-none px-0 py-0 h-auto focus:ring-0 placeholder:text-slate-600"
                      className=""
                    />

                    <div className="mt-2 flex flex-wrap gap-2">
                      {isFinancing && (
                        <span className="text-[10px] uppercase font-bold text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded">
                          Financiamento / 
                          Consórcio
                        </span>
                      )}

                      {isNegative ? (
                        <span className="text-[10px] uppercase font-bold text-rose-300 bg-rose-500/20 px-2 py-1 rounded">
                          Resgate/Custo
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded">
                          Aporte Temporário
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <InputField
                      label={isNegative ? "Valor do Resgate (-)" : "Aporte Temporário Mensal (+)"}
                      value={range.monthlyValue}
                      onChange={(v) => updateRange(range.id, "monthlyValue", v)}
                      readOnly={readOnly}
                      type="currency"
                      inputClassName={isNegative ? "text-rose-300" : "text-emerald-300"}
                    />

                    {!readOnly && (
                      <button
                        onClick={() =>
                          updateRange(
                            range.id,
                            "monthlyValue",
                            (Number(range.monthlyValue || 0) || 0) * -1
                          )
                        }
                        className={`mt-2 w-full text-[10px] font-bold uppercase px-2 py-1.5 rounded text-white transition-all border ${
                          isNegative
                            ? "bg-rose-600 border-rose-500 hover:bg-rose-500"
                            : "bg-emerald-600 border-emerald-500 hover:bg-emerald-500"
                        }`}
                      >
                        {isNegative ? "Virar Aporte (+)" : "Virar Resgate (-)"}
                      </button>
                    )}
                  </div>

                  <div className="md:col-span-4 flex items-end gap-2">
                    <div className="flex-1 min-w-[110px]">
                      <InputField
                        label="Dos"
                        value={range.startAge}
                        onChange={(v) => updateRange(range.id, "startAge", v)}
                        readOnly={readOnly}
                        type="number"
                        suffix="anos"
                        inputClassName="text-center"
                      />
                    </div>

                    <ArrowRight size={16} className="text-slate-500 mb-4 shrink-0" />

                    <div className="flex-1 min-w-[110px]">
                      <InputField
                        label="Até os"
                        value={range.endAge}
                        onChange={(v) => updateRange(range.id, "endAge", v)}
                        readOnly={readOnly}
                        type="number"
                        suffix="anos"
                        inputClassName="text-center"
                      />
                    </div>
                  </div>
                </div>

                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRange(range.id)}
                    className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all self-center shrink-0"
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
