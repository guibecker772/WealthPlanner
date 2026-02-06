// src/engine/FinancialEngine.js
import { CONFIG } from "../constants/config";
import { convertToBRL, calculateFxExposure, applyFxShock, DEFAULT_FX_RATES } from "../utils/fx";

// ---------- Utils ----------
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeRate(x, fallback = 0) {
  const n = toNumber(x, NaN);
  if (!Number.isFinite(n)) return fallback;
  if (Math.abs(n) > 1) return n / 100; // permite 10 => 0.10
  return n;
}

function normalizeText(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function annualToMonthlyRate(annualRealRate) {
  const r = Number(annualRealRate);
  if (!Number.isFinite(r)) return 0;
  return Math.pow(1 + r, 1 / 12) - 1;
}

/**
 * Seleciona a rentabilidade nominal conforme perfil.
 */
function pickNominalReturnByProfile(clientData = {}) {
  const profile = normalizeText(clientData?.profile ?? clientData?.perfil ?? "moderado");

  const rCons = clientData?.returnRateConservative ?? clientData?.rentCons ?? clientData?.retornoConservador;
  const rMod = clientData?.returnRateModerate ?? clientData?.rentMod ?? clientData?.retornoModerado;
  const rBold = clientData?.returnRateBold ?? clientData?.rentBold ?? clientData?.retornoArrojado;

  if (profile.includes("conserv")) return rCons ?? rMod ?? rBold;
  if (profile.includes("arroj") || profile.includes("agress")) return rBold ?? rMod ?? rCons;

  return rMod ?? rCons ?? rBold;
}

/**
 * Bucket do ativo (financeiro vs bens)
 */
function normalizeAssetBucket(asset) {
  const rawType = asset?.type ?? asset?.assetType ?? asset?.category ?? "";
  const t = normalizeText(rawType);

  // Previdência é tratada como categoria separada (mas líquida para aposentadoria)
  if (t === "previdencia" || t === "previdência") return "previdencia";

  const illiquidTypes = new Set([
    "real_estate",
    "imovel",
    "imoveis",
    "bens",
    "business",
    "empresa",
    "vehicle",
    "veiculo",
    "other",
    "outros",
  ]);

  if (illiquidTypes.has(t)) return "illiquid";
  return "financial";
}

function splitAssets(assets = [], scenarioFx = {}) {
  const list = Array.isArray(assets) ? assets : [];
  let financialTotal = 0;
  let illiquidTotal = 0;
  let previdenciaTotal = 0;
  let previdenciaVGBL = 0;
  let previdenciaPGBL = 0;

  for (const a of list) {
    // Usar conversão FX para obter valor em BRL
    const val = convertToBRL(a, scenarioFx) || toNumber(a?.value ?? a?.amount ?? a?.valor ?? 0, 0);
    const bucket = normalizeAssetBucket(a);

    if (bucket === "previdencia") {
      previdenciaTotal += val;
      const planType = a?.previdencia?.planType || "";
      if (planType === "VGBL") previdenciaVGBL += val;
      else if (planType === "PGBL") previdenciaPGBL += val;
    } else if (bucket === "illiquid") {
      illiquidTotal += val;
    } else {
      financialTotal += val;
    }
  }

  // Previdência é líquida para aposentadoria, mas separada para sucessão
  const total = financialTotal + illiquidTotal + previdenciaTotal;

  return {
    financialTotal,
    illiquidTotal,
    previdenciaTotal,
    previdenciaVGBL,
    previdenciaPGBL,
    total,
  };
}

// ---------- Contribution timeline ----------
function normalizeTimelineRule(rule = {}) {
  const startAge = toNumber(
    rule.startAge ?? rule.fromAge ?? rule.from ?? rule.dos ?? rule.ageStart ?? rule.inicio ?? 0,
    0
  );

  const endAgeRaw = rule.endAge ?? rule.toAge ?? rule.to ?? rule.ate ?? rule.ageEnd ?? rule.fim ?? null;
  const endAge = endAgeRaw == null ? 120 : toNumber(endAgeRaw, 120);

  let monthlyValue = toNumber(
    rule.monthlyValue ??
      rule.value ??
      rule.amount ??
      rule.monthlyContribution ??
      rule.aporteMensal ??
      rule.valorMensal ??
      0,
    0
  );

  const kind = normalizeText(rule.kind ?? rule.type ?? rule.mode ?? "");
  const isWithdrawalFlag =
    rule.isWithdrawal === true ||
    rule.withdrawal === true ||
    kind.includes("resgate") ||
    kind.includes("withdraw");

  if (isWithdrawalFlag) monthlyValue = -Math.abs(monthlyValue);

  return {
    id: rule.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    enabled: rule.enabled !== false,
    startAge,
    endAge,
    monthlyValue,
  };
}

function getMonthlyContributionAtAge(age, baseContribution, timeline = []) {
  const rules = Array.isArray(timeline) ? timeline : [];
  const activeRules = rules.filter((r) => {
    if (r?.enabled === false) return false;
    const start = toNumber(r?.startAge, 0);
    const end = r?.endAge == null ? 120 : toNumber(r?.endAge, 120);
    return age >= start && age <= end;
  });

  if (activeRules.length === 0) return baseContribution;

  activeRules.sort((a, b) => toNumber(b?.startAge, 0) - toNumber(a?.startAge, 0));
  return toNumber(activeRules[0]?.monthlyValue, baseContribution);
}

// ---------- Sucessão ----------
const DEFAULT_ITCMD_BY_STATE = {
  SP: 0.04,
  RJ: 0.08,
  MG: 0.05,
  RS: 0.06,
  SC: 0.08,
  PR: 0.04,
  BA: 0.08,
  PE: 0.08,
  CE: 0.08,
  GO: 0.08,
  DF: 0.06,
};

const DEFAULT_LEGAL_PCT = 0.05;
const DEFAULT_FEES_PCT = 0.02;

function getSuccessionConfigFromCosts(costs = {}, state) {
  const itcmdFromConfig = (CONFIG?.ITCMD_RATES && state && CONFIG.ITCMD_RATES[state]) || null;

  const itcmdRate = normalizeRate(
    costs?.itcmdRate ?? costs?.itcmd ?? itcmdFromConfig,
    DEFAULT_ITCMD_BY_STATE[(state || "").toUpperCase()] ?? 0.04
  );

  const legalPct = normalizeRate(
    costs?.legalPct ?? costs?.honorariosPct ?? CONFIG?.SUCCESSION_LEGAL_PCT ?? DEFAULT_LEGAL_PCT,
    DEFAULT_LEGAL_PCT
  );

  const feesPct = normalizeRate(
    costs?.feesPct ?? costs?.custasPct ?? costs?.custasPercent ?? CONFIG?.SUCCESSION_FEES_PCT ?? DEFAULT_FEES_PCT,
    DEFAULT_FEES_PCT
  );

  const feesFixed = Math.max(0, toNumber(costs?.feesFixed ?? costs?.custasFixas ?? CONFIG?.SUCCESSION_FEES_FIXED, 0));

  return {
    itcmdRate: clamp(itcmdRate, 0, 0.2),
    legalPct: clamp(legalPct, 0, 0.2),
    feesPct: clamp(feesPct, 0, 0.2),
    feesFixed,
  };
}

function getSuccessionConfigFromClientData(clientData, state) {
  const cfg =
    clientData?.successionCosts ||
    clientData?.successionConfig ||
    clientData?.adjustments?.successionCosts ||
    clientData?.settings?.successionCosts ||
    {};
  return getSuccessionConfigFromCosts(cfg, state);
}

function calculateSuccessionInternal(clientDataOrAssets, maybeState, maybeSuccessionCosts) {
  const isAssetsArray = Array.isArray(clientDataOrAssets);

  let assets = [];
  let state = "SP";
  let configSource = null;
  let scenarioFx = {};
  let previdenciaConfig = {};

  if (isAssetsArray) {
    assets = clientDataOrAssets || [];

    if (maybeState && typeof maybeState === "object") {
      const obj = maybeState || {};
      state = obj?.state || obj?.successionState || "SP";
      configSource = obj;
      scenarioFx = obj?.fx || {};
      previdenciaConfig = obj?.previdenciaSuccession || {};
    } else {
      state = maybeState || "SP";
      configSource = maybeSuccessionCosts ? { successionCosts: maybeSuccessionCosts } : null;
    }
  } else {
    const cd = clientDataOrAssets || {};
    assets = cd?.assets || [];
    state = cd?.state || cd?.successionState || "SP";
    configSource = cd;
    scenarioFx = cd?.fx || {};
    previdenciaConfig = cd?.previdenciaSuccession || {};
  }

  const {
    financialTotal,
    illiquidTotal,
    previdenciaTotal,
    previdenciaVGBL,
    previdenciaPGBL,
    total,
  } = splitAssets(assets, scenarioFx);

  // Configurações de previdência na sucessão
  const excludePrevidenciaFromInventory = previdenciaConfig?.excludeFromInventory !== false; // default true
  const previdenciaITCMD = previdenciaConfig?.applyITCMD === true; // default false

  // Base para custos: se previdência excluída, não entra
  const inventoryBase = excludePrevidenciaFromInventory
    ? financialTotal + illiquidTotal
    : total;

  const { itcmdRate, legalPct, feesPct, feesFixed } = configSource
    ? getSuccessionConfigFromClientData(configSource, state)
    : getSuccessionConfigFromCosts({}, state);

  // Calcular custos sobre a base do inventário
  const itcmd = inventoryBase * itcmdRate + (previdenciaITCMD ? previdenciaTotal * itcmdRate : 0);
  const legal = inventoryBase * legalPct;
  const fees = inventoryBase * feesPct + feesFixed;

  const costTotal = itcmd + legal + fees;

  // Liquidez disponível: financeiro + previdência (se não bloqueada)
  const availableLiquidity = financialTotal + (excludePrevidenciaFromInventory ? previdenciaTotal : 0);
  const liquidityGap = Math.max(0, costTotal - availableLiquidity);

  // Exposição cambial
  const fxExposure = calculateFxExposure(assets, scenarioFx);

  return {
    state,
    financialTotal,
    illiquidTotal,
    previdenciaTotal,
    previdenciaVGBL,
    previdenciaPGBL,
    totalEstate: total,
    inventoryBase,
    costs: { itcmd, legal, fees, total: costTotal },
    liquidityGap,
    inputs: { itcmdRate, legalPct, feesPct, feesFixed },
    previdenciaConfig: {
      excludeFromInventory: excludePrevidenciaFromInventory,
      applyITCMD: previdenciaITCMD,
    },
    fxExposure,
  };
}

// ---------- MAIN ----------
function run(clientData = {}, isStressActiveExternal = false) {
  const currentAge = toNumber(clientData.currentAge ?? clientData.idadeAtual, 30);

  const retirementAge = toNumber(
    clientData.retirementAge ?? clientData.endContributionsAge ?? clientData.idadeAposentadoria ?? 60,
    60
  );

  const contributionEndAge = toNumber(
    clientData.contributionEndAge ?? clientData.endContributionsAge ?? clientData.fimAportes ?? retirementAge,
    retirementAge
  );

  const maxAge = toNumber(clientData.maxAge ?? clientData.lifeExpectancy ?? clientData.expectativaVida, 90);

  const baseMonthlyContribution = toNumber(
    clientData.monthlyContribution ?? clientData.monthlyAporte ?? clientData.aporteMensal ?? clientData.aporte ?? 0,
    0
  );

  const desiredMonthlyIncome = toNumber(
    clientData.monthlyIncomeRetirement ??
      clientData.monthlyRetirementIncome ??
      clientData.rendaAposentadoria ??
      clientData.monthlyDesiredIncome ??
      clientData.monthlyCostRetirement ??
      clientData.custoVidaAposentadoria ??
      clientData.retirementMonthlyExpense ??
      0,
    0
  );

  const nominalReturn = normalizeRate(
    clientData.assumptions?.nominalReturn ??
      clientData.nominalReturn ??
      pickNominalReturnByProfile(clientData) ??
      clientData.returnRateModerate ??
      CONFIG?.DEFAULT_RETURN_NOMINAL ??
      0.1,
    0.1
  );

  const inflation = normalizeRate(
    clientData.assumptions?.inflation ?? clientData.inflation ?? CONFIG?.DEFAULT_INFLATION ?? 0.04,
    0.04
  );

  const isStress = isStressActiveExternal || !!clientData.isStressTest || !!clientData.__stressTest;

  const stressInflAdd = normalizeRate(CONFIG?.STRESS_INFLATION_ADD, 0);
  const stressRetSub = normalizeRate(CONFIG?.STRESS_RETURN_SUB, 0);

  // Câmbio do cenário (com suporte a stress test)
  const baseFx = clientData?.fx || {};
  const fxShocks = isStress ? (clientData?.stressFxShocks || { USD_BRL_pct: 0.2, EUR_BRL_pct: 0.2 }) : {};
  const scenarioFx = isStress ? applyFxShock(baseFx, fxShocks) : {
    USD_BRL: baseFx?.USD_BRL ?? DEFAULT_FX_RATES.USD_BRL,
    EUR_BRL: baseFx?.EUR_BRL ?? DEFAULT_FX_RATES.EUR_BRL,
  };

  const effInfl = isStress ? inflation + stressInflAdd : inflation;
  const effNominal = isStress ? nominalReturn - stressRetSub : nominalReturn;
  const effReal = (1 + effNominal) / Math.max(1e-9, 1 + effInfl) - 1;

  const monthlyRealRate = annualToMonthlyRate(effReal);

  const {
    financialTotal: initialFinancial,
    illiquidTotal: initialIlliquid,
    previdenciaTotal: initialPrevidencia,
    previdenciaPGBL: _initialPGBL,
    previdenciaVGBL: _initialVGBL,
    total: totalNow,
  } = splitAssets(clientData.assets || [], scenarioFx);

  // ✅ Patrimônio líquido para planejamento: financeiro + previdência
  // Previdência é líquida para aposentadoria, então entra no patrimônio do plano
  const initialLiquidForPlan = initialFinancial + initialPrevidencia;

  // Exposição cambial
  const fxExposure = calculateFxExposure(clientData.assets || [], scenarioFx);

  const goalsRaw = Array.isArray(clientData.financialGoals) ? clientData.financialGoals : [];

  const impactGoals = goalsRaw
    .filter((g) => (g?.type || "impact") === "impact" || normalizeText(g?.type).includes("impact"))
    .map((g) => ({
      id: g.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      age: toNumber(g.age ?? g.naIdade ?? g.idade, 0),
      value: toNumber(g.value ?? g.valor ?? 0, 0),
      name: g.name ?? g.titulo ?? "Meta",
    }))
    .filter((g) => g.age > 0 && g.value > 0);

  const cashInEventsRaw = Array.isArray(clientData.cashInEvents) ? clientData.cashInEvents : [];

  const cashInEvents = cashInEventsRaw
    .filter((e) => e?.enabled !== false)
    .map((e) => ({
      age: toNumber(e.age ?? e.naIdade ?? e.idade, 0),
      value: toNumber(e.value ?? e.valor ?? 0, 0),
      type: normalizeText(e.type || "financial"),
    }))
    .filter((e) => e.age > 0 && e.value > 0);

  const rawTimeline =
    (Array.isArray(clientData.contributionTimeline) && clientData.contributionTimeline) ||
    (Array.isArray(clientData.contributionRanges) && clientData.contributionRanges) ||
    [];

  const contributionTimeline = rawTimeline.map(normalizeTimelineRule).filter((r) => r.enabled !== false);

  // ✅ SÉRIE alinhada ao Tracking:
  // Dentro de cada idade, simulamos 12 meses: aporte do mês -> retorno do mês.
  const startAge = clamp(currentAge, 0, 120);
  const endAge = clamp(maxAge, startAge, 120);

  const cashInByAge = new Map();
  for (const ev of cashInEvents) cashInByAge.set(ev.age, (cashInByAge.get(ev.age) || 0) + ev.value);

  const goalsByAge = new Map();
  for (const g of impactGoals) goalsByAge.set(g.age, (goalsByAge.get(g.age) || 0) + g.value);

  // ✅ Patrimônio inicial para projeção INCLUI previdência (líquida para aposentadoria)
  let wealth = initialLiquidForPlan;
  const series = [];

  // ❌ REMOVIDO: ponto inicial "snapshot" - agora o primeiro ponto será o fim do 1º ano
  // O gráfico começa mostrando o patrimônio após 12 meses de aportes e rendimento

  for (let age = startAge; age < endAge; age++) {
    const baseForThisAge = age < contributionEndAge ? baseMonthlyContribution : 0;

    // 12 meses dentro do ano dessa idade
    for (let m = 1; m <= 12; m++) {
      const monthly = getMonthlyContributionAtAge(age, baseForThisAge, contributionTimeline);

      // aporte no mês
      wealth += toNumber(monthly, 0);

      // retorno do mês
      wealth *= 1 + monthlyRealRate;

      // retirada mensal na aposentadoria
      if (age >= retirementAge && desiredMonthlyIncome > 0) {
        wealth = Math.max(0, wealth - desiredMonthlyIncome);
      }
    }

    // eventos no "aniversário" (age+1)
    const nextAge = age + 1;

    const cashIn = cashInByAge.get(nextAge) || 0;
    if (cashIn > 0) wealth += cashIn;

    const goalsAtAge = goalsByAge.get(nextAge) || 0;
    if (goalsAtAge > 0) wealth = Math.max(0, wealth - goalsAtAge);

    series.push({
      age: nextAge,
      wealth,
      financial: wealth,
      totalWealth: wealth + initialIlliquid,
    });
  }

  const atRet = series.find((p) => p.age === retirementAge) || series[series.length - 1] || { wealth: 0 };
  const capitalAposentadoria = toNumber(atRet.wealth, 0);

  const sustainableIncomeMensal = effReal > 0 ? (capitalAposentadoria * effReal) / 12 : 0;
  const capitalNecessario = effReal > 0 && desiredMonthlyIncome > 0 ? (desiredMonthlyIncome * 12) / effReal : 0;
  const coberturaMetaPct = capitalNecessario > 0 ? (capitalAposentadoria / capitalNecessario) * 100 : 0;

  const liquidityPct = totalNow > 0 ? (initialFinancial / totalNow) * 100 : 0;

  const scoreCoverage = clamp(coberturaMetaPct / 100, 0, 2);
  const scoreLiquidity = clamp(liquidityPct / 100, 0, 1);
  const score = clamp(Math.round(scoreCoverage * 45 + scoreLiquidity * 35 + (effReal > 0 ? 20 : 0)), 0, 100);

  const kpis = {
    coberturaMetaPct,
    capitalNecessario,
    rendaSustentavelMensal: sustainableIncomeMensal,
    liquidityPct,
    wealthScore: score,

    capitalAposentadoriaFinanceiro: capitalAposentadoria,
    patrimonioAtualFinanceiro: initialFinancial,
    patrimonioAtualBens: initialIlliquid,
    patrimonioAtualPrevidencia: initialPrevidencia,

    // ✅ Baseline para Tracking: financeiro + previdência (total líquido para plano)
    baselineWealthBRL: initialLiquidForPlan,

    // Exposição cambial
    fxExposure,
    scenarioFx,

    _inputs: {
      desiredMonthlyIncome,
      baseMonthlyContribution,
      effReal,
      effNominal,
      effInfl,
      nominalReturn,
      inflation,
      monthlyRealRate,
      profile: clientData?.profile,
      pickedReturnByProfile: pickNominalReturnByProfile(clientData),
      retirementAge,
      contributionEndAge,
      isStress,
      startAge,
      endAge,
    },
  };

  return {
    kpis,
    series,
    succession: calculateSuccessionInternal(clientData),
    fxExposure,
  };
}

const FinancialEngine = {
  run,
  calculateSuccession: calculateSuccessionInternal,
  splitAssets,
};

export default FinancialEngine;
