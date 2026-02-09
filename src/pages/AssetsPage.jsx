// src/pages/AssetsPage.jsx
import React, { useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Plus,
  Wallet,
  Building2,
  Car,
  Briefcase,
  Box,
  Trash2,
  Globe,
  ScrollText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  PackageOpen,
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { formatCurrencyBR, getCurrencySymbol, safeNumber } from "../utils/format";
import { convertToBRL, calculateFxExposure, DEFAULT_FX_RATES, validateAssetFx } from "../utils/fx";
import { 
  CURRENCIES, 
  PREVIDENCIA_PLAN_TYPES, 
  PREVIDENCIA_TAX_REGIMES,
  PORTFOLIO_CLASSES_BR,
  PORTFOLIO_CLASSES_INTL,
  PORTFOLIO_DETAIL_MODES,
} from "../constants/assetTypes";

const TYPE_ICONS = {
  financial: Wallet,
  real_estate: Building2,
  vehicle: Car,
  business: Briefcase,
  previdencia: ScrollText,
  international: Globe,
  other: Box,
};

// ✅ Normaliza o retorno do Input (currency mask / event / etc)
// Evita salvar objeto no estado (causa [object Object])
function normalizeCurrencyValue(v) {
  // 1) Se veio um evento padrão de input
  if (v && typeof v === "object" && v.target && typeof v.target.value !== "undefined") {
    v = v.target.value;
  }

  // 2) Se veio objeto de máscara (react-number-format, etc)
  if (v && typeof v === "object") {
    if (typeof v.floatValue !== "undefined") return Number.isFinite(v.floatValue) ? v.floatValue : "";
    if (typeof v.value !== "undefined") return v.value === "" ? "" : safeNumber(v.value);
    if (typeof v.rawValue !== "undefined") return v.rawValue === "" ? "" : safeNumber(v.rawValue);
    if (typeof v.formattedValue !== "undefined") return v.formattedValue === "" ? "" : safeNumber(v.formattedValue);

    // Se cair aqui, é algum objeto inesperado -> não salva objeto
    return "";
  }

  // 3) Se veio string/number simples
  if (v === "" || v === null || typeof v === "undefined") return "";

  // safeNumber deve lidar com "R$ 1.234,56" e "1234,56"
  const n = safeNumber(v);
  return Number.isFinite(n) ? n : "";
}

// ✅ Componente de Input de Valor com Formatação BRL
// Exibe formatado quando não está em foco, permite digitação livre quando em foco
function CurrencyValueInput({ value, onChange, currency: _currency = "BRL", disabled = false, className = "" }) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState("");

  // Quando recebe foco, inicializar com valor atual formatado para edição
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    const num = safeNumber(value, 0);
    // Mostrar número limpo para edição (sem símbolo, com vírgula decimal)
    setLocalValue(num > 0 ? num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  }, [value]);

  // Quando perde foco, parsear e salvar
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const parsed = normalizeCurrencyValue(localValue);
    onChange(parsed);
  }, [localValue, onChange]);

  // Durante digitação, permitir qualquer coisa
  const handleChange = useCallback((e) => {
    const raw = e.target.value;
    // Permitir: dígitos, vírgula, ponto, espaço, R$
    const cleaned = raw.replace(/[^\d.,\s]/g, '');
    setLocalValue(cleaned);
  }, []);

  // Valor exibido
  const displayValue = useMemo(() => {
    if (isFocused) return localValue;
    const num = safeNumber(value, 0);
    // Quando não focado, mostrar apenas o número formatado (sem símbolo - o símbolo fica no prefix)
    return num > 0 
      ? num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";
  }, [isFocused, localValue, value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      className={`block w-full rounded-xl bg-surface-muted border border-border text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50 transition-all duration-200 pl-12 pr-4 py-3 ${className}`}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder="0,00"
    />
  );
}

