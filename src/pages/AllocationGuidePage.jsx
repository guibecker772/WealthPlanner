// src/pages/AllocationGuidePage.jsx
// ========================================
// Guia de Alocação - Feature educacional/diagnóstica
// NÃO influencia FinancialEngine, projeções, sucessão ou acompanhamento
// ========================================
import React, { useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  PieChart,
  Plus,
  Target,
  TrendingUp,
  AlertTriangle,
  Info,
  Briefcase,
  Settings2,
  Trash2,
  Copy,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Activity,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  ArrowRightLeft,
  FileText,
  Printer,
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
  ASSET_CLASSES,
  ASSET_CLASS_LABELS,
  createDefaultAllocationGuide,
  createDefaultPortfolio,
  calculatePortfolioDiagnostics,
  validateBreakdownSum,
  normalizeBreakdownTo100,
  optimizeAllocation,
  calculateAllocationDelta,
  PROFILE_LIMITS,
  DEFAULT_RETURNS_NOMINAL,
  DEFAULT_VOLS,
  classifyRiskLevel,
  getPortfolioValueBRL,
  runBreakdownChecks,
  sugerirAjustes,
  applySuggestion,
  buildCurrentAllocationFromAssets,
  createImportedPortfolio,
  compareAllocations,
  PORTFOLIO_TEMPLATES,
  SOFT_CONSTRAINTS,
  validateSoftConstraints,
} from "../utils/allocationMath";
import { formatCurrencyBR, formatPercent } from "../utils/format";
import { 
  generateAllocationGuideCSV, 
  downloadCSV, 
  printAllocationGuide 
} from "../utils/exportAllocationGuide";

// -----------------------------------------
// Helpers locais para formatação segura
// -----------------------------------------

// Descrições curtas de cada classe de ativo
const ASSET_CLASS_DESCRIPTIONS = {
  cash: 'Liquidez diária, reserva de emergência',
  pos: 'Pós-fixados atrelados ao CDI (CDBs, LCI, LCA)',
  pre: 'Títulos pré-fixados (LTN, CDB pré)',
  ipca: 'Inflação + juros (NTN-B, Tesouro IPCA+)',
  acoes: 'Ações brasileiras (B3)',
  fiis: 'Fundos Imobiliários',
  exterior: 'Ativos internacionais (ETFs, BDRs, stocks)',
  outros: 'Alternativos, criptos, opções, etc.',
};

