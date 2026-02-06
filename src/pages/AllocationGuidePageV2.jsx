// src/pages/AllocationGuidePageV2.jsx
// ========================================
// Guia de Alocação - Versão Step-by-Step
// Fluxo de 3 etapas com Toggle Simples/Avançado
// ========================================
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
  PieChart,
  Info,
  Settings2,
  Download,
  Printer,
  FileText,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  AllocationGuideStepper,
  AllocationModeToggle,
  Step1Portfolio,
  Step2Objective,
  Step3Recommendation,
  AdvancedPanels,
} from "../components/allocation";
import {
  createDefaultAllocationGuide,
  validateBreakdownSum,
  buildCurrentAllocationFromAssets,
  ASSET_CLASSES,
  optimizeAllocation,
} from "../utils/allocationMath";
import {
  generateAllocationGuideCSV,
  downloadCSV,
  printAllocationGuide,
} from "../utils/exportAllocationGuide";
import { useAuth } from "../auth/AuthContext";

// -----------------------------------------
// Key for mode persistence
// -----------------------------------------
const STORAGE_ALLOC_MODE_BASE = "planner_alloc_guide_mode_v1";

function keyForUser(baseKey, uid) {
  return uid ? `${baseKey}__${uid}` : `${baseKey}__anon`;
}

// Helper: normaliza valor em % (string/number) para decimal
// Ex: "4,5" ou 4.5 → 0.045
function normalizePctToDecimal(value, defaultPct = 5) {
  if (value === null || value === undefined || value === '') {
    return defaultPct / 100;
  }
  const str = String(value).replace(',', '.');
  const parsed = parseFloat(str);
  if (!Number.isFinite(parsed)) {
    return defaultPct / 100;
  }
  return parsed / 100;
}

