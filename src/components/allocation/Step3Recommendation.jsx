// src/components/allocation/Step3Recommendation.jsx
// Passo 3: "Sugestão (o que fazer agora?)"
import React, { useMemo, useCallback } from "react";
import {
  Zap,
  Check,
  AlertTriangle,
  Info,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import Card from "../ui/Card";
import Button from "../ui/Button";
import {
  ASSET_CLASSES,
  ASSET_CLASS_LABELS,
  optimizeAllocation,
  calculateAllocationDelta,
  calculatePortfolioDiagnostics,
} from "../../utils/allocationMath";
import { formatPercent } from "../../utils/format";

function safeFormatPercent(n, decimals = 1) {
  const val = Number(n);
  if (!Number.isFinite(val)) return '0';
  return val.toFixed(decimals).replace('.', ',');
}

// Arredonda para 0,5pp mais próximo
function roundToHalfPP(value) {
  return Math.round(value * 2) / 2;
}

export default function Step3Recommendation({
  allocationGuide,
  updateAllocationGuide,
  readOnly = false,
  mode = "simple",
  // Props opcionais passadas do pai (evita recalcular)
  optimizationResult: externalOptimizationResult,
  hasValidRecommendation: externalHasValid,
}) {
  const objective = allocationGuide.objective || {};
  const assumptions = allocationGuide.assumptions || {};
  const profile = objective.profile || "moderado";

  // Carteira selecionada
  const selectedPortfolioId = allocationGuide.selectedPortfolioId || allocationGuide.portfolios?.[0]?.id;
  const selectedPortfolio = useMemo(() => {
    return allocationGuide.portfolios?.find((p) => p.id === selectedPortfolioId) || null;
  }, [allocationGuide.portfolios, selectedPortfolioId]);

  // Diagnóstico da carteira atual
  const currentDiagnostics = useMemo(() => {
    if (!selectedPortfolio?.breakdown) return null;
    return calculatePortfolioDiagnostics(selectedPortfolio.breakdown, assumptions);
  }, [selectedPortfolio, assumptions]);

  // Resultado da otimização - usar prop externa se disponível, senão calcular
  const optimizationResult = useMemo(() => {
    if (externalOptimizationResult !== undefined) {
      return externalOptimizationResult;
    }
    return optimizeAllocation(objective, assumptions, profile);
  }, [externalOptimizationResult, objective, assumptions, profile]);

  // Deltas entre atual e sugestão
  const deltas = useMemo(() => {
    if (!selectedPortfolio?.breakdown || !optimizationResult.recommended) return null;
    return calculateAllocationDelta(selectedPortfolio.breakdown, optimizationResult.recommended);
  }, [selectedPortfolio, optimizationResult]);

  // Plano de ação: top 3-5 maiores deltas
  const actionPlan = useMemo(() => {
    if (!deltas) return [];

    const items = ASSET_CLASSES
      .map(cls => ({
        cls,
        delta: deltas[cls] || 0,
        absDelta: Math.abs(deltas[cls] || 0),
        roundedDelta: roundToHalfPP(deltas[cls] || 0),
      }))
      .filter(item => Math.abs(item.roundedDelta) >= 0.5)
      .sort((a, b) => b.absDelta - a.absDelta)
      .slice(0, 5);

    return items;
  }, [deltas]);

  // Handler: Criar carteira modelo
  const handleCreateModelPortfolio = useCallback(() => {
    if (readOnly || !optimizationResult.recommended) return;

    const newPortfolio = {
      id: `portfolio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: "Carteira Modelo (Sugestão)",
      totalValue: selectedPortfolio?.totalValue || 0,
      currency: "BRL",
      breakdown: { ...optimizationResult.recommended },
      createdAt: new Date().toISOString(),
      fromSuggestion: true,
    };

    const newPortfolios = [...(allocationGuide.portfolios || []), newPortfolio];
    updateAllocationGuide({
      ...allocationGuide,
      portfolios: newPortfolios,
      selectedPortfolioId: newPortfolio.id,
    });
  }, [readOnly, optimizationResult, selectedPortfolio, allocationGuide, updateAllocationGuide]);

  // Cores para barras
  const barColors = {
    current: "bg-blue-500",
    suggested: "bg-accent",
  };

  // Fallback: se não houver resultado de otimização válido
  if (!optimizationResult || !optimizationResult.recommended) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card title="Sugestão" icon={Zap}>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-400 mb-1">Não foi possível gerar sugestão</p>
                <p className="text-sm text-text-secondary">
                  {optimizationResult?.message ||
                    "Revise os parâmetros do objetivo ou verifique se a carteira está configurada corretamente. Se muitos ativos estão em 'Outros', o guia pode não conseguir otimizar."}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Card Principal */}
      <Card title="Sugestão" icon={Zap}>
        {!optimizationResult.feasible ? (
          // Objetivo não atingível (mas há recomendação alternativa)
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-400 mb-1">Objetivo não atingível</p>
                <p className="text-sm text-text-secondary">{optimizationResult.message}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Comparação lado a lado: Atual vs Sugestão */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-text-secondary">Atual vs Sugestão por classe</h4>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${barColors.current}`} />
                    <span className="text-text-muted">Atual</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${barColors.suggested}`} />
                    <span className="text-text-muted">Sugestão</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {ASSET_CLASSES.map((cls) => {
                  const current = selectedPortfolio?.breakdown?.[cls] || 0;
                  const suggested = optimizationResult.recommended[cls] || 0;
                  const delta = deltas?.[cls] || 0;

                  // Só mostrar classes com valores relevantes
                  if (current < 1 && suggested < 1) return null;

                  return (
                    <div key={cls} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-primary font-medium">{ASSET_CLASS_LABELS[cls]}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted">{safeFormatPercent(current)}%</span>
                          <ArrowRight size={12} className="text-text-muted" />
                          <span className="text-accent font-medium">{safeFormatPercent(suggested)}%</span>
                          {Math.abs(delta) >= 0.5 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              delta > 0 ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                            }`}>
                              {delta > 0 ? "+" : ""}{safeFormatPercent(delta)}pp
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-surface-highlight rounded-full overflow-hidden flex">
                          <div
                            className={`h-full ${barColors.current} transition-all`}
                            style={{ width: `${Math.min(current, 100)}%` }}
                          />
                        </div>
                        <div className="flex-1 h-2 bg-surface-highlight rounded-full overflow-hidden flex">
                          <div
                            className={`h-full ${barColors.suggested} transition-all`}
                            style={{ width: `${Math.min(suggested, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plano de Ação (bullets) */}
            {actionPlan.length > 0 && (
              <div className="p-4 rounded-xl bg-surface-muted border border-border">
                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <Zap size={16} className="text-accent" />
                  O que fazer agora
                </h4>
                <ul className="space-y-2">
                  {actionPlan.map((item) => (
                    <li key={item.cls} className="flex items-start gap-2 text-sm">
                      {item.delta > 0 ? (
                        <TrendingUp size={16} className="text-success mt-0.5 shrink-0" />
                      ) : (
                        <TrendingDown size={16} className="text-danger mt-0.5 shrink-0" />
                      )}
                      <span className="text-text-primary">
                        {item.delta > 0 ? "Aumentar" : "Reduzir"}{" "}
                        <strong>{ASSET_CLASS_LABELS[item.cls]}</strong>{" "}
                        em {safeFormatPercent(Math.abs(item.roundedDelta))}pp
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Diagnóstico da sugestão */}
            {optimizationResult.diagnostics && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-center">
                  <p className="text-xs text-text-muted mb-1">Retorno Real</p>
                  <p className="text-lg font-bold text-success">
                    {formatPercent(optimizationResult.diagnostics.returnReal * 100, { decimals: 1 })}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-xs text-text-muted mb-1">Retorno Nominal</p>
                  <p className="text-lg font-bold text-blue-400">
                    {formatPercent(optimizationResult.diagnostics.returnNominal * 100, { decimals: 1 })}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                  <p className="text-xs text-text-muted mb-1">Volatilidade</p>
                  <p className="text-lg font-bold text-purple-400">
                    {formatPercent(optimizationResult.diagnostics.volatility * 100, { decimals: 1 })}
                  </p>
                </div>
              </div>
            )}

            {/* CTA: Criar carteira modelo */}
            {!readOnly && (
              <Button
                onClick={handleCreateModelPortfolio}
                variant="primary"
                className="w-full"
              >
                <Check size={16} className="mr-2" />
                Criar carteira modelo com essa sugestão
              </Button>
            )}

            {/* Nota explicativa */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
              <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-text-secondary">
                A carteira modelo será criada apenas no Guia de Alocação.
                Seus ativos reais no Patrimônio não serão alterados.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Disclaimer (apenas no modo simples) */}
      {mode === "simple" && (
        <div className="p-4 rounded-xl bg-surface-muted border border-border text-center">
          <p className="text-xs text-text-muted leading-relaxed">
            Este guia é educativo e sugere apenas distribuição por classes de ativos.
            Não é recomendação de investimento nem garantia de resultados.
            Valide com um profissional antes de decidir.
          </p>
        </div>
      )}
    </div>
  );
}
