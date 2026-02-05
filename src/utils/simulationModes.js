// src/utils/simulationModes.js
// Solvers e funções para os modos "Consumo do Patrimônio Total" e "Preservação do Patrimônio"

import { toNumber } from "./format";
import { convertToBRL, DEFAULT_FX_RATES } from "./fx";
import {
  normalizeTimelineRule,
  getMonthlyContributionAtAge,
  normalizeTimeline,
} from "./contributionTimeline";

// ========================================
// CONSTANTES E HELPERS
// ========================================

const MODES = {
  CONSUMPTION: "consumption", // Consumo do Patrimônio Total
  PRESERVATION: "preservation", // Preservação do Patrimônio
};

const MAX_ITERATIONS = 50;
const TOLERANCE_MONTHS_WEALTH = 50000; // R$ 50.000 de tolerância para patrimônio final (more lenient)
const TOLERANCE_PRESERVATION_PCT = 0.95; // 95% do patrimônio inicial na aposentadoria é aceitável

/**
 * Helper: converte taxa anual para mensal (juros compostos)
 */
function annualToMonthlyRate(annualRate) {
  const r = toNumber(annualRate, 0);
  if (!Number.isFinite(r) || r <= -1) return 0;
  return Math.pow(1 + r, 1 / 12) - 1;
}

/**
 * Helper: normaliza texto (remove acentos, lowercase)
 */
