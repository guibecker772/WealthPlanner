// src/utils/simulationModes.test.js
import { describe, it, expect } from "vitest";
import { 
  calculateAlternativeScenarios, 
  simulateMode, 
  simulateWealth, 
  markZeroedIfNeeded,
  solveRequiredContribution 
} from "./simulationModes";
import FinancialEngine from "../engine/FinancialEngine";
import { DEFAULT_FX_RATES } from "./fx";

describe("simulationModes - FX e initialWealth", () => {
  // Dados de teste com ativos em múltiplas moedas
  const createClientDataWithMultiCurrency = (fx = {}) => ({
    currentAge: 30,
    retirementAge: 60,
    lifeExpectancy: 90,
    monthlyContribution: 5000,
    monthlyCostRetirement: 15000,
    profile: "moderado",
    inflation: 4.5,
    fx: {
      USD_BRL: fx.USD_BRL ?? DEFAULT_FX_RATES.USD_BRL,
      EUR_BRL: fx.EUR_BRL ?? DEFAULT_FX_RATES.EUR_BRL,
    },
    assets: [
      // Ativo em BRL
      {
        id: "1",
        name: "Tesouro Direto",
        type: "financial",
        currency: "BRL",
        amountCurrency: 200000,
        value: 200000,
      },
      // Ativo em USD
      {
        id: "2",
        name: "ETF S&P 500",
        type: "financial",
        currency: "USD",
        amountCurrency: 20000, // USD 20.000
      },
      // Ativo em EUR
      {
        id: "3",
        name: "ETF Europa",
        type: "financial",
        currency: "EUR",
        amountCurrency: 10000, // EUR 10.000
      },
      // Previdência (sempre BRL)
      {
        id: "4",
        name: "PGBL",
        type: "previdencia",
        currency: "BRL",
        amountCurrency: 100000,
        value: 100000,
        previdencia: { planType: "PGBL" },
      },
      // Imóvel (deve ser excluído)
      {
        id: "5",
        name: "Apartamento",
        type: "real_estate",
        currency: "BRL",
        value: 500000,
      },
    ],
  });

  describe("consistência com baseline (FinancialEngine)", () => {
    it("deve calcular initialWealth igual ao baseline com FX default", () => {
      const clientData = createClientDataWithMultiCurrency();
      
      // Calcula baseline via FinancialEngine
      const engineOutput = FinancialEngine.run(clientData, false);
      const baselineWealthBRL = engineOutput.kpis.baselineWealthBRL;
      
      // Calcula alternativo
      const scenarios = calculateAlternativeScenarios(clientData, { includeImpacts: false });
      
      // O primeiro ponto da série alternativa (após simulação) deve partir do mesmo initialWealth
      // Nota: a série começa em currentAge + 1, mas o patrimônio inicial usado é o mesmo
      
      // Valor esperado com FX default:
      // BRL: 200.000
      // USD: 20.000 * 5.0 = 100.000
      // EUR: 10.000 * 5.5 = 55.000
      // Previdência: 100.000
      // Total: 200.000 + 100.000 + 55.000 + 100.000 = 455.000
      const expectedWealth = 200000 + (20000 * 5.0) + (10000 * 5.5) + 100000;
      
      expect(baselineWealthBRL).toBeCloseTo(expectedWealth, 0);
      
      // O cenário alternativo deve usar o mesmo valor inicial
      // Verificamos que a série foi gerada com sucesso
      expect(scenarios.consumption).not.toBeNull();
      expect(scenarios.preservation).not.toBeNull();
    });

    it("deve usar FX customizado do cenário", () => {
      const customFx = { USD_BRL: 6.0, EUR_BRL: 7.0 };
      const clientData = createClientDataWithMultiCurrency(customFx);
      
      const engineOutput = FinancialEngine.run(clientData, false);
      const baselineWealthBRL = engineOutput.kpis.baselineWealthBRL;
      
      // Valor esperado com FX custom:
      // BRL: 200.000
      // USD: 20.000 * 6.0 = 120.000
      // EUR: 10.000 * 7.0 = 70.000
      // Previdência: 100.000
      // Total: 200.000 + 120.000 + 70.000 + 100.000 = 490.000
      const expectedWealth = 200000 + (20000 * 6.0) + (10000 * 7.0) + 100000;
      
      expect(baselineWealthBRL).toBeCloseTo(expectedWealth, 0);
    });

    it("deve usar fallback FX quando fx ausente", () => {
      const clientData = createClientDataWithMultiCurrency();
      delete clientData.fx; // Remove fx
      
      const engineOutput = FinancialEngine.run(clientData, false);
      const baselineWealthBRL = engineOutput.kpis.baselineWealthBRL;
      
      // Deve usar DEFAULT_FX_RATES
      const expectedWealth = 200000 + (20000 * DEFAULT_FX_RATES.USD_BRL) + (10000 * DEFAULT_FX_RATES.EUR_BRL) + 100000;
      
      expect(baselineWealthBRL).toBeCloseTo(expectedWealth, 0);
    });

    it("deve usar fallback FX quando fx parcial (apenas USD)", () => {
      const clientData = createClientDataWithMultiCurrency({ USD_BRL: 6.0 });
      delete clientData.fx.EUR_BRL; // Remove EUR
      
      const engineOutput = FinancialEngine.run(clientData, false);
      const baselineWealthBRL = engineOutput.kpis.baselineWealthBRL;
      
      // USD usa custom, EUR usa fallback
      const expectedWealth = 200000 + (20000 * 6.0) + (10000 * DEFAULT_FX_RATES.EUR_BRL) + 100000;
      
      expect(baselineWealthBRL).toBeCloseTo(expectedWealth, 0);
    });
  });

  describe("exclusão de ilíquidos", () => {
    it("NÃO deve incluir imóveis no initialWealth", () => {
      const clientData = createClientDataWithMultiCurrency();
      
      const engineOutput = FinancialEngine.run(clientData, false);
      const baselineWealthBRL = engineOutput.kpis.baselineWealthBRL;
      
      // O imóvel de 500.000 NÃO deve estar incluído
      // Total sem imóvel: 455.000
      expect(baselineWealthBRL).toBeLessThan(500000);
      expect(baselineWealthBRL).toBeCloseTo(455000, 0);
    });
  });

  describe("simulateMode", () => {
    it("deve gerar série com valores corretos usando FX", () => {
      const clientData = createClientDataWithMultiCurrency();
      
      const result = simulateMode({
        mode: "consumption",
        inputs: clientData,
        monthlyContribution: 5000,
        retirementAge: 60,
      });
      
      expect(result.series).toBeDefined();
      expect(result.series.length).toBeGreaterThan(0);
      
      // Primeiro ponto (age = currentAge + 1 = 31) deve ter valor > initialWealth (devido a aportes e retorno)
      const firstPoint = result.series[0];
      expect(firstPoint.age).toBe(31);
      expect(firstPoint.wealth).toBeGreaterThan(0);
    });
  });
});

