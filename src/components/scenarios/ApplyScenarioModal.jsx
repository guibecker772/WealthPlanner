// src/components/scenarios/ApplyScenarioModal.jsx
import React, { useState } from "react";
import { X, Check, TrendingUp, Shield, AlertCircle } from "lucide-react";

/**
 * Formata valor em BRL
 */
function formatCurrencyBR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Modal premium para confirmar aplicação de cenário planejado
 */
export default function ApplyScenarioModal({
  isOpen,
  onClose,
  onConfirm,
  mode,
  modeLabel,
  requiredContribution,
  requiredRetirementAge,
  desiredMonthlyIncome,
  // currentScenarioName - reserved for future use
}) {
  const [showOnChart, setShowOnChart] = useState(true);
  const [createNewScenario, setCreateNewScenario] = useState(false);

  if (!isOpen) return null;

  const isConsumption = mode === "consumption";
  const Icon = isConsumption ? TrendingUp : Shield;

  const handleConfirm = () => {
    onConfirm({
      showOnChart,
      createNewScenario,
      mode,
      requiredContribution,
      requiredRetirementAge,
    });
    onClose();
  };

  const scenarioName = isConsumption
    ? "Carteira Planejada (Consumo Total)"
    : "Carteira Planejada (Preservação)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header com gradiente */}
        <div className={`relative px-6 py-5 border-b border-border/50 ${
          isConsumption
            ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10"
            : "bg-gradient-to-r from-emerald-500/10 to-teal-500/10"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                isConsumption
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}>
                <Icon size={22} />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-text-primary">
                  Aplicar Cenário Planejado
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {modeLabel}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-surface-highlight text-text-secondary hover:text-text-primary transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Resumo em destaque */}
          <div className="rounded-2xl border border-border bg-surface-highlight/30 p-4 space-y-3">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Resumo do Cenário
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-text-secondary">Modo</div>
                <div className="text-sm font-bold text-text-primary mt-0.5 flex items-center gap-1.5">
                  <Icon size={14} className={isConsumption ? "text-amber-400" : "text-emerald-400"} />
                  {isConsumption ? "Consumo Total" : "Preservação"}
                </div>
              </div>

              <div>
                <div className="text-xs text-text-secondary">Aporte Recomendado</div>
                <div className="text-sm font-bold text-accent mt-0.5">
                  {requiredContribution != null
                    ? `${formatCurrencyBR(requiredContribution)}/mês`
                    : "—"}
                </div>
              </div>

              <div>
                <div className="text-xs text-text-secondary">Idade de Aposentadoria</div>
                <div className="text-sm font-bold text-text-primary mt-0.5">
                  {requiredRetirementAge != null ? `${requiredRetirementAge} anos` : "—"}
                </div>
              </div>

              {desiredMonthlyIncome > 0 && (
                <div>
                  <div className="text-xs text-text-secondary">Renda Desejada</div>
                  <div className="text-sm font-bold text-text-primary mt-0.5">
                    {formatCurrencyBR(desiredMonthlyIncome)}/mês
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cenário que será criado/atualizado */}
          <div className="rounded-xl border border-border bg-background-secondary/30 p-3 flex items-center gap-3">
            <AlertCircle size={16} className="text-text-secondary flex-shrink-0" />
            <div className="text-xs text-text-secondary leading-relaxed">
              Será criado ou atualizado o cenário:{" "}
              <span className="font-bold text-text-primary">{scenarioName}</span>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={showOnChart}
                  onChange={(e) => setShowOnChart(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                  showOnChart
                    ? "bg-accent border-accent"
                    : "border-border group-hover:border-accent/50"
                }`}>
                  {showOnChart && <Check size={14} className="text-white" />}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">
                  Também mostrar no gráfico após aplicar
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  A linha do cenário será exibida no gráfico de evolução patrimonial
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={createNewScenario}
                  onChange={(e) => setCreateNewScenario(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                  createNewScenario
                    ? "bg-accent border-accent"
                    : "border-border group-hover:border-accent/50"
                }`}>
                  {createNewScenario && <Check size={14} className="text-white" />}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">
                  Criar um novo cenário mesmo se já existir
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  Cria com sufixo incremental (ex.: "{scenarioName} 2")
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 bg-background-secondary/30 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition flex items-center gap-2 ${
              isConsumption
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            }`}
          >
            <Check size={16} />
            Confirmar e aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
