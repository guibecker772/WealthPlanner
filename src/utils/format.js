// src/utils/format.js

// -----------------------------
// Basic numeric helpers
// -----------------------------
export function toNumber(v, fallback = 0) {
  if (v == null) return fallback;

  // avoid "[object Object]" / accidental event objects
  if (typeof v === "object") return fallback;

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : fallback;
  }

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return fallback;

    const cleaned = s
      .replace(/\s/g, "")
      .replace(/R\$/gi, "")
      .replace(/[^\d,.-]/g, "");

    const normalized = cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned;

    const n = Number(normalized);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
}

export function safeNumber(v, fallback = 0) {
  return toNumber(v, fallback);
}

export function clamp(n, min, max) {
  const x = toNumber(n, min);
  return Math.max(min, Math.min(max, x));
}

// -----------------------------
// Currency (multi-moeda)
// -----------------------------

/**
 * Formata valor na moeda especificada (BRL, USD, EUR)
 * @param {number} value - Valor numérico
 * @param {string} currency - 'BRL' | 'USD' | 'EUR'
 * @param {object} opts - Opções de formatação
 * @returns {string} - Valor formatado (ex: "R$ 1.234,56", "US$ 1,234.56", "€ 1.234,56")
 */
export function formatCurrencyWithCode(value, currency = "BRL", opts = {}) {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallback = null,
  } = opts;

  const n = toNumber(value, NaN);
  
  // Fallback dinâmico baseado na moeda
  const defaultFallback = {
    BRL: "R$ 0,00",
    USD: "US$ 0.00",
    EUR: "€ 0,00",
  }[currency] || "R$ 0,00";

  if (!Number.isFinite(n)) return fallback ?? defaultFallback;

  // Locale por moeda
  const localeMap = {
    BRL: "pt-BR",
    USD: "en-US",
    EUR: "de-DE", // alemão usa . para milhares e , para decimal
  };

  const locale = localeMap[currency] || "pt-BR";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(n);
  } catch {
    const prefix = { BRL: "R$", USD: "US$", EUR: "€" }[currency] || "R$";
    return `${prefix} ${n.toFixed(maximumFractionDigits)}`;
  }
}

/**
 * Formata valor em BRL (função original para compatibilidade)
 */
export function formatCurrencyBR(value, opts = {}) {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallback = "R$ 0,00",
  } = opts;

  const n = toNumber(value, NaN);
  if (!Number.isFinite(n)) return fallback;

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(n);
  } catch {
    return `R$ ${formatNumberBR(n, { minimumFractionDigits, maximumFractionDigits })}`;
  }
}

/**
 * ✅ Alias LEGADO (corrige erro do successionStrategies.js)
 * Alguns arquivos antigos importam `formatCurrency`.
 */
export const formatCurrency = formatCurrencyBR;

/**
 * Retorna símbolo da moeda
 * @param {string} currency - 'BRL' | 'USD' | 'EUR'
 * @returns {string} - Símbolo (R$, US$, €)
 */
export function getCurrencySymbol(currency = "BRL") {
  const symbols = { BRL: "R$", USD: "US$", EUR: "€" };
  return symbols[currency] || "R$";
}

export function parseCurrencyBR(input, fallback = 0) {
  return toNumber(input, fallback);
}

// -----------------------------
// Percent
// -----------------------------
export function formatPercent(value, opts = {}) {
  const {
    decimals = 2,
    // default assume value already in percent (66.67)
    inputIsRatio = false,
    fallback = "0,00%",
  } = opts;

  const n = toNumber(value, NaN);
  if (!Number.isFinite(n)) return fallback;

  const pct = inputIsRatio ? n * 100 : n;

  try {
    return `${pct.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}%`;
  } catch {
    return `${pct.toFixed(decimals).replace(".", ",")}%`;
  }
}

// -----------------------------
// Plain numbers (pt-BR)
// -----------------------------
export function formatNumberBR(value, opts = {}) {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    fallback = "0",
  } = opts;

  const n = toNumber(value, NaN);
  if (!Number.isFinite(n)) return fallback;

  try {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(n);
  } catch {
    const fixed = n.toFixed(maximumFractionDigits);
    return fixed.replace(".", ",");
  }
}

// -----------------------------
// UUID
// -----------------------------
export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

// -----------------------------
// Helpers para inputs monetários pt-BR
// -----------------------------

/**
 * Parse robusto de valor monetário pt-BR para number
 * Aceita: "2000", "2.000", "2.000,50", "R$ 2.000,50", "2000.50"
 * @param {string} str - String de entrada
 * @param {number} fallback - Valor padrão se inválido
 * @returns {number} - Valor numérico ou fallback
 */