// -----------------------------------------
// Componente Principal
// -----------------------------------------
export default function AllocationGuidePageV2() {
  const ctx = useOutletContext() || {};
  const { clientData, updateField, readOnly } = ctx;
  const { user } = useAuth();
  const uid = user?.uid;

  // Garantir que allocationGuide existe
  const allocationGuide = useMemo(() => {
    if (clientData?.allocationGuide) {
      return clientData.allocationGuide;
    }
    return createDefaultAllocationGuide(clientData);
  }, [clientData]);

  // ScenarioFx para conversão de moedas
  const scenarioFx = useMemo(
    () => ({
      USD_BRL: Number(clientData?.fx?.USD_BRL) || 5.0,
      EUR_BRL: Number(clientData?.fx?.EUR_BRL) || 5.5,
    }),
    [clientData?.fx]
  );

  // Calcular alocação atual baseada nos ativos do patrimônio
  const currentAllocation = useMemo(() => {
    const assets = clientData?.assets || [];
    if (assets.length === 0) {
      return { totalBRL: 0, byClassPercent: {}, byClassValueBRL: {}, diagnostics: [] };
    }
    return buildCurrentAllocationFromAssets(assets, scenarioFx, { includePrevidencia: true });
  }, [clientData?.assets, scenarioFx]);

  // -----------------------------------------
  // Wizard state
  // -----------------------------------------
  // activeStep usa 1-indexed: 1 = Carteira, 2 = Objetivo, 3 = Sugestão
  const [activeStep, setActiveStep] = useState(1);

  // Mode: 'simple' ou 'advanced'
  const [mode, setMode] = useState(() => {
    const key = keyForUser(STORAGE_ALLOC_MODE_BASE, uid);
    const stored = localStorage.getItem(key);
    return stored === "advanced" ? "advanced" : "simple";
  });

  // Persist mode
  useEffect(() => {
    const key = keyForUser(STORAGE_ALLOC_MODE_BASE, uid);
    localStorage.setItem(key, mode);
  }, [mode, uid]);

  // Modal export confirm
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [pendingExportAction, setPendingExportAction] = useState(null);

  // Função para atualizar allocationGuide
  const updateAllocationGuide = useCallback(
    (newGuide) => {
      if (typeof updateField === "function") {
        updateField("allocationGuide", newGuide);
      }
    },
    [updateField]
  );

  // -----------------------------------------
  // Sincronização da inflação do clientData para allocationGuide.assumptions
  // -----------------------------------------
  useEffect(() => {
    if (readOnly) return;
    if (!allocationGuide) return;

    const nextInflationAnnual = normalizePctToDecimal(clientData?.inflation, 5);
    const currentInflationAnnual = allocationGuide.assumptions?.inflationAnnual ?? 0.05;

    // Só atualizar se diferença significativa (evitar loop infinito)
    if (Math.abs(nextInflationAnnual - currentInflationAnnual) > 1e-6) {
      const updatedGuide = {
        ...allocationGuide,
        assumptions: {
          ...allocationGuide.assumptions,
          inflationAnnual: nextInflationAnnual,
        },
      };
      updateAllocationGuide(updatedGuide);
    }
  }, [clientData?.inflation, allocationGuide?.assumptions?.inflationAnnual, readOnly]);

  // -----------------------------------------
  // Step completeness checks
  // -----------------------------------------
  const isStep1Complete = useMemo(() => {
    const portfolios = allocationGuide.portfolios || [];
    if (portfolios.length === 0) return false;
    const selected =
      portfolios.find((p) => p.id === allocationGuide.selectedPortfolioId) || portfolios[0];
    if (!selected?.breakdown) return false;
    const validation = validateBreakdownSum(selected.breakdown);
    return validation.valid;
  }, [allocationGuide]);

  const isStep2Complete = useMemo(() => {
    const objective = allocationGuide.objective;
    if (!objective) return false;
    const hasMode = objective.mode === "targetReturn" || objective.mode === "targetRisk";
    const hasProfile = ["conservador", "moderado", "arrojado"].includes(objective.profile);
    return hasMode && hasProfile;
  }, [allocationGuide]);

  // -----------------------------------------
  // Calcular recomendação (para auto-advance e validação)
  // -----------------------------------------
  const optimizationResult = useMemo(() => {
    if (!isStep1Complete || !isStep2Complete) return null;
    try {
      const objective = allocationGuide.objective || {};
      const assumptions = allocationGuide.assumptions || {};
      const profile = objective.profile || "moderado";
      return optimizeAllocation(objective, assumptions, profile);
    } catch (err) {
      console.warn("[AllocationGuideV2] Erro ao calcular otimização:", err);
      return null;
    }
  }, [isStep1Complete, isStep2Complete, allocationGuide.objective, allocationGuide.assumptions]);

  // Verificar se temos recomendação válida
  const hasValidRecommendation = useMemo(() => {
    return optimizationResult?.recommended != null;
  }, [optimizationResult]);

  // Ref para suprimir auto-advance após navegação manual
  const manualNavRef = useRef(false);

  // Auto-navigate to first incomplete step on mount (apenas uma vez)
  useEffect(() => {
    if (!isStep1Complete) {
      setActiveStep(1);
    } else if (!isStep2Complete) {
      setActiveStep(2);
    } else if (hasValidRecommendation) {
      setActiveStep(3);
    } else {
      setActiveStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-advance: quando step 2 está completo e há recomendação válida
  // Só avança se o usuário não navegou manualmente no ciclo anterior
  useEffect(() => {
    // Se houve navegação manual, apenas resetar a flag e não auto-avançar
    if (manualNavRef.current) {
      manualNavRef.current = false;
      return;
    }
    // Auto-advance apenas se estiver no step 2 com tudo completo
    if (activeStep === 2 && isStep1Complete && isStep2Complete && hasValidRecommendation) {
      setActiveStep(3);
    }
  }, [activeStep, isStep1Complete, isStep2Complete, hasValidRecommendation]);

  // Auto-regressão: voltar para step anterior se o atual ficar inválido
  useEffect(() => {
    // Se step 1 não está completo mas estamos em step > 1, voltar para 1
    if (!isStep1Complete && activeStep > 1) {
      setActiveStep(1);
      return;
    }
    // Se step 2 não está completo mas estamos no step 3, voltar para 2
    if (isStep1Complete && !isStep2Complete && activeStep === 3) {
      setActiveStep(2);
    }
  }, [isStep1Complete, isStep2Complete, activeStep]);

  // -----------------------------------------
  // Export handlers
  // -----------------------------------------
  const hasInvalidBreakdowns = useMemo(() => {
    if (!allocationGuide.portfolios?.length) return false;
    return allocationGuide.portfolios.some((p) => {
      const validation = validateBreakdownSum(p.breakdown || {});
      return !validation.valid;
    });
  }, [allocationGuide.portfolios]);

  const doExportCSV = useCallback(() => {
    if (!allocationGuide.portfolios?.length) return;
    const csvContent = generateAllocationGuideCSV({
      portfolios: allocationGuide.portfolios,
      assumptions: allocationGuide.assumptions,
      scenarioFx,
      scenarioName: clientData?.name || "Cenário",
    });
    const filename = `guia-alocacao-${(clientData?.name || "cenario")
      .replace(/\s+/g, "-")
      .toLowerCase()}.csv`;
    downloadCSV(csvContent, filename);
  }, [allocationGuide, scenarioFx, clientData?.name]);

  const doPrint = useCallback(() => {
    printAllocationGuide({
      portfolios: allocationGuide.portfolios || [],
      assumptions: allocationGuide.assumptions,
      scenarioFx,
      scenarioName: clientData?.name || "Cenário",
      currentAllocation,
    });
  }, [allocationGuide, scenarioFx, clientData?.name, currentAllocation]);

  const handleExportCSV = useCallback(() => {
    if (!allocationGuide.portfolios?.length) return;
    if (hasInvalidBreakdowns) {
      setPendingExportAction("csv");
      setShowExportConfirm(true);
      return;
    }
    doExportCSV();
  }, [allocationGuide.portfolios, hasInvalidBreakdowns, doExportCSV]);

  const handlePrint = useCallback(() => {
    if (hasInvalidBreakdowns) {
      setPendingExportAction("print");
      setShowExportConfirm(true);
      return;
    }
    doPrint();
  }, [hasInvalidBreakdowns, doPrint]);

  const handleConfirmExport = useCallback(() => {
    if (pendingExportAction === "csv") {
      doExportCSV();
    } else if (pendingExportAction === "print") {
      doPrint();
    }
    setShowExportConfirm(false);
    setPendingExportAction(null);
  }, [pendingExportAction, doExportCSV, doPrint]);

  const handleCancelExport = useCallback(() => {
    setShowExportConfirm(false);
    setPendingExportAction(null);
  }, []);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (activeStep < 3) {
      manualNavRef.current = true;
      setActiveStep((s) => s + 1);
    }
  }, [activeStep]);

  const handleBack = useCallback(() => {
    if (activeStep > 1) {
      manualNavRef.current = true;
      setActiveStep((s) => s - 1);
    }
  }, [activeStep]);

  // Handler para clique direto nos steps do stepper
  const handleStepClick = useCallback((stepNum) => {
    // Validar se o step é acessível
    if (stepNum === 1) {
      manualNavRef.current = true;
      setActiveStep(1);
      return;
    }
    if (stepNum === 2 && isStep1Complete) {
      manualNavRef.current = true;
      setActiveStep(2);
      return;
    }
    if (stepNum === 3 && isStep1Complete && isStep2Complete) {
      manualNavRef.current = true;
      setActiveStep(3);
    }
  }, [isStep1Complete, isStep2Complete]);

  // Verificar contexto
  if (!clientData || typeof updateField !== "function") {
    return (
      <div className="p-6 rounded-2xl border border-border bg-surface/40 text-text-secondary">
        Dados do cenário indisponíveis no momento.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Modal de confirmação de export */}
      {showExportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={24} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Breakdown Incompleto
                </h3>
                <p className="text-sm text-text-secondary">
                  Uma ou mais carteiras têm breakdown que não soma 100%. Deseja exportar mesmo
                  assim?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={handleCancelExport}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmExport}>
                Exportar assim mesmo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-3">
            <PieChart className="text-accent" size={28} />
            Guia de Alocação
          </h1>
          <p className="text-text-secondary mt-1">
            Ferramenta educacional para análise de risco e retorno da carteira
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode toggle */}
          <AllocationModeToggle mode={mode} onChange={setMode} disabled={readOnly} />

          {/* Export buttons (only in advanced mode) */}
          {mode === "advanced" && allocationGuide.portfolios?.length > 0 && (
            <>
              <Button
                onClick={handleExportCSV}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Button
                onClick={handlePrint}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
            </>
          )}

          {/* Info badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <Info size={16} className="text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">
              Análise independente das projeções
            </span>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <AllocationGuideStepper
        activeStep={activeStep}
        step1Complete={isStep1Complete}
        step2Complete={isStep2Complete}
        onStepClick={handleStepClick}
        readOnly={readOnly}
      />

      {/* Content based on active step */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area (2/3 on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {activeStep === 1 && (
            <Step1Portfolio
              allocationGuide={allocationGuide}
              updateAllocationGuide={updateAllocationGuide}
              currentAllocation={currentAllocation}
              clientData={clientData}
              readOnly={readOnly}
              mode={mode}
            />
          )}

          {activeStep === 2 && (
            <Step2Objective
              allocationGuide={allocationGuide}
              updateAllocationGuide={updateAllocationGuide}
              readOnly={readOnly}
              mode={mode}
              recommendationFailed={isStep1Complete && isStep2Complete && !hasValidRecommendation}
              recommendationMessage={optimizationResult?.message}
            />
          )}

          {activeStep === 3 && (
            <Step3Recommendation
              allocationGuide={allocationGuide}
              updateAllocationGuide={updateAllocationGuide}
              readOnly={readOnly}
              mode={mode}
              optimizationResult={optimizationResult}
              hasValidRecommendation={hasValidRecommendation}
            />
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="sm"
              disabled={activeStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              Voltar
            </Button>

            {activeStep < 3 && (
              <Button
                onClick={handleNext}
                variant="primary"
                size="sm"
                disabled={
                  (activeStep === 1 && !isStep1Complete) ||
                  (activeStep === 2 && !isStep2Complete)
                }
                className="flex items-center gap-2"
              >
                Continuar
                <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar: Advanced panels (1/3 on desktop) */}
        {mode === "advanced" && (
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
              <Settings2 size={16} />
              <span className="font-medium">Painéis Avançados</span>
            </div>
            <AdvancedPanels
              allocationGuide={allocationGuide}
              updateAllocationGuide={updateAllocationGuide}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>
    </div>
  );
}
