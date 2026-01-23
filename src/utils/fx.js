// src/utils/fx.js
// Funções utilitárias para conversão de moedas (FX - Foreign Exchange)

/**
 * Moedas suportadas no sistema
 */
export const SUPPORTED_CURRENCIES = ["BRL", "USD", "EUR"];

/**
 * Câmbios padrão (fallback) caso o cenário não defina
 */
export const DEFAULT_FX_RATES = {
  USD_BRL: 5.0,
  EUR_BRL: 5.5,
};

/**
 * Retorna o fxRate efetivo para um ativo
 * IMPORTANTE: Usa apenas o câmbio do cenário (não há mais câmbio por ativo)
 * @param {object} asset - O ativo
 * @param {object} scenarioFx - { USD_BRL: number, EUR_BRL: number }
 * @returns {number} - Taxa de câmbio para BRL
 */
export function getEffectiveFxRate(asset, scenarioFx = {}) {
  const currency = asset?.currency || "BRL";

  if (currency === "BRL") return 1;

  // Buscar do cenário (único lugar de câmbio agora)
  const key = `${currency}_BRL`;
  const scenarioRate = scenarioFx?.[key];
  if (scenarioRate != null && Number.isFinite(scenarioRate) && scenarioRate > 0) {
    return scenarioRate;
  }

  // Fallback padrão
  return DEFAULT_FX_RATES[key] || 1;
}

/**
 * Converte valor do ativo para BRL
 * @param {object} asset - { currency, amountCurrency, fxRate, value }
 * @param {object} scenarioFx - { USD_BRL: number, EUR_BRL: number }
 * @returns {number} - Valor em BRL
 */
export function convertToBRL(asset, scenarioFx = {}) {
  const currency = asset?.currency || "BRL";

  // Valor na moeda do ativo
  const amountInCurrency =
    asset?.amountCurrency != null
      ? Number(asset.amountCurrency)
      : Number(asset?.value ?? asset?.amount ?? 0);

  if (!Number.isFinite(amountInCurrency)) return 0;

  if (currency === "BRL") return amountInCurrency;

  const fxRate = getEffectiveFxRate(asset, scenarioFx);
  return amountInCurrency * fxRate;
}

/**
 * Normaliza um ativo antigo (sem currency) para o novo formato
 * Compatibilidade retroativa
 * @param {object} asset - Ativo possivelmente antigo
 * @returns {object} - Ativo normalizado com currency/amountCurrency
 */
export function normalizeAssetCurrency(asset) {
  if (!asset) return asset;

  const currency = asset.currency || "BRL";
  const amountCurrency =
    asset.amountCurrency != null
      ? asset.amountCurrency
      : asset.value ?? asset.amount ?? 0;

  return {
    ...asset,
    currency,
    amountCurrency,
  };
}

/**
 * Calcula exposição cambial do patrimônio
 * FIX BUG 3: Filtrar apenas ativos investíveis (financial, previdencia)
 * @param {Array} assets - Lista de ativos
 * @param {object} scenarioFx - Câmbios do cenário
 * @returns {object} - { totalBRL, byCurrency: { BRL, USD, EUR }, percentages }
 */
export function calculateFxExposure(assets = [], scenarioFx = {}) {
  const byCurrency = { BRL: 0, USD: 0, EUR: 0 };

  // ✅ FIX BUG 3: Tipos investíveis apenas
  const INVESTABLE_TYPES = ['financial', 'previdencia'];

  for (const asset of assets) {
    // FIX BUG 3: Pular ativos ilíquidos (imóvel, veículo, empresa, outros bens)
    const type = asset?.type || 'financial';
    if (!INVESTABLE_TYPES.includes(type)) {
      continue; // Ignorar real_estate, vehicle, business, other
    }

    const currency = asset?.currency || "BRL";
    const amountBRL = convertToBRL(asset, scenarioFx);
    byCurrency[currency] = (byCurrency[currency] || 0) + amountBRL;
  }

  const totalBRL = byCurrency.BRL + byCurrency.USD + byCurrency.EUR;

  const percentages = {
    BRL: totalBRL > 0 ? (byCurrency.BRL / totalBRL) * 100 : 100,
    USD: totalBRL > 0 ? (byCurrency.USD / totalBRL) * 100 : 0,
    EUR: totalBRL > 0 ? (byCurrency.EUR / totalBRL) * 100 : 0,
  };

  const internationalBRL = byCurrency.USD + byCurrency.EUR;
  const internationalPct = totalBRL > 0 ? (internationalBRL / totalBRL) * 100 : 0;

  return {
    totalBRL,
    byCurrency,
    percentages,
    internationalBRL,
    internationalPct,
  };
}

/**
 * Aplica choque de câmbio (para stress test)
 * @param {object} scenarioFx - Câmbios originais
 * @param {object} shocks - { USD_BRL_pct: 0.2, EUR_BRL_pct: 0.2 }
 * @returns {object} - Novos câmbios com choque aplicado
 */
export function applyFxShock(scenarioFx = {}, shocks = {}) {
  const base = {
    USD_BRL: scenarioFx?.USD_BRL ?? DEFAULT_FX_RATES.USD_BRL,
    EUR_BRL: scenarioFx?.EUR_BRL ?? DEFAULT_FX_RATES.EUR_BRL,
  };

  return {
    USD_BRL: base.USD_BRL * (1 + (shocks?.USD_BRL_pct ?? 0)),
    EUR_BRL: base.EUR_BRL * (1 + (shocks?.EUR_BRL_pct ?? 0)),
  };
}

/**
 * Valida se ativo internacional tem fxRate definido
 * @param {object} asset
 * @param {object} scenarioFx
 * @returns {{ valid: boolean, warning?: string }}
 */
export function validateAssetFx(asset, scenarioFx = {}) {
  const currency = asset?.currency || "BRL";

  if (currency === "BRL") {
    return { valid: true };
  }

  const key = `${currency}_BRL`;
  const hasAssetFx = asset?.fxRate != null && Number.isFinite(asset.fxRate) && asset.fxRate > 0;
  const hasScenarioFx =
    scenarioFx?.[key] != null && Number.isFinite(scenarioFx[key]) && scenarioFx[key] > 0;

  if (!hasAssetFx && !hasScenarioFx) {
    return {
      valid: false,
      warning: `Ativo em ${currency} sem câmbio definido. Usando fallback padrão.`,
    };
  }

  return { valid: true };
}
