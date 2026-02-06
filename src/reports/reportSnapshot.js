// src/reports/reportSnapshot.js
// Camada de "Fonte Única de Verdade" para geração de PDF
// Extrai e normaliza dados do mesmo output do Engine que a UI usa

import { getEffectiveFxRate, calculateFxExposure, DEFAULT_FX_RATES } from "../utils/fx";
import { ASSET_TYPES } from "../constants/assetTypes";
import FinancialEngine from "../engine/FinancialEngine";
import { calculateAlternativeScenarios } from "../utils/simulationModes";

// ========================================
// HELPERS
// ========================================

function toNumber(v, fallback = 0) {
  if (v == null) return fallback;
  if (typeof v === "string") {
    const s = v.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Gera chave estável para dedupe de ativos
 */
function generateAssetKey(asset) {
  if (asset?.id) return asset.id;
  
  const parts = [
    asset?.type || "financial",
    asset?.provider || asset?.instituicao || "",
    asset?.name || asset?.titulo || "",
    asset?.currency || "BRL",
    String(toNumber(asset?.value ?? asset?.amount ?? asset?.amountCurrency ?? 0)),
  ];
  
  return parts.map(p => normalizeText(p)).join("|");
}

/**
 * Mapeia tipo interno para label amigável usando ASSET_TYPES
 */
function getAssetTypeLabel(type) {
  const normalized = normalizeText(type);
  
  // Mapeamento direto
  if (ASSET_TYPES[normalized]?.label) {
    return ASSET_TYPES[normalized].label;
  }
  
  // Mapeamentos alternativos
  const mappings = {
    "financial": "Financeiro",
    "financeiro": "Financeiro",
    "real_estate": "Imóvel",
    "imovel": "Imóvel",
    "imóvel": "Imóvel",
    "imoveis": "Imóvel",
    "vehicle": "Veículo",
    "veiculo": "Veículo",
    "veículo": "Veículo",
    "previdencia": "Previdência",
    "previdência": "Previdência",
    "international": "Internacional",
    "internacional": "Internacional",
    "business": "Empresa",
    "empresa": "Empresa",
    "other": "Outros",
    "outros": "Outros",
  };
  
  return mappings[normalized] || type || "Outros";
}

/**
 * Determina "tese" do planejamento baseado nos dados
 */
function derivePlanningThesis(clientData, goals = []) {
  const hasRetirementGoal = goals.some(g => {
    const name = normalizeText(g?.name || g?.titulo || "");
    return name.includes("aposentadoria") || name.includes("retirement");
  });
  
  const hasFinancialFreedomGoal = goals.some(g => {
    const name = normalizeText(g?.name || g?.titulo || "");
    return name.includes("liberdade") || name.includes("freedom") || name.includes("independencia");
  });
  
  const hasSuccessionFocus = goals.some(g => {
    const name = normalizeText(g?.name || g?.titulo || "");
    return name.includes("sucessao") || name.includes("heranca") || name.includes("herança");
  });
  
  const retirementAge = toNumber(clientData?.retirementAge ?? clientData?.idadeAposentadoria, 0);
  const currentAge = toNumber(clientData?.currentAge ?? clientData?.idadeAtual, 30);
  
  // Aposentadoria próxima
  if (retirementAge > 0 && retirementAge - currentAge <= 10) {
    return "Planejamento focado em Aposentadoria Próxima";
  }
  
  if (hasRetirementGoal || retirementAge > 0) {
    return "Planejamento focado em Aposentadoria";
  }
  
  if (hasFinancialFreedomGoal) {
    return "Planejamento para Liberdade Financeira";
  }
  
  if (hasSuccessionFocus) {
    return "Planejamento de Preservação Patrimonial";
  }
  
  return "Planejamento Financeiro Personalizado";
}

// ========================================
// NORMALIZAÇÃO DE ATIVOS
// ========================================

/**
 * Normaliza e deduplica lista de ativos
 * - Remove duplicidades por chave estável
 * - Aplica FX do cenário para conversão
 * - Mapeia labels de tipo
 * - Retorna lista pronta para PDF
 */
function normalizeAssets(assets = [], scenarioFx = {}) {
  if (!Array.isArray(assets)) return { normalized: [], byType: {}, totals: { brl: 0, byType: {} } };
  
  const seen = new Map();
  const normalized = [];
  
  for (const asset of assets) {
    if (!asset) continue;
    
    const key = generateAssetKey(asset);
    
    // Dedupe: pula se já vimos
    if (seen.has(key)) continue;
    seen.set(key, true);
    
    const currency = asset?.currency || "BRL";
    const amountOriginal = toNumber(asset?.amountCurrency ?? asset?.value ?? asset?.amount ?? 0);
    const type = asset?.type || asset?.assetType || "financial";
    const typeLabel = getAssetTypeLabel(type);
    
    // Conversão FX
    let amountBRL = amountOriginal;
    let fxRate = 1;
    let fxWarning = null;
    
    if (currency !== "BRL") {
      fxRate = getEffectiveFxRate(asset, scenarioFx);
      
      if (fxRate <= 0 || !Number.isFinite(fxRate)) {
        fxWarning = `Câmbio indisponível para ${currency}. Usando fallback.`;
        fxRate = DEFAULT_FX_RATES[`${currency}_BRL`] || 1;
      }
      
      amountBRL = amountOriginal * fxRate;
    }
    
    normalized.push({
      id: asset?.id || key,
      key,
      name: asset?.name || asset?.titulo || "Ativo",
      type,
      typeLabel,
      currency,
      amountOriginal,
      amountBRL,
      fxRate,
      fxWarning,
      provider: asset?.provider || asset?.instituicao || null,
      // Campos extras para previdência
      planType: asset?.previdencia?.planType || null,
      taxRegime: asset?.previdencia?.taxRegime || null,
    });
  }
  
  // Agrupar por tipo
  const byType = {};
  for (const asset of normalized) {
    if (!byType[asset.type]) {
      byType[asset.type] = {
        type: asset.type,
        typeLabel: asset.typeLabel,
        items: [],
        totalBRL: 0,
      };
    }
    byType[asset.type].items.push(asset);
    byType[asset.type].totalBRL += asset.amountBRL;
  }
  
  // Totais
  const totalBRL = normalized.reduce((sum, a) => sum + a.amountBRL, 0);
  const totalsByType = {};
  for (const [t, group] of Object.entries(byType)) {
    totalsByType[t] = group.totalBRL;
  }
  
  return {
    normalized,
    byType,
    totals: {
      brl: totalBRL,
      byType: totalsByType,
      count: normalized.length,
    },
  };
}

// ========================================
// VALIDAÇÃO DE TOTAIS
// ========================================

/**
 * Valida se soma das linhas fecha com total reportado
 * @returns {{ valid: boolean, diff: number, warning?: string }}
 */
function assertTotalsClose(linesSum, reportedTotal, tolerance = 1) {
  const diff = Math.abs(linesSum - reportedTotal);
  
  if (diff <= tolerance) {
    return { valid: true, diff };
  }
  
  // Tolerância percentual para valores grandes
  const percentDiff = reportedTotal > 0 ? (diff / reportedTotal) * 100 : 0;
  if (percentDiff <= 0.01) { // 0.01%
    return { valid: true, diff };
  }
  
  return {
    valid: false,
    diff,
    warning: `Diferença de arredondamento: R$ ${diff.toFixed(2)} (${percentDiff.toFixed(4)}%)`,
  };
}

// ========================================
// KPI DISPLAY HELPER
// ========================================

/**
 * Formata KPI para display, retornando "—" se indisponível
 */
function kpiToDisplay(value, formatter = null) {
  if (value == null || value === "" || (typeof value === "number" && !Number.isFinite(value))) {
    return { value: "—", available: false, note: "Indicador indisponível para este cenário" };
  }
  
  const n = toNumber(value, NaN);
  if (!Number.isFinite(n)) {
    return { value: "—", available: false, note: "Indicador indisponível para este cenário" };
  }
  
  // Se valor é 0 mas poderia ser calculado, ainda mostrar
  // Apenas valores realmente nulos/undefined ficam como "—"
  
  const formatted = formatter ? formatter(n) : n;
  return { value: formatted, available: true, raw: n };
}

// ========================================
// CENÁRIOS - DIFF GENERATOR
// ========================================

/**
 * Gera bullets de diferenças entre cenários
 */
function generateScenarioDiff(baseScenario, compareScenario, diffType = "returnRate") {
  const bullets = [];
  
  if (diffType === "returnRate") {
    // Comparação de rentabilidade (base vs conservador/otimista)
    const baseReturn = toNumber(baseScenario?.returnRate, null);
    const compareReturn = toNumber(compareScenario?.returnRate, null);
    
    if (baseReturn != null && compareReturn != null) {
      const diff = compareReturn - baseReturn;
      if (Math.abs(diff) > 0.001) {
        bullets.push(`Rentabilidade ${diff > 0 ? "maior" : "menor"} em ${Math.abs(diff * 100).toFixed(1)}% a.a.`);
      }
    }
    
    if (!bullets.length) {
      bullets.push("Sem alterações explícitas cadastradas; variação vem de premissas de retorno/risco.");
    }
  } else if (diffType === "contribution") {
    // Comparação de aportes (base vs consumo/preservação)
    const baseContrib = toNumber(baseScenario?.monthlyContribution, null);
    const compareContrib = toNumber(compareScenario?.monthlyContribution, null);
    
    if (baseContrib != null && compareContrib != null && baseContrib !== compareContrib) {
      bullets.push(`Aporte mensal: R$ ${baseContrib.toLocaleString("pt-BR")} → R$ ${compareContrib.toLocaleString("pt-BR")}`);
    }
    
    const baseRetAge = toNumber(baseScenario?.retirementAge, null);
    const compareRetAge = toNumber(compareScenario?.retirementAge, null);
    
    if (baseRetAge != null && compareRetAge != null && baseRetAge !== compareRetAge) {
      bullets.push(`Idade de aposentadoria: ${baseRetAge} → ${compareRetAge} anos`);
    }
    
    if (!bullets.length) {
      bullets.push("Mesmas premissas de aportes e idade.");
    }
  }
  
  return bullets;
}

// ========================================
// PRÓXIMOS PASSOS - HEURÍSTICA
// ========================================

/**
 * Gera lista de "próximos passos" baseado em gaps detectados no planejamento
 */
function generateNextSteps(clientData, kpis, alternativeScenarios, goals) {
  const steps = [];
  
  // 1. Verifica gap de liquidez sucessória
  const liquidityGap = toNumber(kpis?.liquidityGap, 0);
  if (liquidityGap > 0) {
    steps.push({
      priority: 1,
      text: "Revisar estratégia de liquidez para custos sucessórios",
      reason: "gap_liquidez",
    });
  }
  
  // 2. Verifica se aporte atual é insuficiente (consumo/preservação)
  const consumptionOk = alternativeScenarios?.consumption?.requiredContribution?.status === "ok";
  const preservationOk = alternativeScenarios?.preservation?.requiredContribution?.status === "ok";
  
  if (!consumptionOk || !preservationOk) {
    steps.push({
      priority: 2,
      text: "Avaliar aumento do aporte mensal ou ajuste na idade de aposentadoria",
      reason: "aporte_insuficiente",
    });
  }
  
  // 3. Verifica se tem entradas pontuais configuradas
  const cashInEvents = Array.isArray(clientData?.cashInEvents) ? clientData.cashInEvents : [];
  if (cashInEvents.length > 0) {
    steps.push({
      priority: 3,
      text: "Validar datas e valores das entradas pontuais previstas",
      reason: "tem_cash_in",
    });
  }
  
  // 4. Verifica se tem aporte temporário
  const contributionTimeline = Array.isArray(clientData?.contributionTimeline) ? clientData.contributionTimeline : [];
  const hasTemporaryContrib = contributionTimeline.some(r => r?.enabled !== false);
  if (hasTemporaryContrib) {
    steps.push({
      priority: 3,
      text: "Confirmar período e valor do aporte temporário",
      reason: "tem_aporte_temporario",
    });
  }
  
  // 5. Verifica se tem metas de impacto sem idade definida
  const goalsWithoutAge = goals.filter(g => g.type === "impact" && !g.age);
  if (goalsWithoutAge.length > 0) {
    steps.push({
      priority: 4,
      text: "Definir idade de realização para metas de impacto",
      reason: "metas_sem_idade",
    });
  }
  
  // 6. Verifica exposição cambial alta (>30%)
  const fxPct = toNumber(clientData?.fxExposure?.internationalPct, 0);
  if (fxPct > 30) {
    steps.push({
      priority: 4,
      text: "Avaliar proteção cambial para exposição internacional",
      reason: "exposicao_cambial_alta",
    });
  }
  
  // 7. Verifica se não tem previdência
  const hasPrevidencia = (clientData?.assets || []).some(a => 
    normalizeText(a?.type || "").includes("previdencia")
  );
  if (!hasPrevidencia) {
    steps.push({
      priority: 5,
      text: "Considerar previdência privada para eficiência fiscal e sucessória",
      reason: "sem_previdencia",
    });
  }
  
  // Ordena por prioridade e retorna top 3
  return steps
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(s => s.text);
}

/**
 * Gera diagnóstico executivo baseado nos dados
 */
function generateExecutiveDiagnostic(clientData, kpis, totalWealth, fxExposure) {
  const bullets = [];
  
  // Patrimônio total
  if (totalWealth > 0) {
    bullets.push(`Patrimônio total de ${formatCurrencyCompact(totalWealth)}`);
  }
  
  // Exposição internacional
  const intlPct = toNumber(fxExposure?.internationalPct, 0);
  if (intlPct > 0) {
    bullets.push(`${intlPct.toFixed(0)}% do patrimônio em ativos internacionais`);
  }
  
  // Capital na aposentadoria
  const capitalRet = toNumber(kpis?.capitalAposentadoriaFinanceiro ?? kpis?.capitalAposentadoria, 0);
  const retirementAge = toNumber(clientData?.retirementAge, 60);
  if (capitalRet > 0) {
    bullets.push(`Projeção de ${formatCurrencyCompact(capitalRet)} aos ${retirementAge} anos`);
  }
  
  return bullets.slice(0, 3);
}

function formatCurrencyCompact(value) {
  const n = toNumber(value, 0);
  if (n >= 1000000) {
    return `R$ ${(n / 1000000).toFixed(1).replace(".", ",")} mi`;
  }
  if (n >= 1000) {
    return `R$ ${(n / 1000).toFixed(0)} mil`;
  }
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

// ========================================
// NORMALIZAÇÃO DE EVENTOS E ENTRADAS
// ========================================

/**
 * Normaliza entradas pontuais (cash-in events) para exibição
 */
function normalizeCashInEvents(cashInEvents = []) {
  if (!Array.isArray(cashInEvents)) return [];
  
  return cashInEvents
    .filter(ev => ev && toNumber(ev.age, 0) > 0 && toNumber(ev.value, 0) > 0)
    .map((ev, idx) => ({
      id: ev.id || `cashin_${idx}`,
      age: toNumber(ev.age, 0),
      value: toNumber(ev.value, 0),
      description: ev.description || ev.descricao || `Entrada aos ${ev.age} anos`,
    }))
    .sort((a, b) => a.age - b.age);
}

/**
 * Normaliza timeline de aportes temporários
 */
function normalizeContributionTimeline(timeline = []) {
  if (!Array.isArray(timeline)) return [];
  
  return timeline
    .filter(rule => rule && rule.enabled !== false)
    .map((rule, idx) => ({
      id: rule.id || `timeline_${idx}`,
      startAge: toNumber(rule.startAge ?? rule.fromAge, 0),
      endAge: toNumber(rule.endAge ?? rule.toAge, 0),
      value: toNumber(rule.value ?? rule.contribution, 0),
      description: rule.description || `Aporte temporário`,
    }))
    .filter(r => r.startAge > 0 && r.endAge > r.startAge && r.value !== 0);
}

// ========================================
// MAIN: CREATE REPORT SNAPSHOT
// ========================================

/**
 * Cria snapshot completo e normalizado para o PDF
 * Usa os mesmos dados que a UI (engineOutput)
 * 
 * @param {object} params
 * @param {object} params.clientData - Dados do cliente/cenário
 * @param {object} params.engineOutput - Output do FinancialEngine.run() (opcional, será calculado se não fornecido)
 * @param {object} params.reportMeta - Metadados do relatório (clientName, advisorName, etc.)
 * @param {object} params.selectedSections - Seções selecionadas
 * @param {object} params.successionSubBlocks - Sub-blocos de sucessão selecionados
 * 
 * @returns {object} Snapshot pronto para renderização do PDF
 */
export function createReportSnapshot({
  clientData = {},
  engineOutput = null,
  reportMeta = {},
  selectedSections = {},
  successionSubBlocks = {},
}) {
  // 1. Rodar engine se não fornecido
  const engine = engineOutput || FinancialEngine.run(clientData, false);
  const kpis = engine?.kpis || {};
  const series = engine?.series || [];
  const succession = engine?.succession || FinancialEngine.calculateSuccession(clientData);
  
  // 2. Extrair FX do cenário
  const scenarioFx = {
    USD_BRL: kpis?.scenarioFx?.USD_BRL ?? clientData?.fx?.USD_BRL ?? DEFAULT_FX_RATES.USD_BRL,
    EUR_BRL: kpis?.scenarioFx?.EUR_BRL ?? clientData?.fx?.EUR_BRL ?? DEFAULT_FX_RATES.EUR_BRL,
  };
  
  // 3. Normalizar ativos
  const rawAssets = Array.isArray(clientData?.assets) ? clientData.assets : [];
  const assetsNormalized = normalizeAssets(rawAssets, scenarioFx);
  
  // 4. Validar totais
  const engineFinancial = toNumber(succession?.financialTotal ?? kpis?.patrimonioAtualFinanceiro, 0);
  const engineIlliquid = toNumber(succession?.illiquidTotal ?? kpis?.patrimonioAtualBens, 0);
  const enginePrevidencia = toNumber(succession?.previdenciaTotal ?? kpis?.patrimonioAtualPrevidencia, 0);
  const engineTotal = engineFinancial + engineIlliquid + enginePrevidencia;
  
  const assetsTotal = assetsNormalized.totals.brl;
  const totalsValidation = assertTotalsClose(assetsTotal, engineTotal);
  
  // 5. Metas
  const goals = (clientData?.financialGoals || []).map((g, idx) => ({
    id: g?.id || `goal_${idx}`,
    name: g?.name || g?.titulo || "Meta",
    value: toNumber(g?.value ?? g?.valor, 0),
    age: toNumber(g?.age ?? g?.naIdade, null),
    type: g?.type || "impact",
    priority: g?.priority || "medium",
  }));
  
  // 6. Tese do planejamento
  const planningThesis = derivePlanningThesis(clientData, goals);
  
  // 7. Calcular cenários alternativos (Consumo/Preservação) - MESMO CÁLCULO DA UI
  const alternativeScenarios = calculateAlternativeScenarios(clientData, { includeImpacts: true });
  
  // Extrair valores calculados
  const consumptionResult = alternativeScenarios?.consumption;
  const preservationResult = alternativeScenarios?.preservation;
  
  const consumoAporteValue = consumptionResult?.requiredContribution?.status === "ok"
    ? consumptionResult.requiredContribution.requiredMonthlyContribution
    : null;
  const consumoIdadeValue = consumptionResult?.requiredAge?.status === "ok"
    ? consumptionResult.requiredAge.requiredRetirementAge
    : consumptionResult?.currentRetirementAge;
  
  const preservacaoAporteValue = preservationResult?.requiredContribution?.status === "ok"
    ? preservationResult.requiredContribution.requiredMonthlyContribution
    : null;
  const preservacaoIdadeValue = preservationResult?.requiredAge?.status === "ok"
    ? preservationResult.requiredAge.requiredRetirementAge
    : preservationResult?.currentRetirementAge;

  // 8. KPIs normalizados para display
  const kpisDisplay = {
    patrimonioTotal: kpiToDisplay(engineTotal, v => v),
    patrimonioFinanceiro: kpiToDisplay(engineFinancial, v => v),
    patrimonioImobilizado: kpiToDisplay(engineIlliquid, v => v),
    patrimonioPrevidencia: kpiToDisplay(enginePrevidencia, v => v),
    
    capitalAposentadoria: kpiToDisplay(kpis?.capitalAposentadoriaFinanceiro ?? kpis?.capitalAposentadoria, v => v),
    rendaSustentavel: kpiToDisplay(kpis?.rendaSustentavelMensal ?? kpis?.sustainableIncomeMensal, v => v),
    coberturaMeta: kpiToDisplay(kpis?.coberturaMetaPct, v => v),
    wealthScore: kpiToDisplay(kpis?.wealthScore, v => v),
    
    // Cenários Consumo/Preservação - usando cálculo real
    consumoAporte: kpiToDisplay(consumoAporteValue, v => v),
    consumoIdade: kpiToDisplay(consumoIdadeValue, v => v),
    consumoStatus: consumptionResult?.requiredContribution?.status || "unknown",
    consumoExplain: consumptionResult?.requiredContribution?.explain || null,
    
    preservacaoAporte: kpiToDisplay(preservacaoAporteValue, v => v),
    preservacaoIdade: kpiToDisplay(preservacaoIdadeValue, v => v),
    preservacaoStatus: preservationResult?.requiredContribution?.status || "unknown",
    preservacaoExplain: preservationResult?.requiredContribution?.explain || null,
  };
  
  // 9. Exposição cambial
  const fxExposure = kpis?.fxExposure || calculateFxExposure(rawAssets, scenarioFx);
  
  // 10. Sucessão
  const successionData = {
    financialTotal: engineFinancial,
    illiquidTotal: engineIlliquid,
    previdenciaTotal: enginePrevidencia,
    totalEstate: engineTotal,
    
    costs: {
      itcmd: toNumber(succession?.costs?.itcmd, 0),
      legal: toNumber(succession?.costs?.legal, 0),
      fees: toNumber(succession?.costs?.fees, 0),
      total: toNumber(succession?.costs?.total, 0),
    },
    
    liquidityGap: toNumber(succession?.liquidityGap, 0),
    
    inputs: succession?.inputs || {},
    state: succession?.state || clientData?.state || "SP",
    
    // Previdência
    previdenciaVGBL: toNumber(succession?.previdenciaVGBL, 0),
    previdenciaPGBL: toNumber(succession?.previdenciaPGBL, 0),
    previdenciaConfig: succession?.previdenciaConfig || {},
  };
  
  // 11. Cenários base
  const baseScenario = {
    name: "Base",
    returnRate: toNumber(clientData?.returnRateModerate ?? clientData?.rentMod, 0.08),
    inflation: toNumber(clientData?.inflation, 4.5) / 100,
    monthlyContribution: toNumber(clientData?.monthlyContribution ?? clientData?.aporteMensal, 0),
    retirementAge: toNumber(clientData?.retirementAge ?? clientData?.idadeAposentadoria, 60),
  };
  
  // 12. Eventos de estratégia: entradas pontuais e aportes temporários
  const cashInEvents = normalizeCashInEvents(clientData?.cashInEvents);
  const contributionTimeline = normalizeContributionTimeline(clientData?.contributionTimeline);
  
  // 13. Cenários para exibição na seção de Cenários (focado em eventos, NÃO rentabilidade)
  const consumptionScenario = consumptionResult ? {
    name: "Consumo do Patrimônio Total",
    label: consumptionResult.label,
    description: consumptionResult.description,
    requiredContribution: consumoAporteValue,
    requiredAge: consumoIdadeValue,
    status: consumptionResult.requiredContribution?.status,
    explain: consumptionResult.requiredContribution?.explain,
  } : null;
  
  const preservationScenario = preservationResult ? {
    name: "Preservação do Patrimônio",
    label: preservationResult.label,
    description: preservationResult.description,
    requiredContribution: preservacaoAporteValue,
    requiredAge: preservacaoIdadeValue,
    status: preservationResult.requiredContribution?.status,
    explain: preservationResult.requiredContribution?.explain,
  } : null;
  
  // 14. Série para gráfico de evolução
  const chartSeries = series.map(p => ({
    age: p?.age,
    wealth: toNumber(p?.wealth ?? p?.financial, 0),
    totalWealth: toNumber(p?.totalWealth, 0),
  }));
  
  // 15. Premissas do gráfico
  const chartPremises = [
    `Rentabilidade real de ${((baseScenario.returnRate - baseScenario.inflation) * 100).toFixed(1).replace(".", ",")}% a.a.`,
    `Inflação de ${(baseScenario.inflation * 100).toFixed(1).replace(".", ",")}% a.a.`,
    `Aporte mensal de R$ ${baseScenario.monthlyContribution.toLocaleString("pt-BR")}`,
    `Aposentadoria aos ${baseScenario.retirementAge} anos`,
  ];
  
  if (cashInEvents.length > 0) {
    chartPremises.push(`${cashInEvents.length} entrada(s) pontual(is) considerada(s)`);
  }
  if (contributionTimeline.length > 0) {
    chartPremises.push(`Aporte temporário configurado`);
  }
  
  // 16. Diagnóstico executivo e próximos passos
  const executiveDiagnostic = generateExecutiveDiagnostic(clientData, kpis, engineTotal, fxExposure);
  const nextSteps = generateNextSteps(clientData, kpis, alternativeScenarios, goals);
  
  // 17. Metadados
  
  // 17. Metadados
  const meta = {
    clientName: reportMeta?.clientName || clientData?.name || clientData?.clientName || "Cliente",
    advisorName: reportMeta?.advisorName || "",
    referenceDate: reportMeta?.referenceDate || new Date().toISOString().split("T")[0],
    generatedAt: reportMeta?.generatedAt || new Date().toISOString(),
    scenarioName: clientData?.scenarioName || "Cenário Base",
    appVersion: "WealthPlanner Pro v1.0",
  };
  
  // 18. Seções incluídas (para capa) - incluindo Evolução como seção própria
  const includedSections = [];
  if (selectedSections.executive) includedSections.push("Visão Executiva");
  if (selectedSections.executive) includedSections.push("Evolução Patrimonial"); // Sempre junto com Executive
  if (selectedSections.assets) includedSections.push("Patrimônio");
  if (selectedSections.scenarios) includedSections.push("Cenários");
  if (selectedSections.goals) includedSections.push("Metas");
  if (selectedSections.succession) includedSections.push("Sucessão");
  includedSections.push("Disclaimers");
  
  return {
    // Metadados
    meta,
    planningThesis,
    includedSections,
    
    // Diagnóstico e próximos passos (para capa)
    executiveDiagnostic,
    nextSteps,
    
    // Patrimônio
    assets: assetsNormalized,
    totalsValidation,
    
    // KPIs
    kpis: kpisDisplay,
    kpisRaw: kpis,
    
    // FX
    scenarioFx,
    fxExposure,
    
    // Metas
    goals,
    
    // Sucessão
    succession: successionData,
    
    // Cenários (focado em eventos/estratégias)
    scenarios: {
      base: baseScenario,
      consumption: consumptionScenario,
      preservation: preservationScenario,
    },
    
    // Eventos de estratégia
    cashInEvents,
    contributionTimeline,
    
    // Série para gráfico + premissas
    chartSeries,
    chartPremises,
    
    // Config
    selectedSections,
    successionSubBlocks,
    
    // Dados brutos (para fallback)
    clientData,
    engineOutput: engine,
    alternativeScenarios,
  };
}

export default {
  createReportSnapshot,
  normalizeAssets,
  assertTotalsClose,
  kpiToDisplay,
  generateScenarioDiff,
  derivePlanningThesis,
  getAssetTypeLabel,
  generateNextSteps,
  normalizeCashInEvents,
  normalizeContributionTimeline,
};
