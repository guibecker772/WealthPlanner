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
// Currency (BRL)
// -----------------------------
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
