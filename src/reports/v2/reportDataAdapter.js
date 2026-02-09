// src/reports/v2/reportDataAdapter.js
// Adapter: "Dashboard como fonte de verdade" — NÃO recomputa KPIs
// Recebe o mesmo output do Engine que o Dashboard usa e apenas
// valida, sanitiza, seleciona cenários/eventos e expõe ReportV2Data.

import { createReportSnapshot } from "../reportSnapshot";
import { toNumber } from "../../utils/format";

// =============================================
// SANITIZE helpers
// =============================================

/** Retorna null se valor é NaN, Infinity ou absurdo */
export function sanitizeNumber(v, { min = -Infinity, max = Infinity } = {}) {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

/** Retorna "—" para valores inválidos, valor formatado caso contrário */
export function safePrint(v, formatter) {
  if (v == null || (typeof v === "number" && !Number.isFinite(v))) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return formatter ? formatter(n) : String(n);
}

// =============================================
// PREMISSA VALIDATION
// =============================================

const RANGES = {
  inflation: { min: 0, max: 0.15, label: "Inflação" },
  nominalReturn: { min: 0, max: 0.25, label: "Retorno Nominal" },
  realReturn: { min: -0.05, max: 0.15, label: "Retorno Real" },
};

export function validatePremises(assumptions) {
  const warnings = [];
  const { inflation, nominalReturn, realReturn } = assumptions || {};

  for (const [key, range] of Object.entries(RANGES)) {
    const val = assumptions?.[key];
    if (val == null) continue;
    const n = Number(val);
    if (!Number.isFinite(n)) {
      warnings.push(`${range.label}: valor inválido`);
    } else if (n < range.min || n > range.max) {
      warnings.push(
        `${range.label}: ${(n * 100).toFixed(1)}% a.a. está fora do intervalo esperado (${(range.min * 100).toFixed(0)}%–${(range.max * 100).toFixed(0)}%)`
      );
    }
  }
  return warnings;
}

// =============================================
// SCENARIO SELECTION — V2-hardening: ALWAYS Base + Consumo + Preservação
// =============================================

/**
 * Builds the fixed 3 scenarios (Base + Consumo + Preservação).
 * Never picks "better/worse" — always shows all 3 with availability flags.
 */
export function buildFixedScenarios(snapshot) {
  const base = buildBaseScenario(snapshot);

  const consumption = snapshot.scenarios?.consumption;
  const preservation = snapshot.scenarios?.preservation;

  const buildAlt = (s, fallbackName) => {
    if (!s) return { name: fallbackName, available: false, reason: "Não disponível — preencher dados básicos." };
    return {
      name: s.name || fallbackName,
      label: s.label || fallbackName,
      description: s.description || "",
      requiredContribution: s.requiredContribution,
      requiredAge: s.requiredAge,
      status: s.status,
      explain: s.explain,
      available: true,
    };
  };

  return {
    base,
    consumption: buildAlt(consumption, "Consumo do Patrimônio"),
    preservation: buildAlt(preservation, "Preservação do Patrimônio"),
  };
}

function buildBaseScenario(snapshot) {
  const s = snapshot.scenarios?.base || {};
  return {
    name: "Cenário Base",
    returnRate: s.returnRate ?? 0,
    inflation: s.inflation ?? 0,
    monthlyContribution: s.monthlyContribution ?? 0,
    retirementAge: s.retirementAge ?? 60,
    sustainableIncome: snapshot.kpis?.rendaSustentavel?.raw ?? 0,
    coverage: snapshot.kpis?.coberturaMeta?.raw ?? null,
    score: snapshot.kpis?.wealthScore?.raw ?? null,
  };
}

// =============================================
// EVENT SELECTION — top 3 by impact
// =============================================

export function selectTopEvents(snapshot, maxEvents = 3) {
  const events = [];

  // Cash-in events
  const cashIn = snapshot.cashInEvents || [];
  for (const ev of cashIn) {
    events.push({
      age: ev.age,
      value: toNumber(ev.value, 0),
      label: ev.description || `Entrada aos ${ev.age} anos`,
      type: "cash_in",
    });
  }

  // Goals with impact type
  const goals = (snapshot.goals || []).filter((g) => g.type === "impact" && g.age && g.value);
  for (const g of goals) {
    events.push({
      age: g.age,
      value: -toNumber(g.value, 0), // negative = outflow
      label: g.name || `Meta aos ${g.age} anos`,
      type: "goal",
    });
  }

  // Sort by |impact| descending, take top N
  return events
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, maxEvents);
}

// =============================================
// SENSITIVE POINT — post-retirement minimum
// =============================================