function normalizeText(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Seleciona a rentabilidade nominal conforme perfil
 */
function pickNominalReturnByProfile(clientData = {}) {
  const profile = normalizeText(clientData?.profile ?? clientData?.perfil ?? "moderado");

  const rCons = clientData?.returnRateConservative ?? clientData?.rentCons ?? 8;
  const rMod = clientData?.returnRateModerate ?? clientData?.rentMod ?? 10;
  const rBold = clientData?.returnRateBold ?? clientData?.rentBold ?? 12;

  // Valores armazenados em % (ex: 10 = 10%)
  let rate;
  if (profile.includes("conserv")) rate = rCons ?? rMod ?? rBold;
  else if (profile.includes("arroj") || profile.includes("agress")) rate = rBold ?? rMod ?? rCons;
  else rate = rMod ?? rCons ?? rBold;

  return toNumber(rate, 10) / 100; // Retorna em decimal
}

/**
 * Helper: normaliza taxa (se > 1, assume que é percentual e divide por 100)
 */
function normalizeRate(x, fallback = 0) {
  const n = toNumber(x, NaN);
  if (!Number.isFinite(n)) return fallback;
  if (Math.abs(n) > 1) return n / 100;
  return n;
}

/**
 * Helper: Calcula patrimônio inicial em BRL (financeiro + previdência) com conversão FX.
 * Segue a mesma lógica do FinancialEngine.splitAssets para garantir consistência.
 * 
 * @param {Array} assets - Lista de ativos do cliente
 * @param {object} clientData - Dados do cliente (para acessar fx)
 * @returns {number} - Patrimônio inicial em BRL
 */
function calculateInitialWealthBRL(assets, clientData = {}) {
  const list = Array.isArray(assets) ? assets : [];
  
  // Obter FX do cenário com fallback
  const scenarioFx = {
    USD_BRL: clientData?.fx?.USD_BRL ?? DEFAULT_FX_RATES.USD_BRL,
    EUR_BRL: clientData?.fx?.EUR_BRL ?? DEFAULT_FX_RATES.EUR_BRL,
  };
  
  let financialTotal = 0;
  let previdenciaTotal = 0;
  
  for (const a of list) {
    // Converter para BRL usando FX (mesma lógica do convertToBRL em fx.js)
    const val = convertToBRL(a, scenarioFx) || toNumber(a?.value ?? a?.amount ?? a?.valor ?? 0, 0);
    
    const rawType = a?.type ?? a?.assetType ?? a?.category ?? "";
    const t = normalizeText(rawType);
    
    // Categorização idêntica ao FinancialEngine.splitAssets
    if (t === "previdencia" || t === "previdência") {
      previdenciaTotal += val;
    } else {
      // Exclui bens ilíquidos (imóvel, veículo, empresa, etc.)
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
      
      if (!illiquidTypes.has(t)) {
        financialTotal += val;
      }
    }
  }
  
  // Retorna financeiro + previdência (mesma regra do baseline: initialLiquidForPlan)
  return financialTotal + previdenciaTotal;
}

// ========================================
// SIMULAÇÃO SIMPLIFICADA (REUSA LÓGICA DO MOTOR)
// ========================================

// ✅ normalizeTimelineRule e getMonthlyContributionAtAge importados de ./contributionTimeline
// para garantir semântica byte-for-byte equivalente ao FinancialEngine

/**
 * Helper: Marca a idade em que o patrimônio zerou pela primeira vez.
 * 
 * Regras:
 * - Se zeroedAtAge já está setado, mantém o primeiro (não re-marca)
 * - Se before > 0 && after === 0, registra ageToRecord
 * - Caso contrário, mantém null
 * 
 * @param {number} before - Patrimônio antes da operação
 * @param {number} after - Patrimônio após a operação
 * @param {number} ageToRecord - Idade a registrar se houve depletion
 * @param {number|null} zeroedAtAge - Estado atual de zeroedAtAge
 * @returns {number|null} - Novo valor de zeroedAtAge
 */
export function markZeroedIfNeeded(before, after, ageToRecord, zeroedAtAge) {
  // Se já marcou antes, não re-marca
  if (zeroedAtAge !== null) return zeroedAtAge;
  // Se caiu de > 0 para 0, marca a idade
  if (before > 0 && after === 0) return ageToRecord;
  // Caso contrário, mantém null
  return null;
}

/**
 * Simula a evolução do patrimônio com os parâmetros fornecidos.
 * Retorna o patrimônio final e a série de projeção.
 * 
 * @param {object} params
 * @param {number} params.initialWealth - Patrimônio inicial líquido (financeiro + previdência)
 * @param {number} params.monthlyContribution - Aporte mensal
 * @param {number} params.currentAge - Idade atual
 * @param {number} params.retirementAge - Idade de aposentadoria
 * @param {number} params.contributionEndAge - Idade fim dos aportes (geralmente = retirementAge)
 * @param {number} params.lifeExpectancy - Expectativa de vida
 * @param {number} params.desiredMonthlyIncome - Renda mensal desejada na aposentadoria
 * @param {number} params.realReturn - Taxa de retorno real anual (decimal)
 * @param {Array} params.cashInEvents - (opcional) Eventos de entrada de caixa [{age, value}]
 * @param {Array} params.impactGoals - (opcional) Metas de impacto [{age, value}]
 * @param {Array} params.contributionTimeline - (opcional) Timeline de aportes [{startAge, endAge, amount}]
 * @returns {object} { finalWealth, wealthAtRetirement, series, zeroedAtAge, lifeExpectancy }
 */
export function simulateWealth({
  initialWealth,
  monthlyContribution,
  currentAge,
  retirementAge,
  contributionEndAge,
  lifeExpectancy,
  desiredMonthlyIncome,
  realReturn,
  // Parâmetros opcionais para incluir impactos (igual ao FinancialEngine)
  cashInEvents = [],
  impactGoals = [],
  contributionTimeline = [],
}) {
  const monthlyRate = annualToMonthlyRate(realReturn);
  const startAge = Math.max(0, Math.min(120, currentAge));
  const endAge = Math.max(startAge, Math.min(120, lifeExpectancy));
  const retAge = Math.max(startAge, Math.min(endAge, retirementAge));
  const contribEnd = Math.max(startAge, Math.min(endAge, contributionEndAge ?? retAge));

  // Prepara maps para cash-in e goals por idade
  const cashInByAge = new Map();
  for (const ev of cashInEvents) {
    if (ev?.age > 0 && ev?.value > 0) {
      cashInByAge.set(ev.age, (cashInByAge.get(ev.age) || 0) + ev.value);
    }
  }

  const goalsByAge = new Map();
  for (const g of impactGoals) {
    if (g?.age > 0 && g?.value > 0) {
      goalsByAge.set(g.age, (goalsByAge.get(g.age) || 0) + g.value);
    }
  }

  // ✅ Normaliza timeline usando util compartilhado (semântica equivalente ao FinancialEngine)
  const timeline = normalizeTimeline(contributionTimeline);

  let wealth = toNumber(initialWealth, 0);
  const series = [];
  let wealthAtRetirement = wealth;
  let zeroedAtAge = null; // Track when wealth first hit zero

  for (let age = startAge; age < endAge; age++) {
    const baseForThisAge = age < contribEnd ? monthlyContribution : 0;

    // 12 meses dentro do ano
    for (let m = 1; m <= 12; m++) {
      // Aporte do mês (considerando timeline se houver)
      const monthlyContrib = timeline.length > 0
        ? getMonthlyContributionAtAge(age, baseForThisAge, timeline)
        : baseForThisAge;
      
      // ✅ Contribuição negativa (resgate) pode zerar patrimônio
      const wealthBeforeContrib = wealth;
      wealth += toNumber(monthlyContrib, 0);
      if (wealth < 0) wealth = 0; // Não pode ficar negativo
      zeroedAtAge = markZeroedIfNeeded(wealthBeforeContrib, wealth, age + (m / 12), zeroedAtAge);

      // Retorno do mês
      wealth *= 1 + monthlyRate;

      // Retirada mensal na aposentadoria
      if (age >= retAge && desiredMonthlyIncome > 0) {
        const wealthBeforeWithdraw = wealth;
        wealth = Math.max(0, wealth - desiredMonthlyIncome);
        // ✅ Usa helper consistente para marcar depletion
        zeroedAtAge = markZeroedIfNeeded(wealthBeforeWithdraw, wealth, age + (m / 12), zeroedAtAge);
      }
    }

    const nextAge = age + 1;

    // Eventos no "aniversário" (nextAge) - igual ao FinancialEngine
    const cashIn = cashInByAge.get(nextAge) || 0;
    if (cashIn > 0) wealth += cashIn;

    // ✅ FIX: impactGoals pode zerar patrimônio - deve marcar zeroedAtAge = nextAge
    const goalsAtAge = goalsByAge.get(nextAge) || 0;
    if (goalsAtAge > 0) {
      const wealthBeforeGoals = wealth;
      wealth = Math.max(0, wealth - goalsAtAge);
      zeroedAtAge = markZeroedIfNeeded(wealthBeforeGoals, wealth, nextAge, zeroedAtAge);
    }

    // Captura patrimônio na aposentadoria
    if (nextAge === retAge) {
      wealthAtRetirement = wealth;
    }
    // Se aposentadoria já passou e ainda não capturou
    if (nextAge > retAge && wealthAtRetirement === toNumber(initialWealth, 0)) {
      wealthAtRetirement = wealth;
    }

    series.push({
      age: nextAge,
      wealth,
      financial: wealth,
    });
  }

  const finalWealth = wealth;

  return {
    finalWealth,
    wealthAtRetirement: series.find((p) => p.age === retAge)?.wealth ?? wealthAtRetirement,
    series,
    zeroedAtAge, // Age when wealth first hit zero (null if never zeroed)
    lifeExpectancy: endAge, // For comparison
  };
}

// ========================================
// FUNÇÕES DE AVALIAÇÃO PARA OS MODOS
// ========================================

/**
 * Modo CONSUMO: patrimônio deve terminar próximo de zero na expectativa de vida.
 * Returns an object with:
 * - finalWealth: the wealth at end of simulation
 * - zeroedEarly: true if wealth hit zero before life expectancy
 * - yearsShort: how many years early it zeroed (positive = failed early, negative = still has money)
 */
function evaluateConsumptionMode({
  initialWealth,
  monthlyContribution,
  currentAge,
  retirementAge,
  contributionEndAge,
  lifeExpectancy,
  desiredMonthlyIncome,
  realReturn,
  // Impacts opcionais
  cashInEvents = [],
  impactGoals = [],
  contributionTimeline = [],
}) {
  const result = simulateWealth({
    initialWealth,
    monthlyContribution,
    currentAge,
    retirementAge,
    contributionEndAge,
    lifeExpectancy,
    desiredMonthlyIncome,
    realReturn,
    cashInEvents,
    impactGoals,
    contributionTimeline,
  });

  const { finalWealth, zeroedAtAge } = result;
  
  // Did wealth hit zero before life expectancy?
  const zeroedEarly = zeroedAtAge !== null && zeroedAtAge < lifeExpectancy - 0.5;
  
  // Calculate how many years short we are
  // Positive = ran out early (need more contributions)
  // Negative = still has money (need fewer contributions)  
  // Zero = perfect consumption
  let yearsShort = 0;
  if (zeroedEarly) {
    // Ran out of money before life expectancy - this is bad, need more savings
    yearsShort = lifeExpectancy - zeroedAtAge;
  } else if (finalWealth > TOLERANCE_MONTHS_WEALTH) {
    // Still have money at the end - can reduce contributions
    yearsShort = -finalWealth / 10000; // Negative signal proportional to wealth left
  }
  
  return {
    finalWealth,
    zeroedEarly,
    yearsShort,
    zeroedAtAge,
  };
}

/**
 * Modo PRESERVAÇÃO: patrimônio final ≥ patrimônio no início da aposentadoria (ou 95% dele).
 * Retorna a diferença entre patrimônio final e o target de preservação.
 */
function evaluatePreservationMode({
  initialWealth,
  monthlyContribution,
  currentAge,
  retirementAge,
  contributionEndAge,
  lifeExpectancy,
  desiredMonthlyIncome,
  realReturn,
  // Impacts opcionais
  cashInEvents = [],
  impactGoals = [],
  contributionTimeline = [],
}) {
  const { finalWealth, wealthAtRetirement } = simulateWealth({
    initialWealth,
    monthlyContribution,
    currentAge,
    retirementAge,
    contributionEndAge,
    lifeExpectancy,
    desiredMonthlyIncome,
    realReturn,
    cashInEvents,
    impactGoals,
    contributionTimeline,
  });

  // Objetivo: finalWealth >= wealthAtRetirement * 0.95 (preservação com tolerância)
  const targetPreservation = wealthAtRetirement * TOLERANCE_PRESERVATION_PCT;

  // Retorna quanto está acima ou abaixo do target
  return finalWealth - targetPreservation;
}

// ========================================
// SOLVERS (BUSCA BINÁRIA)
// ========================================

/**
 * Encontra o aporte mensal necessário para atingir o objetivo do modo.
 * 
 * @param {object} params
 * @param {'consumption' | 'preservation'} params.mode
 * @param {object} params.inputs - Dados do cliente
 * @param {number} params.targetRetirementAge - Idade de aposentadoria desejada
 * @param {object} params.impacts - (opcional) { cashInEvents, impactGoals, contributionTimeline }
 * @returns {object} { requiredMonthlyContribution, status, explain }
 */
export function solveRequiredContribution({ mode, inputs, targetRetirementAge, impacts = {} }) {
  const { cashInEvents = [], impactGoals = [], contributionTimeline = [] } = impacts;
  
  const currentAge = toNumber(inputs.currentAge, 30);
  const retirementAge = toNumber(targetRetirementAge ?? inputs.retirementAge, 60);
  const contributionEndAge = toNumber(inputs.contributionEndAge ?? retirementAge, retirementAge);
  const lifeExpectancy = toNumber(inputs.lifeExpectancy ?? inputs.maxAge, 90);
  const desiredMonthlyIncome = toNumber(
    inputs.monthlyCostRetirement ?? inputs.monthlyIncomeRetirement ?? inputs.desiredMonthlyIncome ?? 15000,
    15000
  );

  // ✅ Patrimônio inicial em BRL (financeiro + previdência) com conversão FX
  // Usa a mesma lógica do baseline (FinancialEngine.splitAssets)
  const assets = Array.isArray(inputs.assets) ? inputs.assets : [];
  const initialWealth = calculateInitialWealthBRL(assets, inputs);

  // Taxa de retorno real
  const nominalReturn = pickNominalReturnByProfile(inputs);
  const inflation = normalizeRate(inputs.inflation ?? 4.5, 0.045);
  const realReturn = (1 + nominalReturn) / (1 + inflation) - 1;

  // Busca binária para encontrar o aporte necessário
  const currentContrib = toNumber(inputs.monthlyContribution ?? inputs.aporteMensal, 5000);
  let lowerBound = 0;
  let upperBound = Math.max(currentContrib * 10, 100000);

  // Helper para avaliar um aporte
  const evaluateContrib = (contrib) => {
    const params = {
      initialWealth,
      monthlyContribution: contrib,
      currentAge,
      retirementAge,
      contributionEndAge,
      lifeExpectancy,
      desiredMonthlyIncome,
      realReturn,
      // Passa impactos se houver
      cashInEvents,
      impactGoals,
      contributionTimeline,
    };
    
    if (mode === MODES.CONSUMPTION) {
      return evaluateConsumptionMode(params);
    } else {
      return evaluatePreservationMode(params);
    }
  };

  // Para CONSUMPTION: verificar se o upper bound é suficiente para não zerar antes
  // Para PRESERVATION: verificar se o upper bound atinge preservação
  if (mode === MODES.CONSUMPTION) {
    // First check: does contribution = 0 already work? (person has enough wealth)
    const zeroContribResult = evaluateContrib(0);
    if (!zeroContribResult.zeroedEarly) {
      // Person can survive without any new contributions
      // Return 0 as the minimum required contribution
      return {
        requiredMonthlyContribution: 0,
        status: "ok",
        explain: `Com o patrimônio atual, não é necessário aporte adicional para consumir até os ${lifeExpectancy} anos mantendo renda de ${formatSimpleCurrency(desiredMonthlyIncome)}/mês.`,
      };
    }
    
    let testResult = evaluateContrib(upperBound);
    let expansions = 0;
    
    // Se ainda zera antes do fim, aumentar upper bound
    while (testResult.zeroedEarly && expansions < 5) {
      expansions++;
      upperBound *= 2;
      testResult = evaluateContrib(upperBound);
    }
    
    if (testResult.zeroedEarly) {
      return {
        requiredMonthlyContribution: null,
        status: "impossible",
        explain: getImpossibleExplanation(mode, { desiredMonthlyIncome, retirementAge, lifeExpectancy }),
      };
    }
  } else {
    // PRESERVATION mode - keep existing logic
    let testResult = evaluateContrib(upperBound);
    let expansions = 0;
    
    while (testResult < 0 && expansions < 5) {
      expansions++;
      upperBound *= 2;
      testResult = evaluateContrib(upperBound);
    }
    
    if (testResult < 0) {
      return {
        requiredMonthlyContribution: null,
        status: "impossible",
        explain: getImpossibleExplanation(mode, { desiredMonthlyIncome, retirementAge, lifeExpectancy }),
      };
    }
  }

  // Busca binária
  let result = null;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (lowerBound + upperBound) / 2;
    const evaluation = evaluateContrib(mid);

    if (mode === MODES.CONSUMPTION) {
      // CONSUMPTION: queremos finalWealth ≈ 0 sem zerar antes do fim
      const { finalWealth, zeroedEarly } = evaluation;
      
      // Sucesso: não zerou antes E patrimônio final próximo de zero
      if (!zeroedEarly && finalWealth >= 0 && finalWealth < TOLERANCE_MONTHS_WEALTH) {
        result = mid;
        break;
      }
      
      if (zeroedEarly) {
        // Zerou antes do fim - precisa AUMENTAR aporte para ter mais patrimônio
        lowerBound = mid;
      } else if (finalWealth > TOLERANCE_MONTHS_WEALTH) {
        // Sobrou patrimônio no fim - pode REDUZIR aporte
        upperBound = mid;
      } else {
        // Dentro da tolerância
        result = mid;
        break;
      }
    } else {
      // PRESERVATION: queremos evaluation >= 0 (patrimônio final >= target)
      if (evaluation >= 0 && evaluation < TOLERANCE_MONTHS_WEALTH * 10) {
        result = mid;
        break;
      }
      if (evaluation < 0) {
        // Não preservou, precisa aumentar aporte
        lowerBound = mid;
      } else {
        // Preservou com folga, pode reduzir aporte
        upperBound = mid;
      }
    }

    // Convergência por proximidade
    if (upperBound - lowerBound < 50) {
      // For consumption: we want the minimum that works (closer to lowerBound but valid)
      // For preservation: we want the minimum that achieves preservation (upperBound is safer)
      if (mode === MODES.CONSUMPTION) {
        // Try the midpoint - if it works, use it; if not, use upperBound
        const testMid = (lowerBound + upperBound) / 2;
        const midEval = evaluateContrib(testMid);
        if (!midEval.zeroedEarly) {
          result = testMid;
        } else {
          result = upperBound;
        }
      } else {
        const finalEval = evaluateContrib(upperBound);
        result = finalEval >= 0 ? upperBound : null;
      }
      break;
    }
  }

  if (result === null) {
    return {
      requiredMonthlyContribution: null,
      status: "impossible",
      explain: getImpossibleExplanation(mode, { desiredMonthlyIncome, retirementAge, lifeExpectancy }),
    };
  }

  return {
    requiredMonthlyContribution: Math.round(result * 100) / 100,
    status: "ok",
    explain: mode === MODES.CONSUMPTION
      ? `Aporte necessário para consumir todo o patrimônio até os ${lifeExpectancy} anos, mantendo renda de ${formatSimpleCurrency(desiredMonthlyIncome)}/mês.`
      : `Aporte necessário para preservar o patrimônio até os ${lifeExpectancy} anos, mantendo renda de ${formatSimpleCurrency(desiredMonthlyIncome)}/mês.`,
  };
}

