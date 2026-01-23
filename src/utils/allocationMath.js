// src/utils/allocationMath.js
// ========================================
// Guia de Alocação - Cálculos Markowitz simplificados por classes
// NÃO influencia FinancialEngine, projeções, sucessão ou acompanhamento
// ========================================

// -----------------------------------------
// CONSTANTES DEFAULTS
// -----------------------------------------

// Classes de ativos disponíveis
export const ASSET_CLASSES = ['cash', 'pos', 'pre', 'ipca', 'acoes', 'fiis', 'exterior', 'outros'];

export const ASSET_CLASS_LABELS = {
  cash: 'Caixa / Reserva',
  pos: 'Pós-fixado (CDI)',
  pre: 'Pré-fixado',
  ipca: 'Inflação (IPCA+)',
  acoes: 'Ações BR',
  fiis: 'FIIs',
  exterior: 'Exterior',
  outros: 'Outros',
};

// Retornos nominais anuais defaults (decimal)
export const DEFAULT_RETURNS_NOMINAL = {
  cash: 0.10,
  pos: 0.11,
  pre: 0.115,
  ipca: 0.12,
  acoes: 0.14,
  fiis: 0.13,
  exterior: 0.13,
  outros: 0.10,
};

// Volatilidades anuais defaults (desvio padrão, decimal)
export const DEFAULT_VOLS = {
  cash: 0.005,
  pos: 0.02,
  pre: 0.04,
  ipca: 0.05,
  acoes: 0.20,
  fiis: 0.18,
  exterior: 0.22,
  outros: 0.10,
};

// Matriz de correlação simplificada (simétrica)
export const DEFAULT_CORRELATION = {
  cash:     { cash: 1.0, pos: 0.3, pre: 0.2, ipca: 0.2, acoes: 0.1, fiis: 0.1, exterior: 0.1, outros: 0.2 },
  pos:      { cash: 0.3, pos: 1.0, pre: 0.6, ipca: 0.5, acoes: 0.2, fiis: 0.2, exterior: 0.2, outros: 0.3 },
  pre:      { cash: 0.2, pre: 1.0, pos: 0.6, ipca: 0.7, acoes: 0.3, fiis: 0.3, exterior: 0.2, outros: 0.3 },
  ipca:     { cash: 0.2, pos: 0.5, pre: 0.7, ipca: 1.0, acoes: 0.3, fiis: 0.4, exterior: 0.2, outros: 0.3 },
  acoes:    { cash: 0.1, pos: 0.2, pre: 0.3, ipca: 0.3, acoes: 1.0, fiis: 0.7, exterior: 0.6, outros: 0.4 },
  fiis:     { cash: 0.1, pos: 0.2, pre: 0.3, ipca: 0.4, acoes: 0.7, fiis: 1.0, exterior: 0.5, outros: 0.4 },
  exterior: { cash: 0.1, pos: 0.2, pre: 0.2, ipca: 0.2, acoes: 0.6, fiis: 0.5, exterior: 1.0, outros: 0.3 },
  outros:   { cash: 0.2, pos: 0.3, pre: 0.3, ipca: 0.3, acoes: 0.4, fiis: 0.4, exterior: 0.3, outros: 1.0 },
};

// Limites por perfil de investidor (máximos de renda variável)
export const PROFILE_LIMITS = {
  conservador: {
    maxRV: 0.25, // acoes + fiis + exterior <= 25%
    maxExterior: 0.10,
  },
  moderado: {
    maxRV: 0.45,
    maxExterior: 0.15,
  },
  arrojado: {
    maxRV: 0.70,
    maxExterior: 0.25,
  },
};

// ✅ FASE 5: Templates de carteira pré-definidos
export const PORTFOLIO_TEMPLATES = {
  conservador: {
    id: 'template_conservador',
    name: 'Modelo Conservador',
    description: 'Foco em preservação de capital com baixa volatilidade',
    breakdown: {
      cash: 10, pos: 35, pre: 20, ipca: 20,
      acoes: 5, fiis: 5, exterior: 0, outros: 5,
    },
    expectedReturn: 0.11, // ~11% nominal
    expectedVol: 0.04, // ~4%
  },
  moderado: {
    id: 'template_moderado',
    name: 'Modelo Moderado',
    description: 'Equilíbrio entre renda fixa e variável',
    breakdown: {
      cash: 5, pos: 25, pre: 15, ipca: 20,
      acoes: 15, fiis: 10, exterior: 5, outros: 5,
    },
    expectedReturn: 0.12, // ~12% nominal
    expectedVol: 0.08, // ~8%
  },
  arrojado: {
    id: 'template_arrojado',
    name: 'Modelo Arrojado',
    description: 'Maior exposição a risco para buscar retornos superiores',
    breakdown: {
      cash: 5, pos: 10, pre: 5, ipca: 15,
      acoes: 30, fiis: 15, exterior: 15, outros: 5,
    },
    expectedReturn: 0.13, // ~13% nominal
    expectedVol: 0.14, // ~14%
  },
};

// ✅ FASE 5: Soft constraints (guardrails) por perfil
export const SOFT_CONSTRAINTS = {
  conservador: {
    maxRV: 25, // RV total <= 25%
    maxExterior: 15,
    minRF: 70, // RF >= 70%
    maxSingleClass: 40, // Nenhuma classe > 40%
  },
  moderado: {
    maxRV: 45,
    maxExterior: 25,
    minRF: 50,
    maxSingleClass: 35,
  },
  arrojado: {
    maxRV: 70,
    maxExterior: 40,
    minRF: 25,
    maxSingleClass: 35,
  },
};

/**
 * ✅ FASE 5: Valida breakdown contra soft constraints
 * @param {object} breakdown - { cash, pos, pre, ipca, acoes, fiis, exterior, outros }
 * @param {string} profile - 'conservador' | 'moderado' | 'arrojado'
 * @returns {{ valid: boolean, warnings: Array<{ type: string, message: string, severity: string }> }}
 */
