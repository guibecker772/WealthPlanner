// src/components/charts/ProjectionChart.jsx
// Componente unificado de gráfico de projeção patrimonial.
// PR 1 — Extração com paridade visual (zero mudança funcional).
// PR 2 — Range/Zoom: Brush + chips (Tudo/5a/10a/20a) + Custom/Reset.
//        Estratégia: data={chartDataFull} no ComposedChart; Brush controla
//        índices globais; XAxis domain filtra o range visível.
//        Zero mudança no motor — apenas recorte visual.
// PR 3 — Interactive Legend (toggle + hover focus + counter),
//        Executive Tooltip (BRL pt-BR + tracking Δ),
//        Events toggle (essenciais sempre visíveis; não-essenciais default OFF).
// PR 4 — Tracking-only enhancements: gap shading (área entre curvas),
//        mini-resumo executivo (maior ganho/piora + depletion status),
//        depletion marker derivado, Y-axis compact formatter.
//        Tudo gated por canCompare (mode=tracking + ambas séries visíveis).
// PR 5 — Controlled/uncontrolled: single source of truth para visibilidade
//        (olho ↔ legenda ↔ gráfico via props opcionais).
//        Eventos claros: bands (ReferenceArea inclusivo) + points (baseline y=0).
//        Tooltip com seção Eventos quando ON.
// Usa CSS vars tokenizados via useChartColors em vez de hex hardcoded.

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
  Brush,
  Label,
  Customized,
} from "recharts";

import { formatCurrencyBR } from "../../utils/format";
import { prependSnapshotIfMissing } from "../../utils/series/prependSnapshotIfMissing";
import { useChartColors } from "./projection/useChartColors";
import { readContributionRules, buildCashInMap } from "./projection/utils";

// ─────────────────────────────────────────────────
// Range helpers (PR2) — pure functions, no side effects
// ─────────────────────────────────────────────────

const MIN_WINDOW = 2; // endIndex - startIndex >= 2 → mínimo 3 pontos

/** Clamp um par de índices para [0..len-1] e garantir min window. */
function clampIdxRange(start, end, len) {
  if (len <= 0) return { startIndex: 0, endIndex: 0 };
  const max = len - 1;

  // Normalizar: swap se invertidos
  let s = Math.max(0, Math.min(start, max));
  let e = Math.max(0, Math.min(end, max));
  if (s > e) [s, e] = [e, s];

  // Garantir min window
  if (e - s < MIN_WINDOW) {
    e = Math.min(s + MIN_WINDOW, max);
    if (e - s < MIN_WINDOW) {
      s = Math.max(e - MIN_WINDOW, 0);
    }
  }

  return { startIndex: s, endIndex: e };
}

/** Primeiro índice onde data[i].age >= targetAge (fallback 0). */
function findStartIndexByAge(data, targetAge) {
  for (let i = 0; i < data.length; i++) {
    if (data[i].age >= targetAge) return i;
  }
  return 0;
}

/** Último índice onde data[i].age <= targetAge (fallback len-1). */
function findEndIndexByAge(data, targetAge) {
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].age <= targetAge) return i;
  }
  return data.length - 1;
}

/** Preset definitions */
const PRESET_CHIPS = [
  { key: "all", label: "Tudo", years: null },
  { key: "5y",  label: "5a",   years: 5 },
  { key: "10y", label: "10a",  years: 10 },
  { key: "20y", label: "20a",  years: 20 },
];

// ─────────────────────────────────────────────────
// PR3 — Series metadata, labels & order
// ─────────────────────────────────────────────────

/** Fixed rendering order for known series IDs */
const KNOWN_ORDER = ["wealthOriginal", "wealthAdjusted", "wealthPreservation", "wealthConsumption"];

const SERIES_CONFIG = {
  wealthOriginal:     { label: "Plano original",         colorClass: "bg-chart-1", order: 1, colorKey: "accent" },
  wealthAdjusted:     { label: "Plano atualizado",       colorClass: "bg-chart-2", order: 2, colorKey: "adjusted" },
  wealthConsumption:  { label: "Consumo do Patrimônio",  colorClass: "bg-chart-4", order: 3, colorKey: "warning" },
  wealthPreservation: { label: "Preservação",            colorClass: "bg-chart-3", order: 4, colorKey: "success" },
};

/** Series IDs that default to ON in both modes */
const DEFAULT_ON = new Set(["wealthOriginal", "wealthAdjusted"]);

// ─────────────────────────────────────────────────
// PR4 — Tracking comparison helpers (pure)
// ─────────────────────────────────────────────────
const ORIG_ID = "wealthOriginal";
const UPD_ID = "wealthAdjusted";

/** First age where series[key] <= 0 in rows (no interpolation). */
function findDepletionAge(rows, key) {
  for (const row of rows) {
    const v = row?.[key];
    if (typeof v === "number" && v <= 0) return row.age;
  }
  return null;
}