/**
 * Encontra a idade de aposentadoria necessária para atingir o objetivo do modo,
 * mantendo o aporte atual fixo.
 * 
 * @param {object} params
 * @param {'consumption' | 'preservation'} params.mode
 * @param {object} params.inputs - Dados do cliente
 * @param {number} params.fixedMonthlyContribution - Aporte mensal fixo
 * @param {object} params.impacts - (opcional) { cashInEvents, impactGoals, contributionTimeline }
 * @returns {object} { requiredRetirementAge, status, explain }
 */
export function solveRetirementAge({ mode, inputs, fixedMonthlyContribution, impacts = {} }) {
  const { cashInEvents = [], impactGoals = [], contributionTimeline = [] } = impacts;
  
  const currentAge = toNumber(inputs.currentAge, 30);
  const lifeExpectancy = toNumber(inputs.lifeExpectancy ?? inputs.maxAge, 90);
  const desiredMonthlyIncome = toNumber(
    inputs.monthlyCostRetirement ?? inputs.monthlyIncomeRetirement ?? inputs.desiredMonthlyIncome ?? 15000,
    15000
  );
  const monthlyContribution = toNumber(fixedMonthlyContribution ?? inputs.monthlyContribution, 5000);

  // ✅ Patrimônio inicial em BRL (financeiro + previdência) com conversão FX
  // Usa a mesma lógica do baseline (FinancialEngine.splitAssets)
  const assets = Array.isArray(inputs.assets) ? inputs.assets : [];
  const initialWealth = calculateInitialWealthBRL(assets, inputs);

  // Taxa de retorno real
  const nominalReturn = pickNominalReturnByProfile(inputs);
  const inflation = normalizeRate(inputs.inflation ?? 4.5, 0.045);
  const realReturn = (1 + nominalReturn) / (1 + inflation) - 1;

  // Busca binária para idade de aposentadoria
  const currentRetirementAge = toNumber(inputs.retirementAge, 60);
  let lowerBound = currentAge + 1; // Can't retire before current age
  let upperBound = lifeExpectancy - 1;

  // Helper para avaliar uma idade de aposentadoria
  const evaluateAge = (retAge) => {
    const params = {
      initialWealth,
      monthlyContribution,
      currentAge,
      retirementAge: retAge,
      contributionEndAge: retAge,
      lifeExpectancy,
      desiredMonthlyIncome,
      realReturn,
      // Passa impactos se houver
      cashInEvents,
      impactGoals,
      contributionTimeline,
    };
    
    if (mode === MODES.CONSUMPTION) {
      return evaluateConsumptionMode(params);
    } else {
      return evaluatePreservationMode(params);
    }
  };

  // Verificar se já atinge com a idade atual
  const currentEval = evaluateAge(currentRetirementAge);

  if (mode === MODES.CONSUMPTION) {
    const { finalWealth, zeroedEarly } = currentEval;
    // Success if: didn't zero early AND final wealth is near zero
    if (!zeroedEarly && finalWealth >= 0 && finalWealth < TOLERANCE_MONTHS_WEALTH) {
      return {
        requiredRetirementAge: currentRetirementAge,
        status: "ok",
        explain: `Já atinge o objetivo com a idade de aposentadoria atual (${currentRetirementAge} anos).`,
      };
    }
  } else {
    if (currentEval >= 0) {
      return {
        requiredRetirementAge: currentRetirementAge,
        status: "ok",
        explain: `Já atinge o objetivo com a idade de aposentadoria atual (${currentRetirementAge} anos).`,
      };
    }
  }

  // Busca binária
  let result = null;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = Math.round((lowerBound + upperBound) / 2);
    const evaluation = evaluateAge(mid);

    if (mode === MODES.CONSUMPTION) {
      const { finalWealth, zeroedEarly } = evaluation;
      
      // Success: didn't zero early AND final wealth near zero
      if (!zeroedEarly && finalWealth >= 0 && finalWealth < TOLERANCE_MONTHS_WEALTH) {
        result = mid;
        break;
      }
      
      if (zeroedEarly) {
        // Zerou antes do fim - precisa aposentar DEPOIS (mais tempo para acumular)
        lowerBound = mid;
      } else if (finalWealth > TOLERANCE_MONTHS_WEALTH) {
        // Sobrou patrimônio - pode aposentar ANTES
        upperBound = mid;
      } else {
        result = mid;
        break;
      }
    } else {
      // PRESERVATION mode
      if (evaluation >= 0 && evaluation < TOLERANCE_MONTHS_WEALTH * 10) {
        result = mid;
        break;
      }
      if (evaluation < 0) {
        // Não preservou, precisa aposentar depois
        lowerBound = mid;
      } else {
        // Preservou, pode aposentar antes
        upperBound = mid;
      }
    }

    if (upperBound - lowerBound <= 1) {
      // Verify the upper bound works
      const finalEval = evaluateAge(upperBound);
      if (mode === MODES.CONSUMPTION) {
        const { zeroedEarly } = finalEval;
        result = zeroedEarly ? null : upperBound;
      } else {
        result = finalEval >= 0 ? upperBound : null;
      }
      break;
    }
  }

  if (result === null || result >= lifeExpectancy) {
    return {
      requiredRetirementAge: null,
      status: "impossible",
      explain: getImpossibleExplanation(mode, { desiredMonthlyIncome, retirementAge: currentRetirementAge, lifeExpectancy }),
    };
  }

  return {
    requiredRetirementAge: result,
    status: "ok",
    explain: mode === MODES.CONSUMPTION
      ? `Idade necessária para consumir todo o patrimônio até os ${lifeExpectancy} anos, mantendo aporte de ${formatSimpleCurrency(monthlyContribution)}/mês.`
      : `Idade necessária para preservar o patrimônio até os ${lifeExpectancy} anos, mantendo aporte de ${formatSimpleCurrency(monthlyContribution)}/mês.`,
  };
}