// Parse seguro de número em formato pt-BR ("1.234,56" → 1234.56)
function safeParsePtBrNumber(str) {
  if (str === null || str === undefined || str === '') return null;
  // Remove tudo exceto dígitos, vírgula, ponto e sinal negativo
  const cleaned = String(str).replace(/[^\d,.-]/g, '');
  // pt-BR: "1.234,56" → remove pontos (milhares), troca vírgula por ponto
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

// Formata porcentagem segura (evita toFixed em undefined)
function safeFormatPercent(n, decimals = 1) {
  const val = Number(n);
  if (!Number.isFinite(val)) return '0';
  return val.toFixed(decimals).replace('.', ',');
}

// Formata porcentagem para exibição (retorna "—" se não calculável)
// eslint-disable-next-line no-unused-vars
function safeDisplayPercent(n, decimals = 1) {
  const val = Number(n);
  if (!Number.isFinite(val) || isNaN(val)) return '—';
  return val.toFixed(decimals).replace('.', ',') + '%';
}

// Formata valor monetário seguro com símbolo
function safeFormatMoney(n, currency = 'BRL') {
  const val = Number(n);
  if (!Number.isFinite(val)) return currency === 'BRL' ? 'R$ 0,00' : currency === 'USD' ? 'US$ 0.00' : '€ 0.00';
  
  const symbols = { BRL: 'R$', USD: 'US$', EUR: '€' };
  const symbol = symbols[currency] || currency;
  
  // Sempre usar separador pt-BR para exibição
  const formatted = val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${formatted}`;
}

// -----------------------------------------
// Componente Principal
// -----------------------------------------
export default function AllocationGuidePage() {
  const ctx = useOutletContext() || {};
  const { clientData, updateField, readOnly } = ctx;

  // Garantir que allocationGuide existe (inicializa defaults se necessário)
  const allocationGuide = useMemo(() => {
    if (clientData?.allocationGuide) {
      return clientData.allocationGuide;
    }
    return createDefaultAllocationGuide(clientData);
  }, [clientData]);

  // Estado local para carteira selecionada
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    allocationGuide.portfolios?.[0]?.id || null
  );

  // Estado para carteira de comparação (FASE 6)
  const [comparisonPortfolioId, setComparisonPortfolioId] = useState(null);

  // Estado para edição de nome
  const [editingNameId, setEditingNameId] = useState(null);
  const [editingName, setEditingName] = useState("");

  // Estado para mostrar premissas avançadas
  const [showAdvancedAssumptions, setShowAdvancedAssumptions] = useState(false);

  // ✅ FASE 5: Modo cliente (simplificado, oculta seções técnicas)
  const clientModeEnabled = allocationGuide.clientModeEnabled ?? false;

  // Estado para modal de confirmação de export (quando breakdown != 100%)
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [pendingExportAction, setPendingExportAction] = useState(null); // 'csv' | 'print'

  // Estados locais para inputs numéricos (evita travar ao digitar)
  const [localTotalValue, setLocalTotalValue] = useState('');
  const [localFxOverride, setLocalFxOverride] = useState('');
  const [localBreakdown, setLocalBreakdown] = useState({});

  // ✅ TAREFA B: Estado local para input de retorno/volatilidade objetivo
  // Permite digitar vírgula sem bug de cursor
  const [localTargetValueStr, setLocalTargetValueStr] = useState('');

  // Sincronizar localTargetValueStr quando muda objective no allocationGuide
  React.useEffect(() => {
    const mode = allocationGuide.objective?.mode || 'targetReturn';
    const val = mode === 'targetReturn'
      ? (allocationGuide.objective?.targetRealReturn || 0.05) * 100
      : (allocationGuide.objective?.targetVol || 0.10) * 100;
    // Formatar com 1 casa decimal, vírgula como separador
    setLocalTargetValueStr(val.toFixed(1).replace('.', ','));
  }, [allocationGuide.objective?.mode, allocationGuide.objective?.targetRealReturn, allocationGuide.objective?.targetVol]);

  // Sincronizar estados locais quando muda a carteira selecionada
  React.useEffect(() => {
    if (selectedPortfolioId && allocationGuide.portfolios) {
      const portfolio = allocationGuide.portfolios.find(p => p.id === selectedPortfolioId);
      if (portfolio) {
        // Inicializar valor total
        const tv = portfolio.totalValue;
        setLocalTotalValue(
          tv != null && tv !== '' && Number.isFinite(Number(tv)) 
            ? Number(tv).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : ''
        );
        // Inicializar fxOverride
        const fx = portfolio.fxOverride;
        setLocalFxOverride(
          fx != null && fx !== '' && Number.isFinite(Number(fx))
            ? Number(fx).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
            : ''
        );
        // Inicializar breakdown
        const bd = portfolio.breakdown || {};
        const bdLocal = {};
        for (const cls of ASSET_CLASSES) {
          const v = bd[cls];
          bdLocal[cls] = v != null && v !== '' && Number.isFinite(Number(v)) ? String(v).replace('.', ',') : '';
        }
        setLocalBreakdown(bdLocal);
      }
    }
  }, [selectedPortfolioId, allocationGuide.portfolios]);

  // Carteira selecionada
  const selectedPortfolio = useMemo(() => {
    return allocationGuide.portfolios?.find((p) => p.id === selectedPortfolioId) || null;
  }, [allocationGuide.portfolios, selectedPortfolioId]);

  // Diagnóstico da carteira selecionada
  const diagnostics = useMemo(() => {
    if (!selectedPortfolio?.breakdown) return null;
    return calculatePortfolioDiagnostics(selectedPortfolio.breakdown, allocationGuide.assumptions);
  }, [selectedPortfolio, allocationGuide.assumptions]);

  // Validação do breakdown
  const breakdownValidation = useMemo(() => {
    if (!selectedPortfolio?.breakdown) return { valid: true, sum: 0, delta: 0 };
    return validateBreakdownSum(selectedPortfolio.breakdown);
  }, [selectedPortfolio]);

  // ✅ FASE 5: Validação de soft constraints (guardrails)
  const constraintValidation = useMemo(() => {
    if (!selectedPortfolio?.breakdown) return { valid: true, warnings: [] };
    const profile = allocationGuide.objective?.profile || 'moderado';
    return validateSoftConstraints(selectedPortfolio.breakdown, profile);
  }, [selectedPortfolio, allocationGuide.objective?.profile]);

  // FASE 6: Verificar se há carteiras com breakdown inválido (para guardrail de export)
  const hasInvalidBreakdowns = useMemo(() => {
    if (!allocationGuide.portfolios?.length) return false;
    return allocationGuide.portfolios.some(p => {
      const validation = validateBreakdownSum(p.breakdown || {});
      return !validation.valid;
    });
  }, [allocationGuide.portfolios]);

  // FASE 6: Warnings de FX (quando há carteiras em moeda estrangeira sem fx definido)
  const fxWarnings = useMemo(() => {
    const warnings = [];
    const fx = clientData?.fx || {};
    const hasUSD = allocationGuide.portfolios?.some(p => p.currency === 'USD');
    const hasEUR = allocationGuide.portfolios?.some(p => p.currency === 'EUR');
    
    if (hasUSD && (!fx.USD_BRL || fx.USD_BRL <= 0)) {
      warnings.push('Câmbio USD/BRL não definido. Usando valor padrão (5.00).');
    }
    if (hasEUR && (!fx.EUR_BRL || fx.EUR_BRL <= 0)) {
      warnings.push('Câmbio EUR/BRL não definido. Usando valor padrão (5.50).');
    }
    return warnings;
  }, [allocationGuide.portfolios, clientData?.fx]);

  // -----------------------------------------
  // FASE 5: Alocação Atual do Patrimônio
  // -----------------------------------------
  
  // ScenarioFx para conversão de moedas (ler do clientData)
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

  // Carteira importada (se existir)
  const importedPortfolio = useMemo(() => {
    const importedId = allocationGuide.importedPortfolioId;
    if (!importedId) return null;
    return allocationGuide.portfolios?.find(p => p.id === importedId) || null;
  }, [allocationGuide.portfolios, allocationGuide.importedPortfolioId]);

  // Carteira de comparação (pode ser selecionada pelo toggle ou usa selectedPortfolio)
  const comparisonPortfolio = useMemo(() => {
    // Se tem comparisonPortfolioId definido, usar ela
    if (comparisonPortfolioId) {
      return allocationGuide.portfolios?.find(p => p.id === comparisonPortfolioId) || null;
    }
    // Senão, usar a carteira selecionada (exceto se for a importada)
    if (selectedPortfolio && selectedPortfolio.id !== allocationGuide.importedPortfolioId) {
      return selectedPortfolio;
    }
    // Se a selecionada é a importada, usar a primeira que não é
    return allocationGuide.portfolios?.find(p => p.id !== allocationGuide.importedPortfolioId) || null;
  }, [comparisonPortfolioId, selectedPortfolio, allocationGuide.portfolios, allocationGuide.importedPortfolioId]);

  // Comparação entre carteira atual e planejada
  const comparisonResult = useMemo(() => {
    if (!comparisonPortfolio?.breakdown || currentAllocation.totalBRL <= 0) return null;
    const result = compareAllocations(currentAllocation.byClassPercent, comparisonPortfolio.breakdown);
    
    // Adicionar Top 3 desvios ordenados por magnitude
    const sortedDeltas = ASSET_CLASSES
      .map(cls => ({ cls, delta: result.deltas[cls] || 0, abs: Math.abs(result.deltas[cls] || 0) }))
      .sort((a, b) => b.abs - a.abs)
      .slice(0, 3)
      .filter(d => d.abs > 0);
    
    // Maior excesso e maior falta
    const maxExcess = ASSET_CLASSES.reduce((max, cls) => {
      const delta = result.deltas[cls] || 0;
      return delta > (max?.delta || 0) ? { cls, delta } : max;
    }, null);
    
    const maxDeficit = ASSET_CLASSES.reduce((min, cls) => {
      const delta = result.deltas[cls] || 0;
      return delta < (min?.delta || 0) ? { cls, delta } : min;
    }, null);
    
    return { ...result, topDesvios: sortedDeltas, maxExcess, maxDeficit };
  }, [currentAllocation, comparisonPortfolio]);

  // Função para atualizar allocationGuide no draft
  // IMPORTANTE: Deve ser declarada ANTES de qualquer handler que a use
  const updateAllocationGuide = useCallback((newGuide) => {
    if (typeof updateField === "function") {
      updateField("allocationGuide", newGuide);
    }
  }, [updateField]);

  // ✅ TAREFA A: Função unificada para aplicar sugestão E setar comparação automaticamente
  // Quando o usuário clica "Aplicar", a carteira é atualizada e automaticamente selecionada para comparação
  const applySuggestionAndSetComparison = useCallback((newBreakdown, sourceLabel = 'Sugestão') => {
    let targetPortfolioId = selectedPortfolioId;
    let portfolios = [...(allocationGuide.portfolios || [])];
    
    // Se não há carteira selecionada, criar uma nova
    if (!targetPortfolioId || !portfolios.find(p => p.id === targetPortfolioId)) {
      const newPortfolio = {
        id: `portfolio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: `Carteira Planejada (${sourceLabel})`,
        totalValue: currentAllocation?.totalBRL || 0,
        currency: 'BRL',
        breakdown: { ...newBreakdown },
        createdAt: new Date().toISOString(),
        fromSuggestion: true,
      };
      portfolios.push(newPortfolio);
      targetPortfolioId = newPortfolio.id;
    } else {
      // Atualizar breakdown da carteira existente
      portfolios = portfolios.map(p =>
        p.id === targetPortfolioId ? { ...p, breakdown: { ...newBreakdown } } : p
      );
    }
    
    // Atualizar allocationGuide
    const newGuide = { ...allocationGuide, portfolios };
    updateAllocationGuide(newGuide);
    
    // Setar a carteira como selecionada
    setSelectedPortfolioId(targetPortfolioId);
    
    // ✅ Setar automaticamente o dropdown de comparação para a carteira que recebeu a sugestão
    setComparisonPortfolioId(targetPortfolioId);
    
    // Atualizar estados locais do breakdown para refletir imediatamente na UI
    const bdLocal = {};
    for (const cls of ASSET_CLASSES) {
      bdLocal[cls] = newBreakdown[cls] != null ? String(newBreakdown[cls]).replace('.', ',') : '';
    }
    setLocalBreakdown(bdLocal);
    
    // Feedback visual (opcional - pode ser expandido com toast)
    console.info(`[AllocationGuide] Sugestão aplicada: "${sourceLabel}" → carteira ${targetPortfolioId} selecionada para comparação`);
  }, [selectedPortfolioId, allocationGuide, currentAllocation, updateAllocationGuide]);

  // Handler: Importar carteira do patrimônio
  // FIX BUG 4: Guards e tratamento melhorado
  const handleImportFromAssets = useCallback(() => {
    // Guard: verificar se há patrimônio
    const total = Number(currentAllocation?.totalBRL) || 0;
    if (total <= 0) {
      console.warn('[AllocationGuide] handleImportFromAssets: totalBRL <= 0, abortando');
      return;
    }
    
    // Guard: verificar se updateAllocationGuide está disponível
    if (typeof updateAllocationGuide !== 'function') {
      console.error('[AllocationGuide] handleImportFromAssets: updateAllocationGuide não é função');
      return;
    }
    
    const newPortfolio = createImportedPortfolio(currentAllocation);
    if (!newPortfolio || !newPortfolio.id) {
      console.error('[AllocationGuide] handleImportFromAssets: createImportedPortfolio retornou inválido');
      return;
    }
    
    const existingImportedId = allocationGuide.importedPortfolioId;
    
    // Se já existe uma carteira importada, substituir
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
    };
    
    updateAllocationGuide(newGuide);
    setSelectedPortfolioId(existingImportedId || newPortfolio.id);
  }, [currentAllocation, allocationGuide, updateAllocationGuide]);

  // Handler: Criar nova carteira
  const handleAddPortfolio = useCallback(() => {
    const newPortfolio = createDefaultPortfolio(`Carteira ${(allocationGuide.portfolios?.length || 0) + 1}`);
    const newGuide = {
      ...allocationGuide,
      portfolios: [...(allocationGuide.portfolios || []), newPortfolio],
    };
    updateAllocationGuide(newGuide);
    setSelectedPortfolioId(newPortfolio.id);
  }, [allocationGuide, updateAllocationGuide]);

  // ✅ FASE 5: Handler: Criar carteira a partir de template
  const handleAddFromTemplate = useCallback((templateKey) => {
    const template = PORTFOLIO_TEMPLATES[templateKey];
    if (!template) return;
    
    const newPortfolio = {
      id: `portfolio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: template.name,
      description: template.description,
      totalValue: 0,
      currency: 'BRL',
      breakdown: { ...template.breakdown },
      createdAt: new Date().toISOString(),
      fromTemplate: templateKey,
    };
    
    const newGuide = {
      ...allocationGuide,
      portfolios: [...(allocationGuide.portfolios || []), newPortfolio],
    };
    updateAllocationGuide(newGuide);
    setSelectedPortfolioId(newPortfolio.id);
  }, [allocationGuide, updateAllocationGuide]);

  // Handler: Excluir carteira
  const handleDeletePortfolio = useCallback((portfolioId) => {
    const newPortfolios = allocationGuide.portfolios.filter((p) => p.id !== portfolioId);
    const newGuide = { ...allocationGuide, portfolios: newPortfolios };
    updateAllocationGuide(newGuide);
    
    // Se excluiu a selecionada, selecionar outra
    if (portfolioId === selectedPortfolioId) {
      setSelectedPortfolioId(newPortfolios[0]?.id || null);
    }
  }, [allocationGuide, selectedPortfolioId, updateAllocationGuide]);

  // Handler: Duplicar carteira
  const handleDuplicatePortfolio = useCallback((portfolio) => {
    const duplicate = {
      ...portfolio,
      id: `portfolio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: `${portfolio.name} (cópia)`,
    };
    const newGuide = {
      ...allocationGuide,
      portfolios: [...allocationGuide.portfolios, duplicate],
    };
    updateAllocationGuide(newGuide);
    setSelectedPortfolioId(duplicate.id);
  }, [allocationGuide, updateAllocationGuide]);

  // Handler: Iniciar edição de nome
  const handleStartEditName = useCallback((portfolio) => {
    setEditingNameId(portfolio.id);
    setEditingName(portfolio.name);
  }, []);

  // Handler: Salvar nome editado
  const handleSaveEditName = useCallback(() => {
    if (!editingNameId || !editingName.trim()) {
      setEditingNameId(null);
      return;
    }
    const newPortfolios = allocationGuide.portfolios.map((p) =>
      p.id === editingNameId ? { ...p, name: editingName.trim() } : p
    );
    updateAllocationGuide({ ...allocationGuide, portfolios: newPortfolios });
    setEditingNameId(null);
    setEditingName("");
  }, [editingNameId, editingName, allocationGuide, updateAllocationGuide]);

  // Handler: Cancelar edição de nome
  const handleCancelEditName = useCallback(() => {
    setEditingNameId(null);
    setEditingName("");
  }, []);

  // Handler: Atualizar campo da carteira selecionada
  const updateSelectedPortfolio = useCallback((field, value) => {
    if (!selectedPortfolioId) return;
    const newPortfolios = allocationGuide.portfolios.map((p) =>
      p.id === selectedPortfolioId ? { ...p, [field]: value } : p
    );
    updateAllocationGuide({ ...allocationGuide, portfolios: newPortfolios });
  }, [selectedPortfolioId, allocationGuide, updateAllocationGuide]);

  // -----------------------------------------
  // FASE 6: Handlers de Export
  // -----------------------------------------
  
  // Função interna para executar export CSV
  const doExportCSV = useCallback(() => {
    if (!allocationGuide.portfolios?.length) return;
    
    const csvContent = generateAllocationGuideCSV({
      portfolios: allocationGuide.portfolios,
      assumptions: allocationGuide.assumptions,
      scenarioFx,
      scenarioName: clientData?.name || 'Cenário',
    });
    
    const filename = `guia-alocacao-${(clientData?.name || 'cenario').replace(/\s+/g, '-').toLowerCase()}.csv`;
    downloadCSV(csvContent, filename);
  }, [allocationGuide.portfolios, allocationGuide.assumptions, scenarioFx, clientData?.name]);
  
  // Função interna para executar print
  const doPrint = useCallback(() => {
    printAllocationGuide({
      portfolios: allocationGuide.portfolios || [],
      assumptions: allocationGuide.assumptions,
      scenarioFx,
      scenarioName: clientData?.name || 'Cenário',
      currentAllocation,
    });
  }, [allocationGuide.portfolios, allocationGuide.assumptions, scenarioFx, clientData?.name, currentAllocation]);

  // Handler: Exportar CSV (com verificação de breakdown)
  const handleExportCSV = useCallback(() => {
    if (!allocationGuide.portfolios?.length) return;
    
    if (hasInvalidBreakdowns) {
      setPendingExportAction('csv');
      setShowExportConfirm(true);
      return;
    }
    
    doExportCSV();
  }, [allocationGuide.portfolios, hasInvalidBreakdowns, doExportCSV]);
  
  // Handler: Imprimir / PDF (com verificação de breakdown)
  const handlePrint = useCallback(() => {
    if (hasInvalidBreakdowns) {
      setPendingExportAction('print');
      setShowExportConfirm(true);
      return;
    }
    
    doPrint();
  }, [hasInvalidBreakdowns, doPrint]);

  // Handler: Confirmar export (quando breakdown inválido)
  const handleConfirmExport = useCallback(() => {
    if (pendingExportAction === 'csv') {
      doExportCSV();
    } else if (pendingExportAction === 'print') {
      doPrint();
    }
    setShowExportConfirm(false);
    setPendingExportAction(null);
  }, [pendingExportAction, doExportCSV, doPrint]);

  // Handler: Cancelar export
  const handleCancelExport = useCallback(() => {
    setShowExportConfirm(false);
    setPendingExportAction(null);
  }, []);

  // Verificar se contexto está disponível
  if (!clientData || typeof updateField !== "function") {
    return (
      <div className="p-6 rounded-2xl border border-border bg-surface/40 text-text-secondary">
        Dados do cenário indisponíveis no momento.
      </div>
    );
  }


  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Modal de confirmação de export (quando breakdown inválido) */}
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
                  Uma ou mais carteiras têm breakdown que não soma 100%. 
                  Deseja exportar mesmo assim?
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

      {/* Warning de FX */}
      {fxWarnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-400">
            {fxWarnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
          {/* Botões de Export */}
          {allocationGuide.portfolios?.length > 0 && (
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
              Esta análise é independente das projeções de aposentadoria
            </span>
          </div>
        </div>
      </div>

      {/* Grid principal */}
      
      {/* -----------------------------------------
          FASE 5: Cards de Integração com Patrimônio
          ----------------------------------------- */}
      
      {/* Card: Carteira Atual do Cliente (estimada a partir do Patrimônio) */}
      <Card 
        title="Carteira Atual do Cliente (Patrimônio)" 
        icon={Activity}
        className="mb-6"
      >
        {clientData?.assets?.length === 0 || currentAllocation.totalBRL <= 0 ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-surface-highlight flex items-center justify-center">
              <AlertCircle size={24} className="text-text-muted" />
            </div>
            <p className="text-text-secondary text-sm">
              Nenhum ativo investível cadastrado no Patrimônio.
            </p>
            <p className="text-text-muted text-xs mt-1">
              Cadastre ativos em Patrimônio → Ativos para usar esta funcionalidade.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-surface-highlight border border-border">
                <p className="text-text-muted text-xs mb-1">Total Investível</p>
                <p className="text-lg font-bold text-text-primary">
                  {safeFormatMoney(currentAllocation.totalBRL, 'BRL')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-highlight border border-border">
                <p className="text-text-muted text-xs mb-1">Ativos Mapeados</p>
                <p className="text-lg font-bold text-text-primary">
                  {(clientData?.assets || []).filter(a => 
                    !['real_estate', 'vehicle', 'business'].includes(a.type)
                  ).length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-highlight border border-border">
                <p className="text-text-muted text-xs mb-1">Classes c/ Alocação</p>
                <p className="text-lg font-bold text-text-primary">
                  {ASSET_CLASSES.filter(cls => currentAllocation.byClassPercent[cls] > 0).length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-highlight border border-border">
                <p className="text-text-muted text-xs mb-1">Maior Concentração</p>
                <p className="text-lg font-bold text-accent">
                  {(() => {
                    const max = Math.max(...ASSET_CLASSES.map(c => currentAllocation.byClassPercent[c] || 0));
                    const cls = ASSET_CLASSES.find(c => (currentAllocation.byClassPercent[c] || 0) === max);
                    return cls ? `${ASSET_CLASS_LABELS[cls]}: ${safeFormatPercent(max)}%` : '-';
                  })()}
                </p>
              </div>
            </div>

            {/* Breakdown por classe */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ASSET_CLASSES.map(cls => {
                const pct = currentAllocation.byClassPercent[cls] || 0;
                const value = currentAllocation.byClassValueBRL[cls] || 0;
                return (
                  <div key={cls} className="p-2 rounded-lg bg-surface border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-muted">{ASSET_CLASS_LABELS[cls]}</span>
                      <span className="text-xs font-medium text-text-primary">{safeFormatPercent(pct)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-highlight rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full transition-all" 
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1">{safeFormatMoney(value, 'BRL')}</p>
                  </div>
                );
              })}
            </div>

            {/* Diagnósticos */}
            {currentAllocation.diagnostics?.length > 0 && (
              <div className="space-y-2">
                {currentAllocation.diagnostics.map((d, i) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                      d.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    {d.severity === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
                    <span>{d.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
              {!readOnly && (
                <>
                  {importedPortfolio ? (
                    <Button 
                      onClick={handleImportFromAssets} 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw size={14} />
                      Atualizar carteira importada
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleImportFromAssets} 
                      variant="primary" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Download size={14} />
                      Criar carteira a partir do Patrimônio
                    </Button>
                  )}
                </>
              )}
              
              {importedPortfolio && (
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <CheckCircle size={12} className="text-success" />
                  Carteira importada: {importedPortfolio.name}
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Card: Comparação (Atual vs Planejada) */}
      {currentAllocation.totalBRL > 0 && allocationGuide.portfolios?.length > 0 && (
        <Card 
          title="Comparação: Atual vs Planejada" 
          icon={ArrowRightLeft}
          className="mb-6"
        >
          <div className="space-y-4">
            {/* Toggle para escolher carteira planejada */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Comparar com:</span>
                <select
                  value={comparisonPortfolioId || comparisonPortfolio?.id || ''}
                  onChange={(e) => setComparisonPortfolioId(e.target.value || null)}
                  className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {allocationGuide.portfolios
                    .filter(p => p.id !== allocationGuide.importedPortfolioId)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  }
                </select>
              </div>
              
              {/* Top 3 desvios resumo */}
              {comparisonResult?.topDesvios?.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  {comparisonResult.maxExcess?.delta > 0 && (
                    <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                      Excesso: {ASSET_CLASS_LABELS[comparisonResult.maxExcess.cls]} (+{safeFormatPercent(comparisonResult.maxExcess.delta)}pp)
                    </span>
                  )}
                  {comparisonResult.maxDeficit?.delta < 0 && (
                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                      Falta: {ASSET_CLASS_LABELS[comparisonResult.maxDeficit.cls]} ({safeFormatPercent(comparisonResult.maxDeficit.delta)}pp)
                    </span>
                  )}
                </div>
              )}
            </div>

            {comparisonResult && comparisonPortfolio ? (
              <>
                {/* Header com labels */}
                <div className="grid grid-cols-4 gap-2 text-xs text-text-muted font-medium border-b border-border pb-2">
                  <span>Classe</span>
                  <span className="text-center">Atual</span>
                  <span className="text-center">{comparisonPortfolio.name}</span>
                  <span className="text-center">Δ Delta</span>
                </div>

                {/* Linhas por classe */}
                {ASSET_CLASSES.map(cls => {
                  const current = currentAllocation.byClassPercent[cls] || 0;
                  const planned = comparisonPortfolio.breakdown?.[cls] || 0;
                  const delta = comparisonResult.deltas[cls] || 0;
                  const deltaColor = delta > 2 ? 'text-amber-400' : delta < -2 ? 'text-blue-400' : 'text-text-secondary';
                  const deltaSign = delta > 0 ? '+' : '';

                  return (
                    <div key={cls} className="grid grid-cols-4 gap-2 text-sm items-center py-1 border-b border-border/30">
                      <span className="text-text-primary font-medium">{ASSET_CLASS_LABELS[cls]}</span>
                      <span className="text-center text-text-secondary">{safeFormatPercent(current)}%</span>
                      <span className="text-center text-text-secondary">{safeFormatPercent(planned)}%</span>
                      <span className={`text-center font-medium ${deltaColor}`}>
                        {deltaSign}{safeFormatPercent(delta)}pp
                      </span>
                    </div>
                  );
                })}

                {/* Top 3 Desvios */}
                {comparisonResult.topDesvios?.length > 0 && (
                  <div className="pt-3 space-y-2">
                    <p className="text-xs text-text-muted font-medium mb-2">Top 3 maiores desvios:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {comparisonResult.topDesvios.map((d, i) => (
                        <div 
                          key={d.cls}
                          className={`p-2 rounded-lg text-xs flex items-center justify-between ${
                            d.delta > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'
                          }`}
                        >
                          <span className="font-medium text-text-primary">
                            #{i + 1} {ASSET_CLASS_LABELS[d.cls]}
                          </span>
                          <span className={d.delta > 0 ? 'text-amber-400' : 'text-blue-400'}>
                            {d.delta > 0 ? '+' : ''}{safeFormatPercent(d.delta)}pp
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insights detalhados */}
                {comparisonResult.insights?.length > 0 && (
                  <div className="pt-3 space-y-2">
                    <p className="text-xs text-text-muted font-medium mb-2">Recomendações:</p>
                    {comparisonResult.insights.slice(0, 3).map((ins, i) => (
                      <div 
                        key={i} 
                        className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                          ins.direction === 'over' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {ins.direction === 'over' ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                        <span>{ins.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {comparisonResult.insights?.length === 0 && (
                  <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-center">
                    <CheckCircle size={20} className="text-success mx-auto mb-1" />
                    <p className="text-sm text-success font-medium">
                      Sua alocação atual está alinhada com o planejado!
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-text-muted text-sm">
                Selecione uma carteira planejada para comparar.
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Coluna 1: Lista de Carteiras */}
        <div className="lg:col-span-1">
          <Card 
            title="Carteiras do Cliente" 
            icon={Briefcase}
            className="h-full"
          >
            {allocationGuide.portfolios?.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-highlight flex items-center justify-center">
                  <Briefcase size={28} className="text-text-muted" />
                </div>
                <p className="text-text-secondary mb-4">
                  Nenhuma carteira cadastrada
                </p>
                {!readOnly && (
                  <Button onClick={handleAddPortfolio} variant="primary" size="sm">
                    <Plus size={16} className="mr-2" />
                    Criar primeira carteira
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {allocationGuide.portfolios.map((portfolio) => {
                  const isSelected = portfolio.id === selectedPortfolioId;
                  const isEditing = editingNameId === portfolio.id;
                  const diag = calculatePortfolioDiagnostics(portfolio.breakdown, allocationGuide.assumptions);

                  return (
                    <div
                      key={portfolio.id}
                      className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-accent bg-accent/10"
                          : "border-border bg-surface-muted hover:border-accent/50"
                      }`}
                      onClick={() => !isEditing && setSelectedPortfolioId(portfolio.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditName();
                                  if (e.key === "Escape") handleCancelEditName();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 px-2 py-1 text-sm bg-surface border border-accent rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                autoFocus
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSaveEditName(); }}
                                className="p-1 text-success hover:bg-success/20 rounded"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCancelEditName(); }}
                                className="p-1 text-danger hover:bg-danger/20 rounded"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="font-semibold text-text-primary truncate">{portfolio.name}</p>
                              <p className="text-sm text-text-secondary">
                                {formatCurrencyBR(portfolio.totalValue || 0)}
                                {portfolio.currency !== "BRL" && ` (${portfolio.currency})`}
                              </p>
                            </>
                          )}
                        </div>
                        
                        {!isEditing && (
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-right text-xs">
                              <p className="text-accent font-medium">
                                {formatPercent(diag.returnReal * 100, { decimals: 1 })} real
                              </p>
                              <p className="text-text-muted">
                                Vol: {formatPercent(diag.volatility * 100, { decimals: 1 })}
                              </p>
                            </div>
                            
                            {/* Ações (visíveis no hover) */}
                            {!readOnly && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStartEditName(portfolio); }}
                                  className="p-1 text-text-muted hover:text-accent hover:bg-accent/20 rounded"
                                  title="Renomear"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDuplicatePortfolio(portfolio); }}
                                  className="p-1 text-text-muted hover:text-accent hover:bg-accent/20 rounded"
                                  title="Duplicar"
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeletePortfolio(portfolio.id); }}
                                  className="p-1 text-text-muted hover:text-danger hover:bg-danger/20 rounded"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {!readOnly && (
                  <div className="mt-3 space-y-2">
                    <Button
                      onClick={handleAddPortfolio}
                      variant="ghost"
                      size="sm"
                      className="w-full"
                    >
                      <Plus size={16} className="mr-2" />
                      Nova Carteira
                    </Button>

                    {/* ✅ FASE 5: Templates rápidos */}
                    <div className="flex gap-1">
                      {Object.entries(PORTFOLIO_TEMPLATES).map(([key, tpl]) => (
                        <button
                          key={key}
                          onClick={() => handleAddFromTemplate(key)}
                          className="flex-1 py-1.5 px-2 text-xs rounded-lg border border-border bg-surface-muted hover:bg-surface-elevated hover:border-accent/40 text-text-secondary hover:text-text-primary transition-colors"
                          title={tpl.description}
                        >
                          {key === 'conservador' && '🛡️'}
                          {key === 'moderado' && '⚖️'}
                          {key === 'arrojado' && '🚀'}
                          <span className="ml-1 capitalize">{key}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Coluna 2: Detalhes da Carteira */}
        <div className="space-y-6">
          {!selectedPortfolio ? (
            <Card className="h-full flex items-center justify-center py-16">
              <div className="text-center">
                <PieChart size={48} className="mx-auto mb-4 text-text-muted" />
                <p className="text-text-secondary">
                  Selecione ou crie uma carteira para ver os detalhes
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Card: Composição */}
              <Card title={`Composição: ${selectedPortfolio.name}`} icon={PieChart}>
                {/* Nome da Carteira */}
                <div className="mb-6">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Nome da Carteira
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl bg-surface-muted border border-border text-text-primary px-4 py-3 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50"
                    value={selectedPortfolio.name || ''}
                    onChange={(e) => updateSelectedPortfolio("name", e.target.value)}
                    disabled={readOnly}
                    placeholder="Nome da carteira"
                  />
                </div>

                {/* Valor, Moeda e FX Override */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Moeda */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Moeda
                    </label>
                    <select
                      className="w-full rounded-xl bg-surface-muted border border-border text-text-primary px-4 py-3 focus:outline-none focus:border-accent/70"
                      value={selectedPortfolio.currency || "BRL"}
                      onChange={(e) => {
                        updateSelectedPortfolio("currency", e.target.value);
                        // Limpar fxOverride se voltar para BRL
                        if (e.target.value === "BRL") {
                          updateSelectedPortfolio("fxOverride", null);
                          setLocalFxOverride('');
                        }
                      }}
                      disabled={readOnly}
                    >
                      <option value="BRL">BRL (Real)</option>
                      <option value="USD">USD (Dólar)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>

                  {/* Valor Total */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Valor Total
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">
                        {selectedPortfolio.currency === "BRL" ? "R$" : selectedPortfolio.currency === "USD" ? "US$" : "€"}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full rounded-xl bg-surface-muted border border-border text-text-primary pl-12 pr-4 py-3 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50"
                        value={localTotalValue}
                        onChange={(e) => {
                          // Permitir apenas dígitos, vírgula, ponto
                          const raw = e.target.value.replace(/[^\d.,]/g, '');
                          setLocalTotalValue(raw);
                        }}
                        onBlur={() => {
                          const parsed = safeParsePtBrNumber(localTotalValue);
                          const finalVal = parsed !== null && parsed >= 0 ? parsed : 0;
                          updateSelectedPortfolio("totalValue", finalVal);
                          // Re-formatar exibição
                          setLocalTotalValue(
                            finalVal > 0 
                              ? finalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : ''
                          );
                        }}
                        disabled={readOnly}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* FX Override (só para moedas estrangeiras) */}
                  {selectedPortfolio.currency !== "BRL" && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Câmbio (override)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full rounded-xl bg-surface-muted border border-border text-text-primary px-4 py-3 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50"
                        value={localFxOverride}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d.,]/g, '');
                          setLocalFxOverride(raw);
                        }}
                        onBlur={() => {
                          const parsed = safeParsePtBrNumber(localFxOverride);
                          // Se vazio ou inválido, salvar como null
                          if (parsed === null || parsed <= 0) {
                            updateSelectedPortfolio("fxOverride", null);
                            setLocalFxOverride('');
                          } else {
                            updateSelectedPortfolio("fxOverride", parsed);
                            setLocalFxOverride(parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
                          }
                        }}
                        disabled={readOnly}
                        placeholder="Ex: 5,31"
                      />
                    </div>
                  )}
                </div>

                {/* Conversão estimada para BRL (moedas estrangeiras) */}
                {selectedPortfolio.currency !== "BRL" && (
                  <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Info size={14} className="text-blue-400" />
                      <span className="text-text-secondary">
                        Conversão estimada:{" "}
                        <span className="font-semibold text-text-primary">
                          {(() => {
                            const tv = selectedPortfolio.totalValue || 0;
                            const fxUsed = selectedPortfolio.fxOverride || clientData?.fxRates?.[selectedPortfolio.currency] || (selectedPortfolio.currency === 'USD' ? 5.0 : 5.5);
                            const converted = tv * fxUsed;
                            return safeFormatMoney(converted, 'BRL');
                          })()}
                        </span>
                        {" "}(usando {selectedPortfolio.fxOverride ? 'câmbio manual' : 'câmbio do cenário'}: {safeFormatPercent(selectedPortfolio.fxOverride || clientData?.fxRates?.[selectedPortfolio.currency] || (selectedPortfolio.currency === 'USD' ? 5.0 : 5.5), 2)})
                      </span>
                    </div>
                  </div>
                )}

                {/* Breakdown por classe */}
                <div className="space-y-4">
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
                        {!breakdownValidation.valid && ` (${breakdownValidation.delta > 0 ? '+' : ''}${safeFormatPercent(breakdownValidation.delta, 1)})`}
                      </span>
                      {!breakdownValidation.valid && !readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const normalized = normalizeBreakdownTo100(selectedPortfolio.breakdown);
                            updateSelectedPortfolio("breakdown", normalized);
                            // Atualizar estados locais também
                            const bdLocal = {};
                            for (const cls of ASSET_CLASSES) {
                              bdLocal[cls] = normalized[cls] != null ? String(normalized[cls]).replace('.', ',') : '';
                            }
                            setLocalBreakdown(bdLocal);
                          }}
                          className="text-xs"
                        >
                          Normalizar para 100%
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Barra visual de alocação */}
                  <div className="h-6 rounded-lg overflow-hidden flex bg-surface-muted">
                    {ASSET_CLASSES.map((cls, idx) => {
                      const pct = Number(selectedPortfolio.breakdown?.[cls]) || 0;
                      if (pct <= 0) return null;
                      const colors = [
                        "bg-emerald-500", "bg-blue-500", "bg-cyan-500", "bg-indigo-500",
                        "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-gray-500"
                      ];
                      return (
                        <div
                          key={cls}
                          className={`${colors[idx]} transition-all duration-300`}
                          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                          title={`${ASSET_CLASS_LABELS[cls]}: ${safeFormatPercent(pct, 1)}%`}
                        />
                      );
                    })}
                  </div>

                  {/* Inputs por classe (grid 2x4) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ASSET_CLASSES.map((cls, idx) => {
                      const colors = [
                        "border-l-emerald-500", "border-l-blue-500", "border-l-cyan-500", "border-l-indigo-500",
                        "border-l-purple-500", "border-l-pink-500", "border-l-orange-500", "border-l-gray-500"
                      ];
                      return (
                        <div key={cls} className={`p-3 rounded-lg bg-surface-muted border-l-4 ${colors[idx]}`}>
                          <label className="block text-xs text-text-muted mb-1 truncate" title={ASSET_CLASS_DESCRIPTIONS[cls]}>
                            {ASSET_CLASS_LABELS[cls]}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full bg-transparent text-text-primary font-semibold text-lg focus:outline-none"
                              value={localBreakdown[cls] ?? ''}
                              onChange={(e) => {
                                // Permitir apenas dígitos, vírgula, ponto
                                const raw = e.target.value.replace(/[^\d.,]/g, '');
                                setLocalBreakdown(prev => ({ ...prev, [cls]: raw }));
                              }}
                              onBlur={() => {
                                const parsed = safeParsePtBrNumber(localBreakdown[cls]);
                                const finalVal = parsed !== null && parsed >= 0 ? parsed : 0;
                                // Atualizar no draft
                                const newBreakdown = { ...selectedPortfolio.breakdown, [cls]: finalVal };
                                updateSelectedPortfolio("breakdown", newBreakdown);
                                // Re-formatar exibição local
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

                  {/* Legenda das classes */}
                  <div className="mt-4 p-4 rounded-xl bg-surface-muted border border-border">
                    <p className="text-xs font-semibold text-text-secondary mb-2">Legenda das classes:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-text-muted">
                      {ASSET_CLASSES.map((cls, idx) => {
                        const dotColors = [
                          "bg-emerald-500", "bg-blue-500", "bg-cyan-500", "bg-indigo-500",
                          "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-gray-500"
                        ];
                        return (
                          <div key={cls} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${dotColors[idx]}`} />
                            <span className="font-medium text-text-secondary">{ASSET_CLASS_LABELS[cls]}:</span>
                            <span>{ASSET_CLASS_DESCRIPTIONS[cls]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alerta se breakdown inválido */}
                  {!breakdownValidation.valid && (
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                        <div className="text-text-secondary">
                          <span className="font-medium text-yellow-400">Atenção:</span> A soma dos percentuais deve ser exatamente 100%.
                          {Math.abs(breakdownValidation.delta) > 0 && (
                            <span> Atualmente está {breakdownValidation.delta > 0 ? 'acima' : 'abaixo'} em {safeFormatPercent(Math.abs(breakdownValidation.delta), 1)}%.</span>
                          )}
                          {' '}Clique em "Normalizar" para ajustar automaticamente.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ✅ FASE 5: Alertas de Soft Constraints (Guardrails) */}
                  {constraintValidation.warnings.length > 0 && (
                    <div className="space-y-2">
                      {constraintValidation.warnings.map((warning, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl ${
                            warning.severity === 'error'
                              ? 'bg-rose-500/10 border border-rose-500/20'
                              : 'bg-amber-500/10 border border-amber-500/20'
                          }`}
                        >
                          <div className="flex items-start gap-2 text-sm">
                            <AlertTriangle
                              size={16}
                              className={`mt-0.5 shrink-0 ${
                                warning.severity === 'error' ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            />
                            <div className="text-text-secondary">
                              <span className={`font-medium ${
                                warning.severity === 'error' ? 'text-rose-400' : 'text-amber-400'
                              }`}>
                                {warning.severity === 'error' ? 'Limite excedido:' : 'Atenção:'}
                              </span>{' '}
                              {warning.message}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notas */}
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Notas (opcional)
                    </label>
                    <textarea
                      className="w-full rounded-xl bg-surface-muted border border-border text-text-primary px-4 py-3 text-sm focus:outline-none focus:border-accent/70 resize-none"
                      rows={2}
                      value={selectedPortfolio.notes || ""}
                      onChange={(e) => updateSelectedPortfolio("notes", e.target.value)}
                      disabled={readOnly}
                      placeholder="Observações sobre esta carteira..."
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Diagnóstico */}
              <Card title="Diagnóstico da Carteira" icon={TrendingUp}>
                {diagnostics ? (
                  <>
                    {/* Badge de nível de risco */}
                    {(() => {
                      const riskLevel = classifyRiskLevel(diagnostics.volatility);
                      const riskColors = {
                        green: 'bg-green-500/20 text-green-400 border-green-500/30',
                        yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                        orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                        red: 'bg-red-500/20 text-red-400 border-red-500/30',
                      };
                      return (
                        <div className={`mb-4 p-3 rounded-xl border flex items-center gap-3 ${riskColors[riskLevel.color]}`}>
                          <Shield size={20} />
                          <div>
                            <span className="font-semibold">{riskLevel.level}</span>
                            <p className="text-xs opacity-80">{riskLevel.description}</p>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 rounded-xl bg-surface-muted border border-border">
                        <p className="text-xs text-text-muted mb-1">Retorno Nominal (a.a.)</p>
                        <p className="text-2xl font-display font-bold text-text-primary">
                          {formatPercent(diagnostics.returnNominal * 100, { decimals: 2 })}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          Retorno bruto esperado
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
                        <p className="text-xs text-accent mb-1">Retorno Real (a.a.)</p>
                        <p className="text-2xl font-display font-bold text-accent">
                          {formatPercent(diagnostics.returnReal * 100, { decimals: 2 })}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          Descontada inflação de {formatPercent((allocationGuide.assumptions?.inflationAnnual || 0.05) * 100, { decimals: 1 })}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-muted border border-border">
                        <p className="text-xs text-text-muted mb-1">Volatilidade (a.a.)</p>
                        <p className="text-2xl font-display font-bold text-text-primary">
                          {formatPercent(diagnostics.volatility * 100, { decimals: 2 })}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          Desvio padrão anual
                        </p>
                      </div>
                    </div>

                    {/* Risco em R$ (se valor informado) */}
                    {(() => {
                      const valueBRL = getPortfolioValueBRL(selectedPortfolio, clientData?.fxRates);
                      if (valueBRL > 0) {
                        const riskBRL = valueBRL * diagnostics.volatility;
                        return (
                          <div className="mt-4 p-4 rounded-xl bg-surface-muted border border-border">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-text-muted mb-1">Risco estimado (desvio padrão em R$)</p>
                                <p className="text-xl font-display font-bold text-text-primary">
                                  ± {safeFormatMoney(riskBRL, 'BRL')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-text-muted mb-1">Valor da carteira em BRL</p>
                                <p className="text-lg font-semibold text-text-secondary">
                                  {safeFormatMoney(valueBRL, 'BRL')}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-text-muted mt-2">
                              Em um ano típico, sua carteira pode variar aproximadamente este valor para cima ou para baixo.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </>
                ) : (
                  <p className="text-text-secondary text-center py-4">
                    Configure a composição para ver o diagnóstico
                  </p>
                )}

                {/* Explicação educativa */}
                <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Info size={18} className="text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-text-secondary">
                      <p className="font-medium text-blue-400 mb-1">O que significam esses números?</p>
                      <p>
                        <strong>Volatilidade</strong> é o "sobe e desce" esperado da sua carteira em um ano. 
                        Uma volatilidade de 10% significa que, em um ano típico, sua carteira pode variar 
                        cerca de 10% para cima ou para baixo do retorno esperado.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card: Insights & Checagens */}
              <Card title="Insights & Checagens" icon={Zap}>
                {(() => {
                  // Checagens automáticas
                  const checks = runBreakdownChecks(selectedPortfolio.breakdown, selectedPortfolio);
                  
                  // Sugestões de ajuste
                  const targetReal = allocationGuide.objective?.targetRealReturn || 0.06;
                  const maxVol = allocationGuide.objective?.targetVol || 0.15;
                  const suggestions = diagnostics 
                    ? sugerirAjustes(selectedPortfolio.breakdown, diagnostics, { targetRealReturn: targetReal, maxVolatility: maxVol })
                    : [];

                  const hasIssues = checks.length > 0;
                  const hasSuggestions = suggestions.length > 0;

                  return (
                    <div className="space-y-4">
                      {/* Checagens */}
                      {hasIssues && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                            <Activity size={16} />
                            Checagens Automáticas
                          </p>
                          {checks.map((check, idx) => {
                            const severityStyles = {
                              error: 'bg-red-500/10 border-red-500/30 text-red-400',
                              warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
                              info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                            };
                            const SeverityIcon = check.severity === 'error' ? AlertCircle : check.severity === 'warning' ? AlertTriangle : Info;
                            return (
                              <div key={idx} className={`p-3 rounded-lg border flex items-start gap-2 ${severityStyles[check.severity]}`}>
                                <SeverityIcon size={16} className="mt-0.5 shrink-0" />
                                <span className="text-sm">{check.message}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Status OK */}
                      {!hasIssues && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          <span className="text-sm text-green-400">Todas as checagens passaram!</span>
                        </div>
                      )}

                      {/* Sugestões de Ajuste */}
                      {hasSuggestions && (
                        <div className="space-y-3 mt-4">
                          <p className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                            <Zap size={16} />
                            Sugestões de Ajuste
                          </p>
                          {suggestions.map((sug, _idx) => (
                            <div key={sug.id} className="p-4 rounded-xl bg-surface-muted border border-border">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="font-semibold text-text-primary text-sm">{sug.title}</p>
                                  <p className="text-xs text-text-secondary mt-1">{sug.description}</p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {sug.changes.map((change, cIdx) => (
                                      <span 
                                        key={cIdx} 
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          change.deltaPP > 0 
                                            ? 'bg-green-500/20 text-green-400' 
                                            : 'bg-red-500/20 text-red-400'
                                        }`}
                                      >
                                        {ASSET_CLASS_LABELS[change.cls]}: {change.deltaPP > 0 ? '+' : ''}{change.deltaPP}pp
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {!readOnly && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // ✅ TAREFA A: Usar função unificada que aplica E seta comparação
                                      const newBreakdown = applySuggestion(selectedPortfolio.breakdown, sug.changes);
                                      applySuggestionAndSetComparison(newBreakdown, sug.title);
                                    }}
                                    className="shrink-0"
                                  >
                                    <Check size={14} className="mr-1" />
                                    Aplicar
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sem sugestões */}
                      {!hasSuggestions && diagnostics && (
                        <div className="p-3 rounded-lg bg-surface-muted border border-border text-center">
                          <p className="text-sm text-text-muted">
                            Nenhuma sugestão de ajuste no momento. A carteira está alinhada com seus objetivos.
                          </p>
                        </div>
                      )}

                      {/* Explicação */}
                      <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-start gap-3">
                          <Info size={18} className="text-amber-400 mt-0.5 shrink-0" />
                          <div className="text-sm text-text-secondary">
                            <p className="font-medium text-amber-400 mb-1">Sobre os insights</p>
                            <p>
                              As sugestões são baseadas em heurísticas simples comparando sua alocação atual 
                              com os objetivos definidos (retorno real de {formatPercent(targetReal * 100, { decimals: 1 })} e 
                              volatilidade máxima de {formatPercent(maxVol * 100, { decimals: 1 })}). 
                              Ajuste os objetivos no card abaixo para refinar as sugestões.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>

              {/* Card: Objetivo e Sugestão */}
              <Card title="Objetivo e Sugestão" icon={Target}>
                {/* Seleção de modo */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-text-secondary block mb-2">
                    O que você busca?
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (readOnly) return;
                        const updated = {
                          ...allocationGuide,
                          objective: {
                            ...allocationGuide.objective,
                            mode: "targetReturn",
                          },
                        };
                        updateField("allocationGuide", updated);
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        allocationGuide.objective?.mode === "targetReturn"
                          ? "bg-accent text-white"
                          : "bg-surface-muted border border-border text-text-secondary hover:bg-surface-elevated"
                      }`}
                      disabled={readOnly}
                    >
                      Buscar retorno real
                    </button>
                    <button
                      onClick={() => {
                        if (readOnly) return;
                        const updated = {
                          ...allocationGuide,
                          objective: {
                            ...allocationGuide.objective,
                            mode: "targetRisk",
                          },
                        };
                        updateField("allocationGuide", updated);
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        allocationGuide.objective?.mode === "targetRisk"
                          ? "bg-accent text-white"
                          : "bg-surface-muted border border-border text-text-secondary hover:bg-surface-elevated"
                      }`}
                      disabled={readOnly}
                    >
                      Limitar volatilidade
                    </button>
                  </div>
                </div>

                {/* Input do objetivo */}
                {/* ✅ TAREFA B: Usar estado local para permitir vírgula sem bug de cursor */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-text-secondary block mb-2">
                    {allocationGuide.objective?.mode === "targetReturn"
                      ? "Retorno real desejado (% a.a.)"
                      : "Volatilidade máxima (% a.a.)"}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={localTargetValueStr}
                      onChange={(e) => {
                        if (readOnly) return;
                        // Apenas salvar o texto digitado (permite vírgula e ponto)
                        setLocalTargetValueStr(e.target.value);
                      }}
                      onBlur={(e) => {
                        if (readOnly) return;
                        // Parse pt-BR: trocar vírgula por ponto
                        const raw = e.target.value.trim().replace(',', '.');
                        const parsed = parseFloat(raw);
                        
                        if (!isNaN(parsed) && Number.isFinite(parsed)) {
                          // Clamp entre 0 e 30
                          const clamped = Math.max(0, Math.min(30, parsed));
                          const key = allocationGuide.objective?.mode === "targetReturn" ? "targetRealReturn" : "targetVol";
                          const updated = {
                            ...allocationGuide,
                            objective: {
                              ...allocationGuide.objective,
                              [key]: clamped / 100,
                            },
                          };
                          updateField("allocationGuide", updated);
                          // Reformatar para pt-BR
                          setLocalTargetValueStr(clamped.toFixed(1).replace('.', ','));
                        } else {
                          // Valor inválido: restaurar do state
                          const mode = allocationGuide.objective?.mode || 'targetReturn';
                          const val = mode === 'targetReturn'
                            ? (allocationGuide.objective?.targetRealReturn || 0.05) * 100
                            : (allocationGuide.objective?.targetVol || 0.10) * 100;
                          setLocalTargetValueStr(val.toFixed(1).replace('.', ','));
                          console.warn('[AllocationGuide] Valor inválido para objetivo:', e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur(); // Força onBlur ao pressionar Enter
                        }
                      }}
                      className="w-24 text-center"
                      disabled={readOnly}
                    />
                    <span className="text-text-muted">% a.a.</span>
                  </div>
                </div>

                {/* Perfil de risco (para limites) */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-text-secondary block mb-2">
                    Perfil de risco (limita renda variável)
                  </label>
                  <div className="flex gap-2">
                    {Object.keys(PROFILE_LIMITS).map((profile) => (
                      <button
                        key={profile}
                        onClick={() => {
                          if (readOnly) return;
                          const updated = {
                            ...allocationGuide,
                            objective: {
                              ...allocationGuide.objective,
                              profile,
                            },
                          };
                          updateField("allocationGuide", updated);
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                          (allocationGuide.objective?.profile || "moderado") === profile
                            ? "bg-accent text-white"
                            : "bg-surface-muted border border-border text-text-secondary hover:bg-surface-elevated"
                        }`}
                        disabled={readOnly}
                      >
                        {profile}
                        <span className="block text-xs opacity-70">
                          (até {PROFILE_LIMITS[profile].maxRV * 100}% RV)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resultado da otimização */}
                {(() => {
                  const result = optimizeAllocation(
                    allocationGuide.objective || {},
                    allocationGuide.assumptions || {},
                    allocationGuide.objective?.profile || "moderado"
                  );

                  if (!result.feasible) {
                    return (
                      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={18} className="text-yellow-400 mt-0.5 shrink-0" />
                          <div className="text-sm text-text-secondary">
                            <p className="font-medium text-yellow-400 mb-1">Objetivo não atingível</p>
                            <p>{result.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const delta = selectedPortfolio
                    ? calculateAllocationDelta(selectedPortfolio.breakdown, result.recommended)
                    : null;

                  return (
                    <div className="space-y-4">
                      {/* Alocação recomendada */}
                      <div className="p-4 rounded-xl bg-surface-muted border border-border">
                        <p className="text-sm font-medium text-accent mb-3">Alocação Recomendada</p>
                        <div className="space-y-2">
                          {ASSET_CLASSES.map((cls) => {
                            // ✅ FASE 4 FIX: breakdown já está em 0-100, não multiplicar
                            const weight = result.recommended[cls] || 0;
                            const deltaVal = delta ? delta[cls] : 0;
                            if (weight === 0 && Math.abs(deltaVal) < 0.1) return null;
                            
                            return (
                              <div key={cls} className="flex items-center gap-3">
                                <span className="w-24 text-xs text-text-muted">
                                  {ASSET_CLASS_LABELS[cls]}
                                </span>
                                <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent transition-all"
                                    style={{ width: `${weight}%` }}
                                  />
                                </div>
                                <span className="w-16 text-right text-sm font-medium">
                                  {formatPercent(weight, { decimals: 0 })}
                                </span>
                                {delta && Math.abs(deltaVal) >= 0.5 && (
                                  <span
                                    className={`w-16 text-right text-xs font-medium ${
                                      deltaVal > 0 ? "text-green-400" : "text-red-400"
                                    }`}
                                  >
                                    {deltaVal > 0 ? "+" : ""}{formatPercent(deltaVal, { decimals: 0 })}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Diagnóstico da alocação recomendada */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                          <p className="text-xs text-text-muted">Retorno Nominal</p>
                          <p className="text-lg font-bold text-green-400">
                            {formatPercent(result.diagnostics.returnNominal * 100, { decimals: 1 })}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                          <p className="text-xs text-text-muted">Retorno Real</p>
                          <p className="text-lg font-bold text-blue-400">
                            {formatPercent(result.diagnostics.returnReal * 100, { decimals: 1 })}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                          <p className="text-xs text-text-muted">Volatilidade</p>
                          <p className="text-lg font-bold text-purple-400">
                            {formatPercent(result.diagnostics.volatility * 100, { decimals: 1 })}
                          </p>
                        </div>
                      </div>

                      {/* Botão aplicar sugestão */}
                      {!readOnly && (
                        <Button
                          onClick={() => {
                            // ✅ TAREFA A: Usar função unificada que aplica E seta comparação
                            applySuggestionAndSetComparison({ ...result.recommended }, 'Otimização');
                          }}
                          variant="primary"
                          className="w-full"
                        >
                          <Check size={16} className="mr-2" />
                          Aplicar sugestão à carteira selecionada
                        </Button>
                      )}
                    </div>
                  );
                })()}

                {/* Explicação */}
                <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Info size={18} className="text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-text-secondary">
                      <p className="font-medium text-blue-400 mb-1">Como funciona o otimizador?</p>
                      <p>
                        O sistema busca a melhor alocação que atinge seu objetivo (retorno ou risco) 
                        respeitando os limites do perfil selecionado. A otimização usa premissas de 
                        retorno e risco por classe de ativo baseadas em médias históricas.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card: Premissas Avançadas (collapsible) - Oculto em modo cliente */}
              {!clientModeEnabled && (
              <Card 
                title="Premissas do Modelo" 
                icon={Settings2}
                action={
                  <div className="flex items-center gap-3">
                    {/* ✅ FASE 5: Toggle Modo Cliente */}
                    <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer" title="Modo simplificado para apresentação ao cliente">
                      <input
                        type="checkbox"
                        checked={clientModeEnabled}
                        onChange={(e) => {
                          if (!readOnly) {
                            updateAllocationGuide({ ...allocationGuide, clientModeEnabled: e.target.checked });
                          }
                        }}
                        disabled={readOnly}
                        className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/50 bg-surface-muted"
                      />
                      <span>Modo Cliente</span>
                    </label>
                    <button
                      onClick={() => setShowAdvancedAssumptions(!showAdvancedAssumptions)}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
                    >
                      {showAdvancedAssumptions ? (
                        <>
                          <ChevronUp size={14} />
                          Ocultar
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          Expandir
                        </>
                      )}
                    </button>
                  </div>
                }
              >
                {/* Resumo sempre visível */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted border border-border">
                  <div className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">Inflação:</span>{" "}
                    {formatPercent((allocationGuide.assumptions?.inflationAnnual || 0.05) * 100, { decimals: 1 })} a.a.
                  </div>
                  <div className="text-xs text-text-muted">
                    Clique em "Expandir" para editar
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {showAdvancedAssumptions && (
                  <div className="mt-4 space-y-6 animate-fade-in">
                    {/* Inflação */}
                    <div>
                      <label className="text-sm font-medium text-text-secondary block mb-2">
                        Inflação esperada (% a.a.)
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={formatPercent((allocationGuide.assumptions?.inflationAnnual || 0.05) * 100, { decimals: 1, showSymbol: false })}
                          onChange={(e) => {
                            if (readOnly) return;
                            const raw = e.target.value.replace(/[^\d,.-]/g, "").replace(",", ".");
                            const parsed = parseFloat(raw);
                            if (!isNaN(parsed)) {
                              const updated = {
                                ...allocationGuide,
                                assumptions: {
                                  ...allocationGuide.assumptions,
                                  inflationAnnual: parsed / 100,
                                },
                              };
                              updateField("allocationGuide", updated);
                            }
                          }}
                          className="w-24 text-center"
                          disabled={readOnly}
                        />
                        <span className="text-text-muted">% a.a.</span>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = {
                                ...allocationGuide,
                                assumptions: {
                                  ...allocationGuide.assumptions,
                                  inflationAnnual: 0.05,
                                },
                              };
                              updateField("allocationGuide", updated);
                            }}
                            className="text-xs"
                          >
                            Restaurar (5%)
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Retornos por classe */}
                    <div>
                      <label className="text-sm font-medium text-text-secondary block mb-2">
                        Retornos nominais por classe (% a.a.)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {ASSET_CLASSES.map((cls) => {
                          const currentReturns = allocationGuide.assumptions?.classReturnsNominal || DEFAULT_RETURNS_NOMINAL;
                          const currentVal = (currentReturns[cls] || DEFAULT_RETURNS_NOMINAL[cls]) * 100;
                          return (
                            <div key={cls} className="p-2 rounded-lg bg-surface-muted border border-border">
                              <label className="block text-xs text-text-muted mb-1 truncate">
                                {ASSET_CLASS_LABELS[cls]}
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="w-full bg-transparent text-text-primary font-semibold text-sm focus:outline-none"
                                  value={formatPercent(currentVal, { decimals: 1, showSymbol: false })}
                                  onChange={(e) => {
                                    if (readOnly) return;
                                    const raw = e.target.value.replace(/[^\d,.-]/g, "").replace(",", ".");
                                    const parsed = parseFloat(raw);
                                    if (!isNaN(parsed)) {
                                      const updated = {
                                        ...allocationGuide,
                                        assumptions: {
                                          ...allocationGuide.assumptions,
                                          classReturnsNominal: {
                                            ...(allocationGuide.assumptions?.classReturnsNominal || DEFAULT_RETURNS_NOMINAL),
                                            [cls]: parsed / 100,
                                          },
                                        },
                                      };
                                      updateField("allocationGuide", updated);
                                    }
                                  }}
                                  disabled={readOnly}
                                />
                                <span className="text-text-muted text-xs">%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Volatilidades por classe */}
                    <div>
                      <label className="text-sm font-medium text-text-secondary block mb-2">
                        Volatilidade por classe (% a.a.)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {ASSET_CLASSES.map((cls) => {
                          const currentVols = allocationGuide.assumptions?.classVolAnnual || DEFAULT_VOLS;
                          const currentVal = (currentVols[cls] || DEFAULT_VOLS[cls]) * 100;
                          return (
                            <div key={cls} className="p-2 rounded-lg bg-surface-muted border border-border">
                              <label className="block text-xs text-text-muted mb-1 truncate">
                                {ASSET_CLASS_LABELS[cls]}
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="w-full bg-transparent text-text-primary font-semibold text-sm focus:outline-none"
                                  value={formatPercent(currentVal, { decimals: 1, showSymbol: false })}
                                  onChange={(e) => {
                                    if (readOnly) return;
                                    const raw = e.target.value.replace(/[^\d,.-]/g, "").replace(",", ".");
                                    const parsed = parseFloat(raw);
                                    if (!isNaN(parsed)) {
                                      const updated = {
                                        ...allocationGuide,
                                        assumptions: {
                                          ...allocationGuide.assumptions,
                                          classVolAnnual: {
                                            ...(allocationGuide.assumptions?.classVolAnnual || DEFAULT_VOLS),
                                            [cls]: parsed / 100,
                                          },
                                        },
                                      };
                                      updateField("allocationGuide", updated);
                                    }
                                  }}
                                  disabled={readOnly}
                                />
                                <span className="text-text-muted text-xs">%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botão restaurar defaults */}
                    {!readOnly && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = {
                              ...allocationGuide,
                              assumptions: {
                                inflationAnnual: 0.05,
                                classReturnsNominal: { ...DEFAULT_RETURNS_NOMINAL },
                                classVolAnnual: { ...DEFAULT_VOLS },
                              },
                            };
                            updateField("allocationGuide", updated);
                          }}
                          className="text-xs"
                        >
                          Restaurar todos os defaults
                        </Button>
                      </div>
                    )}

                    {/* Explicação sobre premissas */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                        <div className="text-sm text-text-secondary">
                          <p className="font-medium text-amber-400 mb-1">Sobre as premissas</p>
                          <p>
                            Os valores default são baseados em médias históricas e expectativas de mercado. 
                            Altere-os com cautela, pois afetam diretamente os resultados do otimizador e diagnóstico.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
              )}

              {/* ✅ FASE 5: Toggle para Modo Cliente quando premissas estão ocultas */}
              {clientModeEnabled && (
                <div className="p-3 rounded-xl bg-surface-muted border border-border flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">Modo Cliente</span> ativo — visão simplificada
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => updateAllocationGuide({ ...allocationGuide, clientModeEnabled: false })}
                      className="text-xs text-accent hover:text-accent/80 underline"
                    >
                      Voltar ao modo completo
                    </button>
                  )}
                </div>
              )}

              {/* Card: Mapa Risco x Retorno (Scatter Chart) */}
              <Card title="Mapa Risco × Retorno" icon={TrendingUp}>
                {(() => {
                  // Calcular diagnósticos de todas as carteiras para o gráfico
                  const portfolioDiags = (allocationGuide.portfolios || []).map((p) => {
                    const diag = calculatePortfolioDiagnostics(p.breakdown, allocationGuide.assumptions);
                    return {
                      id: p.id,
                      name: p.name,
                      returnReal: diag.returnReal,
                      volatility: diag.volatility,
                      isSelected: p.id === selectedPortfolioId,
                    };
                  });

                  // Calcular resultado do otimizador para incluir no gráfico
                  const optResult = optimizeAllocation(
                    allocationGuide.objective || {},
                    allocationGuide.assumptions || {},
                    allocationGuide.objective?.profile || "moderado"
                  );

                  // Determinar escalas do gráfico
                  const allPoints = portfolioDiags.map((p) => ({ x: p.volatility, y: p.returnReal }));
                  if (optResult.feasible) {
                    allPoints.push({ x: optResult.diagnostics.volatility, y: optResult.diagnostics.returnReal });
                  }
                  
                  // Garantir range mínimo
                  const xVals = allPoints.map((p) => p.x);
                  const yVals = allPoints.map((p) => p.y);
                  const xMin = Math.max(0, Math.min(...xVals, 0) - 0.02);
                  const xMax = Math.max(...xVals, 0.20) + 0.02;
                  const yMin = Math.min(...yVals, 0) - 0.01;
                  const yMax = Math.max(...yVals, 0.10) + 0.01;

                  // Dimensões do SVG
                  const width = 400;
                  const height = 250;
                  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
                  const plotWidth = width - padding.left - padding.right;
                  const plotHeight = height - padding.top - padding.bottom;

                  // Funções de escala
                  const scaleX = (val) => padding.left + ((val - xMin) / (xMax - xMin)) * plotWidth;
                  const scaleY = (val) => padding.top + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;

                  return (
                    <div className="space-y-4">
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md mx-auto">
                        {/* Grid lines */}
                        {[0.05, 0.10, 0.15, 0.20].filter((v) => v >= xMin && v <= xMax).map((v) => (
                          <line
                            key={`vx-${v}`}
                            x1={scaleX(v)}
                            y1={padding.top}
                            x2={scaleX(v)}
                            y2={height - padding.bottom}
                            stroke="currentColor"
                            strokeOpacity="0.1"
                            strokeDasharray="2,2"
                          />
                        ))}
                        {[0, 0.02, 0.04, 0.06, 0.08, 0.10].filter((v) => v >= yMin && v <= yMax).map((v) => (
                          <line
                            key={`hy-${v}`}
                            x1={padding.left}
                            y1={scaleY(v)}
                            x2={width - padding.right}
                            y2={scaleY(v)}
                            stroke="currentColor"
                            strokeOpacity="0.1"
                            strokeDasharray="2,2"
                          />
                        ))}

                        {/* Eixos */}
                        <line
                          x1={padding.left}
                          y1={height - padding.bottom}
                          x2={width - padding.right}
                          y2={height - padding.bottom}
                          stroke="currentColor"
                          strokeOpacity="0.3"
                        />
                        <line
                          x1={padding.left}
                          y1={padding.top}
                          x2={padding.left}
                          y2={height - padding.bottom}
                          stroke="currentColor"
                          strokeOpacity="0.3"
                        />

                        {/* Labels dos eixos */}
                        <text
                          x={width / 2}
                          y={height - 5}
                          textAnchor="middle"
                          className="fill-current text-text-muted text-xs"
                        >
                          Volatilidade (%)
                        </text>
                        <text
                          x={12}
                          y={height / 2}
                          textAnchor="middle"
                          transform={`rotate(-90, 12, ${height / 2})`}
                          className="fill-current text-text-muted text-xs"
                        >
                          Retorno Real (%)
                        </text>

                        {/* Pontos das carteiras */}
                        {portfolioDiags.map((p) => (
                          <g key={p.id}>
                            <circle
                              cx={scaleX(p.volatility)}
                              cy={scaleY(p.returnReal)}
                              r={p.isSelected ? 8 : 6}
                              className={p.isSelected ? "fill-accent" : "fill-blue-500"}
                              opacity={p.isSelected ? 1 : 0.7}
                            />
                            <text
                              x={scaleX(p.volatility)}
                              y={scaleY(p.returnReal) - 12}
                              textAnchor="middle"
                              className={`text-xs ${p.isSelected ? "fill-accent" : "fill-current text-text-muted"}`}
                            >
                              {p.name.length > 12 ? `${p.name.slice(0, 12)}...` : p.name}
                            </text>
                          </g>
                        ))}

                        {/* Ponto da sugestão */}
                        {optResult.feasible && (
                          <g>
                            <circle
                              cx={scaleX(optResult.diagnostics.volatility)}
                              cy={scaleY(optResult.diagnostics.returnReal)}
                              r={7}
                              className="fill-green-500"
                              strokeWidth={2}
                              stroke="white"
                            />
                            <text
                              x={scaleX(optResult.diagnostics.volatility)}
                              y={scaleY(optResult.diagnostics.returnReal) - 12}
                              textAnchor="middle"
                              className="fill-green-400 text-xs font-medium"
                            >
                              Sugestão
                            </text>
                          </g>
                        )}
                      </svg>

                      {/* Legenda */}
                      <div className="flex flex-wrap justify-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-accent" />
                          <span className="text-text-secondary">Selecionada</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500 opacity-70" />
                          <span className="text-text-secondary">Outras carteiras</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                          <span className="text-text-secondary">Sugestão otimizada</span>
                        </div>
                      </div>

                      {/* Explicação */}
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-start gap-3">
                          <Info size={18} className="text-blue-400 mt-0.5 shrink-0" />
                          <div className="text-sm text-text-secondary">
                            <p className="font-medium text-blue-400 mb-1">Como ler este gráfico?</p>
                            <p>
                              Cada ponto representa uma carteira. <strong>Quanto mais à direita</strong>, maior 
                              o risco (volatilidade). <strong>Quanto mais acima</strong>, maior o retorno esperado. 
                              O objetivo é buscar pontos no <strong>canto superior esquerdo</strong> — alto retorno 
                              com baixo risco.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
