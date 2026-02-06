// src/components/allocation/AdvancedPanels.jsx
// Painéis avançados em accordions para modo Avançado
import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Settings,
  TrendingUp,
  FileText,
  Layers,
  AlertTriangle,
  Check,
  Info,
  Trash2,
  Copy,
  Plus,
  Edit3,
  Download,
  Printer,
} from "lucide-react";

import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import {
  ASSET_CLASSES,
  ASSET_CLASS_LABELS,
  DEFAULT_ASSUMPTIONS,
  PROFILE_LIMITS,
  SOFT_CONSTRAINTS,
  validateSoftConstraints,
  calculatePortfolioDiagnostics,
  optimizeAllocation,
} from "../../utils/allocationMath";
import { formatPercent, formatCurrency } from "../../utils/format";

// Accordion genérico
function Accordion({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-surface-muted hover:bg-surface-highlight transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-accent" />}
          <span className="font-medium text-text-primary">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp size={18} className="text-text-muted" />
        ) : (
          <ChevronDown size={18} className="text-text-muted" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 border-t border-border bg-surface animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export default function AdvancedPanels({
  allocationGuide,
  updateAllocationGuide,
  readOnly = false,
}) {
  const objective = allocationGuide.objective || {};
  const assumptions = allocationGuide.assumptions || DEFAULT_ASSUMPTIONS;
  const portfolios = allocationGuide.portfolios || [];
  const selectedPortfolioId = allocationGuide.selectedPortfolioId || portfolios[0]?.id;
  const profile = objective.profile || "moderado";

  // Carteira selecionada
  const selectedPortfolio = useMemo(() => {
    return portfolios.find((p) => p.id === selectedPortfolioId) || null;
  }, [portfolios, selectedPortfolioId]);

  // Diagnóstico da carteira atual
  const currentDiagnostics = useMemo(() => {
    if (!selectedPortfolio?.breakdown) return null;
    return calculatePortfolioDiagnostics(selectedPortfolio.breakdown, assumptions);
  }, [selectedPortfolio, assumptions]);

  // Checagens de limites
  const softConstraintsResult = useMemo(() => {
    if (!selectedPortfolio?.breakdown) return null;
    return validateSoftConstraints(selectedPortfolio.breakdown, profile);
  }, [selectedPortfolio, profile]);

  // Resultado da otimização
  const optimizationResult = useMemo(() => {
    return optimizeAllocation(objective, assumptions, profile);
  }, [objective, assumptions, profile]);

  // Diagnóstico da sugestão
  const suggestedDiagnostics = useMemo(() => {
    if (!optimizationResult.recommended) return null;
    return calculatePortfolioDiagnostics(optimizationResult.recommended, assumptions);
  }, [optimizationResult, assumptions]);

  // Handlers de premissas
  const handleAssumptionChange = useCallback(
    (cls, field, value) => {
      if (readOnly) return;
      const numVal = parseFloat(value) || 0;
      const newAssumptions = {
        ...assumptions,
        [cls]: {
          ...assumptions[cls],
          [field]: numVal,
        },
      };
      updateAllocationGuide({
        ...allocationGuide,
        assumptions: newAssumptions,
      });
    },
    [readOnly, assumptions, allocationGuide, updateAllocationGuide]
  );

  const handleResetAssumptions = useCallback(() => {
    if (readOnly) return;
    updateAllocationGuide({
      ...allocationGuide,
      assumptions: DEFAULT_ASSUMPTIONS,
    });
  }, [readOnly, allocationGuide, updateAllocationGuide]);

  // Handlers de portfólios
  const handleAddPortfolio = useCallback(() => {
    if (readOnly) return;
    const newPortfolio = {
      id: `portfolio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: `Carteira ${portfolios.length + 1}`,
      totalValue: 0,
      currency: "BRL",
      breakdown: {
        rf_pos: 100,
        rf_pre: 0,
        rf_inf: 0,
        rv_br: 0,
        rv_ext: 0,
        multi: 0,
        alt: 0,
        cash: 0,
        outros: 0,
      },
      createdAt: new Date().toISOString(),
    };
    updateAllocationGuide({
      ...allocationGuide,
      portfolios: [...portfolios, newPortfolio],
      selectedPortfolioId: newPortfolio.id,
    });
  }, [readOnly, portfolios, allocationGuide, updateAllocationGuide]);

  const handleDeletePortfolio = useCallback(
    (portfolioId) => {
      if (readOnly || portfolios.length <= 1) return;
      const newPortfolios = portfolios.filter((p) => p.id !== portfolioId);
      const newSelected =
        selectedPortfolioId === portfolioId
          ? newPortfolios[0]?.id
          : selectedPortfolioId;
      updateAllocationGuide({
        ...allocationGuide,
        portfolios: newPortfolios,
        selectedPortfolioId: newSelected,
      });
    },
    [readOnly, portfolios, selectedPortfolioId, allocationGuide, updateAllocationGuide]
  );

  const handleDuplicatePortfolio = useCallback(
    (portfolioId) => {
      if (readOnly) return;
      const source = portfolios.find((p) => p.id === portfolioId);
      if (!source) return;
      const newPortfolio = {
        ...source,
        id: `portfolio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: `${source.name} (cópia)`,
        createdAt: new Date().toISOString(),
      };
      updateAllocationGuide({
        ...allocationGuide,
        portfolios: [...portfolios, newPortfolio],
        selectedPortfolioId: newPortfolio.id,
      });
    },
    [readOnly, portfolios, allocationGuide, updateAllocationGuide]
  );

  const handleRenamePortfolio = useCallback(
    (portfolioId, newName) => {
      if (readOnly) return;
      const newPortfolios = portfolios.map((p) =>
        p.id === portfolioId ? { ...p, name: newName } : p
      );
      updateAllocationGuide({
        ...allocationGuide,
        portfolios: newPortfolios,
      });
    },
    [readOnly, portfolios, allocationGuide, updateAllocationGuide]
  );

  const handleSelectPortfolio = useCallback(
    (portfolioId) => {
      updateAllocationGuide({
        ...allocationGuide,
        selectedPortfolioId: portfolioId,
      });
    },
    [allocationGuide, updateAllocationGuide]
  );

  return (
    <div className="space-y-4">
      {/* 1. Detalhes e checagens */}
      <Accordion title="Detalhes e checagens" icon={FileText}>
        <div className="space-y-4">
          {/* Diagnóstico da carteira atual */}
          {currentDiagnostics && (
            <div>
              <h5 className="text-sm font-semibold text-text-secondary mb-3">
                Diagnóstico da carteira atual
              </h5>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-surface-muted text-center">
                  <p className="text-xs text-text-muted mb-1">Retorno Real</p>
                  <p className="text-lg font-bold text-text-primary">
                    {formatPercent(currentDiagnostics.returnReal * 100, { decimals: 1 })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-muted text-center">
                  <p className="text-xs text-text-muted mb-1">Retorno Nominal</p>
                  <p className="text-lg font-bold text-text-primary">
                    {formatPercent(currentDiagnostics.returnNominal * 100, { decimals: 1 })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-muted text-center">
                  <p className="text-xs text-text-muted mb-1">Volatilidade</p>
                  <p className="text-lg font-bold text-text-primary">
                    {formatPercent(currentDiagnostics.volatility * 100, { decimals: 1 })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Checagens de limites */}
          {softConstraintsResult && (
            <div>
              <h5 className="text-sm font-semibold text-text-secondary mb-3">
                Checagens de limites ({profile})
              </h5>
              <div className="space-y-2">
                {softConstraintsResult.warnings.length === 0 ? (
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2">
                    <Check size={16} className="text-success" />
                    <span className="text-sm text-success">
                      Todas as checagens passaram
                    </span>
                  </div>
                ) : (
                  softConstraintsResult.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2"
                    >
                      <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-text-secondary">{w.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Limites do perfil */}
          <div>
            <h5 className="text-sm font-semibold text-text-secondary mb-3">
              Limites do perfil {profile}
            </h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(PROFILE_LIMITS[profile] || {}).map(([key, val]) => (
                <div key={key} className="p-2 rounded bg-surface-muted flex justify-between">
                  <span className="text-text-muted">{key}</span>
                  <span className="text-text-primary font-medium">{val}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Accordion>

      {/* 2. Como o guia estima risco e retorno */}
      <Accordion title="Como o guia estima risco e retorno" icon={Settings}>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Edite as premissas de retorno real e volatilidade esperados para cada classe de ativo.
            Esses valores são usados para calcular o diagnóstico da carteira.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="p-2 text-text-muted font-medium">Classe</th>
                  <th className="p-2 text-text-muted font-medium text-center">Retorno Real (%)</th>
                  <th className="p-2 text-text-muted font-medium text-center">Volatilidade (%)</th>
                </tr>
              </thead>
              <tbody>
                {ASSET_CLASSES.filter((c) => c !== "outros").map((cls) => (
                  <tr key={cls} className="border-b border-border/50">
                    <td className="p-2 text-text-primary">{ASSET_CLASS_LABELS[cls]}</td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={assumptions[cls]?.returnReal ?? DEFAULT_ASSUMPTIONS[cls]?.returnReal ?? 0}
                        onChange={(e) => handleAssumptionChange(cls, "returnReal", e.target.value)}
                        disabled={readOnly}
                        className="text-center w-20 mx-auto"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={assumptions[cls]?.volatility ?? DEFAULT_ASSUMPTIONS[cls]?.volatility ?? 0}
                        onChange={(e) => handleAssumptionChange(cls, "volatility", e.target.value)}
                        disabled={readOnly}
                        className="text-center w-20 mx-auto"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <Button
              onClick={handleResetAssumptions}
              variant="ghost"
              size="sm"
              className="text-text-muted"
            >
              Restaurar padrão
            </Button>
          )}
        </div>
      </Accordion>

      {/* 3. Comparação: risco e retorno (estimado) */}
      <Accordion title="Comparação: risco e retorno (estimado)" icon={TrendingUp}>
        <div className="space-y-4">
          {currentDiagnostics && suggestedDiagnostics && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="p-2 text-text-muted font-medium">Métrica</th>
                    <th className="p-2 text-text-muted font-medium text-center">Atual</th>
                    <th className="p-2 text-text-muted font-medium text-center">Sugestão</th>
                    <th className="p-2 text-text-muted font-medium text-center">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="p-2 text-text-primary">Retorno Real</td>
                    <td className="p-2 text-center">
                      {formatPercent(currentDiagnostics.returnReal * 100, { decimals: 2 })}
                    </td>
                    <td className="p-2 text-center text-accent font-medium">
                      {formatPercent(suggestedDiagnostics.returnReal * 100, { decimals: 2 })}
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={
                          suggestedDiagnostics.returnReal > currentDiagnostics.returnReal
                            ? "text-success"
                            : suggestedDiagnostics.returnReal < currentDiagnostics.returnReal
                            ? "text-danger"
                            : "text-text-muted"
                        }
                      >
                        {formatPercent(
                          (suggestedDiagnostics.returnReal - currentDiagnostics.returnReal) * 100,
                          { decimals: 2, sign: true }
                        )}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-2 text-text-primary">Retorno Nominal</td>
                    <td className="p-2 text-center">
                      {formatPercent(currentDiagnostics.returnNominal * 100, { decimals: 2 })}
                    </td>
                    <td className="p-2 text-center text-accent font-medium">
                      {formatPercent(suggestedDiagnostics.returnNominal * 100, { decimals: 2 })}
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={
                          suggestedDiagnostics.returnNominal > currentDiagnostics.returnNominal
                            ? "text-success"
                            : suggestedDiagnostics.returnNominal < currentDiagnostics.returnNominal
                            ? "text-danger"
                            : "text-text-muted"
                        }
                      >
                        {formatPercent(
                          (suggestedDiagnostics.returnNominal - currentDiagnostics.returnNominal) * 100,
                          { decimals: 2, sign: true }
                        )}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-2 text-text-primary">Volatilidade</td>
                    <td className="p-2 text-center">
                      {formatPercent(currentDiagnostics.volatility * 100, { decimals: 2 })}
                    </td>
                    <td className="p-2 text-center text-accent font-medium">
                      {formatPercent(suggestedDiagnostics.volatility * 100, { decimals: 2 })}
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={
                          suggestedDiagnostics.volatility < currentDiagnostics.volatility
                            ? "text-success"
                            : suggestedDiagnostics.volatility > currentDiagnostics.volatility
                            ? "text-danger"
                            : "text-text-muted"
                        }
                      >
                        {formatPercent(
                          (suggestedDiagnostics.volatility - currentDiagnostics.volatility) * 100,
                          { decimals: 2, sign: true }
                        )}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!currentDiagnostics && (
            <div className="p-4 rounded-lg bg-surface-muted text-center">
              <Info size={20} className="text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">
                Selecione uma carteira com breakdown para ver a comparação.
              </p>
            </div>
          )}
        </div>
      </Accordion>

      {/* 4. Carteiras e templates */}
      <Accordion title="Carteiras e templates" icon={Layers}>
        <div className="space-y-4">
          {/* Lista de carteiras */}
          <div className="space-y-2">
            {portfolios.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                  p.id === selectedPortfolioId
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface-muted hover:bg-surface-highlight"
                }`}
                onClick={() => handleSelectPortfolio(p.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      p.id === selectedPortfolioId ? "bg-accent" : "bg-text-muted"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-text-primary text-sm">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {p.totalValue > 0
                        ? formatCurrency(p.totalValue, p.currency || "BRL")
                        : "Sem valor definido"}
                    </p>
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt("Novo nome:", p.name);
                        if (newName) handleRenamePortfolio(p.id, newName);
                      }}
                      className="p-1.5 rounded hover:bg-surface-highlight text-text-muted hover:text-text-primary"
                      title="Renomear"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicatePortfolio(p.id);
                      }}
                      className="p-1.5 rounded hover:bg-surface-highlight text-text-muted hover:text-text-primary"
                      title="Duplicar"
                    >
                      <Copy size={14} />
                    </button>
                    {portfolios.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir "${p.name}"?`)) {
                            handleDeletePortfolio(p.id);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-danger/20 text-text-muted hover:text-danger"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botão adicionar carteira */}
          {!readOnly && (
            <Button onClick={handleAddPortfolio} variant="ghost" size="sm" className="w-full">
              <Plus size={16} className="mr-2" />
              Nova carteira
            </Button>
          )}
        </div>
      </Accordion>
    </div>
  );
}
