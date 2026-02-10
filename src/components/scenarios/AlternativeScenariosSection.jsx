// src/components/scenarios/AlternativeScenariosSection.jsx
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Shield,
  Info,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Target,
} from "lucide-react";
import ApplyScenarioModal from "./ApplyScenarioModal";
import { calculateAlternativeScenarios } from "../../utils/simulationModes";
import { toNumber } from "../../utils/format";

// formatCurrencyBR moved to use formatCurrencyCompact for this component

/**
 * Formata valor em BRL compacto (sem centavos)
 */
function formatCurrencyCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "R$ 0";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Tooltip component simples
 */
function Tooltip({ children, content }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50">
          <div className="bg-surface-highlight border border-border rounded-xl p-3 text-xs text-text-secondary leading-relaxed shadow-elevated">
            {content}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5">
            <div className="w-3 h-3 bg-surface-highlight border-r border-b border-border rotate-45 -mt-1.5" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Card individual para cada modo de simulação
 */
function ScenarioModeCard({
  mode,
  label,
  description,
  tooltip,
  requiredContribution,
  requiredAge,
  currentRetirementAge,
  currentContribution,
  isShowingOnChart,
  onToggleChart,
  onApply,
}) {
  const isConsumption = mode === "consumption";
  const Icon = isConsumption ? TrendingUp : Shield;

  const contribOk = requiredContribution?.status === "ok";
  const ageOk = requiredAge?.status === "ok";
  // hasAnyResult computed but not displayed directly (used via contribOk/ageOk)
  const isImpossible = !contribOk && !ageOk;

  // Cores por modo
  const accentColor = isConsumption ? "amber" : "emerald";
  const gradientFrom = isConsumption ? "from-amber-500/10" : "from-emerald-500/10";
  const gradientTo = isConsumption ? "to-orange-500/5" : "to-teal-500/5";
  const iconBg = isConsumption ? "bg-amber-500/15" : "bg-emerald-500/15";
  const iconColor = isConsumption ? "text-amber-400" : "text-emerald-400";
  const buttonGradient = isConsumption
    ? "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
    : "from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${gradientFrom} ${gradientTo} p-5 transition-all duration-200 hover:border-${accentColor}-500/30`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon size={22} className={iconColor} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-text-primary">{label}</h4>
              <Tooltip content={tooltip}>
                <Info size={14} className="text-text-muted hover:text-text-secondary transition" />
              </Tooltip>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 max-w-[200px] leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      {isImpossible ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-danger">
                Não atingível com as premissas atuais
              </div>
              <div className="text-xs text-text-secondary mt-2 space-y-1">
                <div className="font-medium text-text-primary">Sugestões:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Aumentar a idade de aposentadoria</li>
                  <li>Aumentar o aporte mensal</li>
                  <li>Reduzir a renda desejada</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {/* Aporte necessário */}
          <div className="rounded-xl border border-border bg-surface/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-text-secondary font-medium">
                  Aporte necessário
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  para aposentar aos {currentRetirementAge} anos
                </div>
              </div>
              <div className="text-right">
                {contribOk ? (
                  <div className={`text-lg font-display font-bold ${iconColor}`}>
                    {formatCurrencyCompact(requiredContribution.requiredMonthlyContribution)}
                    <span className="text-xs text-text-secondary font-normal">/mês</span>
                  </div>
                ) : (
                  <div className="text-sm text-text-muted">—</div>
                )}
              </div>
            </div>
          </div>

          {/* Idade necessária */}
          <div className="rounded-xl border border-border bg-surface/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-text-secondary font-medium">
                  Idade necessária
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  mantendo aporte de {formatCurrencyCompact(currentContribution)}/mês
                </div>
              </div>
              <div className="text-right">
                {ageOk ? (
                  <div className={`text-lg font-display font-bold ${iconColor}`}>
                    {requiredAge.requiredRetirementAge}
                    <span className="text-xs text-text-secondary font-normal ml-1">anos</span>
                  </div>
                ) : (
                  <div className="text-sm text-text-muted">—</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApply}
          disabled={isImpossible}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2 ${
            isImpossible
              ? "bg-surface-highlight text-text-muted cursor-not-allowed"
              : `bg-gradient-to-r ${buttonGradient}`
          }`}
        >
          <Sparkles size={14} />
          Aplicar como cenário
        </button>

        <button
          onClick={onToggleChart}
          disabled={isImpossible}
          aria-label={
            isImpossible
              ? "Indisponível para este cenário/dados"
              : isShowingOnChart
              ? `Ocultar ${label} do gráfico`
              : `Ver ${label} no gráfico`
          }
          aria-pressed={!isImpossible ? isShowingOnChart : undefined}
          className={`p-2.5 rounded-xl border transition ${
            isImpossible
              ? "border-border text-text-muted cursor-not-allowed"
              : isShowingOnChart
              ? `border-${accentColor}-500/50 bg-${accentColor}-500/10 ${iconColor}`
              : "border-border text-text-secondary hover:border-accent/50 hover:text-text-primary"
          }`}
          title={
            isImpossible
              ? "Indisponível para este cenário/dados"
              : isShowingOnChart
              ? "Ocultar do gráfico"
              : "Ver no gráfico"
          }
        >
          {isShowingOnChart ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

/**
 * Seção "Cenários Alternativos" para a aba Simulação
 */
export default function AlternativeScenariosSection({
  clientData,
  onApplyScenario,
  chartVisibility = {},
  onToggleChartVisibility,
  includeImpacts = false,
  onToggleIncludeImpacts,
  // showToast - reserved for future inline notifications
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);

  // Calcula os cenários alternativos
  const scenarios = useMemo(() => {
    if (!clientData) return { consumption: null, preservation: null };
    return calculateAlternativeScenarios(clientData, { includeImpacts });
  }, [clientData, includeImpacts]);

  const desiredMonthlyIncome = toNumber(
    clientData?.monthlyCostRetirement ??
      clientData?.monthlyIncomeRetirement ??
      clientData?.desiredMonthlyIncome ??
      15000,
    15000
  );

  const handleOpenApplyModal = (mode) => {
    setSelectedMode(mode);
    setModalOpen(true);
  };

  const handleConfirmApply = (config) => {
    if (!selectedMode || !onApplyScenario) return;

    const scenario = scenarios[selectedMode];
    if (!scenario) return;

    // Determina os valores a aplicar
    // Prioriza aporte necessário se disponível, senão usa idade necessária
    const contrib = scenario.requiredContribution?.requiredMonthlyContribution;
    const retAge = contrib != null
      ? scenario.currentRetirementAge
      : scenario.requiredAge?.requiredRetirementAge;

    onApplyScenario({
      mode: selectedMode,
      modeLabel: scenario.label,
      requiredContribution: contrib ?? scenario.currentContribution,
      requiredRetirementAge: retAge ?? scenario.currentRetirementAge,
      showOnChart: config.showOnChart,
      createNewScenario: config.createNewScenario,
      projectionSeries: scenario.projectionSeries,
    });

    // Ativa visualização no gráfico se checkbox marcado
    if (config.showOnChart && onToggleChartVisibility) {
      onToggleChartVisibility(selectedMode, true);
    }

    setModalOpen(false);
    setSelectedMode(null);
  };

  const handleToggleChart = (mode) => {
    if (onToggleChartVisibility) {
      const currentlyVisible = chartVisibility[mode] ?? false;
      onToggleChartVisibility(mode, !currentlyVisible);
    }
  };

  if (!scenarios.consumption && !scenarios.preservation) {
    return null;
  }

  const selectedScenario = selectedMode ? scenarios[selectedMode] : null;

  return (
    <>
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {/* Header da seção */}
        <div className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-surface-highlight/50 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/10">
                <Sparkles size={20} className="text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-text-primary">
                  Cenários Alternativos
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Compare diferentes estratégias de aposentadoria
                </p>
              </div>
            </div>
            {/* Toggle "Considerar Metas e Cenários" */}
            <div className="flex items-center gap-3">
              <Tooltip
                content={
                  includeImpacts
                    ? "ON: Os cenários consideram suas metas, aportes extras e eventos de cash-in, igual ao Plano Original."
                    : "OFF: Os cenários usam projeção simplificada, sem metas nem eventos extras."
                }
              >
                <button
                  onClick={onToggleIncludeImpacts}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 ${
                    includeImpacts
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-border bg-surface-highlight/50 text-text-secondary hover:border-border/80"
                  }`}
                >
                  <Target size={14} className={includeImpacts ? "text-accent" : "text-text-muted"} />
                  <span className="text-xs font-medium whitespace-nowrap">
                    Metas e Cenários
                  </span>
                  {includeImpacts ? (
                    <ToggleRight size={18} className="text-accent" />
                  ) : (
                    <ToggleLeft size={18} className="text-text-muted" />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Cards dos modos */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {scenarios.consumption && (
              <ScenarioModeCard
                mode="consumption"
                label={scenarios.consumption.label}
                description={scenarios.consumption.description}
                tooltip={scenarios.consumption.tooltip}
                requiredContribution={scenarios.consumption.requiredContribution}
                requiredAge={scenarios.consumption.requiredAge}
                currentRetirementAge={scenarios.consumption.currentRetirementAge}
                currentContribution={scenarios.consumption.currentContribution}
                isShowingOnChart={chartVisibility.consumption ?? false}
                onToggleChart={() => handleToggleChart("consumption")}
                onApply={() => handleOpenApplyModal("consumption")}
              />
            )}

            {scenarios.preservation && (
              <ScenarioModeCard
                mode="preservation"
                label={scenarios.preservation.label}
                description={scenarios.preservation.description}
                tooltip={scenarios.preservation.tooltip}
                requiredContribution={scenarios.preservation.requiredContribution}
                requiredAge={scenarios.preservation.requiredAge}
                currentRetirementAge={scenarios.preservation.currentRetirementAge}
                currentContribution={scenarios.preservation.currentContribution}
                isShowingOnChart={chartVisibility.preservation ?? false}
                onToggleChart={() => handleToggleChart("preservation")}
                onApply={() => handleOpenApplyModal("preservation")}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de aplicação */}
      <ApplyScenarioModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedMode(null);
        }}
        onConfirm={handleConfirmApply}
        mode={selectedMode}
        modeLabel={selectedScenario?.label ?? ""}
        requiredContribution={
          selectedScenario?.requiredContribution?.requiredMonthlyContribution ??
          selectedScenario?.currentContribution
        }
        requiredRetirementAge={
          selectedScenario?.requiredContribution?.status === "ok"
            ? selectedScenario?.currentRetirementAge
            : selectedScenario?.requiredAge?.requiredRetirementAge
        }
        desiredMonthlyIncome={desiredMonthlyIncome}
      />
    </>
  );
}

/**
 * Hook para gerenciar as séries extras do gráfico (cenários alternativos)
 */
export function useAlternativeScenariosSeries(clientData, chartVisibility, includeImpacts = false) {
  const scenarios = useMemo(() => {
    if (!clientData) return { consumption: null, preservation: null };
    return calculateAlternativeScenarios(clientData, { includeImpacts });
  }, [clientData, includeImpacts]);

  const extraSeries = useMemo(() => {
    const series = [];

    // PR5: Always include available series — visibility controlled upstream via visibleSeriesIds
    if (scenarios.consumption?.projectionSeries?.series) {
      series.push({
        key: "wealthConsumption",
        name: "Consumo Total",
        data: scenarios.consumption.projectionSeries.series,
        color: "#f59e0b", // amber-500
        strokeDasharray: "5 5",
      });
    }

    if (scenarios.preservation?.projectionSeries?.series) {
      series.push({
        key: "wealthPreservation",
        name: "Preservação",
        data: scenarios.preservation.projectionSeries.series,
        color: "#10b981", // emerald-500
        strokeDasharray: "8 4",
      });
    }

    return series;
  }, [scenarios]);

  return { scenarios, extraSeries };
}
