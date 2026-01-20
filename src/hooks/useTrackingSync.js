// src/hooks/useTrackingSync.js
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_TRACKING_PREFIX = "planner_tracking_v1"; // chave base

function storageKey(simulationId) {
  return `${STORAGE_TRACKING_PREFIX}:${simulationId || "default"}`;
}

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeMonthKey(input) {
  // aceita "2026-1", "2026-01", Date, etc -> "YYYY-MM"
  if (!input) return "";
  if (input instanceof Date) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  const s = String(input).trim();
  const match = s.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    const y = match[1];
    const m = String(match[2]).padStart(2, "0");
    return `${y}-${m}`;
  }
  // já vem "YYYY-MM" ou lixo
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return "";
}

function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  // aceita: 0.015 (1,5%) ou 1.5 (1,5%)? Vamos normalizar:
  // regra: se > 1, assume que veio em "percent" (1.5 = 1,5%), converte para decimal.
  if (Math.abs(n) > 1) return n / 100;
  return n;
}

function sum(arr) {
  return arr.reduce((acc, x) => acc + (Number(x) || 0), 0);
}

function compoundReturn(returnsArrayDecimal) {
  // retorna decimal anual: (1+r1)(1+r2)... - 1
  return returnsArrayDecimal.reduce((acc, r) => acc * (1 + (Number(r) || 0)), 1) - 1;
}

export default function useTrackingSync(simulationId) {
  const key = useMemo(() => storageKey(simulationId), [simulationId]);

  const [tracking, setTracking] = useState(() => {
    const raw = localStorage.getItem(key);
    const list = safeParse(raw, []);
    return Array.isArray(list) ? list : [];
  });

  // mantém em sync caso trocar de simulação
  useEffect(() => {
    const raw = localStorage.getItem(key);
    const list = safeParse(raw, []);
    setTracking(Array.isArray(list) ? list : []);
  }, [key]);

  const persist = useCallback(
    (next) => {
      const sorted = [...next].sort((a, b) => String(a.month).localeCompare(String(b.month)));
      setTracking(sorted);
      localStorage.setItem(key, JSON.stringify(sorted));
    },
    [key]
  );

  const upsertMonth = useCallback(
    ({ month, returnPct, contribution, inflationPct, notes }) => {
      const m = normalizeMonthKey(month);
      if (!m) throw new Error("Mês inválido. Use formato YYYY-MM.");

      const item = {
        month: m,
        returnPct: clampPct(returnPct),
        contribution: Number(contribution) || 0,
        inflationPct: clampPct(inflationPct),
        notes: String(notes || "").slice(0, 500),
        updatedAt: Date.now(),
      };

      const exists = tracking.some((x) => x.month === m);
      const next = exists
        ? tracking.map((x) => (x.month === m ? { ...x, ...item } : x))
        : [...tracking, item];

      persist(next);
    },
    [tracking, persist]
  );

  const removeMonth = useCallback(
    (month) => {
      const m = normalizeMonthKey(month);
      if (!m) return;
      persist(tracking.filter((x) => x.month !== m));
    },
    [tracking, persist]
  );

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const yearsAvailable = useMemo(() => {
    const years = new Set(tracking.map((x) => String(x.month).slice(0, 4)));
    return Array.from(years).sort();
  }, [tracking]);

  const getYearSummary = useCallback(
    (year) => {
      const y = String(year);
      const rows = tracking.filter((x) => String(x.month).startsWith(`${y}-`));
      const returns = rows.map((r) => Number(r.returnPct) || 0);
      const infl = rows.map((r) => Number(r.inflationPct) || 0);

      return {
        year: y,
        monthsCount: rows.length,
        totalContribution: sum(rows.map((r) => r.contribution)),
        returnYear: compoundReturn(returns), // decimal
        inflationYear: compoundReturn(infl), // decimal
      };
    },
    [tracking]
  );

  const byYear = useMemo(() => {
    const map = {};
    for (const y of yearsAvailable) {
      map[y] = getYearSummary(y);
    }
    return map;
  }, [yearsAvailable, getYearSummary]);

  return {
    tracking, // lista completa (ordenada)
    upsertMonth,
    removeMonth,
    clearAll,
    yearsAvailable,
    getYearSummary,
    byYear,
  };
}