// ✅ Componente de Detalhes da Carteira Financeira
function FinancialPortfolioDetailsPanel({
  asset,
  readOnly,
  updatePortfolioDetails,
  updateBreakdownField,
  normalizeBreakdown,
  getDefaultPortfolioDetails,
}) {
  const details = asset.portfolioDetails || getDefaultPortfolioDetails();
  const detailMode = details.detailMode || 'BR';
  const isEnabled = details.enabled !== false;

  // Determinar qual breakdown usar e quais classes
  const isBR = detailMode === 'BR';
  const _isIntl = detailMode === 'INTL';
  const breakdownKey = isBR ? 'breakdown' : 'intlBreakdown';
  const classes = isBR ? PORTFOLIO_CLASSES_BR : PORTFOLIO_CLASSES_INTL;
  const currentBreakdown = details[breakdownKey] || {};

  // Calcular soma atual
  const totalPercent = Object.values(currentBreakdown).reduce((s, v) => s + safeNumber(v, 0), 0);
  const isBalanced = totalPercent === 100;
  const sumColor = totalPercent === 100 ? 'text-emerald-400' : totalPercent > 100 ? 'text-rose-400' : 'text-amber-400';
  const sumBg = totalPercent === 100 ? 'bg-emerald-500/10' : totalPercent > 100 ? 'bg-rose-500/10' : 'bg-amber-500/10';

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4">
      {/* Header com toggle e modo */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => updatePortfolioDetails('enabled', e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent/50 bg-surface-muted"
            />
            <span className="text-sm font-semibold text-text-primary">Detalhar classes</span>
          </label>
        </div>

        {isEnabled && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary">Modo:</label>
            <select
              className="bg-surface-muted border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
              value={detailMode}
              onChange={(e) => updatePortfolioDetails('detailMode', e.target.value)}
              disabled={readOnly}
            >
              {PORTFOLIO_DETAIL_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Breakdown Editor */}
      {isEnabled && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(classes).map(([key, config]) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-text-secondary font-medium" title={config.description}>
                  {config.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={safeNumber(currentBreakdown[key], 0)}
                    onChange={(e) => updateBreakdownField(breakdownKey, key, parseFloat(e.target.value) || 0)}
                    disabled={readOnly}
                    className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 pr-8 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Soma e normalizar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${sumBg}`}>
              <span className="text-xs text-text-secondary">Soma:</span>
              <span className={`text-sm font-bold ${sumColor}`}>{totalPercent}%</span>
              {!isBalanced && (
                <span className="text-xs text-text-muted">
                  ({totalPercent > 100 ? `+${totalPercent - 100}%` : `-${100 - totalPercent}%`})
                </span>
              )}
            </div>

            {!isBalanced && !readOnly && (
              <button
                onClick={() => normalizeBreakdown(breakdownKey)}
                className="text-xs text-accent hover:text-accent/80 underline transition-colors"
              >
                Normalizar para 100%
              </button>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs text-text-secondary font-semibold">Observações da carteira</label>
            <Input
              value={details.notes || ''}
              onChange={(e) => updatePortfolioDetails('notes', e.target.value)}
              disabled={readOnly}
              placeholder="Notas sobre a composição, estratégia, etc."
              className="mt-1"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function AssetsPage() {
  const ctx = useOutletContext() || {};
  const { clientData, updateField, readOnly } = ctx;
  const [showFxSettings, setShowFxSettings] = useState(false);
  const [expandedAssetId, setExpandedAssetId] = useState(null); // Para previdência
  const [expandedFinancialId, setExpandedFinancialId] = useState(null); // Para financeiro
  
  // ✅ Estados locais para inputs de FX (permite digitação livre)
  const [fxInputUSD, setFxInputUSD] = useState("");
  const [fxInputEUR, setFxInputEUR] = useState("");

  if (!clientData || typeof updateField !== "function") {
    return (
      <div className="p-6 rounded-2xl border border-border bg-surface/40 text-text-secondary">
        Dados do cenário indisponíveis no momento.
      </div>
    );
  }

  const assets = clientData.assets || [];
  
  // ✅ FX com defaults seguros
  const scenarioFx = {
    USD_BRL: safeNumber(clientData.fx?.USD_BRL, DEFAULT_FX_RATES.USD_BRL),
    EUR_BRL: safeNumber(clientData.fx?.EUR_BRL, DEFAULT_FX_RATES.EUR_BRL),
  };

  // ✅ Sincronizar inputs locais com scenarioFx quando abrir settings
  React.useEffect(() => {
    if (showFxSettings) {
      setFxInputUSD(String(scenarioFx.USD_BRL).replace('.', ','));
      setFxInputEUR(String(scenarioFx.EUR_BRL).replace('.', ','));
    }
  }, [showFxSettings]);

  // ✅ Parsear valor FX de string pt-BR para number
  const parseFxValue = (str) => {
    if (!str || typeof str !== 'string') return null;
    const cleaned = str.trim().replace(',', '.');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  // ✅ Ao sair do input (blur), validar e salvar no draft
  const handleFxBlur = (key, inputValue, setInputValue) => {
    const parsed = parseFxValue(inputValue);
    if (parsed !== null) {
      updateField("fx", { ...scenarioFx, [key]: parsed });
      setInputValue(String(parsed).replace('.', ','));
    } else {
      // Valor inválido: reverter para o valor atual do cenário
      const currentVal = scenarioFx[key] || DEFAULT_FX_RATES[key];
      setInputValue(String(currentVal).replace('.', ','));
    }
  };

  // ✅ Formatar número para exibição segura (evita crash em .toFixed)
  const safeFormatFx = (value, decimals = 2) => {
    const num = safeNumber(value, 0);
    return num.toFixed(decimals);
  };

  const addAsset = () => {
    const newAsset = {
      id: Date.now().toString(),
      name: "Novo Ativo",
      value: "",
      amountCurrency: "",
      currency: "BRL",
      fxRate: null,
      type: "financial",
    };

    updateField("assets", [...assets, newAsset]);
  };

  const addPrevidenciaAsset = () => {
    const newAsset = {
      id: Date.now().toString(),
      name: "Nova Previdência",
      value: "",
      amountCurrency: "",
      currency: "BRL",
      type: "previdencia",
      previdencia: {
        planType: "VGBL",
        taxRegime: "regressivo",
        provider: "",
        adminFee: null,
        notes: "",
        beneficiaries: [],
      },
    };

    updateField("assets", [...assets, newAsset]);
    setExpandedAssetId(newAsset.id);
  };

  // ✅ Adiciona ativo de imóvel (para onboarding empty state)
  const addRealEstateAsset = () => {
    const newAsset = {
      id: Date.now().toString(),
      name: "Novo Imóvel",
      value: "",
      amountCurrency: "",
      currency: "BRL",
      fxRate: null,
      type: "real_estate",
    };
    updateField("assets", [...assets, newAsset]);
  };

  const removeAsset = (id) => {
    updateField("assets", assets.filter((a) => a.id !== id));
  };

  const updateAsset = (id, key, val) => {
    updateField(
      "assets",
      assets.map((a) => {
        if (a.id !== id) return a;

        // Se mudar moeda para BRL, limpar fxRate
        if (key === "currency" && val === "BRL") {
          return { ...a, [key]: val, fxRate: null };
        }

        // Atualizar valor e sincronizar amountCurrency
        if (key === "value") {
          return { ...a, value: val, amountCurrency: val };
        }

        return { ...a, [key]: val };
      })
    );
  };

  const updatePrevidenciaField = (assetId, field, val) => {
    updateField(
      "assets",
      assets.map((a) => {
        if (a.id !== assetId) return a;
        return {
          ...a,
          previdencia: { ...(a.previdencia || {}), [field]: val },
        };
      })
    );
  };

  // ✅ Atualizar campo de portfolioDetails para ativos financeiros
  const updatePortfolioDetails = (assetId, field, val) => {
    updateField(
      "assets",
      assets.map((a) => {
        if (a.id !== assetId) return a;
        const current = a.portfolioDetails || getDefaultPortfolioDetails();
        return {
          ...a,
          portfolioDetails: { ...current, [field]: val },
        };
      })
    );
  };

  // ✅ Atualizar breakdown de classes (BR ou INTL)
  const updateBreakdownField = (assetId, breakdownKey, classKey, val) => {
    updateField(
      "assets",
      assets.map((a) => {
        if (a.id !== assetId) return a;
        const current = a.portfolioDetails || getDefaultPortfolioDetails();
        const currentBreakdown = current[breakdownKey] || {};
        return {
          ...a,
          portfolioDetails: {
            ...current,
            [breakdownKey]: {
              ...currentBreakdown,
              [classKey]: Math.max(0, Math.min(100, safeNumber(val, 0))),
            },
          },
        };
      })
    );
  };

  // ✅ Default para portfolioDetails
  // FIX: PORTFOLIO_CLASSES_BR é um array de objetos {key, label}, não um objeto
  // Object.keys() retornava índices ['0','1','2'...], agora usa .map(c => c.key)
  const getDefaultPortfolioDetails = () => ({
    enabled: false,
    detailMode: 'BR',
    breakdown: Object.fromEntries(PORTFOLIO_CLASSES_BR.map(c => [c.key, 0])),
    intlBreakdown: Object.fromEntries(PORTFOLIO_CLASSES_INTL.map(c => [c.key, 0])),
    notes: '',
  });

  // ✅ Normalizar breakdown para somar 100%
  const normalizeBreakdown = (assetId, breakdownKey) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const current = asset.portfolioDetails || getDefaultPortfolioDetails();
    const currentBreakdown = current[breakdownKey] || {};
    const total = Object.values(currentBreakdown).reduce((s, v) => s + safeNumber(v, 0), 0);
    if (total === 0) return;
    const normalized = {};
    Object.entries(currentBreakdown).forEach(([k, v]) => {
      normalized[k] = Math.round((safeNumber(v, 0) / total) * 100);
    });
    // Ajustar arredondamento para garantir soma exata
    const newTotal = Object.values(normalized).reduce((s, v) => s + v, 0);
    if (newTotal !== 100) {
      const diff = 100 - newTotal;
      const maxKey = Object.keys(normalized).reduce((a, b) => normalized[a] > normalized[b] ? a : b);
      normalized[maxKey] += diff;
    }
    updatePortfolioDetails(assetId, breakdownKey, normalized);
  };

  // Normaliza valor de input (pode vir como número direto ou evento)
  const normalizeInputValue = (valOrEvent) => {
    if (valOrEvent && typeof valOrEvent === 'object' && valOrEvent.target) {
      return valOrEvent.target.value;
    }
    return valOrEvent;
  };

  const _updateFxRate = (key, val) => {
    const rawVal = normalizeInputValue(val);
    // Permitir string vazia durante digitação
    if (rawVal === '' || rawVal === null || rawVal === undefined) {
      updateField("fx", { ...scenarioFx, [key]: '' });
      return;
    }
    // Aceitar vírgula como separador decimal
    const strVal = String(rawVal).replace(',', '.');
    const numVal = parseFloat(strVal);
    updateField("fx", { ...scenarioFx, [key]: Number.isFinite(numVal) && numVal > 0 ? numVal : '' });
  };

  // Calcular totais com conversão FX (apenas investíveis: financial + previdencia)
  const { totalBRL, byCurrency, percentages, internationalBRL: _internationalBRL, internationalPct } = useMemo(
    () => calculateFxExposure(assets, scenarioFx),
    [assets, scenarioFx]
  );

  // ✅ Novo: totalPatrimonioBRL = soma de TODOS os ativos convertidos para BRL
  // Inclui: financial, previdencia, real_estate, vehicle, business, other
  const totalPatrimonioBRL = useMemo(() => {
    let total = 0;
    for (const asset of assets) {
      const valueBRL = convertToBRL(asset, scenarioFx);
      if (Number.isFinite(valueBRL)) {
        total += valueBRL;
      } else {
        console.warn(`[AssetsPage] Ativo com valor inválido ignorado:`, asset?.name, asset?.value);
      }
    }
    return total;
  }, [assets, scenarioFx]);

  // Separar ativos por categoria
  const _groupedAssets = useMemo(() => {
    const groups = {
      financial: [],
      previdencia: [],
      international: [],
      illiquid: [],
    };

    for (const a of assets) {
      const currency = a.currency || "BRL";
      const type = a.type || "financial";

      if (type === "previdencia") {
        groups.previdencia.push(a);
      } else if (currency !== "BRL") {
        groups.international.push(a);
      } else if (["real_estate", "vehicle", "business", "other"].includes(type)) {
        groups.illiquid.push(a);
      } else {
        groups.financial.push(a);
      }
    }

    return groups;
  }, [assets]);

  // Verificar warnings de FX
  const fxWarnings = useMemo(() => {
    const warnings = [];
    for (const a of assets) {
      const result = validateAssetFx(a, scenarioFx);
      if (!result.valid && result.warning) {
        warnings.push({ assetId: a.id, assetName: a.name, warning: result.warning });
      }
    }
    return warnings;
  }, [assets, scenarioFx]);

  // ✅ Empty State quando não há ativos
  if (assets.length === 0) {
    return (
      <div className="animate-fade-in font-sans">
        <div className="max-w-xl mx-auto p-8 rounded-2xl border border-border bg-background-secondary/60 backdrop-blur-sm text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-accent/10 flex items-center justify-center">
            <PackageOpen size={32} className="text-accent" />
          </div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-2">
            Nenhum ativo cadastrado
          </h2>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            Para calcular o plano financeiro, adicione pelo menos 1 ativo.
            Pode ser uma carteira de investimentos, imóvel ou previdência privada.
          </p>

          {!readOnly && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={addAsset}
                data-guide="add-asset"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-background font-bold text-sm shadow-lg shadow-accent/30 hover:shadow-accent/50 hover:scale-[1.02] transition-all"
              >
                <Wallet size={18} />
                Adicionar carteira
              </button>
              <button
                type="button"
                onClick={addRealEstateAsset}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border text-text-secondary font-semibold text-sm hover:bg-surface-highlight hover:text-text-primary transition-all"
              >
                <Building2 size={18} />
                Adicionar imóvel
              </button>
              <button
                type="button"
                onClick={addPrevidenciaAsset}
                data-guide="add-previdencia"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border text-text-secondary font-semibold text-sm hover:bg-surface-highlight hover:text-text-primary transition-all"
              >
                <ScrollText size={18} />
                Adicionar previdência
              </button>
            </div>
          )}

          {readOnly && (
            <p className="text-xs text-text-muted italic">
              Modo visualização — edição desabilitada.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in items-start font-sans">
      {/* Câmbio do Cenário */}
      <Card title="Câmbio do Cenário" className="lg:col-span-3">
        <div className="flex flex-wrap gap-6 items-end">
          <button
            onClick={() => setShowFxSettings(!showFxSettings)}
            className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
          >
            {showFxSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showFxSettings ? "Ocultar configurações" : "Configurar câmbio"}
          </button>

          <div className="flex gap-4 text-sm text-text-secondary">
            <span>USD/BRL: <b className="text-text-primary">{safeFormatFx(scenarioFx.USD_BRL)}</b></span>
            <span>EUR/BRL: <b className="text-text-primary">{safeFormatFx(scenarioFx.EUR_BRL)}</b></span>
          </div>

          {internationalPct > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20">
              <Globe size={14} className="text-sky-400" />
              <span className="text-xs text-sky-300 font-semibold">
                Exposição internacional: {safeFormatFx(internationalPct, 1)}%
              </span>
            </div>
          )}
        </div>

        {showFxSettings && (
          <div className="mt-4 p-4 rounded-xl bg-surface-highlight/30 border border-border grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary font-semibold">USD/BRL</label>
              <input
                type="text"
                inputMode="decimal"
                value={fxInputUSD}
                onChange={(e) => setFxInputUSD(e.target.value)}
                onBlur={() => handleFxBlur("USD_BRL", fxInputUSD, setFxInputUSD)}
                disabled={readOnly}
                placeholder="5,00"
                className="mt-1 block w-full rounded-xl bg-surface-muted border border-border text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50 transition-all duration-200 px-4 py-3"
              />
              <p className="text-[10px] text-text-muted mt-1">Use vírgula ou ponto (ex: 5,31)</p>
            </div>
            <div>
              <label className="text-xs text-text-secondary font-semibold">EUR/BRL</label>
              <input
                type="text"
                inputMode="decimal"
                value={fxInputEUR}
                onChange={(e) => setFxInputEUR(e.target.value)}
                onBlur={() => handleFxBlur("EUR_BRL", fxInputEUR, setFxInputEUR)}
                disabled={readOnly}
                placeholder="5,50"
                className="mt-1 block w-full rounded-xl bg-surface-muted border border-border text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50 transition-all duration-200 px-4 py-3"
              />
              <p className="text-[10px] text-text-muted mt-1">Use vírgula ou ponto (ex: 5,50)</p>
            </div>
            <p className="text-xs text-text-muted md:col-span-2">
              Esses valores serão usados para converter ativos em USD/EUR para BRL. Clique fora do campo para aplicar.
            </p>
          </div>
        )}

        {fxWarnings.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-300">
              {fxWarnings.map((w, i) => (
                <p key={i}>{w.assetName}: {w.warning}</p>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Estrutura Patrimonial"
        className="lg:col-span-2"
        action={
          !readOnly && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" icon={ScrollText} onClick={addPrevidenciaAsset} data-guide="add-previdencia">
                Previdência
              </Button>
              <Button variant="outline" size="sm" icon={Plus} onClick={addAsset} data-guide="add-asset">
                Ativo
              </Button>
            </div>
          )
        }
      >
        {/* Lista de ativos - scroll natural da página */}
        <div className="space-y-4">
          {assets.length === 0 ? (
            <p className="text-text-muted text-sm italic py-4 text-center">
              Nenhum ativo cadastrado.
            </p>
          ) : (
            assets.map((asset) => {
              const Icon = TYPE_ICONS[asset.type] || Box;
              const currency = asset.currency || "BRL";
              const _currencySymbol = CURRENCIES.find((c) => c.value === currency)?.symbol || "R$";
              const valueBRL = convertToBRL(asset, scenarioFx);
              const isPrevidencia = asset.type === "previdencia";
              const isExpanded = expandedAssetId === asset.id;

              return (
                <div
                  key={asset.id}
                  className="group bg-surface-highlight/30 border border-border p-5 rounded-xl hover:border-accent/50 transition-all"
                >
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                      <div className={`p-3 rounded-xl bg-surface border border-border shadow-sm ${
                        currency !== "BRL" ? "text-sky-400" : isPrevidencia ? "text-violet-400" : "text-accent"
                      }`}>
                        <Icon size={20} />
                      </div>

                      <div className="flex-1 space-y-2">
                        <Input
                          value={asset.name}
                          onChange={(e) => updateAsset(asset.id, "name", e.target.value)}
                          disabled={readOnly}
                          placeholder="Nome do ativo"
                          className="font-display font-semibold text-lg bg-transparent border-none px-0 py-1 focus:ring-0 placeholder:text-text-muted/50"
                        />

                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            className="bg-transparent text-sm text-text-secondary outline-none cursor-pointer appearance-none pr-4 font-medium focus:text-accent transition-colors"
                            value={asset.type}
                            onChange={(e) => updateAsset(asset.id, "type", e.target.value)}
                            disabled={readOnly}
                            style={{
                              colorScheme: "dark",
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23D4AF37' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: `right center`,
                              backgroundRepeat: `no-repeat`,
                              backgroundSize: `1em 1em`,
                            }}
                          >
                            <option value="financial" className="bg-surface text-text-primary">Financeiro</option>
                            <option value="real_estate" className="bg-surface text-text-primary">Imóvel</option>
                            <option value="business" className="bg-surface text-text-primary">Empresa</option>
                            <option value="vehicle" className="bg-surface text-text-primary">Veículo</option>
                            <option value="previdencia" className="bg-surface text-text-primary">Previdência</option>
                            <option value="other" className="bg-surface text-text-primary">Outros</option>
                          </select>

                          <select
                            className="bg-transparent text-sm text-text-secondary outline-none cursor-pointer appearance-none pr-4 font-medium focus:text-accent transition-colors"
                            value={currency}
                            onChange={(e) => updateAsset(asset.id, "currency", e.target.value)}
                            disabled={readOnly}
                            style={{
                              colorScheme: "dark",
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%230ea5e9' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: `right center`,
                              backgroundRepeat: `no-repeat`,
                              backgroundSize: `1em 1em`,
                            }}
                          >
                            {CURRENCIES.map((c) => (
                              <option key={c.value} value={c.value} className="bg-surface text-text-primary">
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <div className="flex flex-col gap-1">
                        <div className="w-44">
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Valor ({getCurrencySymbol(currency)})
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium pointer-events-none">
                              {getCurrencySymbol(currency)}
                            </span>
                            {/* ✅ Input com formatação BRL */}
                            <CurrencyValueInput
                              value={asset.value}
                              onChange={(val) => updateAsset(asset.id, "value", val)}
                              currency={currency}
                              disabled={readOnly}
                            />
                          </div>
                        </div>

                        {currency !== "BRL" && (
                          <div className="text-xs text-text-muted">
                            ≈ {formatCurrencyBR(valueBRL)} (câmbio: {safeFormatFx(scenarioFx[`${currency}_BRL`])})
                          </div>
                        )}
                      </div>

                      {isPrevidencia && (
                        <button
                          onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                          className="p-2 rounded-lg text-text-secondary hover:text-accent hover:bg-surface-highlight transition-all"
                          title="Detalhes da previdência"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      )}

                      {/* Botão de detalhes para ativos financeiros */}
                      {asset.type === 'financial' && (
                        <button
                          onClick={() => setExpandedFinancialId(expandedFinancialId === asset.id ? null : asset.id)}
                          className="p-2 rounded-lg text-text-secondary hover:text-accent hover:bg-surface-highlight transition-all"
                          title="Detalhes da carteira"
                        >
                          {expandedFinancialId === asset.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      )}

                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAsset(asset.id)}
                          className="text-text-muted hover:text-danger hover:bg-danger-subtle opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Detalhes de Previdência */}
                  {isPrevidencia && isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-text-secondary font-semibold">Tipo de Plano</label>
                        <select
                          className="mt-1 w-full bg-surface-muted border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
                          value={asset.previdencia?.planType || "VGBL"}
                          onChange={(e) => updatePrevidenciaField(asset.id, "planType", e.target.value)}
                          disabled={readOnly}
                        >
                          {PREVIDENCIA_PLAN_TYPES.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary font-semibold">Regime Tributário</label>
                        <select
                          className="mt-1 w-full bg-surface-muted border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
                          value={asset.previdencia?.taxRegime || "regressivo"}
                          onChange={(e) => updatePrevidenciaField(asset.id, "taxRegime", e.target.value)}
                          disabled={readOnly}
                        >
                          {PREVIDENCIA_TAX_REGIMES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary font-semibold">Seguradora</label>
                        <Input
                          value={asset.previdencia?.provider || ""}
                          onChange={(e) => updatePrevidenciaField(asset.id, "provider", e.target.value)}
                          disabled={readOnly}
                          placeholder="Ex: XP, BTG, Icatu..."
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary font-semibold">Taxa Admin (% a.a.)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="5"
                          value={asset.previdencia?.adminFee ?? ""}
                          onChange={(v) => updatePrevidenciaField(asset.id, "adminFee", safeNumber(normalizeInputValue(v)))}
                          disabled={readOnly}
                          placeholder="1.0"
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs text-text-secondary font-semibold">Observações</label>
                        <Input
                          value={asset.previdencia?.notes || ""}
                          onChange={(e) => updatePrevidenciaField(asset.id, "notes", e.target.value)}
                          disabled={readOnly}
                          placeholder="Beneficiários, notas, etc."
                          className="mt-1"
                        />
                      </div>

                      {/* ✅ FIX BUG 2: Painel de detalhamento de classes para Previdência */}
                      <div className="md:col-span-3 pt-4 border-t border-border/50">
                        <FinancialPortfolioDetailsPanel
                          asset={asset}
                          readOnly={readOnly}
                          updatePortfolioDetails={(field, val) => updatePortfolioDetails(asset.id, field, val)}
                          updateBreakdownField={(breakdownKey, classKey, val) => updateBreakdownField(asset.id, breakdownKey, classKey, val)}
                          normalizeBreakdown={(breakdownKey) => normalizeBreakdown(asset.id, breakdownKey)}
                          getDefaultPortfolioDetails={getDefaultPortfolioDetails}
                        />
                      </div>
                    </div>
                  )}

                  {/* ✅ Detalhes de Carteira Financeira */}
                  {asset.type === 'financial' && expandedFinancialId === asset.id && (
                    <FinancialPortfolioDetailsPanel
                      asset={asset}
                      readOnly={readOnly}
                      updatePortfolioDetails={(field, val) => updatePortfolioDetails(asset.id, field, val)}
                      updateBreakdownField={(breakdownKey, classKey, val) => updateBreakdownField(asset.id, breakdownKey, classKey, val)}
                      normalizeBreakdown={(breakdownKey) => normalizeBreakdown(asset.id, breakdownKey)}
                      getDefaultPortfolioDetails={getDefaultPortfolioDetails}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
          <span className="font-medium text-text-secondary uppercase tracking-wider text-sm">
            Patrimônio Total (BRL)
          </span>
          <span className="font-display text-3xl font-bold text-text-primary">
            {formatCurrencyBR(totalPatrimonioBRL)}
          </span>
        </div>
      </Card>

      {/* Resumo - sticky no desktop para acompanhar scroll */}
      <Card title="Resumo da Alocação" className="bg-surface-highlight/20 lg:sticky lg:top-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Financeiro (BRL)</span>
              <span className="font-semibold text-emerald-400">{formatCurrencyBR(byCurrency.BRL)}</span>
            </div>
            {byCurrency.USD > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Internacional (USD)</span>
                <span className="font-semibold text-sky-400">{formatCurrencyBR(byCurrency.USD)}</span>
              </div>
            )}
            {byCurrency.EUR > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Internacional (EUR)</span>
                <span className="font-semibold text-sky-400">{formatCurrencyBR(byCurrency.EUR)}</span>
              </div>
            )}
            {/* ✅ Total Financeiro (BRL) = soma investíveis convertidos */}
            <div className="flex justify-between text-sm pt-2 mt-2 border-t border-border/50">
              <span className="text-text-secondary font-medium">Total Financeiro (BRL)</span>
              <span className="font-bold text-accent">{formatCurrencyBR(totalBRL)}</span>
            </div>
          </div>

          {internationalPct > 0 && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold">
                <Globe size={16} />
                Exposição Cambial
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-text-muted">BRL</div>
                  <div className="font-bold text-text-primary">{safeFormatFx(percentages.BRL, 1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-text-muted">USD</div>
                  <div className="font-bold text-sky-400">{safeFormatFx(percentages.USD, 1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-text-muted">EUR</div>
                  <div className="font-bold text-sky-400">{safeFormatFx(percentages.EUR, 1)}%</div>
                </div>
              </div>
            </div>
          )}

          <p className="text-text-muted text-xs leading-relaxed">
            A distribuição entre ativos financeiros (líquidos), previdência e bens patrimoniais impacta
            diretamente a projeção de renda na aposentadoria e os custos sucessórios.
          </p>
        </div>
      </Card>
    </div>
  );
}
