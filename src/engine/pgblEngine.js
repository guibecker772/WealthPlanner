// src/engine/pgblEngine.js
// Motor de cálculo para eficiência fiscal PGBL (estilo XP)

/**
 * Alíquotas marginais do IR
 */
export const IR_MARGINAL_RATES = [
  { label: "Isento", value: 0 },
  { label: "7,5%", value: 0.075 },
  { label: "15%", value: 0.15 },
  { label: "22,5%", value: 0.225 },
  { label: "27,5%", value: 0.275 },
];

/**
 * Tabela regressiva PGBL/VGBL
 */
export const REGRESSIVE_TABLE = [
  { minYears: 0, maxYears: 2, rate: 0.35 },
  { minYears: 2, maxYears: 4, rate: 0.30 },
  { minYears: 4, maxYears: 6, rate: 0.25 },
  { minYears: 6, maxYears: 8, rate: 0.20 },
  { minYears: 8, maxYears: 10, rate: 0.15 },
  { minYears: 10, maxYears: Infinity, rate: 0.10 },
];

/**
 * Retorna alíquota da tabela regressiva
 * @param {number} years - Anos de permanência
 * @returns {number} - Alíquota
 */
export function getRegressiveRate(years) {
  for (const row of REGRESSIVE_TABLE) {
    if (years >= row.minYears && years < row.maxYears) {
      return row.rate;
    }
  }
  return 0.10; // mínimo após 10 anos
}

/**
 * Calcula limite de dedução PGBL
 * 12% da renda tributável anual, apenas se:
 * - Declaração completa
 * - Contribui para INSS/regime próprio
 *
 * @param {object} params
 * @returns {number} - Limite de dedução anual
 */
export function calculateDeductionLimit({
  annualTaxableIncome = 0,
  annualContribution = 0,
  isCompleteDeclaration = true,
  contributesToINSS = true,
}) {
  if (!isCompleteDeclaration || !contributesToINSS) {
    return 0;
  }

  const maxDeduction = annualTaxableIncome * 0.12;
  return Math.min(annualContribution, maxDeduction);
}

/**
 * Calcula economia fiscal anual
 * @param {object} params
 * @returns {number} - Economia fiscal anual em BRL
 */
export function calculateAnnualTaxSavings({
  annualTaxableIncome = 0,
  annualContribution = 0,
  marginalTaxRate = 0.275,
  isCompleteDeclaration = true,
  contributesToINSS = true,
}) {
  const deduction = calculateDeductionLimit({
    annualTaxableIncome,
    annualContribution,
    isCompleteDeclaration,
    contributesToINSS,
  });

  return deduction * marginalTaxRate;
}

/**
 * Projeta acumulação PGBL + benefício fiscal investido
 *
 * @param {object} params
 * @returns {Array} - Série por ano { age, year, pgblBalance, benefitBalance, total }
 */
export function projectPGBLAccumulation({
  currentAge = 30,
  targetAge = 65,
  annualTaxableIncome = 0,
  annualContribution = 0,
  marginalTaxRate = 0.275,
  annualReturnRate = 0.08,
  isCompleteDeclaration = true,
  contributesToINSS = true,
  reinvestTaxSavings = true,
  adminFeeRate = 0,
  initialPgblBalance = 0,
}) {
  const series = [];
  const years = Math.max(0, targetAge - currentAge);

  // Taxa líquida após custos admin
  const netReturnRate = Math.max(0, annualReturnRate - adminFeeRate);

  let pgblBalance = initialPgblBalance;
  let benefitBalance = 0;

  // ✅ CORREÇÃO: O ponto "Idade N" representa o patrimônio ao FINAL do ano N→N+1
  // Ou seja, já inclui o primeiro aporte e primeiro ano de rentabilidade.
  // Isso faz mais sentido visualmente: aos 35 anos, você vê quanto terá após 
  // completar o primeiro ano de aportes.
  
  // Primeiro ponto: já com primeiro ano de evolução
  const firstYearTaxSavings = calculateAnnualTaxSavings({
    annualTaxableIncome,
    annualContribution,
    marginalTaxRate,
    isCompleteDeclaration,
    contributesToINSS,
  });
  
  const firstYearDeduction = calculateDeductionLimit({
    annualTaxableIncome,
    annualContribution,
    isCompleteDeclaration,
    contributesToINSS,
  });

  // Primeiro ano: saldo inicial + aporte + retorno proporcional (metade do ano em média)
  // Opção simplificada: aporte no início do ano, rende o ano todo
  pgblBalance = (initialPgblBalance + annualContribution) * (1 + netReturnRate);
  
  if (reinvestTaxSavings) {
    benefitBalance = firstYearTaxSavings * (1 + netReturnRate);
  }

  series.push({
    age: currentAge,
    year: 0,
    pgblBalance,
    benefitBalance,
    total: pgblBalance + benefitBalance,
    annualContribution,
    annualTaxSavings: firstYearTaxSavings,
    deduction: firstYearDeduction,
    label: `Aos ${currentAge} (final do 1º ano)`,
  });

  for (let y = 1; y <= years; y++) {
    const age = currentAge + y;

    // Economia fiscal do ano
    const taxSavings = calculateAnnualTaxSavings({
      annualTaxableIncome,
      annualContribution,
      marginalTaxRate,
      isCompleteDeclaration,
      contributesToINSS,
    });

    const deduction = calculateDeductionLimit({
      annualTaxableIncome,
      annualContribution,
      isCompleteDeclaration,
      contributesToINSS,
    });

    // Crescimento do PGBL: saldo anterior + retorno + aporte
    pgblBalance = pgblBalance * (1 + netReturnRate) + annualContribution;

    // Crescimento do benefício fiscal investido
    if (reinvestTaxSavings) {
      benefitBalance = benefitBalance * (1 + netReturnRate) + taxSavings;
    }

    series.push({
      age,
      year: y,
      pgblBalance,
      benefitBalance,
      total: pgblBalance + benefitBalance,
      annualContribution,
      annualTaxSavings: taxSavings,
      deduction,
    });
  }

  return series;
}

