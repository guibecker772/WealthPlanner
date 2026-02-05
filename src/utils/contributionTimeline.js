// src/utils/contributionTimeline.js
// Utilitário compartilhado para normalização e avaliação de contribution timeline
// Semântica byte-for-byte equivalente ao FinancialEngine.js

import { toNumber } from "./format";

/**
 * Normaliza texto para comparação (lowercase, sem acentos)
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
 * Normaliza uma regra de contributionTimeline para formato canônico.
 * Aceita múltiplos aliases de campos para compatibilidade.
 * 
 * Semântica:
 * - monthlyValue: valor mensal do aporte/resgate (principal)
 * - aliases aceitos: value, amount, monthlyContribution, aporteMensal, valorMensal, valor
 * - startAge: idade de início (inclusivo)
 * - endAge: idade de fim (inclusivo), default 120 se não especificado
 * - enabled: true por default
 * - Valores negativos são resgates (isWithdrawal força negativo)
 * 
 * @param {object} rule - Regra de timeline bruta
 * @returns {object|null} - Regra normalizada ou null se inválida
 */
export function normalizeTimelineRule(rule) {
  if (rule == null) return null;

  const startAge = toNumber(
    rule.startAge ?? rule.fromAge ?? rule.from ?? rule.dos ?? rule.ageStart ?? rule.inicio ?? rule.idadeInicio ?? 0,
    0
  );

  const endAgeRaw = rule.endAge ?? rule.toAge ?? rule.to ?? rule.ate ?? rule.ageEnd ?? rule.fim ?? rule.idadeFim ?? null;
  const endAge = endAgeRaw == null ? 120 : toNumber(endAgeRaw, 120);

  // Normalização de monthlyValue com aliases (ordem de prioridade)
  let monthlyValue = toNumber(
    rule.monthlyValue ??
      rule.value ??
      rule.amount ??
      rule.monthlyContribution ??
      rule.aporteMensal ??
      rule.valorMensal ??
      rule.valor ??
      0,
    0
  );

  // Detecta resgate pelo kind/type ou flag explícita
  const kind = normalizeText(rule.kind ?? rule.type ?? rule.mode ?? "");
  const isWithdrawalFlag =
    rule.isWithdrawal === true ||
    rule.withdrawal === true ||
    kind.includes("resgate") ||
    kind.includes("withdraw");

  // Força negativo se for resgate
  if (isWithdrawalFlag) {
    monthlyValue = -Math.abs(monthlyValue);
  }

  return {
    id: rule.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    enabled: rule.enabled !== false,
    startAge,
    endAge,
    monthlyValue,
    kind: rule.kind ?? rule.type ?? rule.mode ?? "",
  };
}

/**
 * Determina o aporte mensal efetivo para uma idade, considerando timeline.
 * 
 * Semântica (idêntica ao FinancialEngine):
 * - Filtra regras com enabled !== false
 * - Regra ativa se: age >= startAge && age <= endAge (INCLUSIVO)
 * - Se múltiplas ativas: vence a de MAIOR startAge (mais específica/recente)
 * - Sem regra ativa: retorna baseContribution (fallback)
 * - Retorna monthlyValue da regra vencedora (pode ser negativo = resgate)
 * 
 * @param {number} age - Idade a avaliar
 * @param {number} baseContribution - Aporte base (fallback se sem regra)
 * @param {Array} timeline - Array de regras normalizadas
 * @returns {number} - Aporte mensal efetivo
 */
export function getMonthlyContributionAtAge(age, baseContribution, timeline = []) {
  const rules = Array.isArray(timeline) ? timeline : [];
  
  // Filtra regras ativas para a idade (range INCLUSIVO)
  const activeRules = rules.filter((r) => {
    if (!r || r.enabled === false) return false;
    const start = toNumber(r.startAge, 0);
    const end = r.endAge == null ? 120 : toNumber(r.endAge, 120);
    // ✅ INCLUSIVO: age >= start && age <= end
    return age >= start && age <= end;
  });

  // Sem regras ativas → fallback
  if (activeRules.length === 0) {
    return baseContribution;
  }

  // ✅ Múltiplas ativas: vence maior startAge (mais específica)
  activeRules.sort((a, b) => toNumber(b.startAge, 0) - toNumber(a.startAge, 0));
  
  // Retorna monthlyValue da regra vencedora, com fallback para baseContribution
  return toNumber(activeRules[0]?.monthlyValue, baseContribution);
}

/**
 * Normaliza um array de regras de timeline.
 * 
 * @param {Array} rawTimeline - Array de regras brutas
 * @returns {Array} - Array de regras normalizadas (apenas enabled)
 */
export function normalizeTimeline(rawTimeline = []) {
  if (!Array.isArray(rawTimeline)) return [];
  
  return rawTimeline
    .map(normalizeTimelineRule)
    .filter((r) => r && r.enabled !== false);
}

export default {
  normalizeTimelineRule,
  getMonthlyContributionAtAge,
  normalizeTimeline,
};