export function validateSoftConstraints(breakdown, profile = 'moderado') {
  const constraints = SOFT_CONSTRAINTS[profile] || SOFT_CONSTRAINTS.moderado;
  const warnings = [];

  // Calcular totais
  const rf = (breakdown.cash || 0) + (breakdown.pos || 0) + (breakdown.pre || 0) + (breakdown.ipca || 0);
  const rv = (breakdown.acoes || 0) + (breakdown.fiis || 0) + (breakdown.exterior || 0);
  const exterior = breakdown.exterior || 0;

  // Verificar constraints
  if (rv > constraints.maxRV) {
    warnings.push({
      type: 'maxRV',
      message: `Renda variável (${rv.toFixed(0)}%) excede limite recomendado para perfil ${profile} (${constraints.maxRV}%)`,
      severity: rv > constraints.maxRV * 1.2 ? 'error' : 'warning',
    });
  }

  if (exterior > constraints.maxExterior) {
    warnings.push({
      type: 'maxExterior',
      message: `Exterior (${exterior.toFixed(0)}%) excede limite recomendado para perfil ${profile} (${constraints.maxExterior}%)`,
      severity: exterior > constraints.maxExterior * 1.2 ? 'error' : 'warning',
    });
  }

  if (rf < constraints.minRF) {
    warnings.push({
      type: 'minRF',
      message: `Renda fixa (${rf.toFixed(0)}%) abaixo do mínimo recomendado para perfil ${profile} (${constraints.minRF}%)`,
      severity: rf < constraints.minRF * 0.8 ? 'error' : 'warning',
    });
  }

  // Verificar concentração em classe única
  for (const [cls, pct] of Object.entries(breakdown)) {
    if ((pct || 0) > constraints.maxSingleClass) {
      warnings.push({
        type: 'concentration',
        message: `${ASSET_CLASS_LABELS[cls] || cls} (${pct.toFixed(0)}%) excede concentração máxima recomendada (${constraints.maxSingleClass}%)`,
        severity: (pct || 0) > constraints.maxSingleClass * 1.2 ? 'error' : 'warning',
      });
    }
  }

  return {
    valid: warnings.filter(w => w.severity === 'error').length === 0,
    warnings,
  };
}

// -----------------------------------------
// FUNÇÕES DE CÁLCULO
// -----------------------------------------

/**
 * Normaliza breakdown (soma deve ser 1.0)
 * @param {object} breakdown - { cash: 10, pos: 20, ... } em percentuais (0-100)
 * @returns {object} pesos em decimal somando 1.0
 */
export function normalizeWeights(breakdown) {
  const weights = {};
  let sum = 0;

  for (const cls of ASSET_CLASSES) {
    const v = Number(breakdown?.[cls] || 0);
    weights[cls] = Number.isFinite(v) && v >= 0 ? v : 0;
    sum += weights[cls];
  }

  if (sum <= 0) {
    // Se tudo zero, distribuir igualmente
    const equal = 1.0 / ASSET_CLASSES.length;
    for (const cls of ASSET_CLASSES) {
      weights[cls] = equal;
    }
    return weights;
  }

  // Normalizar para somar 1.0
  for (const cls of ASSET_CLASSES) {
    weights[cls] = weights[cls] / sum;
  }

  return weights;
}

/**
 * Calcula retorno nominal esperado da carteira
 * @param {object} weights - pesos em decimal (soma 1.0)
 * @param {object} returnsNominal - retornos nominais por classe (decimal)
 * @returns {number} retorno nominal anual
 */
export function expectedReturnNominal(weights, returnsNominal = DEFAULT_RETURNS_NOMINAL) {
  let ret = 0;
  for (const cls of ASSET_CLASSES) {
    const w = weights[cls] || 0;
    const r = returnsNominal[cls] || 0;
    ret += w * r;
  }
  return ret;
}

/**
 * Calcula retorno real esperado
 * @param {number} retNominal - retorno nominal anual (decimal)
 * @param {number} inflation - inflação anual (decimal)
 * @returns {number} retorno real anual
 */
export function expectedReturnReal(retNominal, inflation = 0.05) {
  if (inflation <= -1) return retNominal; // evitar divisão por zero
  return (1 + retNominal) / (1 + inflation) - 1;
}

/**
 * Monta matriz de covariância a partir de volatilidades e correlações
 * @param {object} vols - volatilidades por classe
 * @param {object} corr - matriz de correlação
 * @returns {object} matriz de covariância { class1: { class2: cov(1,2), ... }, ... }
 */
export function buildCovMatrix(vols = DEFAULT_VOLS, corr = DEFAULT_CORRELATION) {
  const cov = {};
  for (const i of ASSET_CLASSES) {
    cov[i] = {};
    for (const j of ASSET_CLASSES) {
      const vol_i = vols[i] || 0;
      const vol_j = vols[j] || 0;
      const rho = corr[i]?.[j] ?? (i === j ? 1 : 0);
      cov[i][j] = vol_i * vol_j * rho;
    }
  }
  return cov;
}

/**
 * Calcula variância da carteira (w^T * Cov * w)
 * @param {object} weights - pesos por classe (decimal)
 * @param {object} cov - matriz de covariância
 * @returns {number} variância anual
 */
export function portfolioVariance(weights, cov) {
  let variance = 0;
  for (const i of ASSET_CLASSES) {
    for (const j of ASSET_CLASSES) {
      const w_i = weights[i] || 0;
      const w_j = weights[j] || 0;
      const c_ij = cov[i]?.[j] || 0;
      variance += w_i * w_j * c_ij;
    }
  }
  return variance;
}

/**
 * Calcula volatilidade (desvio padrão) anual da carteira
 * @param {object} weights - pesos por classe (decimal)
 * @param {object} cov - matriz de covariância
 * @returns {number} volatilidade anual (desvio padrão)
 */
