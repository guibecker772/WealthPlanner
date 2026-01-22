// src/constants/config.js

export const APP_VERSION = "7.0.0 (FX + Previdência + PGBL Efficiency)";

export const CONFIG = {
  // ---------- Sucessão ----------
  SUCCESSION_SAVINGS_PCT: 0.2,

  // Percentuais padrão (se não vierem do clientData.successionCosts)
  SUCCESSION_LEGAL_PCT: 0.05,       // Honorários padrão (5%)
  SUCCESSION_FEES_PCT: 0.02,        // Custas padrão (2%)  ✅ (substitui valor fixo)
  SUCCESSION_FEES_FIXED: 0,         // Mantém compatibilidade, mas zerado

  // Link opcional para entrar no evento do calendário (Meet/Teams/Zoom)
  // Se deixar vazio, o evento fica como "Online" sem link.
  MEETING_LINK: "https://meet.google.com/xxx-xxxx-xxx",

  // Se quiser, você pode customizar o título/observação do evento
  MEETING_TITLE_PREFIX: "Reunião | Planejamento Patrimonial",
  MEETING_DEFAULT_DURATION_MIN: 30,

  // ---------- Planejamento / Aposentadoria ----------
  SAFE_WITHDRAWAL_RATE: 0.04,
  MIN_LIQUIDITY_RATIO: 0.1,

  // ---------- Stress Test ----------
  // OBS: No FinancialEngine normalizeRate() interpreta >1 como "percentual"
  // então 1.5 => 0.015 (1,5%), 2.0 => 0.02 (2%)
  STRESS_INFLATION_ADD: 1.5,
  STRESS_RETURN_SUB: 2.0,

  // Choque de câmbio no stress test (em fração: 0.2 = +20%)
  STRESS_FX_SHOCK: {
    USD_BRL_pct: 0.2, // +20% no USD/BRL
    EUR_BRL_pct: 0.2, // +20% no EUR/BRL
  },

  // ---------- Câmbio Padrão ----------
  DEFAULT_FX_RATES: {
    USD_BRL: 5.0,
    EUR_BRL: 5.5,
  },

  // ---------- ITCMD (fallback) ----------
  // Se você quiser garantir que o motor pegue daqui antes do fallback interno
  ITCMD_RATES: {
    SP: 0.04,
    RJ: 0.08,
    MG: 0.05,
    RS: 0.06,
    SC: 0.08,
    PR: 0.04,
    BA: 0.08,
    PE: 0.08,
    CE: 0.08,
    GO: 0.08,
    DF: 0.06,
  },

  // ---------- Premissas econômicas (fallbacks) ----------
  DEFAULT_RETURN_NOMINAL: 0.1,
  DEFAULT_INFLATION: 0.04,
};