/**
 * Simula um modo específico e retorna a série de projeção para o gráfico.
 * 
 * @param {object} params
 * @param {'consumption' | 'preservation'} params.mode
 * @param {object} params.inputs - Dados do cliente
 * @param {number} params.monthlyContribution - Aporte mensal a usar
 * @param {number} params.retirementAge - Idade de aposentadoria a usar
 * @param {object} params.impacts - (opcional) { cashInEvents, impactGoals, contributionTimeline }
 * @returns {object} { series, finalWealth, wealthAtRetirement }
 */
export function simulateMode({ mode, inputs, monthlyContribution, retirementAge, impacts = {} }) {
  const { cashInEvents = [], impactGoals = [], contributionTimeline = [] } = impacts;
  
  const currentAge = toNumber(inputs.currentAge, 30);
  const retAge = toNumber(retirementAge ?? inputs.retirementAge, 60);
  const contributionEndAge = toNumber(inputs.contributionEndAge ?? retAge, retAge);
  const lifeExpectancy = toNumber(inputs.lifeExpectancy ?? inputs.maxAge, 90);
  const desiredMonthlyIncome = toNumber(
    inputs.monthlyCostRetirement ?? inputs.monthlyIncomeRetirement ?? inputs.desiredMonthlyIncome ?? 15000,
    15000
  );

  // ✅ Patrimônio inicial em BRL (financeiro + previdência) com conversão FX
  // Usa a mesma lógica do baseline (FinancialEngine.splitAssets)
  const assets = Array.isArray(inputs.assets) ? inputs.assets : [];
  const initialWealth = calculateInitialWealthBRL(assets, inputs);

  // Taxa de retorno real
  const nominalReturn = pickNominalReturnByProfile(inputs);
  const inflation = normalizeRate(inputs.inflation ?? 4.5, 0.045);
  const realReturn = (1 + nominalReturn) / (1 + inflation) - 1;

  const result = simulateWealth({
    initialWealth,
    monthlyContribution: toNumber(monthlyContribution, 5000),
    currentAge,
    retirementAge: retAge,
    contributionEndAge: Math.min(contributionEndAge, retAge),
    lifeExpectancy,
    desiredMonthlyIncome,
    realReturn,
    // Passa impactos se houver
    cashInEvents,
    impactGoals,
    contributionTimeline,
  });

  return {
    mode,
    series: result.series,
    finalWealth: result.finalWealth,
    wealthAtRetirement: result.wealthAtRetirement,
    labels: {
      mode: mode === MODES.PRESERVATION ? "Preservação do Patrimônio" : "Consumo Total",
      retirementAge: retAge,
      monthlyContribution,
      desiredMonthlyIncome,
    },
  };
}