export function findSensitivePoint(series, retirementAge) {
  if (!series || series.length === 0) return null;

  const postRetirement = series.filter((p) => p.age >= retirementAge);
  if (postRetirement.length === 0) return null;

  let minPoint = postRetirement[0];
  for (const p of postRetirement) {
    if (p.wealth < minPoint.wealth) {
      minPoint = p;
    }
  }

  // If wealth goes to 0 before life expectancy
  const zeroPoint = postRetirement.find((p) => p.wealth <= 0);
  if (zeroPoint) {
    return {
      age: zeroPoint.age,
      wealth: 0,
      isZero: true,
      warning: `O patrimônio se esgota aos ${zeroPoint.age} anos.`,
    };
  }

  if (minPoint.wealth < postRetirement[0].wealth * 0.3) {
    return {
      age: minPoint.age,
      wealth: minPoint.wealth,
      isZero: false,
      warning: `Ponto mínimo de R$ ${Math.round(minPoint.wealth).toLocaleString("pt-BR")} aos ${minPoint.age} anos.`,
    };
  }

  return null;
}

// =============================================
// FLAGS de fallback
// =============================================

export function computeFlags(snapshot) {
  const clientData = snapshot.clientData || {};
  const assets = clientData.assets || [];
  const goals = clientData.financialGoals || [];

  return {
    hasAssets: assets.length > 0,
    hasGoal: goals.length > 0,
    hasAges:
      toNumber(clientData.currentAge, 0) > 0 &&
      toNumber(clientData.retirementAge, 0) > 0 &&
      toNumber(clientData.lifeExpectancy, 0) > 0,
    hasCoverage: snapshot.kpis?.coberturaMeta?.available === true,
    hasScore: snapshot.kpis?.wealthScore?.available === true,
    hasSeries: (snapshot.chartSeries || []).length >= 2,
    hasSuccession: toNumber(snapshot.succession?.costs?.total, 0) > 0 ||
      toNumber(snapshot.succession?.financialTotal, 0) > 0,
  };
}

// =============================================
// ACTION PLAN alerts (dynamic)
// =============================================

export function generateAlerts(snapshot, flags) {
  const alerts = [];
  const clientData = snapshot.clientData || {};

  if (!flags.hasAssets) {
    alerts.push({ severity: 1, text: "Cadastrar ativos para iniciar o planejamento." });
  }

  if (!flags.hasGoal) {
    alerts.push({ severity: 2, text: "Definir ao menos uma meta financeira." });
  }

  if (!flags.hasAges) {
    alerts.push({ severity: 2, text: "Preencher idades (atual, aposentadoria, expectativa de vida)." });
  }

  // Concentration
  const assets = clientData.assets || [];
  if (assets.length > 0) {
    const total = assets.reduce((s, a) => s + toNumber(a.value, 0), 0);
    if (total > 0) {
      const maxAsset = Math.max(...assets.map((a) => toNumber(a.value, 0)));
      if (maxAsset / total > 0.5) {
        alerts.push({ severity: 3, text: "Concentração patrimonial alta — um único ativo representa mais de 50% do total." });
      }
    }
  }

  // Low liquidity
  const illiquid = toNumber(snapshot.kpis?.patrimonioImobilizado?.raw, 0);
  const totalW = toNumber(snapshot.kpis?.patrimonioTotal?.raw, 0);
  if (totalW > 0 && illiquid / totalW > 0.6) {
    alerts.push({ severity: 3, text: "Baixa liquidez — mais de 60% em ativos imobilizados." });
  }

  // Succession gap
  if (snapshot.succession?.liquidityGap > 0) {
    alerts.push({ severity: 2, text: "Gap de liquidez para custos sucessórios — risco de venda forçada." });
  }

  return alerts.sort((a, b) => a.severity - b.severity).slice(0, 2);
}

// =============================================
// ASSET BREAKDOWN by category — V2-hardening: always 4 categories
// =============================================

export function buildAssetBreakdown(snapshot) {
  // Prefer snapshot's pre-computed 4-category breakdown (V2-hardening)
  if (snapshot.assetCategories && snapshot.assetCategories.length > 0) {
    return snapshot.assetCategories.map(c => ({
      label: c.label,
      value: c.value,
      pct: c.pct,
      key: c.key,
    }));
  }

  // Fallback: compute locally but ALWAYS include all 4
  const assets = snapshot.assets?.normalized || [];
  const total = snapshot.assets?.totals?.brl || 0;

  const CATEGORIES = {
    financial: "Financeiro",
    international: "Financeiro",
    previdencia: "Previdência",
    real_estate: "Imóveis",
    vehicle: "Imóveis",
  };

  const groups = {
    Financeiro: 0,
    Previdência: 0,
    Imóveis: 0,
    Outros: 0,
  };

  for (const a of assets) {
    const cat = CATEGORIES[a.type] || "Outros";
    groups[cat] += a.amountBRL;
  }

  // Always include all 4 categories, even with value 0
  return Object.entries(groups).map(([label, value]) => {
    const pct = total > 0 ? (value / total) * 100 : 0;
    const rounded = Math.round(pct * 2) / 2;
    return { label, value, pct: rounded };
  }).sort((a, b) => b.value - a.value);
}

// =============================================
// INCOME page helpers
// =============================================