// ========================================
// TESTES PARA BUG DE DEPLETION (zeroedAtAge)
// ========================================

describe("simulationModes - Depletion tracking (zeroedAtAge)", () => {
  describe("markZeroedIfNeeded helper", () => {
    it("deve marcar quando wealth cai de > 0 para 0", () => {
      expect(markZeroedIfNeeded(100000, 0, 47, null)).toBe(47);
    });

    it("NÃO deve re-marcar se zeroedAtAge já está setado", () => {
      expect(markZeroedIfNeeded(50000, 0, 50, 47)).toBe(47);
    });

    it("NÃO deve marcar se wealth não zerou", () => {
      expect(markZeroedIfNeeded(100000, 50000, 47, null)).toBeNull();
    });

    it("NÃO deve marcar se wealth já era 0 antes", () => {
      expect(markZeroedIfNeeded(0, 0, 47, null)).toBeNull();
    });

    it("NÃO deve marcar se wealth subiu", () => {
      expect(markZeroedIfNeeded(50000, 100000, 47, null)).toBeNull();
    });
  });

  describe("simulateWealth - depletion por impactGoals", () => {
    const baseParams = {
      initialWealth: 100000, // R$ 100k - menor para garantir que zera
      monthlyContribution: 1000, // Aporte baixo
      currentAge: 30,
      retirementAge: 60,
      contributionEndAge: 60,
      lifeExpectancy: 90,
      desiredMonthlyIncome: 10000,
      realReturn: 0.03, // 3% real anual (conservador)
    };

    it("deve registrar zeroedAtAge quando impactGoal zera patrimônio no aniversário", () => {
      // Goal de R$ 500k aos 35 (muito maior que patrimônio acumulado de ~R$ 120k em 5 anos)
      const result = simulateWealth({
        ...baseParams,
        impactGoals: [{ age: 35, value: 500000 }], // Meta muito grande
      });

      // zeroedAtAge deve ser 35 (idade do evento)
      expect(result.zeroedAtAge).toBe(35);
      
      // A série deve mostrar wealth = 0 a partir dessa idade
      const pointAt35 = result.series.find(p => p.age === 35);
      expect(pointAt35?.wealth).toBe(0);
    });

    it("deve registrar nextAge (não age atual) quando goal zera", () => {
      // Goal aos 32 (apenas 2 anos de acumulação)
      const result = simulateWealth({
        ...baseParams,
        impactGoals: [{ age: 32, value: 500000 }],
      });

      // O evento acontece no "aniversário" (nextAge = age + 1 após processar os 12 meses)
      // Portanto, zeroedAtAge deve ser 32 (a idade onde o goal é aplicado)
      expect(result.zeroedAtAge).toBe(32);
    });

    it("NÃO deve re-marcar se já zerou antes por outro evento", () => {
      // Dois goals: um aos 32 e outro aos 40
      const result = simulateWealth({
        ...baseParams,
        impactGoals: [
          { age: 32, value: 500000 },
          { age: 40, value: 100000 },
        ],
      });

      // Deve manter o primeiro (32)
      expect(result.zeroedAtAge).toBe(32);
    });

    it("NÃO deve marcar se goal não zera o patrimônio", () => {
      // Goal pequeno que não zera
      const result = simulateWealth({
        ...baseParams,
        initialWealth: 500000, // Patrimônio alto
        impactGoals: [{ age: 35, value: 10000 }], // Meta pequena
      });

      // Não deve ter zerado aos 35
      expect(result.zeroedAtAge).not.toBe(35);
    });
  });

  describe("simulateWealth - depletion por timeline negativa (resgate)", () => {
    const baseParams = {
      initialWealth: 100000,
      monthlyContribution: 5000,
      currentAge: 30,
      retirementAge: 60,
      contributionEndAge: 60,
      lifeExpectancy: 90,
      desiredMonthlyIncome: 10000,
      realReturn: 0.05,
    };

    it("deve registrar zeroedAtAge quando resgate mensal zera patrimônio", () => {
      // Resgate de R$ 50k/mês dos 32 aos 35 (muito maior que o patrimônio)
      const result = simulateWealth({
        ...baseParams,
        contributionTimeline: [
          { startAge: 32, endAge: 35, monthlyValue: -50000, enabled: true },
        ],
      });

      // Deve zerar em algum ponto entre 32 e 35
      expect(result.zeroedAtAge).not.toBeNull();
      expect(result.zeroedAtAge).toBeGreaterThanOrEqual(32);
      expect(result.zeroedAtAge).toBeLessThanOrEqual(36);
    });

    it("NÃO deve marcar se resgate é pequeno e não zera", () => {
      // Resgate pequeno que não zera
      const result = simulateWealth({
        ...baseParams,
        initialWealth: 1000000, // Patrimônio alto
        contributionTimeline: [
          { startAge: 32, endAge: 35, monthlyValue: -1000, enabled: true },
        ],
      });

      // Pode ou não zerar na aposentadoria, mas não pelo resgate
      if (result.zeroedAtAge !== null) {
        expect(result.zeroedAtAge).toBeGreaterThan(35);
      }
    });
  });

  describe("solveRequiredContribution - não aceita solução impossível", () => {
    const createClientData = () => ({
      currentAge: 30,
      retirementAge: 60,
      lifeExpectancy: 90,
      monthlyContribution: 1000,
      monthlyCostRetirement: 15000,
      profile: "moderado",
      inflation: 4.5,
      assets: [
        { id: "1", type: "financial", currency: "BRL", value: 100000 },
      ],
    });

    it("NÃO deve retornar requiredMonthlyContribution = 0 quando goal grande zera patrimônio", () => {
      const clientData = createClientData();

      const result = solveRequiredContribution({
        mode: "consumption",
        inputs: clientData,
        targetRetirementAge: 60,
        impacts: {
          impactGoals: [{ age: 35, value: 500000 }], // Meta que zera cedo
        },
      });

      // Não pode retornar 0 - ou é impossible ou precisa de contribuição > 0
      if (result.status === "ok") {
        expect(result.requiredMonthlyContribution).toBeGreaterThan(0);
      } else {
        expect(result.status).toBe("impossible");
      }
    });

    it("solver com meta muito grande: deve precisar de contribuição alta ou ser impossível", () => {
      const clientData = createClientData();

      const result = solveRequiredContribution({
        mode: "consumption",
        inputs: clientData,
        targetRetirementAge: 60,
        impacts: {
          impactGoals: [{ age: 32, value: 5000000 }], // Meta astronômica aos 32 (só 2 anos)
        },
      });

      // Deve ser impossível ou exigir contribuição muito alta
      if (result.status === "ok") {
        // Se conseguiu resolver, a contribuição deve ser muito alta para cobrir 5M em 2 anos
        expect(result.requiredMonthlyContribution).toBeGreaterThan(100000);
      } else {
        expect(result.status).toBe("impossible");
      }
    });
  });

  describe("calculateAlternativeScenarios - toggle ON com impactGoals", () => {
    const createClientData = () => ({
      currentAge: 30,
      retirementAge: 60,
      lifeExpectancy: 90,
      monthlyContribution: 1000,
      monthlyCostRetirement: 15000,
      profile: "moderado",
      inflation: 4.5,
      assets: [
        { id: "1", type: "financial", currency: "BRL", value: 100000 },
      ],
      financialGoals: [
        { id: "goal_1", type: "impact", age: 35, value: 500000, name: "Meta grande" },
      ],
    });

    it("toggle ON: simulateWealth deve registrar zeroedAtAge corretamente", () => {
      // Teste direto da função simulateWealth para verificar que zeroedAtAge funciona
      const result = simulateWealth({
        initialWealth: 100000,
        monthlyContribution: 1000,
        currentAge: 30,
        retirementAge: 60,
        contributionEndAge: 60,
        lifeExpectancy: 90,
        desiredMonthlyIncome: 10000,
        realReturn: 0.03,
        impactGoals: [{ age: 35, value: 500000 }],
      });

      // O patrimônio deve zerar aos 35
      expect(result.zeroedAtAge).toBe(35);
      
      // E a série deve refletir isso
      const pointAt35 = result.series.find(p => p.age === 35);
      expect(pointAt35?.wealth).toBe(0);
    });
  });
});