// ========================================
// FUNÇÃO PRINCIPAL: CALCULAR AMBOS OS MODOS
// ========================================

/**
 * Extrai e normaliza os eventos de impacto do clientData.
 * Reutiliza lógica similar ao FinancialEngine.js
 */
function extractImpactsFromClientData(clientData) {
  if (!clientData) return { cashInEvents: [], impactGoals: [], contributionTimeline: [] };

  // Cash-in events
  const cashInEventsRaw = Array.isArray(clientData.cashInEvents) ? clientData.cashInEvents : [];
  const cashInEvents = cashInEventsRaw
    .filter((e) => e?.enabled !== false)
    .map((e) => ({
      age: toNumber(e.age ?? e.naIdade ?? e.idade, 0),
      value: toNumber(e.value ?? e.valor ?? 0, 0),
      type: normalizeText(e.type || "financial"),
    }))
    .filter((e) => e.age > 0 && e.value > 0);

  // Impact goals
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

  // Contribution timeline
  const rawTimeline =
    (Array.isArray(clientData.contributionTimeline) && clientData.contributionTimeline) ||
    (Array.isArray(clientData.contributionRanges) && clientData.contributionRanges) ||
    [];
  const contributionTimeline = rawTimeline
    .map(normalizeTimelineRule)
    .filter((r) => r && r.enabled !== false);

  return { cashInEvents, impactGoals, contributionTimeline };
}