export function parsePtBrMoney(str, fallback = 0) {
  if (str === null || str === undefined || str === '') return fallback;
  
  // Remover R$, espaços, símbolos de moeda
  let cleaned = String(str)
    .replace(/R\$/gi, '')
    .replace(/US\$/gi, '')
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .trim();
  
  if (!cleaned) return fallback;
  
  // Detectar formato:
  // - "1.234,56" (pt-BR) → remover pontos, trocar vírgula por ponto
  // - "1,234.56" (en-US) → remover vírgulas, manter ponto
  // - "1234" (sem separadores) → direto
  
  // Se tem vírgula como último separador → pt-BR
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // pt-BR: 1.234,56 → pontos são milhares, vírgula é decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && lastComma !== -1) {
    // en-US: 1,234.56 → vírgulas são milhares, ponto é decimal
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastDot === -1 && lastComma !== -1) {
    // Só vírgula, ex: "1234,50"
    cleaned = cleaned.replace(',', '.');
  }
  // Senão mantém como está (só ponto ou sem separadores)
  
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Formata número como moeda BRL visual (R$ 2.000,00)
 * Usa Intl.NumberFormat para formatação consistente
 * @param {number} value - Valor numérico
 * @returns {string} - String formatada (ex: "R$ 2.000,00")
 */
export function formatMoneyBRL(value) {
  const n = toNumber(value, 0);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `R$ ${n.toFixed(2).replace('.', ',')}`;
  }
}

// ========================================
// Helpers para cálculos YTD vs Projetado
// ========================================

/**
 * Converte taxa anual para taxa mensal equivalente (juros compostos)
 * @param {number} annualRate - Taxa anual em decimal (ex: 0.10 para 10%)
 * @returns {number} - Taxa mensal equivalente em decimal
 */
export function annualToMonthlyRate(annualRate) {
  const r = toNumber(annualRate, 0);
  if (!Number.isFinite(r) || r <= -1) return 0;
  return Math.pow(1 + r, 1 / 12) - 1;
}

/**
 * Calcula taxa acumulada para N meses (juros compostos)
 * @param {number} monthlyRate - Taxa mensal em decimal
 * @param {number} months - Número de meses
 * @returns {number} - Taxa acumulada em decimal
 */
export function compoundMonthlyRate(monthlyRate, months) {
  const r = toNumber(monthlyRate, 0);
  const n = toNumber(months, 0);
  if (!Number.isFinite(r) || !Number.isFinite(n) || n <= 0) return 0;
  return Math.pow(1 + r, n) - 1;
}

/**
 * Formata percentual no padrão pt-BR com vírgula decimal
 * @param {number} value - Valor percentual (ex: 7.5 para 7,50%)
 * @param {object} opts - Opções: { decimals: 2, showSign: false }
 * @returns {string} - String formatada (ex: "7,50%" ou "+7,50%")
 */
export function formatPercentPtBr(value, opts = {}) {
  const { decimals = 2, showSign = false } = opts;
  const n = toNumber(value, 0);
  if (!Number.isFinite(n)) return '—';
  
  const sign = showSign && n > 0 ? '+' : '';
  const formatted = n.toFixed(decimals).replace('.', ',');
  return `${sign}${formatted}%`;
}

/**
 * Formata delta em pontos percentuais (pp)
 * @param {number} value - Valor em pontos percentuais
 * @param {object} opts - Opções: { decimals: 2 }
 * @returns {string} - String formatada (ex: "+0,90pp" ou "-0,50pp")
 */
export function formatDeltaPp(value, opts = {}) {
  const { decimals = 2 } = opts;
  const n = toNumber(value, 0);
  if (!Number.isFinite(n)) return '—';
  
  const sign = n >= 0 ? '+' : '';
  const formatted = n.toFixed(decimals).replace('.', ',');
  return `${sign}${formatted}pp`;
}

/**
 * Obtém a taxa de retorno esperada baseada no perfil do cliente
 * @param {object} clientData - Dados do cliente
 * @returns {number} - Taxa de retorno anual em decimal (ex: 0.10 para 10%)
 */
export function getExpectedReturnByProfile(clientData) {
  if (!clientData) return 0.10; // default 10%
  
  const profile = (clientData.profile || 'Moderado').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Taxas em decimal (store tem em %)
  const conservative = toNumber(clientData.returnRateConservative, 8) / 100;
  const moderate = toNumber(clientData.returnRateModerate, 10) / 100;
  const bold = toNumber(clientData.returnRateBold, 12) / 100;
  
  if (profile.includes('conservador')) return conservative;
  if (profile.includes('arrojado') || profile.includes('agressivo')) return bold;
  return moderate; // default: moderado
}

/**
 * Calcula retorno real a partir do retorno nominal e inflação
 * @param {number} nominalReturn - Retorno nominal em decimal
 * @param {number} inflation - Inflação em decimal
 * @returns {number} - Retorno real em decimal
 */
export function nominalToRealReturn(nominalReturn, inflation) {
  const nom = toNumber(nominalReturn, 0);
  const inf = toNumber(inflation, 0);
  if (inf <= -1) return nom;
  return (1 + nom) / (1 + inf) - 1;
}

