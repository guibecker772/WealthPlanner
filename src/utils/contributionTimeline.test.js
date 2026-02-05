// src/utils/contributionTimeline.test.js
import { describe, it, expect } from "vitest";
import {
  normalizeTimelineRule,
  getMonthlyContributionAtAge,
  normalizeTimeline,
} from "./contributionTimeline";

describe("contributionTimeline", () => {
  // ========================================
  // normalizeTimelineRule
  // ========================================
  describe("normalizeTimelineRule", () => {
    it("deve retornar null para regra null/undefined", () => {
      expect(normalizeTimelineRule(null)).toBeNull();
      expect(normalizeTimelineRule(undefined)).toBeNull();
    });

    it("deve normalizar regra com monthlyValue (campo principal)", () => {
      const rule = { startAge: 30, endAge: 40, monthlyValue: 5000 };
      const normalized = normalizeTimelineRule(rule);
      
      expect(normalized.startAge).toBe(30);
      expect(normalized.endAge).toBe(40);
      expect(normalized.monthlyValue).toBe(5000);
      expect(normalized.enabled).toBe(true);
    });

    it("deve aceitar alias 'value' para monthlyValue", () => {
      const rule = { startAge: 30, endAge: 40, value: 3000 };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(3000);
    });

    it("deve aceitar alias 'amount' para monthlyValue", () => {
      const rule = { startAge: 30, endAge: 40, amount: 4000 };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(4000);
    });

    it("deve aceitar alias 'monthlyContribution' para monthlyValue", () => {
      const rule = { startAge: 30, endAge: 40, monthlyContribution: 2500 };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(2500);
    });

    it("deve aceitar alias 'aporteMensal' para monthlyValue", () => {
      const rule = { startAge: 30, endAge: 40, aporteMensal: 2000 };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(2000);
    });

    it("deve aceitar alias 'valorMensal' para monthlyValue", () => {
      const rule = { startAge: 30, endAge: 40, valorMensal: 1500 };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(1500);
    });

    it("deve aceitar alias 'valor' para monthlyValue", () => {
      const rule = { startAge: 30, endAge: 40, valor: 1000 };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(1000);
    });

    it("deve priorizar monthlyValue sobre aliases", () => {
      const rule = { startAge: 30, endAge: 40, monthlyValue: 5000, value: 3000, amount: 2000 };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(5000);
    });

    it("deve aceitar aliases para startAge (fromAge, inicio, idadeInicio)", () => {
      expect(normalizeTimelineRule({ fromAge: 25, endAge: 40, monthlyValue: 100 }).startAge).toBe(25);
      expect(normalizeTimelineRule({ inicio: 28, endAge: 40, monthlyValue: 100 }).startAge).toBe(28);
      expect(normalizeTimelineRule({ idadeInicio: 32, endAge: 40, monthlyValue: 100 }).startAge).toBe(32);
    });

    it("deve aceitar aliases para endAge (toAge, fim, idadeFim)", () => {
      expect(normalizeTimelineRule({ startAge: 30, toAge: 45, monthlyValue: 100 }).endAge).toBe(45);
      expect(normalizeTimelineRule({ startAge: 30, fim: 50, monthlyValue: 100 }).endAge).toBe(50);
      expect(normalizeTimelineRule({ startAge: 30, idadeFim: 55, monthlyValue: 100 }).endAge).toBe(55);
    });

    it("deve usar endAge=120 como default se não especificado", () => {
      const rule = { startAge: 30, monthlyValue: 1000 };
      expect(normalizeTimelineRule(rule).endAge).toBe(120);
    });

    it("deve preservar valores negativos (resgate)", () => {
      const rule = { startAge: 30, endAge: 40, monthlyValue: -500 };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(-500);
    });

    it("deve forçar negativo quando isWithdrawal=true", () => {
      const rule = { startAge: 30, endAge: 40, monthlyValue: 500, isWithdrawal: true };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(-500);
    });

    it("deve forçar negativo quando kind='resgate'", () => {
      const rule = { startAge: 30, endAge: 40, monthlyValue: 500, kind: "resgate" };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(-500);
    });

    it("deve forçar negativo quando kind='withdraw'", () => {
      const rule = { startAge: 30, endAge: 40, monthlyValue: 500, kind: "withdraw" };
      expect(normalizeTimelineRule(rule).monthlyValue).toBe(-500);
    });

    it("deve manter enabled=true por default", () => {
      const rule = { startAge: 30, endAge: 40, monthlyValue: 1000 };
      expect(normalizeTimelineRule(rule).enabled).toBe(true);
    });

    it("deve respeitar enabled=false explícito", () => {
      const rule = { startAge: 30, endAge: 40, monthlyValue: 1000, enabled: false };
      expect(normalizeTimelineRule(rule).enabled).toBe(false);
    });
  });

  // ========================================
  // getMonthlyContributionAtAge
  // ========================================
  describe("getMonthlyContributionAtAge", () => {
    const baseContribution = 5000;

    describe("Range inclusivo (bug fix)", () => {
      const timeline = [
        { id: "fin_32_37", enabled: true, startAge: 32, endAge: 37, monthlyValue: 2000 },
      ];

      it("idade 31 (antes do range) → fallback", () => {
        expect(getMonthlyContributionAtAge(31, baseContribution, timeline)).toBe(baseContribution);
      });

      it("idade 32 (startAge, inclusivo) → regra", () => {
        expect(getMonthlyContributionAtAge(32, baseContribution, timeline)).toBe(2000);
      });

      it("idade 33 (dentro do range) → regra", () => {
        expect(getMonthlyContributionAtAge(33, baseContribution, timeline)).toBe(2000);
      });

      it("idade 37 (endAge, inclusivo) → regra", () => {
        expect(getMonthlyContributionAtAge(37, baseContribution, timeline)).toBe(2000);
      });

      it("idade 38 (após endAge) → fallback", () => {
        expect(getMonthlyContributionAtAge(38, baseContribution, timeline)).toBe(baseContribution);
      });
    });

    describe("Fallback para baseContribution", () => {
      it("sem regras → baseContribution", () => {
        expect(getMonthlyContributionAtAge(30, baseContribution, [])).toBe(baseContribution);
      });

      it("timeline null/undefined → baseContribution", () => {
        expect(getMonthlyContributionAtAge(30, baseContribution, null)).toBe(baseContribution);
        expect(getMonthlyContributionAtAge(30, baseContribution, undefined)).toBe(baseContribution);
      });

      it("idade fora de todas as regras → baseContribution", () => {
        const timeline = [
          { startAge: 40, endAge: 50, monthlyValue: 1000, enabled: true },
        ];
        expect(getMonthlyContributionAtAge(30, baseContribution, timeline)).toBe(baseContribution);
        expect(getMonthlyContributionAtAge(55, baseContribution, timeline)).toBe(baseContribution);
      });

      it("NUNCA retorna 0 como default (retorna baseContribution)", () => {
        const timeline = [
          { startAge: 40, endAge: 50, monthlyValue: 1000, enabled: true },
        ];
        // Idade 30 está fora do range, deve retornar baseContribution (5000), não 0
        expect(getMonthlyContributionAtAge(30, baseContribution, timeline)).not.toBe(0);
        expect(getMonthlyContributionAtAge(30, baseContribution, timeline)).toBe(baseContribution);
      });
    });

    describe("enabled:false → ignorar", () => {
      it("regra com enabled=false é ignorada", () => {
        const timeline = [
          { startAge: 30, endAge: 40, monthlyValue: 1000, enabled: false },
        ];
        expect(getMonthlyContributionAtAge(35, baseContribution, timeline)).toBe(baseContribution);
      });

      it("regra enabled:false não afeta outras regras", () => {
        const timeline = [
          { startAge: 30, endAge: 40, monthlyValue: 1000, enabled: false },
          { startAge: 30, endAge: 40, monthlyValue: 2000, enabled: true },
        ];
        expect(getMonthlyContributionAtAge(35, baseContribution, timeline)).toBe(2000);
      });
    });

    describe("Overlap: maior startAge vence", () => {
      it("múltiplas regras ativas → vence maior startAge", () => {
        const timeline = [
          { startAge: 30, endAge: 50, monthlyValue: 1000, enabled: true }, // range largo
          { startAge: 35, endAge: 45, monthlyValue: 2000, enabled: true }, // range mais específico
        ];
        // Idade 40: ambas ativas, vence startAge=35
        expect(getMonthlyContributionAtAge(40, baseContribution, timeline)).toBe(2000);
      });

      it("overlap resolve por maior startAge, independente da ordem do array", () => {
        const timeline = [
          { startAge: 35, endAge: 45, monthlyValue: 2000, enabled: true }, // mais específico, primeiro
          { startAge: 30, endAge: 50, monthlyValue: 1000, enabled: true }, // range largo, segundo
        ];
        // Idade 40: vence startAge=35, mesmo estando primeiro no array
        expect(getMonthlyContributionAtAge(40, baseContribution, timeline)).toBe(2000);
      });

      it("array embaralhado → resultado invariável", () => {
        const timeline1 = [
          { startAge: 30, endAge: 50, monthlyValue: 1000, enabled: true },
          { startAge: 35, endAge: 45, monthlyValue: 2000, enabled: true },
          { startAge: 38, endAge: 42, monthlyValue: 3000, enabled: true },
        ];
        const timeline2 = [
          { startAge: 38, endAge: 42, monthlyValue: 3000, enabled: true },
          { startAge: 30, endAge: 50, monthlyValue: 1000, enabled: true },
          { startAge: 35, endAge: 45, monthlyValue: 2000, enabled: true },
        ];
        
        // Idade 40: vence startAge=38 (maior)
        expect(getMonthlyContributionAtAge(40, baseContribution, timeline1)).toBe(3000);
        expect(getMonthlyContributionAtAge(40, baseContribution, timeline2)).toBe(3000);
      });
    });

    describe("Valores negativos (resgate)", () => {
      it("monthlyValue negativo é retornado como está", () => {
        const timeline = [
          { startAge: 30, endAge: 40, monthlyValue: -500, enabled: true },
        ];
        expect(getMonthlyContributionAtAge(35, baseContribution, timeline)).toBe(-500);
      });
    });

    describe("Caso de reprodução do bug (toggle ON)", () => {
      it("fixture fin_32_37 deve aplicar corretamente 32-37", () => {
        const clientDataMonthlyContribution = 5000;
        const timeline = [
          { id: "fin_32_37", enabled: true, startAge: 32, endAge: 37, monthlyValue: 2000, kind: "financiamento" },
        ];

        // Antes do range
        expect(getMonthlyContributionAtAge(31, clientDataMonthlyContribution, timeline)).toBe(5000);
        
        // Dentro do range (inclusivo)
        expect(getMonthlyContributionAtAge(32, clientDataMonthlyContribution, timeline)).toBe(2000);
        expect(getMonthlyContributionAtAge(33, clientDataMonthlyContribution, timeline)).toBe(2000);
        expect(getMonthlyContributionAtAge(34, clientDataMonthlyContribution, timeline)).toBe(2000);
        expect(getMonthlyContributionAtAge(35, clientDataMonthlyContribution, timeline)).toBe(2000);
        expect(getMonthlyContributionAtAge(36, clientDataMonthlyContribution, timeline)).toBe(2000);
        expect(getMonthlyContributionAtAge(37, clientDataMonthlyContribution, timeline)).toBe(2000);
        
        // Após o range (fallback)
        expect(getMonthlyContributionAtAge(38, clientDataMonthlyContribution, timeline)).toBe(5000);
        expect(getMonthlyContributionAtAge(39, clientDataMonthlyContribution, timeline)).toBe(5000);
      });

      it("toggle ON com arrays vazios não deve alterar crescimento", () => {
        const baseContrib = 5000;
        
        // Sem timeline
        expect(getMonthlyContributionAtAge(30, baseContrib, [])).toBe(baseContrib);
        expect(getMonthlyContributionAtAge(40, baseContrib, [])).toBe(baseContrib);
        expect(getMonthlyContributionAtAge(50, baseContrib, [])).toBe(baseContrib);
      });
    });
  });

  // ========================================
  // normalizeTimeline
  // ========================================
  describe("normalizeTimeline", () => {
    it("deve normalizar array de regras", () => {
      const raw = [
        { startAge: 30, endAge: 40, monthlyValue: 1000 },
        { startAge: 40, endAge: 50, value: 2000 },
      ];
      const normalized = normalizeTimeline(raw);
      
      expect(normalized.length).toBe(2);
      expect(normalized[0].monthlyValue).toBe(1000);
      expect(normalized[1].monthlyValue).toBe(2000);
    });

    it("deve filtrar regras com enabled=false", () => {
      const raw = [
        { startAge: 30, endAge: 40, monthlyValue: 1000, enabled: true },
        { startAge: 40, endAge: 50, monthlyValue: 2000, enabled: false },
      ];
      const normalized = normalizeTimeline(raw);
      
      expect(normalized.length).toBe(1);
      expect(normalized[0].monthlyValue).toBe(1000);
    });

    it("deve retornar array vazio para input null/undefined", () => {
      expect(normalizeTimeline(null)).toEqual([]);
      expect(normalizeTimeline(undefined)).toEqual([]);
    });

    it("deve retornar array vazio para input não-array", () => {
      expect(normalizeTimeline("string")).toEqual([]);
      expect(normalizeTimeline(123)).toEqual([]);
    });
  });
});