/**
 * Calcula valor líquido na saída (Fase 2)
 * Compara PGBL vs investimento tradicional
 *
 * @param {object} params
 * @returns {object} - { pgblNet, traditionalNet, advantage, advantagePct }
 */
export function calculateNetComparison({
  pgblGrossBalance = 0,
  benefitBalance = 0,
  traditionalBalance = 0,
  traditionalCost = 0, // custo de aquisição do investimento tradicional
  yearsHeld = 10,
  exitTaxRegime = "regressivo", // "progressivo" | "regressivo"
  exitMarginalRate = 0.275, // para progressivo
}) {
  // IR na saída do PGBL
  let pgblTaxRate;
  if (exitTaxRegime === "regressivo") {
    pgblTaxRate = getRegressiveRate(yearsHeld);
  } else {
    pgblTaxRate = exitMarginalRate;
  }

  // PGBL tributa sobre o valor TOTAL (não só ganho)
  const pgblTax = pgblGrossBalance * pgblTaxRate;
  const pgblNet = pgblGrossBalance - pgblTax + benefitBalance;

  // Investimento tradicional: tributa só o ganho (15% após 2 anos para renda fixa longa)
  const traditionalGain = Math.max(0, traditionalBalance - traditionalCost);
  const traditionalTaxRate = 0.15; // simplificado
  const traditionalTax = traditionalGain * traditionalTaxRate;
  const traditionalNet = traditionalBalance - traditionalTax;

  const advantage = pgblNet - traditionalNet;
  const advantagePct = traditionalNet > 0 ? (advantage / traditionalNet) * 100 : 0;

  return {
    pgblGrossBalance,
    pgblTax,
    pgblNet,
    benefitBalance,
    traditionalBalance,
    traditionalGain,
    traditionalTax,
    traditionalNet,
    advantage,
    advantagePct,
  };
}

/**
 * Gera dados para o gráfico de barras empilhadas (estilo XP)
 * @param {Array} series - Saída de projectPGBLAccumulation
 * @returns {Array} - Dados formatados para Recharts
 */
export function formatChartData(series = []) {
  return series.map((point) => ({
    age: point.age,
    year: point.year,
    pgbl: Math.round(point.pgblBalance),
    benefit: Math.round(point.benefitBalance),
    total: Math.round(point.total),
  }));
}

/**
 * Calcula resumo final da projeção
 * @param {Array} series
 * @returns {object} - Métricas de resumo
 */
export function calculateProjectionSummary(series = []) {
  if (!series.length) {
    return {
      finalPgblBalance: 0,
      finalBenefitBalance: 0,
      finalTotal: 0,
      totalContributions: 0,
      totalTaxSavings: 0,
      totalGrowth: 0,
    };
  }

  const last = series[series.length - 1];
  const totalContributions = series.reduce((acc, p) => acc + (p.annualContribution || 0), 0);
  const totalTaxSavings = series.reduce((acc, p) => acc + (p.annualTaxSavings || 0), 0);

  return {
    finalPgblBalance: last.pgblBalance,
    finalBenefitBalance: last.benefitBalance,
    finalTotal: last.total,
    totalContributions,
    totalTaxSavings,
    totalGrowth: last.total - totalContributions,
  };
}

const PGBLEngine = {
  IR_MARGINAL_RATES,
  REGRESSIVE_TABLE,
  getRegressiveRate,
  calculateDeductionLimit,
  calculateAnnualTaxSavings,
  projectPGBLAccumulation,
  calculateNetComparison,
  formatChartData,
  calculateProjectionSummary,
};

export default PGBLEngine;