export function buildIncomeData(snapshot) {
  const kpis = snapshot.kpis || {};
  const clientData = snapshot.clientData || {};

  return {
    sustainableIncome: kpis.rendaSustentavel?.raw ?? null,
    capitalAtRetirement: kpis.capitalAposentadoria?.raw ?? null,
    currentAge: toNumber(clientData.currentAge, null),
    retirementAge: toNumber(clientData.retirementAge, null),
    lifeExpectancy: toNumber(clientData.lifeExpectancy, null),
    contributionEndAge: toNumber(clientData.contributionEndAge, null),
  };
}

// =============================================
// MAIN: createReportV2Data
// =============================================

/**
 * Creates the full V2 report data from dashboard payload.
 * Does NOT recompute KPIs — uses snapshot (same as Dashboard).
 *
 * @param {object} params
 * @param {object} params.clientData - Active scenario data
 * @param {object} params.engineOutput - FinancialEngine.run() output (from Dashboard)
 * @param {object} params.reportMeta - { clientName, advisorName, referenceDate, advisorEmail, advisorPhone, bookingLink }
 * @param {string} params.advisorNotes - Free-text notes from advisor
 * @param {boolean} params.includeAppendix - Whether to include appendix pages
 * @returns {object} ReportV2Data
 */
export function createReportV2Data({
  clientData = {},
  engineOutput = null,
  reportMeta = {},
  advisorNotes = "",
  includeAppendix = false,
}) {
  // 1. Create base snapshot using the V1 layer (reuse!)
  const snapshot = createReportSnapshot({
    clientData,
    engineOutput,
    reportMeta,
    selectedSections: {
      executive: true,
      assets: true,
      scenarios: true,
      goals: true,
      succession: true,
    },
    successionSubBlocks: {
      overview: true,
      costs: true,
      beneficiaries: true,
      recommendations: true,
      incomeProtection: true,
      pgblEfficiency: true,
    },
  });

  // 2. Compute flags
  const flags = computeFlags(snapshot);

  // 3. Use snapshot's validated assumptions (V2-hardening: no recalculation)
  const assumptions = {
    inflation: snapshot.assumptionsDisplay?.inflationPctText ?? "—",
    nominalReturn: snapshot.assumptionsDisplay?.nominalPctText ?? "—",
    realReturn: snapshot.assumptionsDisplay?.realPctText ?? "—",
    invalidMessage: snapshot.assumptionsDisplay?.invalidMessage ?? null,
  };
  const premiseWarnings = snapshot.assumptionsWarnings || [];
  const assumptionsValid = snapshot.assumptionsValid ?? false;

  // 4. Fixed scenario selection (V2-hardening: always Base + Consumo + Preservação)
  const scenarioComparison = buildFixedScenarios(snapshot);

  // 5. Top events for projection markers
  const topEvents = selectTopEvents(snapshot, 3);

  // 6. Sensitive point — gated by assumptionsValid (V2-hardening P0)
  const retAge = toNumber(clientData.retirementAge, 60);
  const sensitivePoint = assumptionsValid
    ? findSensitivePoint(snapshot.chartSeries, retAge)
    : null;

  // 7. Alerts for action plan
  const alerts = generateAlerts(snapshot, flags);

  // 8. Asset breakdown
  const assetBreakdown = buildAssetBreakdown(snapshot);

  // 9. Income data
  const incomeData = buildIncomeData(snapshot);

  // 10. Succession with liquidity rule
  const successionLiquiditySufficient =
    toNumber(snapshot.succession?.liquidityGap, 0) <= 0;

  // 11. Assemble
  return {
    // Pass through from snapshot
    meta: snapshot.meta,
    planningThesis: snapshot.planningThesis,
    kpis: snapshot.kpis,
    kpisRaw: snapshot.kpisRaw,
    chartSeries: snapshot.chartSeries,
    chartPremises: snapshot.chartPremises,
    assets: snapshot.assets,
    goals: snapshot.goals,
    succession: snapshot.succession,
    scenarios: snapshot.scenarios,
    cashInEvents: snapshot.cashInEvents,
    contributionTimeline: snapshot.contributionTimeline,
    fxExposure: snapshot.fxExposure,
    scenarioFx: snapshot.scenarioFx,
    executiveDiagnostic: snapshot.executiveDiagnostic,
    nextSteps: snapshot.nextSteps,

    // V2-hardening: pass-through flags from snapshot (single source of truth)
    assumptionsValid,
    assumptionsDisplay: snapshot.assumptionsDisplay,
    hasMeta: snapshot.hasMeta ?? false,
    desiredMonthlyIncome: snapshot.desiredMonthlyIncome ?? 0,
    coveragePct: snapshot.coveragePct,
    coverageDisplay: snapshot.coverageDisplay,
    capitalAtRetirement: snapshot.capitalAtRetirement ?? 0,
    topPriorities: snapshot.topPriorities || [],
    assetCategories: snapshot.assetCategories || [],
    assetInsights: snapshot.assetInsights || [],

    // V2-specific
    flags,
    assumptions,
    premiseWarnings,
    scenarioComparison,
    topEvents,
    sensitivePoint,
    alerts,
    assetBreakdown,
    incomeData,
    successionLiquiditySufficient,
    advisorNotes,
    includeAppendix,

    // Raw reference
    clientData,
    snapshot,
  };
}