/** Compact Y-axis formatter: 1.234.567 → "1,2M", 850.000 → "850k", etc. */
function formatCompactY(val) {
  if (val == null || !Number.isFinite(val)) return "";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}${m.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${sign}${k.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  }
  return `${sign}${abs.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

// ─────────────────────────────────────────────────
// PR4 — GapShadingShape: custom SVG path between two series
// Uses Recharts Customized to access xAxisMap/yAxisMap scales.
// ─────────────────────────────────────────────────
function GapShadingShape({ xAxisMap, yAxisMap, formattedGraphicalItems, fillColor }) {
  if (!xAxisMap || !yAxisMap) return null;

  const xAxis = Object.values(xAxisMap)[0];
  const yAxis = Object.values(yAxisMap)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;

  // Find items for our two series by dataKey
  const items = formattedGraphicalItems || [];
  const origItem = items.find((it) => it?.item?.props?.dataKey === ORIG_ID);
  const updItem = items.find((it) => it?.item?.props?.dataKey === UPD_ID);
  if (!origItem || !updItem) return null;

  const origPoints = origItem.props?.points || [];
  const updPoints = updItem.props?.points || [];
  if (origPoints.length === 0 || updPoints.length === 0) return null;

  // Build path: forward along upper, backward along lower
  const segments = [];
  const len = Math.min(origPoints.length, updPoints.length);

  for (let i = 0; i < len; i++) {
    const oY = origPoints[i]?.y;
    const uY = updPoints[i]?.y;
    const x = origPoints[i]?.x;
    if (x == null || oY == null || uY == null) continue;
    segments.push({ x, oY, uY });
  }

  if (segments.length < 2) return null;

  // Build closed polygon: upper line forward, lower line backward
  let d = `M ${segments[0].x},${Math.min(segments[0].oY, segments[0].uY)}`;
  for (let i = 1; i < segments.length; i++) {
    d += ` L ${segments[i].x},${Math.min(segments[i].oY, segments[i].uY)}`;
  }
  for (let i = segments.length - 1; i >= 0; i--) {
    d += ` L ${segments[i].x},${Math.max(segments[i].oY, segments[i].uY)}`;
  }
  d += " Z";

  return <path d={d} fill={fillColor} />;
}

// ─────────────────────────────────────────────────
// ExecutiveTooltip — PR3 premium tooltip + PR5 Events section
//   Receives extra props via Recharts element cloning:
//   visibleSeriesIds, orderedSeries, isTracking, showEvents, eventBands, eventPoints
// ─────────────────────────────────────────────────
function ExecutiveTooltip({ active, payload, label, visibleSeriesIds, orderedSeries, isTracking, showEvents, eventBands, eventPoints }) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0]?.payload;
  const year = point?.meta?.year || point?.year;

  // Build entries only for visible series, in legend order, skipping null/gaps
  const entries = (orderedSeries || [])
    .filter((s) => visibleSeriesIds?.has(s.id))
    .map((s) => {
      const entry = payload.find((p) => p.dataKey === s.id);
      const value = entry?.value ?? point?.[s.id];
      return { ...s, value };
    })
    .filter((e) => e.value != null && Number.isFinite(e.value));

  const cashInEntry = payload.find((p) => p.dataKey === "chartCashIn");
  const cashInValue = cashInEntry?.value;

  // Tracking Δ: only when both main series visible + finite at this point
  let delta = null;
  if (isTracking && visibleSeriesIds?.has("wealthOriginal") && visibleSeriesIds?.has("wealthAdjusted")) {
    const orig = point?.wealthOriginal;
    const adj = point?.wealthAdjusted;
    if (orig != null && Number.isFinite(orig) && adj != null && Number.isFinite(adj)) {
      delta = adj - orig;
    }
  }

  // PR5: Events at this age (only when showEvents ON)
  const bandsAtAge = showEvents && eventBands
    ? eventBands.filter((b) => label >= b.startAge && label <= b.endAge)
    : [];
  const pointsAtAge = showEvents && eventPoints
    ? eventPoints.filter((p) => p.age === label)
    : [];

  return (
    <div className="bg-surface-2 border border-border p-4 rounded-xl shadow-elevated backdrop-blur-md relative z-50 min-w-[250px]">
      <p className="text-text-muted text-sm mb-3 font-medium">
        Idade {label}{year ? ` (Ano ${year})` : ""}
      </p>

      <div className="space-y-2">
        {entries.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-[3px] rounded-full ${s.colorClass || ""}`}
                style={!s.colorClass && s.color ? { backgroundColor: s.color } : undefined}
              />
              <span className="text-xs text-text-muted font-medium">{s.label}</span>
            </div>
            <span className="text-sm font-display font-bold text-text tabular-nums">
              {formatCurrencyBR(s.value)}
            </span>
          </div>
        ))}
      </div>

      {cashInValue != null && cashInValue > 0 && (
        <div className="mt-3 pt-3 border-t border-divider">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-success font-medium">Aporte extraordinário</span>
            <span className="text-sm font-display font-bold text-success tabular-nums">
              + {formatCurrencyBR(cashInValue)}
            </span>
          </div>
        </div>
      )}

      {delta != null && (
        <div className="mt-3 pt-3 border-t border-divider">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-text-muted font-medium">Δ (Atual − Original)</span>
            <span
              className={`text-sm font-display font-bold tabular-nums ${
                delta >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {delta >= 0 ? "+ " : ""}
              {formatCurrencyBR(delta)}
            </span>
          </div>
        </div>
      )}

      {/* PR5: Events section (only when toggle ON) */}
      {showEvents && (bandsAtAge.length > 0 || pointsAtAge.length > 0) && (
        <div className="mt-3 pt-3 border-t border-divider">
          <p className="text-[11px] text-text-muted font-bold uppercase tracking-wide mb-1.5">Eventos</p>
          <div className="space-y-1">
            {bandsAtAge.map((b, i) => (
              <div key={`tb_${i}`} className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-secondary">
                  {b.kindLabel || (b.type === "contribution" ? "Aporte" : "Resgate")}
                </span>
                <span className={`text-xs font-bold tabular-nums ${b.type === "contribution" ? "text-success" : "text-danger"}`}>
                  {b.monthlyValue >= 0 ? "+" : ""}{formatCurrencyBR(b.monthlyValue)}/mês
                </span>
              </div>
            ))}
            {pointsAtAge.map((p, i) => (
              <div key={`tp_${i}`} className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-secondary">
                  {p.type === "cashIn" ? "Cash-in" : p.name || "Meta/Saque"}
                </span>
                <span className={`text-xs font-bold tabular-nums ${p.type === "cashIn" ? "text-success" : "text-warning"}`}>
                  {p.type === "cashIn" ? "+" : "−"} {formatCurrencyBR(Math.abs(p.value))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// InteractiveLegend — PR3 toggle + hover focus + counter
// ─────────────────────────────────────────────────
function InteractiveLegend({
  orderedSeries,
  visibleSeriesIds,
  hoverSeriesId,
  onToggle,
  onHoverStart,
  onHoverEnd,
  showEvents,
  timelineRules = [],
}) {
  return (
    <div className="mt-4 space-y-3">
      {/* Series toggles */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs font-semibold">
        {orderedSeries.map((s) => {
          const isOn = visibleSeriesIds.has(s.id);
          const bulletStyle =
            !s.colorClass && s.color ? { backgroundColor: s.color } : undefined;

          return (
            <button
              key={s.id}
              type="button"
              aria-label={`Alternar série ${s.label}`}
              aria-pressed={isOn}
              onClick={() => onToggle(s.id)}
              onMouseEnter={() => onHoverStart(s.id)}
              onMouseLeave={onHoverEnd}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(s.id);
                }
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all select-none ${
                isOn
                  ? "border-border-highlight bg-surface/60 text-text-primary"
                  : "border-transparent bg-transparent text-text-muted line-through opacity-50"
              } hover:border-border-highlight focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none`}
            >
              <span
                className={`w-3 h-[3px] rounded-full shrink-0 ${isOn ? s.colorClass || "" : "bg-text-muted"}`}
                style={isOn ? bulletStyle : undefined}
              />
              <span className="whitespace-nowrap">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline rules detail (visible only when events are ON) */}
      {showEvents && timelineRules.length > 0 && (
        <div className="rounded-xl border border-border bg-background-secondary/30 p-3">
          <div className="text-xs font-extrabold text-text-primary mb-2">
            Linha do tempo de aportes & resgates (cenário)
          </div>
          <div className="space-y-1 text-xs text-text-secondary">
            {timelineRules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-bold text-text-primary">
                    {r.startAge}–{r.endAge}
                  </span>{" "}
                  <span className="truncate">
                    • {r.monthlyValue >= 0 ? "Aporte" : "Resgate"}{" "}
                    <b className={r.monthlyValue >= 0 ? "text-success" : "text-danger"}>
                      {r.monthlyValue >= 0 ? "+" : "-"} {formatCurrencyBR(Math.abs(r.monthlyValue))}/mês
                    </b>
                  </span>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full border border-border bg-surface/40">
                  {r.kindLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// ProjectionChart — componente principal
// ─────────────────────────────────────────────────

/**
 * @param {Object}  props
 * @param {Array}   props.seriesOriginal     Série "plano original" [{age, wealth, financial}]
 * @param {Array}   props.seriesAdjusted     Série "plano atualizado" (tracking ou ajustado)
 * @param {Object}  props.clientData         Dados do cenário/cliente
 * @param {boolean} props.showAdjusted       Exibir série adjusted?
 * @param {Array}   props.extraSeries        Cenários alternativos [{key, name, color, data, strokeDasharray?}]
 * @param {number}  props.baselineWealthBRL  Patrimônio inicial baseline
 * @param {string}  props.theme              "dark" | "light" (effectiveTheme)
 * @param {number}  [props.currentAge]       Idade atual (opcional; se não vier, usa minX para chips)
 * @param {"simulation"|"tracking"} [props.mode] Modo do gráfico (default "simulation")
 * @param {Set<string>} [props.visibleSeriesIds]        Controlled: séries visíveis
 * @param {function}    [props.onVisibleSeriesIdsChange] Controlled: setter para visibleSeriesIds
 * @param {boolean}     [props.showEvents]               Controlled: exibir eventos (bands + points)
 * @param {function}    [props.onShowEventsChange]       Controlled: setter para showEvents
 */
function ProjectionChart({
  seriesOriginal,
  seriesAdjusted,
  clientData,
  showAdjusted,
  extraSeries = [],
  baselineWealthBRL = 0,
  theme = "dark",
  currentAge: currentAgeProp,
  mode = "simulation",
  // PR5: Controlled props (optional — uncontrolled when absent)
  visibleSeriesIds: visibleSeriesIdsProp,
  onVisibleSeriesIdsChange,
  showEvents: showEventsProp,
  onShowEventsChange,
}) {
  // ── Cores via CSS vars (zero hardcode) ──
  const colors = useChartColors(theme);

  const allGoals = (clientData?.financialGoals || []).filter((g) => (g?.value || 0) > 0);

  const nowAge = Number(clientData?.currentAge ?? clientData?.idadeAtual);
  const currentAgeInt = Number.isFinite(nowAge) ? Math.floor(nowAge) : 0;
  const retirementAge = clientData?.retirementAge ?? clientData?.endContributionsAge ?? 60;
  const contributionEndAge = clientData?.contributionEndAge ?? clientData?.endContributionsAge ?? 60;

  const timelineRules = useMemo(() => readContributionRules(clientData), [clientData]);

  const cashInMap = useMemo(
    () => buildCashInMap(clientData?.cashInEvents),
    [clientData?.cashInEvents]
  );

  // ── chartData — merge séries por age (dataset COMPLETO) ──
  const chartData = useMemo(() => {
    const snapshotWealth =
      Number.isFinite(baselineWealthBRL) && baselineWealthBRL > 0 ? baselineWealthBRL : 0;

    const rawO = Array.isArray(seriesOriginal) ? seriesOriginal : [];
    const rawA = Array.isArray(seriesAdjusted) ? seriesAdjusted : [];

    const o =
      snapshotWealth > 0 && currentAgeInt > 0
        ? prependSnapshotIfMissing(rawO, currentAgeInt, snapshotWealth)
        : rawO;
    const a =
      snapshotWealth > 0 && currentAgeInt > 0
        ? prependSnapshotIfMissing(rawA, currentAgeInt, snapshotWealth)
        : rawA;

    if (!o.length && !a.length) return [];

    const byAge = new Map();

    o.forEach((p) => {
      const age = Number(p?.age);
      if (!Number.isFinite(age)) return;
      byAge.set(age, { age, wealthOriginal: p?.financial ?? p?.wealth ?? 0 });
    });

    a.forEach((p) => {
      const age = Number(p?.age);
      if (!Number.isFinite(age)) return;
      const prev = byAge.get(age) || { age };
      byAge.set(age, { ...prev, wealthAdjusted: p?.financial ?? p?.wealth ?? 0 });
    });

    // Séries extras (cenários alternativos) com snapshot
    extraSeries.forEach((extra) => {
      if (!extra?.data) return;
      const extraData =
        snapshotWealth > 0 && currentAgeInt > 0
          ? prependSnapshotIfMissing(extra.data, currentAgeInt, snapshotWealth)
          : extra.data;

      extraData.forEach((p) => {
        const age = Number(p?.age);
        if (!Number.isFinite(age)) return;
        const prev = byAge.get(age) || { age };
        byAge.set(age, { ...prev, [extra.key]: p?.financial ?? p?.wealth ?? 0 });
      });
    });

    const merged = Array.from(byAge.values()).sort((x, y) => x.age - y.age);

    return merged.map((point) => ({
      ...point,
      chartCashIn: cashInMap[String(point.age)] || null,
    }));
  }, [seriesOriginal, seriesAdjusted, cashInMap, extraSeries, currentAgeInt, baselineWealthBRL]);

  // ───────────────────────────────────────────────
  // PR2 — Range / Zoom state (hooks MUST be before early return)
  // ───────────────────────────────────────────────
  const len = chartData.length;
  const fullMinAge = len > 0 ? chartData[0].age : 0;
  const fullMaxAge = len > 0 ? chartData[len - 1].age : 0;

  // Base age for chips: explicit prop → clientData currentAge → first point
  const chipBaseAge = useMemo(() => {
    const explicit = Number(currentAgeProp);
    if (Number.isFinite(explicit) && explicit >= fullMinAge && explicit <= fullMaxAge) return explicit;
    if (currentAgeInt > 0 && currentAgeInt >= fullMinAge && currentAgeInt <= fullMaxAge) return currentAgeInt;
    return fullMinAge;
  }, [currentAgeProp, currentAgeInt, fullMinAge, fullMaxAge]);

  const [activePreset, setActivePreset] = useState("all");
  const [lastPreset, setLastPreset] = useState("all");
  const [rangeIdx, setRangeIdx] = useState(() => ({ startIndex: 0, endIndex: Math.max(0, len - 1) }));

  // Keep rangeIdx in sync when chartData length changes (e.g. scenario switch)
  const rangeIdxSafe = useMemo(() => {
    if (len === 0) return { startIndex: 0, endIndex: 0 };
    return clampIdxRange(
      Math.min(rangeIdx.startIndex, len - 1),
      Math.min(rangeIdx.endIndex, len - 1),
      len
    );
  }, [rangeIdx, len]);

  /** Apply a preset and update state */
  const applyPreset = useCallback(
    (presetKey) => {
      if (len === 0) return;

      let s = 0;
      let e = len - 1;

      if (presetKey !== "all") {
        const years = presetKey === "5y" ? 5 : presetKey === "10y" ? 10 : 20;
        const startAge = chipBaseAge;
        const endAge = Math.min(startAge + years, fullMaxAge);
        s = findStartIndexByAge(chartData, startAge);
        e = findEndIndexByAge(chartData, endAge);
      }

      const clamped = clampIdxRange(s, e, len);
      setRangeIdx(clamped);
      setActivePreset(presetKey);
      setLastPreset(presetKey);
    },
    [chartData, chipBaseAge, fullMaxAge, len]
  );

  /** Brush onChange handler */
  const handleBrushChange = useCallback(
    (newRange) => {
      if (!newRange) return;
      const { startIndex: ns, endIndex: ne } = newRange;
      // Protect against undefined from some Recharts versions
      if (ns == null || ne == null) return;
      if (!Number.isFinite(ns) || !Number.isFinite(ne)) return;

      const clamped = clampIdxRange(ns, ne, len);
      setRangeIdx(clamped);
      setActivePreset("custom");
      // lastPreset stays unchanged
    },
    [len]
  );

  /** Reset handler */
  const handleReset = useCallback(() => {
    applyPreset(lastPreset || "all");
  }, [applyPreset, lastPreset]);

  // ── Visible range ages ──
  const xMinVisible = len > 0 ? (chartData[rangeIdxSafe.startIndex]?.age ?? fullMinAge) : 0;
  const xMaxVisible = len > 0 ? (chartData[rangeIdxSafe.endIndex]?.age ?? fullMaxAge) : 0;

  // ───────────────────────────────────────────────
  // PR3 — Series order, visibility, hover, events
  // ───────────────────────────────────────────────

  /** Ordered series descriptors: known IDs first (fixed order), then extras */
  const orderedSeries = useMemo(() => {
    const available = new Set();

    // wealthOriginal — always available if data exists
    if (chartData.some((d) => d.wealthOriginal != null)) available.add("wealthOriginal");

    // wealthAdjusted — available only in tracking mode (showAdjusted)
    if (showAdjusted && chartData.some((d) => d.wealthAdjusted != null)) available.add("wealthAdjusted");

    // Extras from props (consumption, preservation, or other scenarios)
    extraSeries.forEach((extra) => {
      if (extra?.key && chartData.some((d) => d[extra.key] != null)) available.add(extra.key);
    });

    const known = KNOWN_ORDER.filter((id) => available.has(id));
    const extraIds = extraSeries
      .filter((e) => available.has(e?.key) && !KNOWN_ORDER.includes(e?.key))
      .map((e) => e.key);

    const ordered = [...known, ...extraIds];

    // If no known IDs found, fall back to whatever is available
    if (ordered.length === 0 && available.size > 0) {
      return [...available].map((id) => {
        const extra = extraSeries.find((e) => e.key === id);
        return {
          id,
          label: SERIES_CONFIG[id]?.label || extra?.name || id,
          colorClass: SERIES_CONFIG[id]?.colorClass || null,
          color: extra?.color || null,
          colorKey: SERIES_CONFIG[id]?.colorKey || null,
        };
      });
    }

    return ordered.map((id) => {
      const cfg = SERIES_CONFIG[id];
      const extra = extraSeries.find((e) => e.key === id);
      return {
        id,
        label: cfg?.label || extra?.name || id,
        colorClass: cfg?.colorClass || null,
        color: extra?.color || null,
        colorKey: cfg?.colorKey || null,
      };
    });
  }, [chartData, showAdjusted, extraSeries]);

  /** Stable key for detecting when series composition changes */
  const seriesKey = useMemo(() => orderedSeries.map((s) => s.id).join(","), [orderedSeries]);

  // ── PR5: Visibility state — controlled or uncontrolled ──
  const [localVisibleIds, setLocalVisibleIds] = useState(() => new Set(DEFAULT_ON));
  const prevSeriesKeyRef = useRef(seriesKey);

  const isControlledVis = visibleSeriesIdsProp != null;
  const visibleSeriesIds = isControlledVis ? visibleSeriesIdsProp : localVisibleIds;

  // Reset visibility to defaults when series composition changes (uncontrolled only)
  useEffect(() => {
    if (isControlledVis) return; // parent manages resets
    if (prevSeriesKeyRef.current !== seriesKey) {
      prevSeriesKeyRef.current = seriesKey;
      const defaults = new Set();
      for (const s of orderedSeries) {
        if (DEFAULT_ON.has(s.id)) defaults.add(s.id);
      }
      // Guarantee at least one series is ON
      if (defaults.size === 0 && orderedSeries.length > 0) defaults.add(orderedSeries[0].id);
      setLocalVisibleIds(defaults);
    }
  }, [seriesKey, orderedSeries, isControlledVis]);

  // ── Hover highlight state ──
  const [hoverSeriesId, setHoverSeriesId] = useState(null);

  // ── PR5: Events toggle — controlled or uncontrolled ──
  const [localShowEvents, setLocalShowEvents] = useState(false);
  const isControlledEvt = showEventsProp != null;
  const showEvents = isControlledEvt ? showEventsProp : localShowEvents;

  /** Toggle series visibility (min 1 active, controlled or uncontrolled) */
  const toggleSeriesVisibility = useCallback((id) => {
    const prev = visibleSeriesIds;
    let next;
    if (prev.has(id)) {
      if (prev.size <= 1) return; // block: at least 1 must stay on
      next = new Set(prev);
      next.delete(id);
    } else {
      next = new Set(prev);
      next.add(id);
    }
    if (isControlledVis) {
      onVisibleSeriesIdsChange?.(next);
    } else {
      setLocalVisibleIds(next);
    }
  }, [visibleSeriesIds, isControlledVis, onVisibleSeriesIdsChange]);

  // ── PR3: Hover opacity/width helpers ──
  const hoverActive = hoverSeriesId != null;
  const seriesOpacity = useCallback(
    (id) => (hoverActive && hoverSeriesId !== id ? 0.25 : 1),
    [hoverActive, hoverSeriesId]
  );
  const seriesFillOpacity = useCallback(
    (id) => (hoverActive && hoverSeriesId !== id ? 0.15 : 1),
    [hoverActive, hoverSeriesId]
  );
  const seriesStrokeW = useCallback(
    (id, base) => (hoverActive && hoverSeriesId === id ? base + 1 : base),
    [hoverActive, hoverSeriesId]
  );

  // ── Y domain for visible range — scoped to VISIBLE series only (PR3) ──
  const yDomainMax = useMemo(() => {
    if (len === 0) return 1;
    let maxVal = 0;
    for (let i = rangeIdxSafe.startIndex; i <= rangeIdxSafe.endIndex; i++) {
      const d = chartData[i];
      if (!d) continue;
      if (visibleSeriesIds.has("wealthOriginal")) maxVal = Math.max(maxVal, d.wealthOriginal || 0);
      if (visibleSeriesIds.has("wealthAdjusted")) maxVal = Math.max(maxVal, d.wealthAdjusted || 0);
      if (showEvents) maxVal = Math.max(maxVal, d.chartCashIn || 0);
      extraSeries.forEach((extra) => {
        if (visibleSeriesIds.has(extra.key)) maxVal = Math.max(maxVal, d[extra.key] || 0);
      });
    }
    return maxVal * 1.1 || 1;
  }, [chartData, rangeIdxSafe, extraSeries, len, visibleSeriesIds, showEvents]);

  // ── Ticks for visible range ──
  const visibleTicks = useMemo(() => {
    const ticks = [];
    for (let i = xMinVisible; i <= xMaxVisible; i++) ticks.push(i);
    return ticks;
  }, [xMinVisible, xMaxVisible]);

  // ── Filter markers/events to visible range ──
  const cashInEvents = (clientData?.cashInEvents || []).filter(
    (e) => e?.enabled !== false && e?.age && Number(e.value) > 0
  );
  const hasCashIn = cashInEvents.length > 0;

  const visibleCashInEvents = useMemo(
    () => cashInEvents.filter((e) => {
      const a = Number(e.age);
      return a >= xMinVisible && a <= xMaxVisible;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cashInEvents, xMinVisible, xMaxVisible]
  );

  const visibleGoals = useMemo(
    () => allGoals.filter((g) => g.age >= xMinVisible && g.age <= xMaxVisible),
    [allGoals, xMinVisible, xMaxVisible]
  );

  const visibleRules = useMemo(
    () => timelineRules.filter((r) => r.endAge >= xMinVisible && r.startAge <= xMaxVisible),
    [timelineRules, xMinVisible, xMaxVisible]
  );

  // ── PR5: Event view model — bands + points ──
  const eventBands = useMemo(() =>
    timelineRules.map((r) => ({
      startAge: r.startAge,
      endAge: r.endAge,
      endAgeInclusive: r.endAge + 0.99, // visually pin the end tick (view only)
      label: `${r.monthlyValue >= 0 ? "Aporte" : "Resgate"} ${formatCurrencyBR(Math.abs(r.monthlyValue))}/mês`,
      type: r.monthlyValue >= 0 ? "contribution" : "withdrawal",
      kindLabel: r.kindLabel,
      monthlyValue: r.monthlyValue,
    })),
    [timelineRules]
  );

  const eventPoints = useMemo(() => {
    const pts = [];
    for (const e of cashInEvents) {
      const age = Number(e.age);
      const val = Number(e.value);
      if (!Number.isFinite(age) || !Number.isFinite(val)) continue;
      pts.push({ age, value: val, label: `Cash-in: ${formatCurrencyBR(val)}`, type: "cashIn" });
    }
    for (const g of allGoals) {
      const age = Number(g.age);
      const val = Number(g.value);
      if (!Number.isFinite(age) || !Number.isFinite(val)) continue;
      pts.push({ age, value: -val, label: `Meta/Saque: ${formatCurrencyBR(val)}`, type: "goal", name: g.name });
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashInEvents, allGoals]);

  const visibleEventBands = useMemo(
    () => eventBands.filter((b) => b.endAge >= xMinVisible && b.startAge <= xMaxVisible),
    [eventBands, xMinVisible, xMaxVisible]
  );

  const visibleEventPoints = useMemo(
    () => eventPoints.filter((p) => p.age >= xMinVisible && p.age <= xMaxVisible),
    [eventPoints, xMinVisible, xMaxVisible]
  );

  // ───────────────────────────────────────────────
  // PR4 — Tracking comparison: canCompare, deltaStats, depletion, gapData
  // ───────────────────────────────────────────────
  const isTracking = mode === "tracking";
  const canCompare =
    isTracking &&
    visibleSeriesIds.has(ORIG_ID) &&
    visibleSeriesIds.has(UPD_ID) &&
    chartData.some((d) => d[ORIG_ID] != null) &&
    chartData.some((d) => d[UPD_ID] != null);

  /** Rows in the visible range (PR2 range) */
  const visibleRows = useMemo(() => {
    if (len === 0) return [];
    return chartData.slice(rangeIdxSafe.startIndex, rangeIdxSafe.endIndex + 1);
  }, [chartData, rangeIdxSafe, len]);

  /** Delta statistics for the visible range (biggest gain / biggest loss) */
  const deltaStats = useMemo(() => {
    if (!canCompare || visibleRows.length === 0) return null;

    let maxGain = -Infinity;
    let maxGainAge = null;
    let maxLoss = Infinity;
    let maxLossAge = null;
    let hasAnyPair = false;

    for (const row of visibleRows) {
      const o = row[ORIG_ID];
      const u = row[UPD_ID];
      if (typeof o !== "number" || typeof u !== "number") continue;
      hasAnyPair = true;
      const d = u - o;
      if (d > maxGain) { maxGain = d; maxGainAge = row.age; }
      if (d < maxLoss) { maxLoss = d; maxLossAge = row.age; }
    }

    if (!hasAnyPair) return null;

    // Prefer showing the biggest gain; if none positive, show biggest loss
    if (maxGain > 0) {
      return { kind: "gain", value: maxGain, age: maxGainAge };
    }
    return { kind: "loss", value: maxLoss, age: maxLossAge };
  }, [canCompare, visibleRows]);

  /** Depletion info for visible range */
  const depletionInfo = useMemo(() => {
    if (!canCompare || visibleRows.length === 0) return null;

    const depOrig = findDepletionAge(visibleRows, ORIG_ID);
    const depUpd = findDepletionAge(visibleRows, UPD_ID);

    let statusText;
    if (depOrig != null && depUpd != null) {
      const diff = depUpd - depOrig;
      if (diff > 0) statusText = `Atualizado esgota ${diff} ano${diff > 1 ? "s" : ""} depois (aos ${depUpd})`;
      else if (diff < 0) statusText = `Atualizado esgota ${Math.abs(diff)} ano${Math.abs(diff) > 1 ? "s" : ""} antes (aos ${depUpd})`;
      else statusText = `Ambos esgotam na mesma idade (${depOrig})`;
    } else if (depOrig != null) {
      statusText = `Atualizado evita esgotamento até ${xMaxVisible}`;
    } else if (depUpd != null) {
      statusText = `Atualizado esgota aos ${depUpd}`;
    } else {
      statusText = "Sem esgotamento no horizonte";
    }

    const earliest = [depOrig, depUpd].filter((a) => a != null);
    const earliestAge = earliest.length > 0 ? Math.min(...earliest) : null;

    return { depOrig, depUpd, statusText, earliestAge };
  }, [canCompare, visibleRows, xMaxVisible]);

  /** Gap shading data — upper/lower envelope between the two series */
  const gapData = useMemo(() => {
    if (!canCompare) return null;
    return chartData.map((row) => {
      const o = row[ORIG_ID];
      const u = row[UPD_ID];
      if (typeof o !== "number" || typeof u !== "number") {
        return { age: row.age, gapUpper: null, gapLower: null };
      }
      return { age: row.age, gapUpper: Math.max(o, u), gapLower: Math.min(o, u) };
    });
  }, [canCompare, chartData]);

  // ── Empty state (AFTER all hooks) ──
  if (!chartData.length) {
    return (
      <div className="h-full w-full flex items-center justify-center text-text-muted text-sm">
        Sem dados para projeção (verifique idade atual, ativos e premissas).
      </div>
    );
  }

  // ── Cor de fundo do activeDot (contraste com tema) ──
  const dotFill = theme === "light" ? "#FFFFFF" : "#0A0C14";

  // ── Brush styling ──
  const brushStroke = colors.accent;

  return (
    <div className="w-full">
      {/* ── PR4: Mini-resumo executivo (tracking + canCompare only) ── */}
      {canCompare && deltaStats && (
        <div className="mb-3 rounded-xl border border-border bg-surface/40 backdrop-blur-sm px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-text-secondary tabular-nums">
            {deltaStats.kind === "gain"
              ? `Maior ganho no período: +${formatCurrencyBR(deltaStats.value)} (aos ${deltaStats.age} anos)`
              : `Maior piora no período: ${formatCurrencyBR(deltaStats.value)} (aos ${deltaStats.age} anos)`}
          </p>
          {depletionInfo && (
            <p className="text-xs text-text-muted">
              {depletionInfo.statusText}
            </p>
          )}
        </div>
      )}

      {/* ── PR2/PR3: Controls bar ── */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto">
        {/* Left: Events toggle + Series counter */}
        <button
          type="button"
          aria-label="Alternar eventos no gráfico"
          aria-pressed={showEvents}
          onClick={() => {
            const next = !showEvents;
            if (isControlledEvt) onShowEventsChange?.(next);
            else setLocalShowEvents(next);
          }}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
            showEvents
              ? "bg-accent/20 text-accent border-accent/40"
              : "bg-surface/50 text-text-secondary border-border hover:text-text-primary hover:border-border-highlight"
          }`}
        >
          Eventos
        </button>

        <span className="text-text-muted/60 text-[11px] font-normal whitespace-nowrap">
          Séries ativas: {visibleSeriesIds.size}/{orderedSeries.length}
        </span>

        <span className="flex-1" />

        {/* Right: Range chips (PR2) */}
        {PRESET_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => applyPreset(chip.key)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
              activePreset === chip.key
                ? "bg-accent/20 text-accent border-accent/40"
                : "bg-surface/50 text-text-secondary border-border hover:text-text-primary hover:border-border-highlight"
            }`}
          >
            {chip.label}
          </button>
        ))}

        {activePreset === "custom" && (
          <>
            <span className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-surface/30 text-text-muted cursor-default whitespace-nowrap">
              Custom
            </span>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 transition-all whitespace-nowrap"
            >
              Reset
            </button>
          </>
        )}
      </div>

      <div className="h-[560px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 18, right: 22, left: 10, bottom: 36 }}>
            <defs>
              <linearGradient id="colorOriginal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopOpacity={0.28} stopColor={colors.gradientOriginalStart} />
                <stop offset="100%" stopOpacity={0.05} stopColor={colors.gradientOriginalEnd} />
              </linearGradient>

              <linearGradient id="colorAdjusted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopOpacity={0.20} stopColor={colors.gradientAdjustedStart} />
                <stop offset="100%" stopOpacity={0.04} stopColor={colors.gradientAdjustedEnd} />
              </linearGradient>

              {/* PR4: Gap shading gradient (tracking, same color as adjusted series) */}
              <linearGradient id="colorGapShading" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopOpacity={0.10} stopColor={colors.adjusted} />
                <stop offset="100%" stopOpacity={0.06} stopColor={colors.adjusted} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />

            <XAxis
              dataKey="age"
              type="number"
              domain={[xMinVisible, xMaxVisible]}
              ticks={visibleTicks}
              interval={0}
              tick={{ fill: colors.axis, fontSize: 12, fontFamily: "Inter" }}
              axisLine={{ stroke: colors.grid }}
              tickLine={false}
              allowDecimals={false}
              allowDataOverflow
              minTickGap={6}
            />

            <YAxis
              tickFormatter={formatCompactY}
              tick={{ fill: colors.axis, fontSize: 11, fontFamily: "Inter" }}
              axisLine={false}
              tickLine={false}
              domain={[0, yDomainMax]}
              allowDataOverflow
              width={52}
            />

            <Tooltip
              cursor={false}
              content={
                <ExecutiveTooltip
                  visibleSeriesIds={visibleSeriesIds}
                  orderedSeries={orderedSeries}
                  isTracking={showAdjusted}
                  showEvents={showEvents}
                  eventBands={eventBands}
                  eventPoints={eventPoints}
                />
              }
            />

            {/* PR5: Event bands (timeline rules) — continuous ReferenceArea with inclusive endAge */}
            {showEvents &&
              visibleEventBands.map((b, i) => (
                <ReferenceArea
                  key={`band_${i}`}
                  x1={Math.max(xMinVisible, b.startAge)}
                  x2={Math.min(xMaxVisible, b.endAgeInclusive)}
                  ifOverflow="hidden"
                  fill={b.type === "contribution" ? colors.accent : colors.goalStroke}
                  fillOpacity={0.08}
                  strokeOpacity={0}
                />
              ))}

            {/* Linha "AGORA" — ESSENTIAL (always visible) */}
            {Number.isFinite(nowAge) && nowAge >= xMinVisible && nowAge <= xMaxVisible && (
              <ReferenceLine
                x={nowAge}
                stroke={colors.nowStroke}
                strokeDasharray="4 4"
                label={{
                  value: "Agora",
                  position: "top",
                  fill: colors.nowStroke,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "Inter",
                }}
              />
            )}

            {/* Cash-in bar — non-essential event (PR3: gated by showEvents) */}
            {showEvents && (
              <Bar
                dataKey="chartCashIn"
                name="Aporte extraordinário"
                fill={colors.success}
                barSize={7}
                radius={[6, 6, 0, 0]}
              />
            )}

            {/* PR3: Series rendering — only visible series, with hover focus */}
            {visibleSeriesIds.has("wealthOriginal") && (
              <Area
                type="monotone"
                dataKey="wealthOriginal"
                name="Plano original"
                stroke={colors.accent}
                strokeWidth={seriesStrokeW("wealthOriginal", 3)}
                strokeOpacity={seriesOpacity("wealthOriginal")}
                fillOpacity={seriesFillOpacity("wealthOriginal")}
                fill="url(#colorOriginal)"
                activeDot={{ r: 6, stroke: colors.accent, strokeWidth: 2, fill: dotFill }}
              />
            )}

            {visibleSeriesIds.has("wealthAdjusted") && (
              <Area
                type="monotone"
                dataKey="wealthAdjusted"
                name="Plano atualizado"
                stroke={colors.adjusted}
                strokeWidth={seriesStrokeW("wealthAdjusted", 3)}
                strokeOpacity={seriesOpacity("wealthAdjusted")}
                fillOpacity={seriesFillOpacity("wealthAdjusted")}
                fill="url(#colorAdjusted)"
                activeDot={{ r: 6, stroke: colors.adjusted, strokeWidth: 2, fill: dotFill }}
              />
            )}

            {/* Extra series — only visible, with hover focus */}
            {extraSeries
              .filter((e) => visibleSeriesIds.has(e.key))
              .map((extra) => (
                <Line
                  key={extra.key}
                  type="monotone"
                  dataKey={extra.key}
                  name={extra.name}
                  stroke={extra.color}
                  strokeWidth={seriesStrokeW(extra.key, 2)}
                  strokeOpacity={seriesOpacity(extra.key)}
                  strokeDasharray={extra.strokeDasharray || "0"}
                  dot={false}
                  activeDot={{ r: 5, stroke: extra.color, strokeWidth: 2, fill: dotFill }}
                />
              ))}

            {/* Aposentadoria — ESSENTIAL (always visible if in range) */}
            {retirementAge >= xMinVisible && retirementAge <= xMaxVisible && (
              <ReferenceLine
                x={retirementAge}
                stroke={colors.retirementStroke}
                strokeDasharray="5 5"
                label={{
                  value: "Aposentadoria",
                  position: "top",
                  fill: colors.retirementStroke,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "Inter",
                }}
              />
            )}

            {/* Fim aportes (only if in visible range) */}
            {contributionEndAge >= xMinVisible && contributionEndAge <= xMaxVisible && (
              <ReferenceLine
                x={contributionEndAge}
                stroke={colors.contributionEndStroke}
                strokeDasharray="3 3"
                label={{
                  value: "Fim aportes",
                  position: "insideTopLeft",
                  fill: colors.contributionEndStroke,
                  fontSize: 11,
                  fontWeight: 700,
                  angle: -90,
                  offset: 15,
                  fontFamily: "Inter",
                }}
              />
            )}

            {/* PR5: Event points (cash-in + goals) — discrete markers at y=0 baseline */}
            {showEvents &&
              visibleEventPoints.map((p, i) => (
                <ReferenceDot
                  key={`evt_pt_${i}`}
                  x={p.age}
                  y={0}
                  r={p.type === "cashIn" ? 7 : 6}
                  fill={p.type === "cashIn" ? colors.success : colors.goalStroke}
                  stroke={dotFill}
                  strokeWidth={2}
                  ifOverflow="hidden"
                />
              ))}

            {/* PR4: Gap shading between original & adjusted (tracking only, canCompare) */}
            {canCompare && (
              <Customized
                component={
                  <GapShadingShape fillColor="url(#colorGapShading)" />
                }
              />
            )}

            {/* PR4: Depletion marker — earliest esgotamento (tracking, derived) */}
            {canCompare &&
              depletionInfo?.earliestAge != null &&
              depletionInfo.earliestAge >= xMinVisible &&
              depletionInfo.earliestAge <= xMaxVisible && (
                <ReferenceLine
                  x={depletionInfo.earliestAge}
                  stroke={colors.axis}
                  strokeDasharray="6 3"
                  strokeOpacity={0.7}
                  label={{
                    value: "Esgotamento",
                    position: "insideTopRight",
                    fill: colors.axis,
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "Inter",
                  }}
                />
              )}

            {/* PR2: Brush — always visible, controlled, operates on full dataset */}
            <Brush
              dataKey="age"
              height={28}
              stroke={brushStroke}
              fill="transparent"
              travellerWidth={10}
              startIndex={rangeIdxSafe.startIndex}
              endIndex={rangeIdxSafe.endIndex}
              onChange={handleBrushChange}
              tickFormatter={(val) => `${val}`}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <InteractiveLegend
        orderedSeries={orderedSeries}
        visibleSeriesIds={visibleSeriesIds}
        hoverSeriesId={hoverSeriesId}
        onToggle={toggleSeriesVisibility}
        onHoverStart={setHoverSeriesId}
        onHoverEnd={() => setHoverSeriesId(null)}
        showEvents={showEvents}
        timelineRules={timelineRules}
      />
    </div>
  );
}

export default ProjectionChart;
