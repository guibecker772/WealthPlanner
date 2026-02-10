// src/components/charts/projection/utils.js
// Utilitários compartilhados para ProjectionChart (extraídos de DashboardPage)

/**
 * Converte para inteiro, com fallback seguro.
 */
export function safeInt(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/**
 * Converte para número, com fallback seguro.
 */
export function safeNum(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Normaliza texto para comparação (lowercase, sem acentos).
 */
export function normalizeText(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Lê contribution timeline rules do clientData.
 * Retorna array ordenado por startAge com { id, startAge, endAge, monthlyValue, kindLabel }.
 */
export function readContributionRules(clientData) {
  const raw =
    (Array.isArray(clientData?.contributionTimeline) && clientData.contributionTimeline) ||
    (Array.isArray(clientData?.contributionRanges) && clientData.contributionRanges) ||
    [];

  const rules = raw
    .filter((r) => r && r.enabled !== false)
    .map((r, idx) => {
      const startAge = safeInt(r.startAge ?? r.fromAge ?? r.from ?? r.inicio ?? r.dos, NaN);
      const endAge = safeInt(r.endAge ?? r.toAge ?? r.to ?? r.fim ?? r.ate, NaN);

      const monthlyValue = safeNum(
        r.monthlyValue ?? r.value ?? r.amount ?? r.aporteMensal ?? r.valorMensal,
        NaN
      );

      const kindRaw = normalizeText(r.kind ?? r.type ?? r.mode ?? "");
      const isWithdrawal =
        r.isWithdrawal === true ||
        r.withdrawal === true ||
        kindRaw.includes("resgate") ||
        kindRaw.includes("withdraw") ||
        (Number.isFinite(monthlyValue) && monthlyValue < 0);

      const mv = Number.isFinite(monthlyValue) ? monthlyValue : 0;
      const monthly = isWithdrawal ? -Math.abs(mv) : mv;

      const kindLabel =
        kindRaw.includes("financ") ? "Financiamento" :
        kindRaw.includes("consorc") ? "Consórcio" :
        kindRaw.includes("aporte") ? "Aporte temporário" :
        kindRaw.includes("resgate") ? "Resgate" :
        "Período";

      if (!Number.isFinite(startAge) || !Number.isFinite(endAge)) return null;
      if (endAge < startAge) return null;

      return {
        id: r.id ?? `rule_${idx}_${startAge}_${endAge}`,
        startAge,
        endAge,
        monthlyValue: monthly,
        kindLabel,
      };
    })
    .filter(Boolean);

  rules.sort((a, b) => a.startAge - b.startAge);
  return rules;
}

/**
 * Constrói mapa de cash-in events por idade.
 * @returns {Record<string, number>}
 */
export function buildCashInMap(cashInEvents) {
  const map = {};
  const events = cashInEvents || [];

  events.forEach((event) => {
    if (event?.enabled === false) return;
    const ageStr = String(event.age);
    const value = Number(event.value) || 0;
    if (!ageStr || value <= 0) return;
    map[ageStr] = (map[ageStr] || 0) + value;
  });

  return map;
}
