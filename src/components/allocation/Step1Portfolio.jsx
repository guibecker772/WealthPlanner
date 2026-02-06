// src/components/allocation/Step1Portfolio.jsx
// Passo 1: "Sua carteira (ponto de partida)"
import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Download,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Settings2,
  Plus,
} from "lucide-react";

import Card from "../ui/Card";
import Button from "../ui/Button";
import {
  ASSET_CLASSES,
  ASSET_CLASS_LABELS,
  validateBreakdownSum,
  normalizeBreakdownTo100,
  buildCurrentAllocationFromAssets,
  createImportedPortfolio,
  createDefaultPortfolio,
} from "../../utils/allocationMath";
import { formatCurrencyBR, formatPercent } from "../../utils/format";

// Parse seguro de número em formato pt-BR
function safeParsePtBrNumber(str) {
  if (str === null || str === undefined || str === '') return null;
  const cleaned = String(str).replace(/[^\d,.\-]/g, '');
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeFormatPercent(n, decimals = 1) {
  const val = Number(n);
  if (!Number.isFinite(val)) return '0';
  return val.toFixed(decimals).replace('.', ',');
}

export default function Step1Portfolio({
  allocationGuide,
  clientData,
  updateAllocationGuide,
  readOnly = false,
  mode = "simple",
  onManagePortfolios,
}) {
  const navigate = useNavigate();
  const [showBreakdownEditor, setShowBreakdownEditor] = useState(false);
  const [localBreakdown, setLocalBreakdown] = useState({});

  // ScenarioFx para conversão de moedas
  const scenarioFx = useMemo(() => ({
    USD_BRL: Number(clientData?.fx?.USD_BRL) || 5.0,
    EUR_BRL: Number(clientData?.fx?.EUR_BRL) || 5.5,
  }), [clientData?.fx]);

  // Calcular alocação atual baseada nos ativos do patrimônio
  const currentAllocation = useMemo(() => {
    const assets = clientData?.assets || [];
    if (assets.length === 0) {
      return { totalBRL: 0, byClassPercent: {}, byClassValueBRL: {}, diagnostics: [] };
    }
    return buildCurrentAllocationFromAssets(assets, scenarioFx, { includePrevidencia: true });
  }, [clientData?.assets, scenarioFx]);

  // Carteira selecionada
  const selectedPortfolioId = allocationGuide.selectedPortfolioId || allocationGuide.portfolios?.[0]?.id;
  const selectedPortfolio = useMemo(() => {
    return allocationGuide.portfolios?.find((p) => p.id === selectedPortfolioId) || null;
  }, [allocationGuide.portfolios, selectedPortfolioId]);

  // Validação do breakdown
  const breakdownValidation = useMemo(() => {
    if (!selectedPortfolio?.breakdown) return { valid: true, sum: 0, delta: 0 };
    return validateBreakdownSum(selectedPortfolio.breakdown);
  }, [selectedPortfolio]);

  // Sincronizar localBreakdown quando muda a carteira
  React.useEffect(() => {
    if (selectedPortfolio?.breakdown) {
      const bdLocal = {};
      for (const cls of ASSET_CLASSES) {
        const v = selectedPortfolio.breakdown[cls];
        bdLocal[cls] = v != null && v !== '' && Number.isFinite(Number(v)) ? String(v).replace('.', ',') : '';
      }
      setLocalBreakdown(bdLocal);
    }
  }, [selectedPortfolio]);

  // Verificar "Outros" alto
  const outrosPercent = selectedPortfolio?.breakdown?.outros || 0;
  const outrosWarning = outrosPercent >= 80 ? "error" : outrosPercent > 40 ? "warning" : null;

  // Maior concentração
  const maxConcentration = useMemo(() => {
    if (!selectedPortfolio?.breakdown) return null;
    let maxCls = null;
    let maxVal = 0;
    for (const cls of ASSET_CLASSES) {
      const val = Number(selectedPortfolio.breakdown[cls]) || 0;
      if (val > maxVal) {
        maxVal = val;
        maxCls = cls;
      }
    }
    return maxCls ? { cls: maxCls, pct: maxVal } : null;
  }, [selectedPortfolio]);

  // Contagem de classes com alocação > 0
  const classesWithAllocation = useMemo(() => {
    if (!selectedPortfolio?.breakdown) return 0;
    return ASSET_CLASSES.filter(cls => (Number(selectedPortfolio.breakdown[cls]) || 0) > 0).length;
  }, [selectedPortfolio]);

  // Handler: Importar carteira do patrimônio
  const handleImportFromAssets = useCallback(() => {
    if (readOnly) return;
    const total = Number(currentAllocation?.totalBRL) || 0;
    if (total <= 0) return;

    const newPortfolio = createImportedPortfolio(currentAllocation);
    if (!newPortfolio || !newPortfolio.id) return;

    const existingImportedId = allocationGuide.importedPortfolioId;

    let newPortfolios;
    if (existingImportedId && allocationGuide.portfolios?.some(p => p.id === existingImportedId)) {
      newPortfolios = allocationGuide.portfolios.map(p =>
        p.id === existingImportedId ? { ...newPortfolio, id: existingImportedId } : p
      );
    } else {
      newPortfolios = [...(allocationGuide.portfolios || []), newPortfolio];
    }

    const newGuide = {
      ...allocationGuide,
      portfolios: newPortfolios,
      importedPortfolioId: existingImportedId || newPortfolio.id,
      selectedPortfolioId: existingImportedId || newPortfolio.id,
    };

    updateAllocationGuide(newGuide);
  }, [currentAllocation, allocationGuide, updateAllocationGuide, readOnly]);

  // Handler: Criar carteira manualmente
  const handleCreateManual = useCallback(() => {
    if (readOnly) return;
    const newPortfolio = createDefaultPortfolio("Carteira Manual");
    const newGuide = {
      ...allocationGuide,
      portfolios: [...(allocationGuide.portfolios || []), newPortfolio],
      selectedPortfolioId: newPortfolio.id,
    };
    updateAllocationGuide(newGuide);
  }, [allocationGuide, updateAllocationGuide, readOnly]);

  // Handler: Trocar carteira ativa
  const handleSelectPortfolio = useCallback((portfolioId) => {
    updateAllocationGuide({
      ...allocationGuide,
      selectedPortfolioId: portfolioId,
    });
  }, [allocationGuide, updateAllocationGuide]);

  // Handler: Atualizar breakdown da carteira selecionada
  const updateBreakdown = useCallback((newBreakdown) => {
    if (!selectedPortfolioId || readOnly) return;
    const newPortfolios = allocationGuide.portfolios.map((p) =>
      p.id === selectedPortfolioId ? { ...p, breakdown: newBreakdown } : p
    );
    updateAllocationGuide({ ...allocationGuide, portfolios: newPortfolios });
  }, [selectedPortfolioId, allocationGuide, updateAllocationGuide, readOnly]);

  // Handler: Normalizar breakdown para 100%
  const handleNormalize = useCallback(() => {
    if (!selectedPortfolio?.breakdown || readOnly) return;
    const normalized = normalizeBreakdownTo100(selectedPortfolio.breakdown);
    updateBreakdown(normalized);
    // Atualizar local
    const bdLocal = {};
    for (const cls of ASSET_CLASSES) {
      bdLocal[cls] = normalized[cls] != null ? String(normalized[cls]).replace('.', ',') : '';
    }
    setLocalBreakdown(bdLocal);
  }, [selectedPortfolio, updateBreakdown, readOnly]);

  // Sem ativos investíveis
  const hasNoAssets = (clientData?.assets || []).filter(a =>
    !['real_estate', 'vehicle', 'business'].includes(a.type)
  ).length === 0;

  // Sem carteira selecionada
  const hasNoPortfolio = !selectedPortfolio;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Card Principal: Sua Carteira */}
      <Card title="Sua carteira" icon={Wallet}>
        {hasNoAssets && hasNoPortfolio ? (
          // Estado vazio: nenhum ativo e nenhuma carteira
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-highlight flex items-center justify-center">
              <AlertCircle size={28} className="text-text-muted" />
            </div>
            <p className="text-text-secondary mb-2">
              Nenhum ativo investível cadastrado no Patrimônio.
            </p>
            <p className="text-text-muted text-sm mb-6">
              Cadastre ativos ou crie uma carteira manualmente para começar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate("/dashboard/assets")}
                variant="primary"
                disabled={readOnly}
              >
                <Plus size={16} className="mr-2" />
                Adicionar patrimônio
              </Button>
              <Button
                onClick={handleCreateManual}
                variant="outline"
                disabled={readOnly}
              >
                Criar carteira manualmente
              </Button>
            </div>
          </div>
        ) : hasNoPortfolio ? (
          // Tem ativos mas nenhuma carteira ainda
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">
              Você tem ativos cadastrados. Importe-os para começar a análise.
            </p>
            <Button
              onClick={handleImportFromAssets}
              variant="primary"
              disabled={readOnly || currentAllocation.totalBRL <= 0}
            >
              <Download size={16} className="mr-2" />
              Importar do Patrimônio
            </Button>
          </div>
        ) : (
          // Tem carteira selecionada - mostrar resumo
          <div className="space-y-4">
            {/* Dropdown para trocar carteira (se houver mais de 1) */}
            {allocationGuide.portfolios?.length > 1 && (
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <span className="text-sm text-text-secondary">Carteira:</span>
                <select
                  value={selectedPortfolioId || ''}
                  onChange={(e) => handleSelectPortfolio(e.target.value)}
                  className="flex-1 max-w-xs px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  disabled={readOnly}
                >
                  {allocationGuide.portfolios.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {mode === "simple" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onManagePortfolios}
                    className="text-xs"
                  >
                    <Settings2 size={14} className="mr-1" />
                    Gerenciar
                  </Button>
                )}
              </div>
            )}

            {/* Resumo compacto */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-surface-highlight border border-border">
                <p className="text-text-muted text-xs mb-1">Valor Total</p>
                <p className="text-lg font-bold text-text-primary">
                  {formatCurrencyBR(selectedPortfolio.totalValue || currentAllocation.totalBRL || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-highlight border border-border">
                <p className="text-text-muted text-xs mb-1">Classes mapeadas</p>
                <p className="text-lg font-bold text-text-primary">
                  {classesWithAllocation} de {ASSET_CLASSES.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-highlight border border-border">
                <p className="text-text-muted text-xs mb-1">Maior concentração</p>
                <p className="text-lg font-bold text-accent">
                  {maxConcentration
                    ? `${ASSET_CLASS_LABELS[maxConcentration.cls]}: ${safeFormatPercent(maxConcentration.pct)}%`
                    : '-'
                  }
                </p>
              </div>
              <div className={`p-3 rounded-xl border ${
                outrosWarning === "error"
                  ? "bg-danger/10 border-danger/30"
                  : outrosWarning === "warning"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-surface-highlight border-border"
              }`}>
                <p className="text-text-muted text-xs mb-1">Outros</p>
                <p className={`text-lg font-bold ${
                  outrosWarning === "error" ? "text-danger" :
                  outrosWarning === "warning" ? "text-amber-400" :
                  "text-text-primary"
                }`}>
                  {safeFormatPercent(outrosPercent)}%
                </p>
              </div>
            </div>

            {/* Alerta de "Outros" alto */}
            {outrosWarning === "error" && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-start gap-3">
                <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-danger mb-1">Classificação insuficiente</p>
                  <p className="text-text-secondary">
                    Com {safeFormatPercent(outrosPercent)}% em "Outros", o guia não consegue balancear corretamente.
                    Ajuste a composição por classe abaixo.
                  </p>
                </div>
              </div>
            )}

            {outrosWarning === "warning" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-400">
                  Atenção: {safeFormatPercent(outrosPercent)}% em "Outros". Considere reclassificar para melhor análise.
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!readOnly && currentAllocation.totalBRL > 0 && (
                <Button
                  onClick={handleImportFromAssets}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw size={14} className="mr-2" />
                  {allocationGuide.importedPortfolioId ? "Atualizar do Patrimônio" : "Importar do Patrimônio"}
                </Button>
              )}

              <Button
                onClick={() => setShowBreakdownEditor(!showBreakdownEditor)}
                variant="ghost"
                size="sm"
              >
                {showBreakdownEditor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span className="ml-1">
                  {showBreakdownEditor ? "Ocultar composição" : "Ajustar composição por classe"}
                </span>
              </Button>
            </div>

            {/* Editor inline de breakdown */}
            {showBreakdownEditor && (
              <div className="mt-4 p-4 rounded-xl bg-surface-muted border border-border space-y-4 animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-semibold text-text-secondary">Alocação por Classe (%)</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      breakdownValidation.valid
                        ? "bg-success/20 text-success"
                        : Math.abs(breakdownValidation.delta) <= 1
                          ? "bg-yellow-500/20 text-yellow-500"
                          : "bg-danger/20 text-danger"
                    }`}>
                      Soma: {safeFormatPercent(breakdownValidation.sum, 1)}%
                    </span>
                    {!breakdownValidation.valid && !readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNormalize}
                        className="text-xs"
                      >
                        Normalizar para 100%
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inputs por classe */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ASSET_CLASSES.map((cls, idx) => {
                    const colors = [
                      "border-l-emerald-500", "border-l-blue-500", "border-l-cyan-500", "border-l-indigo-500",
                      "border-l-purple-500", "border-l-pink-500", "border-l-orange-500", "border-l-gray-500"
                    ];
                    return (
                      <div key={cls} className={`p-3 rounded-lg bg-surface border-l-4 ${colors[idx]}`}>
                        <label className="block text-xs text-text-muted mb-1 truncate">
                          {ASSET_CLASS_LABELS[cls]}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full bg-transparent text-text-primary font-semibold text-lg focus:outline-none"
                            value={localBreakdown[cls] ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d.,]/g, '');
                              setLocalBreakdown(prev => ({ ...prev, [cls]: raw }));
                            }}
                            onBlur={() => {
                              const parsed = safeParsePtBrNumber(localBreakdown[cls]);
                              const finalVal = parsed !== null && parsed >= 0 ? parsed : 0;
                              const newBreakdown = { ...selectedPortfolio.breakdown, [cls]: finalVal };
                              updateBreakdown(newBreakdown);
                              setLocalBreakdown(prev => ({
                                ...prev,
                                [cls]: finalVal > 0 ? String(finalVal).replace('.', ',') : ''
                              }));
                            }}
                            disabled={readOnly}
                            placeholder="0"
                          />
                          <span className="text-text-muted text-sm">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Alerta se breakdown inválido */}
                {!breakdownValidation.valid && (
                  <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2 text-sm">
                    <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                    <div className="text-text-secondary">
                      <span className="font-medium text-yellow-400">Atenção:</span> A soma deve ser 100%.
                      Clique em "Normalizar" para ajustar automaticamente.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