export function portfolioVol(weights, cov) {
  const variance = portfolioVariance(weights, cov);
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Calcula diagnóstico completo de uma carteira
 * @param {object} breakdown - breakdown em percentuais (0-100)
 * @param {object} assumptions - { inflationAnnual, classReturnsNominal, classVolAnnual, correlation }
 * @returns {object} { returnNominal, returnReal, volatility, weights }
 */
export function calculatePortfolioDiagnostics(breakdown, assumptions = {}) {
  const inflation = assumptions.inflationAnnual ?? 0.05;
  const returnsNominal = { ...DEFAULT_RETURNS_NOMINAL, ...assumptions.classReturnsNominal };
  const vols = { ...DEFAULT_VOLS, ...assumptions.classVolAnnual };
  const corr = assumptions.correlation ?? DEFAULT_CORRELATION;

  const weights = normalizeWeights(breakdown);
  const cov = buildCovMatrix(vols, corr);

  const returnNominal = expectedReturnNominal(weights, returnsNominal);
  const returnReal = expectedReturnReal(returnNominal, inflation);
  const volatility = portfolioVol(weights, cov);

  return {
    returnNominal,
    returnReal,
    volatility,
    weights,
  };
}

/**
 * Verifica se breakdown soma 100%
 * @param {object} breakdown - { cash: 10, pos: 20, ... }
 * @returns {{ valid: boolean, sum: number, delta: number }}
 */
export function validateBreakdownSum(breakdown) {
  let sum = 0;
  for (const cls of ASSET_CLASSES) {
    const v = Number(breakdown?.[cls] || 0);
    sum += Number.isFinite(v) ? v : 0;
  }
  const delta = Math.abs(sum - 100);
  return {
    valid: delta < 0.01, // tolerância de 0.01%
    sum,
    delta: 100 - sum,
  };
}

/**
 * Normaliza breakdown para somar exatamente 100%
 * @param {object} breakdown - { cash: 10, pos: 20, ... }
 * @returns {object} breakdown normalizado
 */
export function normalizeBreakdownTo100(breakdown) {
  const result = {};
  let sum = 0;

  for (const cls of ASSET_CLASSES) {
    const v = Number(breakdown?.[cls] || 0);
    result[cls] = Number.isFinite(v) && v >= 0 ? v : 0;
    sum += result[cls];
  }

  if (sum <= 0) {
    // Distribuir igualmente
    const equal = 100 / ASSET_CLASSES.length;
    for (const cls of ASSET_CLASSES) {
      result[cls] = parseFloat(equal.toFixed(2));
    }
    return result;
  }

  // Normalizar proporcionalmente
  const factor = 100 / sum;
  for (const cls of ASSET_CLASSES) {
    result[cls] = parseFloat((result[cls] * factor).toFixed(2));
  }

  // Ajustar arredondamento no último item
  let newSum = 0;
  for (const cls of ASSET_CLASSES) {
    newSum += result[cls];
  }
  const diff = 100 - newSum;
  if (Math.abs(diff) > 0.001) {
    result.outros = parseFloat((result.outros + diff).toFixed(2));
  }

  return result;
}

// -----------------------------------------
// DEFAULTS PARA NOVO allocationGuide
// -----------------------------------------

/**
 * Cria estrutura default para allocationGuide
 * @param {object} clientData - dados do cliente (para pegar inflação)
 * @returns {object} allocationGuide default
 */
export function createDefaultAllocationGuide(clientData = {}) {
  const inflation = clientData?.inflation ?? clientData?.inflacao ?? 0.05;

  return {
    portfolios: [],
    objective: {
      mode: 'targetReturn',
      targetRealReturn: 0.06, // 6% a.a.
      targetVol: 0.10,        // 10% a.a.
    },
    assumptions: {
      inflationAnnual: inflation,
      classReturnsNominal: { ...DEFAULT_RETURNS_NOMINAL },
      classVolAnnual: { ...DEFAULT_VOLS },
      correlation: DEFAULT_CORRELATION,
    },
  };
}

/**
 * Cria uma nova carteira vazia
 * @param {string} name - nome da carteira
 * @returns {object} portfolio default
 */
export function createDefaultPortfolio(name = 'Nova Carteira') {
  return {
    id: `portfolio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    currency: 'BRL',
    totalValue: 0,
    fxOverride: null,
    breakdown: {
      cash: 10,
      pos: 30,
      pre: 10,
      ipca: 15,
      acoes: 15,
      fiis: 10,
      exterior: 5,
      outros: 5,
    },
    notes: '',
  };
}

// -----------------------------------------
// OTIMIZADOR (Grid Search simplificado)
// -----------------------------------------

/**
 * Gera candidatos de alocação via grid search
 * @param {number} step - passo do grid (ex: 5 = 5%)
 * @param {object} limits - limites por perfil { maxRV, maxExterior }
 * @returns {Array} array de breakdowns candidatos
 */
function generateCandidates(step = 5, limits = PROFILE_LIMITS.moderado) {
  const candidates = [];
  const { maxRV, maxExterior } = limits;

  // RF classes: cash, pos, pre, ipca
  // RV classes: acoes, fiis, exterior
  // Outros: outros

  // Simplificação: gerar combinações onde RF + RV + outros = 100
  for (let rv = 0; rv <= maxRV * 100; rv += step) {
    for (let exterior = 0; exterior <= Math.min(rv, maxExterior * 100); exterior += step) {
      const rvBR = rv - exterior; // acoes + fiis
      
      for (let acoes = 0; acoes <= rvBR; acoes += step) {
        const fiis = rvBR - acoes;
        
        const rf = 100 - rv - 5; // deixar 5% para "outros"
        const outros = 5;
        
        if (rf < 0) continue;
        
        // Distribuir RF entre cash, pos, pre, ipca
        // Simplificação: proporcional ou variações
        const rfCombos = [
          { cash: 5, pos: rf * 0.4, pre: rf * 0.2, ipca: rf * 0.4 - 5 },
          { cash: 10, pos: rf * 0.5 - 5, pre: rf * 0.2, ipca: rf * 0.3 - 5 },
          { cash: 5, pos: rf * 0.3, pre: rf * 0.3, ipca: rf * 0.4 - 5 },
        ];
        
        for (const rfCombo of rfCombos) {
          // Validar que todos os valores são >= 0
          const cash = Math.max(0, Math.round(rfCombo.cash));
          const pos = Math.max(0, Math.round(rfCombo.pos));
          const pre = Math.max(0, Math.round(rfCombo.pre));
          const ipca = Math.max(0, Math.round(rfCombo.ipca));
          
          const total = cash + pos + pre + ipca + acoes + fiis + exterior + outros;
          
          // Ajustar para somar 100
          const breakdown = {
            cash,
            pos,
            pre,
            ipca,
            acoes: Math.round(acoes),
            fiis: Math.round(fiis),
            exterior: Math.round(exterior),
            outros,
          };
          
          // Normalizar se necessário
          let sum = Object.values(breakdown).reduce((a, b) => a + b, 0);
          if (Math.abs(sum - 100) > 1) continue; // Pular inválidos
          
          // Ajustar arredondamento
          if (sum !== 100) {
            breakdown.pos = breakdown.pos + (100 - sum);
          }
          
          candidates.push(breakdown);
        }
      }
    }
  }

  return candidates;
}

/**
 * Otimiza alocação baseado no objetivo
 * @param {object} objective - { mode: 'targetReturn'|'targetRisk', targetRealReturn, targetVol }
 * @param {object} assumptions - premissas de retorno/vol/correlação
 * @param {string} profile - 'conservador'|'moderado'|'arrojado'
 * @returns {object} { recommended: breakdown, diagnostics, feasible, message }
 */
export function optimizeAllocation(objective, assumptions = {}, profile = 'moderado') {
  const limits = PROFILE_LIMITS[profile] || PROFILE_LIMITS.moderado;
  const candidates = generateCandidates(5, limits);
  
  if (candidates.length === 0) {
    return {
      recommended: null,
      diagnostics: null,
      feasible: false,
      message: 'Não foi possível gerar candidatos de alocação.',
    };
  }

  // Calcular diagnóstico para cada candidato
  const evaluated = candidates.map(breakdown => {
    const diag = calculatePortfolioDiagnostics(breakdown, assumptions);
    return { breakdown, ...diag };
  });

  const { mode, targetRealReturn, targetVol } = objective;

  let best = null;
  let message = '';

  if (mode === 'targetReturn') {
    // Objetivo: menor vol que atinja retorno >= alvo
    const target = targetRealReturn || 0.06;
    const feasible = evaluated.filter(c => c.returnReal >= target);
    
    if (feasible.length > 0) {
      // Ordenar por volatilidade (menor primeiro)
      feasible.sort((a, b) => a.volatility - b.volatility);
      best = feasible[0];
      message = `Alocação com menor risco para atingir ${(target * 100).toFixed(1)}% a.a. real.`;
    } else {
      // Não encontrou: pegar o de maior retorno
      evaluated.sort((a, b) => b.returnReal - a.returnReal);
      best = evaluated[0];
      message = `Não foi possível atingir ${(target * 100).toFixed(1)}% a.a. real dentro dos limites do perfil. Esta é a melhor alternativa.`;
    }
  } else {
    // Objetivo: maior retorno com vol <= alvo
    const target = targetVol || 0.10;
    const feasible = evaluated.filter(c => c.volatility <= target);
    
    if (feasible.length > 0) {
      // Ordenar por retorno (maior primeiro)
      feasible.sort((a, b) => b.returnReal - a.returnReal);
      best = feasible[0];
      message = `Alocação com maior retorno mantendo volatilidade <= ${(target * 100).toFixed(1)}%.`;
    } else {
      // Não encontrou: pegar o de menor vol
      evaluated.sort((a, b) => a.volatility - b.volatility);
      best = evaluated[0];
      message = `Não foi possível manter volatilidade <= ${(target * 100).toFixed(1)}% dentro dos limites. Esta é a alternativa de menor risco.`;
    }
  }

  return {
    recommended: best.breakdown,
    diagnostics: {
      returnNominal: best.returnNominal,
      returnReal: best.returnReal,
      volatility: best.volatility,
    },
    feasible: message.includes('melhor alternativa') || message.includes('alternativa de menor') ? false : true,
    message,
  };
}

/**
 * Calcula delta entre alocação atual e recomendada
 * @param {object} current - breakdown atual
 * @param {object} recommended - breakdown recomendado
 * @returns {object} delta por classe (em pontos percentuais)
 */
export function calculateAllocationDelta(current, recommended) {
  const delta = {};
  for (const cls of ASSET_CLASSES) {
    const cur = current?.[cls] || 0;
    const rec = recommended?.[cls] || 0;
    delta[cls] = rec - cur;
  }
  return delta;
}

// -----------------------------------------
// FUNÇÕES FASE 4: Insights e Sugestões
// -----------------------------------------

/**
 * Classifica o nível de risco baseado na volatilidade
 * @param {number} volatility - volatilidade anual (decimal)
 * @returns {{ level: string, color: string, description: string }}
 */
export function classifyRiskLevel(volatility) {
  const vol = volatility * 100; // Converter para %
  if (vol < 6) {
    return { level: 'Conservador', color: 'green', description: 'Risco baixo, adequado para perfil conservador' };
  } else if (vol < 12) {
    return { level: 'Moderado', color: 'yellow', description: 'Risco médio, adequado para perfil moderado' };
  } else if (vol < 18) {
    return { level: 'Arrojado', color: 'orange', description: 'Risco elevado, adequado para perfil arrojado' };
  } else {
    return { level: 'Agressivo', color: 'red', description: 'Risco muito alto, apenas para investidores experientes' };
  }
}

/**
 * Obtém valor da carteira em BRL
 * @param {object} portfolio - { totalValue, currency, fxOverride }
 * @param {object} scenarioFx - { USD: 5.0, EUR: 5.5 } taxas de câmbio do cenário
 * @returns {number} valor em BRL
 */
export function getPortfolioValueBRL(portfolio, scenarioFx = {}) {
  const value = Number(portfolio?.totalValue) || 0;
  const currency = portfolio?.currency || 'BRL';
  
  if (currency === 'BRL') return value;
  
  // Usar fxOverride se existir, senão usar fx do cenário, senão default
  const fxOverride = portfolio?.fxOverride;
  const defaultFx = currency === 'USD' ? 5.0 : currency === 'EUR' ? 5.5 : 1;
  const fx = fxOverride != null && fxOverride > 0 
    ? fxOverride 
    : (scenarioFx?.[currency] || defaultFx);
  
  return value * fx;
}

/**
 * Verifica checagens automáticas do breakdown
 * @param {object} breakdown - breakdown percentuais
 * @param {object} portfolio - dados da carteira
 * @returns {Array<{ type: string, severity: string, message: string }>}
 */
export function runBreakdownChecks(breakdown, portfolio = {}) {
  const checks = [];
  
  // 1. Soma do breakdown
  const validation = validateBreakdownSum(breakdown);
  if (!validation.valid) {
    checks.push({
      type: 'soma',
      severity: 'error',
      message: `Soma dos percentuais é ${validation.sum.toFixed(1)}% (deveria ser 100%)`,
    });
  }
  
  // 2. Verificar percentuais negativos
  for (const cls of ASSET_CLASSES) {
    const val = Number(breakdown?.[cls]) || 0;
    if (val < 0) {
      checks.push({
        type: 'negativo',
        severity: 'error',
        message: `${ASSET_CLASS_LABELS[cls]} não pode ser negativo`,
      });
    }
  }
  
  // 3. Verificar concentração excessiva (> 40% em uma classe)
  for (const cls of ASSET_CLASSES) {
    const val = Number(breakdown?.[cls]) || 0;
    if (val > 40) {
      checks.push({
        type: 'concentracao',
        severity: 'warning',
        message: `Concentração alta em ${ASSET_CLASS_LABELS[cls]}: ${val.toFixed(1)}%`,
      });
    }
  }
  
  // 4. Verificar se carteira está vazia (tudo zero)
  let allZero = true;
  for (const cls of ASSET_CLASSES) {
    if ((Number(breakdown?.[cls]) || 0) > 0) {
      allZero = false;
      break;
    }
  }
  if (allZero) {
    checks.push({
      type: 'vazio',
      severity: 'error',
      message: 'Carteira sem alocação definida',
    });
  }
  
  // 5. Verificar valor total
  if (!portfolio?.totalValue || portfolio.totalValue <= 0) {
    checks.push({
      type: 'valor',
      severity: 'info',
      message: 'Valor total da carteira não informado',
    });
  }
  
  // 6. Verificar câmbio para moedas estrangeiras
  if (portfolio?.currency !== 'BRL' && !portfolio?.fxOverride) {
    checks.push({
      type: 'cambio',
      severity: 'info',
      message: `Câmbio de ${portfolio?.currency || 'moeda'} não definido (usando default)`,
    });
  }
  
  return checks;
}

/**
 * Gera sugestões de ajuste baseadas em heurísticas simples
 * @param {object} breakdown - breakdown atual (percentuais)
 * @param {object} diagnostics - { returnNominal, returnReal, volatility }
 * @param {object} settings - { targetRealReturn, maxVolatility, ... }
 * @returns {Array<{ id: string, title: string, description: string, changes: Array, priority: number }>}
 */
export function sugerirAjustes(breakdown, diagnostics, settings = {}) {
  const suggestions = [];
  const targetReal = settings.targetRealReturn ?? 0.06;
  const maxVol = settings.maxVolatility ?? 0.15;
  
  const { returnReal, volatility } = diagnostics;
  
  // Classes de alto retorno/risco
  const highReturnClasses = ['acoes', 'exterior', 'fiis'];
  // Classes de baixo risco
  const lowRiskClasses = ['cash', 'pos', 'ipca'];
  
  // Calcular alocações atuais por grupo
  let currentHighReturn = 0;
  let currentLowRisk = 0;
  for (const cls of highReturnClasses) {
    currentHighReturn += Number(breakdown?.[cls]) || 0;
  }
  for (const cls of lowRiskClasses) {
    currentLowRisk += Number(breakdown?.[cls]) || 0;
  }
  
  // 1. Retorno real abaixo do alvo
  if (returnReal < targetReal) {
    const gap = (targetReal - returnReal) * 100;
    const deltaPP = Math.min(10, Math.max(5, gap * 2)); // 5-10pp de ajuste
    
    if (currentHighReturn < 60 && currentLowRisk > 20) {
      suggestions.push({
        id: 'aumentar_retorno',
        title: 'Aumentar potencial de retorno',
        description: `Para buscar ${(targetReal * 100).toFixed(1)}% real (atual: ${(returnReal * 100).toFixed(1)}%), considere aumentar exposição a ativos de maior retorno.`,
        changes: [
          { cls: 'acoes', deltaPP: Math.round(deltaPP / 2) },
          { cls: 'exterior', deltaPP: Math.round(deltaPP / 3) },
          { cls: 'pos', deltaPP: -Math.round(deltaPP / 2) },
          { cls: 'cash', deltaPP: -Math.round(deltaPP / 2) },
        ],
        priority: 1,
      });
    }
  }
  
  // 2. Volatilidade acima do máximo
  if (volatility > maxVol) {
    const excess = (volatility - maxVol) * 100;
    const deltaPP = Math.min(15, Math.max(5, excess * 1.5)); // 5-15pp de ajuste
    
    if (currentHighReturn > 15) {
      suggestions.push({
        id: 'reduzir_risco',
        title: 'Reduzir volatilidade',
        description: `Volatilidade atual (${(volatility * 100).toFixed(1)}%) está acima do limite de ${(maxVol * 100).toFixed(1)}%. Reduza exposição a renda variável.`,
        changes: [
          { cls: 'acoes', deltaPP: -Math.round(deltaPP / 2) },
          { cls: 'exterior', deltaPP: -Math.round(deltaPP / 3) },
          { cls: 'ipca', deltaPP: Math.round(deltaPP / 2) },
          { cls: 'pos', deltaPP: Math.round(deltaPP / 3) },
        ],
        priority: 2,
      });
    }
  }
  
  // 3. Concentração excessiva
  for (const cls of ASSET_CLASSES) {
    const val = Number(breakdown?.[cls]) || 0;
    if (val > 40) {
      const excessPP = val - 30; // Sugerir reduzir para ~30%
      
      // Encontrar classes para distribuir
      const targetClasses = ASSET_CLASSES.filter(c => c !== cls && (Number(breakdown?.[c]) || 0) < 25);
      const distribPP = Math.round(excessPP / Math.max(1, targetClasses.length));
      
      const changes = [{ cls, deltaPP: -Math.round(excessPP) }];
      targetClasses.slice(0, 3).forEach(c => {
        changes.push({ cls: c, deltaPP: distribPP });
      });
      
      suggestions.push({
        id: `diversificar_${cls}`,
        title: `Diversificar ${ASSET_CLASS_LABELS[cls]}`,
        description: `Concentração de ${val.toFixed(1)}% em ${ASSET_CLASS_LABELS[cls]} é elevada. Considere diversificar.`,
        changes,
        priority: 3,
      });
    }
  }
  
  // Ordenar por prioridade
  suggestions.sort((a, b) => a.priority - b.priority);
  
  return suggestions;
}

/**
 * Aplica sugestão de ajuste ao breakdown
 * @param {object} breakdown - breakdown atual
 * @param {Array<{ cls: string, deltaPP: number }>} changes - mudanças a aplicar
 * @returns {object} novo breakdown normalizado para 100%
 */
export function applySuggestion(breakdown, changes) {
  const newBreakdown = { ...breakdown };
  
  // Aplicar deltas
  for (const { cls, deltaPP } of changes) {
    const current = Number(newBreakdown[cls]) || 0;
    newBreakdown[cls] = Math.max(0, current + deltaPP); // Nunca negativo
  }
  
  // Normalizar para 100%
  return normalizeBreakdownTo100(newBreakdown);
}

// -----------------------------------------
// FASE 5: Integração com Patrimônio
// -----------------------------------------

/**
 * Mapeamento de tipo de ativo (AssetsPage) para classe do Guia de Alocação
 * Tipos do AssetsPage: financial, real_estate, vehicle, previdencia, international, business, other
 * Classes do Guia: cash, pos, pre, ipca, acoes, fiis, exterior, outros
 */
export const ASSET_TYPE_TO_ALLOCATION_CLASS = {
  // Tipo "financial" é genérico - mapear para "outros" por padrão
  // O nome do ativo pode dar pistas (ex: "CDB", "Tesouro", "Ações", "FII")
  financial: 'outros',
  // Tipo "previdencia" - pode ser PGBL/VGBL
  previdencia: 'ipca', // Assume mix conservador de previdência
  // Tipo "international" - ativos em moeda estrangeira
  international: 'exterior',
  // Tipos ilíquidos - não incluir no patrimônio investível
  real_estate: null,
  vehicle: null,
  business: null,
  other: 'outros',
};

/**
 * Tenta inferir a classe do Guia baseado no nome do ativo
 * @param {string} name - nome do ativo
 * @returns {string|null} classe inferida ou null
 */
function inferClassFromName(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  
  // Caixa / Liquidez
  if (n.includes('caixa') || n.includes('saldo') || n.includes('conta') || n.includes('reserva') || n.includes('poupan')) {
    return 'cash';
  }
  
  // Pós-fixado (CDI)
  if (n.includes('cdb') || n.includes('lci') || n.includes('lca') || n.includes('cdi') || n.includes('pós') || n.includes('pos-')) {
    return 'pos';
  }
  
  // Pré-fixado
  if (n.includes('pré') || n.includes('pre-') || n.includes('ltn') || n.includes('prefixad')) {
    return 'pre';
  }
  
  // Inflação (IPCA+)
  if (n.includes('ipca') || n.includes('ntn-b') || n.includes('ntnb') || n.includes('tesouro') || n.includes('inflação') || n.includes('inflacao')) {
    return 'ipca';
  }
  
  // Ações
  if (n.includes('aç') || n.includes('acao') || n.includes('ações') || n.includes('bolsa') || n.includes('ibov') || n.includes('small') || n.includes('stock')) {
    return 'acoes';
  }
  
  // FIIs
  if (n.includes('fii') || n.includes('imobiliário') || n.includes('imobiliario') || n.includes('fundos imob')) {
    return 'fiis';
  }
  
  // Exterior / Internacional
  if (n.includes('exterior') || n.includes('internac') || n.includes('etf') || n.includes('bdr') || n.includes('s&p') || n.includes('nasdaq') || n.includes('msci')) {
    return 'exterior';
  }
  
  // Multimercado / Outros
  if (n.includes('multi') || n.includes('hedge') || n.includes('cripto') || n.includes('altern') || n.includes('coe')) {
    return 'outros';
  }
  
  return null;
}

/**
 * Converte um ativo para BRL
 * @param {object} asset - { value, currency, fxRate }
 * @param {object} scenarioFx - { USD_BRL, EUR_BRL }
 * @returns {number} valor em BRL
 */
function convertAssetToBRL(asset, scenarioFx = {}) {
  const value = Number(asset?.value) || Number(asset?.amountCurrency) || 0;
  const currency = asset?.currency || 'BRL';
  
  if (currency === 'BRL') return value;
  
  // Usar fxRate do ativo se existir, senão usar scenarioFx
  const assetFx = asset?.fxRate;
  if (assetFx != null && assetFx > 0) {
    return value * assetFx;
  }
  
  // Usar fx do cenário
  if (currency === 'USD') {
    return value * (scenarioFx?.USD_BRL || 5.0);
  }
  if (currency === 'EUR') {
    return value * (scenarioFx?.EUR_BRL || 5.5);
  }
  
  // Moeda desconhecida, retornar valor como está
  return value;
}

/**
 * Determina a classe do Guia para um ativo
 * @param {object} asset - ativo
 * @returns {string|null} classe ou null se não incluir
 */
function getAssetAllocationClass(asset) {
  // Verificar se é tipo ilíquido (não incluir no patrimônio investível)
  const type = asset?.type || 'financial';
  const currency = asset?.currency || 'BRL';
  
  // Ativos ilíquidos
  if (['real_estate', 'vehicle', 'business'].includes(type)) {
    return null;
  }
  
  // Ativo internacional (moeda estrangeira)
  if (currency !== 'BRL') {
    return 'exterior';
  }
  
  // Tentar inferir pelo nome
  const inferredClass = inferClassFromName(asset?.name);
  if (inferredClass) {
    return inferredClass;
  }
  
  // Previdência
  if (type === 'previdencia') {
    return 'ipca'; // Assume mix conservador
  }
  
  // Fallback: usar mapeamento de tipo
  return ASSET_TYPE_TO_ALLOCATION_CLASS[type] || 'outros';
}

// -----------------------------------------
// NORMALIZAÇÃO DE BREAKDOWN KEYS
// -----------------------------------------

/**
 * Mapeamento canônico: variantes de nomes de classe → key interna ASSET_CLASSES
 * Suporta pt-BR, inglês, variantes com/sem acento, índices numéricos (bug antigo)
 */
const CANONICAL_CLASS_MAP = {
  // Índices numéricos (bug de Object.keys em array)
  // Ordem: caixa, pos, pre, ipca, acoes, fiis, exterior, outros
  '0': 'cash',
  '1': 'pos',
  '2': 'pre',
  '3': 'ipca',
  '4': 'acoes',
  '5': 'fiis',
  '6': 'exterior',
  '7': 'outros',
  
  // Caixa / Cash / Liquidez / Reserva
  'caixa': 'cash',
  'cash': 'cash',
  'liquidez': 'cash',
  'reserva': 'cash',
  'poupanca': 'cash',
  'poupança': 'cash',
  'money_market': 'cash',
  
  // Pós-fixado (CDI)
  'pos': 'pos',
  'pós': 'pos',
  'pos_fixado': 'pos',
  'pos-fixado': 'pos',
  'posfixado': 'pos',
  'cdi': 'pos',
  'post_fixed': 'pos',
  'postfixed': 'pos',
  'floating': 'pos',
  
  // Pré-fixado
  'pre': 'pre',
  'pré': 'pre',
  'pre_fixado': 'pre',
  'pre-fixado': 'pre',
  'prefixado': 'pre',
  'fixed': 'pre',
  'nominal': 'pre',
  'bonds_nominal': 'pre', // Para INTL também mapeia aqui como fallback
  
  // Inflação (IPCA+)
  'ipca': 'ipca',
  'inflacao': 'ipca',
  'inflação': 'ipca',
  'inflation': 'ipca',
  'tips': 'ipca',
  'bonds_inflation': 'ipca',
  'ipca+': 'ipca',
  'ntnb': 'ipca',
  
  // Ações Brasil
  'acoes': 'acoes',
  'ações': 'acoes',
  'acoes_br': 'acoes',
  'ações_br': 'acoes',
  'equities_br': 'acoes',
  'br_equities': 'acoes',
  'stocks_br': 'acoes',
  'renda_variavel': 'acoes',
  
  // FIIs
  'fiis': 'fiis',
  'fii': 'fiis',
  'fundos_imobiliarios': 'fiis',
  'reits_br': 'fiis',
  
  // Exterior / Internacional
  'exterior': 'exterior',
  'internacional': 'exterior',
  'intl': 'exterior',
  'international': 'exterior',
  'equities': 'exterior',      // INTL equities → exterior
  'global_equities': 'exterior',
  'stocks_intl': 'exterior',
  'reits': 'exterior',         // INTL reits → exterior
  'global': 'exterior',
  
  // Outros / Alternativos
  'outros': 'outros',
  'alternatives': 'outros',
  'crypto_other': 'outros',
  'alt': 'outros',
  'alternativos': 'outros',
  'multimercado': 'outros',
  'hedge': 'outros',
  'cripto': 'outros',
  'crypto': 'outros',
};

/**
 * Normaliza chaves de breakdown para o set canônico do Guia de Alocação
 * @param {object} breakdown - breakdown vindo do UI (chaves podem ser variantes)
 * @param {'BR'|'INTL'} mode - modo do detalhamento
 * @returns {object|null} breakdown normalizado com chaves canônicas, ou null se inválido
 */
export function normalizeBreakdownKeys(breakdown, mode = 'BR') {
  if (!breakdown || typeof breakdown !== 'object') {
    return null;
  }
  
  // Inicializar resultado com zeros
  const normalized = {};
  for (const cls of ASSET_CLASSES) {
    normalized[cls] = 0;
  }
  
  let sum = 0;
  const unknownKeys = [];
  
  for (const [rawKey, rawValue] of Object.entries(breakdown)) {
    const value = Number(rawValue) || 0;
    if (value <= 0) continue;
    
    // Normalizar a chave: lowercase, remover espaços
    const key = String(rawKey).toLowerCase().trim().replace(/\s+/g, '_');
    
    // Buscar no mapa canônico
    const canonicalClass = CANONICAL_CLASS_MAP[key];
    
    if (canonicalClass && ASSET_CLASSES.includes(canonicalClass)) {
      normalized[canonicalClass] += value;
      sum += value;
    } else {
      // Chave desconhecida: acumular em 'outros'
      unknownKeys.push(rawKey);
      normalized['outros'] += value;
      sum += value;
    }
  }
  
  // Log de debug se houver chaves desconhecidas
  if (unknownKeys.length > 0 && typeof console !== 'undefined') {
    console.warn('[normalizeBreakdownKeys] Chaves desconhecidas mapeadas para "outros":', unknownKeys);
  }
  
  // Validar soma (tolerância de 0.5 para arredondamentos)
  if (sum <= 0 || !Number.isFinite(sum)) {
    return null;
  }
  
  // Se soma não é ~100, retornar null para usar fallback
  if (Math.abs(sum - 100) > 0.5) {
    console.warn('[normalizeBreakdownKeys] Soma do breakdown inválida:', sum, '- usando fallback');
    return null;
  }
  
  return normalized;
}

/**
 * Constrói alocação atual baseada nos ativos do patrimônio
 * @param {Array} assets - lista de ativos do clientData.assets
 * @param {object} scenarioFx - { USD_BRL, EUR_BRL }
 * @param {object} options - { includePrevidencia: boolean, includeIlliquid: boolean }
 * @returns {{ totalBRL: number, byClassPercent: object, byClassValueBRL: object, diagnostics: Array }}
 */
export function buildCurrentAllocationFromAssets(assets = [], scenarioFx = {}, options = {}) {
  const { includePrevidencia = true } = options;
  
  // Inicializar acumuladores
  const byClassValueBRL = {};
  for (const cls of ASSET_CLASSES) {
    byClassValueBRL[cls] = 0;
  }
  
  let totalBRL = 0;
  const diagnosticsList = [];
  
  // Processar cada ativo
  for (const asset of assets) {
    const type = asset?.type || 'financial';
    
    // Pular previdência se não incluir
    if (type === 'previdencia' && !includePrevidencia) {
      continue;
    }
    
    // Verificar se é tipo ilíquido
    if (['real_estate', 'vehicle', 'business'].includes(type)) {
      continue;
    }
    
    // Converter para BRL
    const valueBRL = convertAssetToBRL(asset, scenarioFx);
    if (valueBRL <= 0) continue;
    
    // ✅ Verificar se tem portfolioDetails ativo (FASE 3)
    // FIX BUG 2: Incluir previdência também (não só 'financial')
    const pDetails = asset.portfolioDetails;
    const canUseBreakdown = type === 'financial' || type === 'previdencia';
    if (pDetails?.enabled && canUseBreakdown) {
      // Distribuir valor pelas classes do breakdown
      const detailMode = pDetails.detailMode || 'BR';
      const breakdownData = detailMode === 'BR' ? pDetails.breakdown : pDetails.intlBreakdown;
      
      // ✅ Usar normalizeBreakdownKeys para tratar todas as variantes de chaves
      const normalizedBreakdown = normalizeBreakdownKeys(breakdownData, detailMode);
      
      if (normalizedBreakdown) {
        // Breakdown válido - distribuir valor pelas classes canônicas
        const breakdownSum = Object.values(normalizedBreakdown).reduce((s, v) => s + (Number(v) || 0), 0);
        
        if (breakdownSum > 0) {
          for (const [canonicalClass, pct] of Object.entries(normalizedBreakdown)) {
            const normalizedPct = (Number(pct) || 0) / breakdownSum; // Normalizar para soma = 1
            const valueForClass = valueBRL * normalizedPct;
            
            if (valueForClass > 0 && ASSET_CLASSES.includes(canonicalClass)) {
              byClassValueBRL[canonicalClass] = (byClassValueBRL[canonicalClass] || 0) + valueForClass;
            }
          }
          totalBRL += valueBRL;
          continue; // Não processar pela lógica padrão
        }
      } else {
        // Log de debug: breakdown inválido após normalização
        console.warn('[buildCurrentAllocationFromAssets] Breakdown inválido para ativo:', {
          name: asset.name,
          type,
          detailMode,
          originalBreakdown: breakdownData,
          enabled: pDetails?.enabled,
        });
      }
    }
    
    // ✅ Fallback: lógica original para ativos sem breakdown
    const allocClass = getAssetAllocationClass(asset);
    if (!allocClass) {
      // Ativo não investível (ilíquido)
      continue;
    }
    
    // Acumular
    byClassValueBRL[allocClass] = (byClassValueBRL[allocClass] || 0) + valueBRL;
    totalBRL += valueBRL;
  }
  
  // Calcular percentuais
  const byClassPercent = {};
  for (const cls of ASSET_CLASSES) {
    byClassPercent[cls] = totalBRL > 0 ? (byClassValueBRL[cls] / totalBRL) * 100 : 0;
  }
  
  // Gerar diagnósticos
  if (totalBRL <= 0) {
    diagnosticsList.push({
      type: 'vazio',
      severity: 'info',
      message: 'Nenhum ativo investível cadastrado no Patrimônio',
    });
  }
  
  // Verificar concentração
  for (const cls of ASSET_CLASSES) {
    if (byClassPercent[cls] > 50) {
      diagnosticsList.push({
        type: 'concentracao',
        severity: 'warning',
        message: `Alta concentração em ${ASSET_CLASS_LABELS[cls]}: ${byClassPercent[cls].toFixed(1)}%`,
      });
    }
  }
  
  return {
    totalBRL,
    byClassPercent,
    byClassValueBRL,
    diagnostics: diagnosticsList,
  };
}

/**
 * Cria uma carteira importada a partir dos ativos
 * @param {object} currentAllocation - resultado de buildCurrentAllocationFromAssets
 * @returns {object} portfolio para adicionar a allocationGuide.portfolios
 */
export function createImportedPortfolio(currentAllocation) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  
  // Arredondar percentuais para 2 casas decimais
  const breakdown = {};
  for (const cls of ASSET_CLASSES) {
    breakdown[cls] = parseFloat((currentAllocation.byClassPercent[cls] || 0).toFixed(2));
  }
  
  // Normalizar para garantir soma = 100
  const normalized = normalizeBreakdownTo100(breakdown);
  
  return {
    id: `portfolio_imported_${Date.now()}`,
    name: 'Carteira Atual (Importada)',
    currency: 'BRL',
    totalValue: currentAllocation.totalBRL,
    fxOverride: null,
    breakdown: normalized,
    notes: `Gerada automaticamente a partir do Patrimônio em ${dateStr}`,
    isImported: true,
  };
}

/**
 * Compara duas carteiras e retorna deltas
 * @param {object} currentBreakdown - breakdown atual (percentuais)
 * @param {object} plannedBreakdown - breakdown planejado (percentuais)
 * @returns {{ deltas: object, insights: Array }}
 */
export function compareAllocations(currentBreakdown, plannedBreakdown) {
  const deltas = {};
  const insights = [];
  
  for (const cls of ASSET_CLASSES) {
    const current = Number(currentBreakdown?.[cls]) || 0;
    const planned = Number(plannedBreakdown?.[cls]) || 0;
    const delta = current - planned;
    deltas[cls] = delta;
    
    // Gerar insight se delta significativo (> 5pp)
    if (Math.abs(delta) >= 5) {
      if (delta > 0) {
        insights.push({
          cls,
          direction: 'over',
          delta,
          message: `Você está com +${delta.toFixed(1)}pp em ${ASSET_CLASS_LABELS[cls]} vs planejado`,
        });
      } else {
        insights.push({
          cls,
          direction: 'under',
          delta,
          message: `Você está com ${delta.toFixed(1)}pp em ${ASSET_CLASS_LABELS[cls]} vs planejado`,
        });
      }
    }
  }
  
  return { deltas, insights };
}
