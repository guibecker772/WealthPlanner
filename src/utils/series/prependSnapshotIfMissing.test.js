// src/utils/series/prependSnapshotIfMissing.test.js
import { describe, it, expect } from "vitest";
import { prependSnapshotIfMissing } from "./prependSnapshotIfMissing";

describe("prependSnapshotIfMissing", () => {
  describe("casos básicos", () => {
    it("deve retornar array vazio se series não for array", () => {
      expect(prependSnapshotIfMissing(null, 30, 100000)).toEqual([]);
      expect(prependSnapshotIfMissing(undefined, 30, 100000)).toEqual([]);
      expect(prependSnapshotIfMissing("string", 30, 100000)).toEqual([]);
    });

    it("deve retornar série inalterada se currentAgeInt não for finito", () => {
      const series = [{ age: 31, wealth: 110000, financial: 110000 }];
      expect(prependSnapshotIfMissing(series, NaN, 100000)).toEqual(series);
      expect(prependSnapshotIfMissing(series, Infinity, 100000)).toEqual(series);
    });

    it("deve retornar série inalterada se initialWealthBRL não for finito", () => {
      const series = [{ age: 31, wealth: 110000, financial: 110000 }];
      expect(prependSnapshotIfMissing(series, 30, NaN)).toEqual(series);
      expect(prependSnapshotIfMissing(series, 30, undefined)).toEqual(series);
    });
  });

  describe("anti-duplicação", () => {
    it("NÃO deve inserir snapshot se série já contém ponto com currentAgeInt", () => {
      const series = [
        { age: 30, wealth: 100000, financial: 100000 },
        { age: 31, wealth: 110000, financial: 110000 },
      ];
      
      const result = prependSnapshotIfMissing(series, 30, 100000);
      
      // Deve retornar série inalterada (sem duplicar)
      expect(result).toEqual(series);
      expect(result.length).toBe(2);
    });

    it("NÃO deve duplicar mesmo com age como string", () => {
      const series = [
        { age: "30", wealth: 100000, financial: 100000 },
        { age: 31, wealth: 110000, financial: 110000 },
      ];
      
      const result = prependSnapshotIfMissing(series, 30, 100000);
      
      expect(result.length).toBe(2);
    });

    it("NÃO deve duplicar com idade decimal que arredonda para mesmo inteiro", () => {
      const series = [
        { age: 30, wealth: 100000, financial: 100000 },
        { age: 31, wealth: 110000, financial: 110000 },
      ];
      
      // currentAge = 30.7 deve ser tratado como 30 (Math.floor)
      const result = prependSnapshotIfMissing(series, 30.7, 100000);
      
      expect(result.length).toBe(2);
    });
  });

  describe("inserção de snapshot", () => {
    it("deve inserir snapshot no início se série começar com idade > currentAgeInt", () => {
      const series = [
        { age: 31, wealth: 110000, financial: 110000 },
        { age: 32, wealth: 120000, financial: 120000 },
      ];
      
      const result = prependSnapshotIfMissing(series, 30, 100000);
      
      expect(result.length).toBe(3);
      expect(result[0]).toEqual({
        age: 30,
        wealth: 100000,
        financial: 100000,
      });
    });

    it("deve inserir snapshot em série vazia", () => {
      const result = prependSnapshotIfMissing([], 30, 100000);
      
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        age: 30,
        wealth: 100000,
        financial: 100000,
      });
    });

    it("snapshot deve conter apenas age, wealth e financial (sem totalWealth)", () => {
      const series = [{ age: 31, wealth: 110000, financial: 110000, totalWealth: 150000 }];
      
      const result = prependSnapshotIfMissing(series, 30, 100000);
      
      expect(result[0]).not.toHaveProperty("totalWealth");
      expect(result[0]).toEqual({
        age: 30,
        wealth: 100000,
        financial: 100000,
      });
    });
  });

  describe("normalização de idade", () => {
    it("deve normalizar currentAgeInt para inteiro (Math.floor)", () => {
      const series = [{ age: 32, wealth: 120000, financial: 120000 }];
      
      // 30.9 deve virar 30
      const result = prependSnapshotIfMissing(series, 30.9, 100000);
      
      expect(result[0].age).toBe(30);
    });
  });
});