/**
 * Calcula os resultados de ambos os modos de simulação.
 * 
 * @param {object} clientData - Dados do cliente
 * @param {object} options - Opções de cálculo
 * @param {boolean} options.includeImpacts - Se true, considera metas, cash-in events e timeline de aportes
 * @returns {object} { consumption: {...}, preservation: {...} }
 */
export function calculateAlternativeScenarios(clientData, options = {}) {
  if (!clientData) return { consumption: null, preservation: null };

  const { includeImpacts = false } = options;

  // Extrai impactos do clientData se includeImpacts = true
  const impacts = includeImpacts ? extractImpactsFromClientData(clientData) : {};

  const currentRetirementAge = toNumber(clientData.retirementAge, 60);
  const currentContribution = toNumber(clientData.monthlyContribution, 5000);

  // ============ MODO CONSUMO ============
  const consumptionContrib = solveRequiredContribution({
    mode: MODES.CONSUMPTION,
    inputs: clientData,
    targetRetirementAge: currentRetirementAge,
    impacts,
  });

  const consumptionAge = solveRetirementAge({
    mode: MODES.CONSUMPTION,
    inputs: clientData,
    fixedMonthlyContribution: currentContribution,
    impacts,
  });

  let consumptionSeries = null;
  if (consumptionContrib.status === "ok") {
    consumptionSeries = simulateMode({
      mode: MODES.CONSUMPTION,
      inputs: clientData,
      monthlyContribution: consumptionContrib.requiredMonthlyContribution,
      retirementAge: currentRetirementAge,
      impacts,
    });
  }

  // ============ MODO PRESERVAÇÃO ============
  const preservationContrib = solveRequiredContribution({
    mode: MODES.PRESERVATION,
    inputs: clientData,
    targetRetirementAge: currentRetirementAge,
    impacts,
  });

  const preservationAge = solveRetirementAge({
    mode: MODES.PRESERVATION,
    inputs: clientData,
    fixedMonthlyContribution: currentContribution,
    impacts,
  });

  let preservationSeries = null;
  if (preservationContrib.status === "ok") {
    preservationSeries = simulateMode({
      mode: MODES.PRESERVATION,
      inputs: clientData,
      monthlyContribution: preservationContrib.requiredMonthlyContribution,
      retirementAge: currentRetirementAge,
      impacts,
    });
  }

  return {
    consumption: {
      mode: MODES.CONSUMPTION,
      label: "Consumo do Patrimônio Total",
      description: "Planeje para usar todo o patrimônio até a expectativa de vida, mantendo sua renda desejada.",
      tooltip: "Neste modo, o patrimônio é consumido gradualmente até terminar próximo de zero na expectativa de vida.",
      requiredContribution: consumptionContrib,
      requiredAge: consumptionAge,
      projectionSeries: consumptionSeries,
      currentRetirementAge,
      currentContribution,
    },
    preservation: {
      mode: MODES.PRESERVATION,
      label: "Preservação do Patrimônio",
      description: "Planeje para manter o patrimônio preservado para herança, vivendo apenas dos rendimentos.",
      tooltip: "Neste modo, o patrimônio final permanece ≥ 95% do valor no início da aposentadoria.",
      requiredContribution: preservationContrib,
      requiredAge: preservationAge,
      projectionSeries: preservationSeries,
      currentRetirementAge,
      currentContribution,
    },
  };
}

// ========================================
// HELPERS INTERNOS
// ========================================

function formatSimpleCurrency(value) {
  const n = toNumber(value, 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getImpossibleExplanation() {
  const suggestions = [
    "Aumentar a idade de aposentadoria",
    "Aumentar o aporte mensal",
    "Reduzir a renda desejada na aposentadoria",
  ];

  return `Não atingível com as premissas atuais.\n\nSugestões:\n• ${suggestions.slice(0, 2).join("\n• ")}`;
}

// ========================================
// EXPORTS
// ========================================

export { MODES };

export default {
  calculateAlternativeScenarios,
  solveRequiredContribution,
  solveRetirementAge,
  simulateMode,
  MODES,
};
