// src/pages/DashboardPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
  Label,
} from "recharts";
import {
  Target,
  TrendingUp,
  Building2,
  Sparkles,
  AlertTriangle,
  LineChart,
  Calendar,
} from "lucide-react";

import { CONFIG } from "../constants/config";
import Card from "../components/ui/Card";

import FinancialEngine from "../engine/FinancialEngine";
import TrackingEngine from "../engine/TrackingEngine";
import {
  formatCurrencyBR,
  formatPercent,
  annualToMonthlyRate,
  compoundMonthlyRate,
  formatPercentPtBr,
  formatDeltaPp,
  getExpectedReturnByProfile,
  nominalToRealReturn,
  toNumber,
} from "../utils/format";

import MonthlyTrackingCard from "../components/tracking/MonthlyTrackingCard";

// -------------------------
// Helpers
// -------------------------
function safeInt(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function buildYearOptions({ trackingStartYear, currentYear, currentAge, retirementAge }) {
  const start = trackingStartYear || currentYear;

  let end = start;
  const a0 = safeInt(currentAge, NaN);
  const ar = safeInt(retirementAge, NaN);
  if (Number.isFinite(a0) && Number.isFinite(ar) && ar > a0 && ar < 120) {
    end = start + (ar - a0);
  } else {
    end = start + 30;
  }

  if (end < start) end = start;

  const years = [];
  for (let y = start; y <= end; y++) years.push(y);
  return years;
}

function normalizeText(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function safeNum(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

// -------------------------
// Tooltip custom
// -------------------------
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const original = payload.find((p) => p.dataKey === "wealthOriginal");
  const adjusted = payload.find((p) => p.dataKey === "wealthAdjusted");
  const cashIn = payload.find((p) => p.dataKey === "chartCashIn");

  return (
    <div className="bg-surface-highlight/95 border border-accent/20 p-4 rounded-xl shadow-glass backdrop-blur-md relative z-50 min-w-[220px]">
      <p className="text-text-secondary text-sm mb-2 font-medium">Aos {label} anos</p>

      {original && (
        <div className="mb-2">
          <p className="text-xs text-text-secondary font-semibold">Plano original</p>
          <p className="text-lg font-display font-bold text-text-primary leading-none">
            {formatCurrencyBR(original.value || 0)}
          </p>
        </div>
      )}

      {adjusted && (
        <div className="mb-2">
          <p className="text-xs text-text-secondary font-semibold">Plano atualizado</p>
          <p className="text-lg font-display font-bold text-text-primary leading-none">
            {formatCurrencyBR(adjusted.value || 0)}
          </p>
        </div>
      )}

      {cashIn && cashIn.value > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-lg font-display font-bold text-success leading-none flex items-center gap-1">
            + {formatCurrencyBR(cashIn.value)}
          </p>
          <p className="text-xs text-success/80 mt-1 font-medium">Aporte extraordinário</p>
        </div>
      )}
    </div>
  );
};

// -------------------------
// Legenda/Guia
// -------------------------
function ChartLegendFooter({
  showAdjusted,
  hasCashIn,
  retirementAge,
  contributionEndAge,
  goals = [],
  timelineRules = [],
}) {
  const LineSwatch = ({ className }) => (
    <span className={`inline-block w-8 h-[3px] rounded-full ${className}`} />
  );

  const DotSwatch = ({ className }) => (
    <span className={`inline-block w-3 h-3 rounded-full ${className}`} />
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-text-secondary">
        <div className="flex items-center gap-2">
          <LineSwatch className="bg-accent" />
          <span>Plano original</span>
        </div>

        {showAdjusted && (
          <div className="flex items-center gap-2">
            <LineSwatch className="bg-sky-400" />
            <span>Plano atualizado</span>
          </div>
        )}

        {hasCashIn && (
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
            <span>Aporte extraordinário (cash-in)</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-text-secondary">
        <div className="flex items-center gap-2">
          <DotSwatch className="bg-emerald-500 border border-white" />
          <span>Ponto de evento (cash-in)</span>
        </div>

        <div className="flex items-center gap-2">
          <LineSwatch className="bg-emerald-500" />
          <span>Aposentadoria (idade {retirementAge})</span>
        </div>

        <div className="flex items-center gap-2">
          <LineSwatch className="bg-orange-400" />
          <span>Fim dos aportes (idade {contributionEndAge})</span>
        </div>

        {goals.length > 0 && (
          <div className="flex items-center gap-2">
            <LineSwatch className="bg-rose-500" />
            <span>Metas (linhas vermelhas)</span>
          </div>
        )}
      </div>

      {timelineRules.length > 0 && (
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

// -------------------------
// Timeline rules
// -------------------------
function readContributionRules(clientData) {
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

// -------------------------
// Gráfico
// -------------------------
function WealthEvolutionChart({ seriesOriginal, seriesAdjusted, clientData, showAdjusted }) {
  const allGoals = (clientData?.financialGoals || []).filter((g) => (g?.value || 0) > 0);

  const nowAge = Number(clientData?.currentAge ?? clientData?.idadeAtual);
  const retirementAge = clientData?.retirementAge ?? clientData?.endContributionsAge ?? 60;
  const contributionEndAge = clientData?.contributionEndAge ?? clientData?.endContributionsAge ?? 60;

  const timelineRules = useMemo(() => readContributionRules(clientData), [clientData]);

  const cashInMap = useMemo(() => {
    const map = {};
    const events = clientData?.cashInEvents || [];

    events.forEach((event) => {
      if (event?.enabled === false) return;
      const ageStr = String(event.age);
      const value = Number(event.value) || 0;
      if (!ageStr || value <= 0) return;
      map[ageStr] = (map[ageStr] || 0) + value;
    });

    return map;
  }, [clientData?.cashInEvents]);

  const chartData = useMemo(() => {
    const o = Array.isArray(seriesOriginal) ? seriesOriginal : [];
    const a = Array.isArray(seriesAdjusted) ? seriesAdjusted : [];
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

    const merged = Array.from(byAge.values()).sort((x, y) => x.age - y.age);

    return merged.map((point) => ({
      ...point,
      chartCashIn: cashInMap[String(point.age)] || null,
    }));
  }, [seriesOriginal, seriesAdjusted, cashInMap]);

  if (!chartData.length) {
    return (
      <div className="h-full w-full flex items-center justify-center text-text-muted text-sm">
        Sem dados para projeção (verifique idade atual, ativos e premissas).
      </div>
    );
  }

  const maxCashIn = Math.max(0, ...Object.values(cashInMap));
  const maxO = Math.max(...chartData.map((d) => d.wealthOriginal || 0), 0);
  const maxA = Math.max(...chartData.map((d) => d.wealthAdjusted || 0), 0);
  const yDomainMax = Math.max(maxCashIn, maxO, maxA) * 1.1;

  const accentColor = "#D4AF37";
  const adjustedColor = "#60a5fa";
  const successColor = "#10b981";
  const gridColor = "rgba(255,255,255,0.05)";
  const axisTextColor = "#9CA3AF";

  const cashInEvents = (clientData?.cashInEvents || []).filter(
    (e) => e?.enabled !== false && e?.age && Number(e.value) > 0
  );
  const hasCashIn = cashInEvents.length > 0;

  const minAge = Math.min(...chartData.map((d) => Number(d.age)));
  const maxAge = Math.max(...chartData.map((d) => Number(d.age)));
  const ticks = Array.from({ length: maxAge - minAge + 1 }, (_, i) => minAge + i);

  const rulesInRange = timelineRules.filter((r) => r.endAge >= minAge && r.startAge <= maxAge);

  return (
    <div className="w-full">
      <div className="h-[560px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 18, right: 22, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="colorOriginal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopOpacity={0.28} stopColor={accentColor} />
                <stop offset="100%" stopOpacity={0.05} stopColor={accentColor} />
              </linearGradient>

              <linearGradient id="colorAdjusted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopOpacity={0.20} stopColor={adjustedColor} />
                <stop offset="100%" stopOpacity={0.04} stopColor={adjustedColor} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />

            <XAxis
              dataKey="age"
              type="number"
              domain={[minAge, maxAge]}
              ticks={ticks}                 // ✅ ano a ano
              interval={0}                  // ✅ não pula de 25 em 25
              tick={{ fill: axisTextColor, fontSize: 12, fontFamily: "Inter" }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              allowDecimals={false}
              minTickGap={6}
            />

            <YAxis
              tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
              tick={{ fill: axisTextColor, fontSize: 12, fontFamily: "Inter" }}
              axisLine={false}
              tickLine={false}
              domain={[0, yDomainMax]}
            />

            <Tooltip cursor={false} content={<CustomTooltip />} />

            {/* ✅ Faixas do timeline */}
            {rulesInRange.map((r) => (
              <ReferenceArea
                key={`rule_${r.id}`}
                x1={Math.max(minAge, r.startAge)}
                x2={Math.min(maxAge, r.endAge)}
                ifOverflow="hidden"
                fill={r.monthlyValue >= 0 ? "rgba(212,175,55,0.08)" : "rgba(244,63,94,0.08)"}
                strokeOpacity={0}
              />
            ))}

            {/* ✅ Linha "AGORA" */}
            {Number.isFinite(nowAge) && nowAge >= minAge && nowAge <= maxAge && (
              <ReferenceLine
                x={nowAge}
                stroke="rgba(255,255,255,0.35)"
                strokeDasharray="4 4"
                label={{
                  value: "Agora",
                  position: "top",
                  fill: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "Inter",
                }}
              />
            )}

            <Bar
              dataKey="chartCashIn"
              name="Aporte extraordinário"
              fill={successColor}
              barSize={7}
              radius={[6, 6, 0, 0]}
            />

            <Area
              type="monotone"
              dataKey="wealthOriginal"
              name="Plano original"
              stroke={accentColor}
              strokeWidth={3}
              fill="url(#colorOriginal)"
              activeDot={{ r: 6, stroke: accentColor, strokeWidth: 2, fill: "#0A0C14" }}
            />

            {showAdjusted && (
              <Area
                type="monotone"
                dataKey="wealthAdjusted"
                name="Plano atualizado"
                stroke={adjustedColor}
                strokeWidth={3}
                fill="url(#colorAdjusted)"
                activeDot={{ r: 6, stroke: adjustedColor, strokeWidth: 2, fill: "#0A0C14" }}
              />
            )}

            <ReferenceLine
              x={retirementAge}
              stroke={successColor}
              strokeDasharray="5 5"
              label={{
                value: "Aposentadoria",
                position: "top",
                fill: successColor,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "Inter",
              }}
            />

            <ReferenceLine
              x={contributionEndAge}
              stroke="#f97316"
              strokeDasharray="3 3"
              label={{
                value: "Fim aportes",
                position: "insideTopLeft",
                fill: "#f97316",
                fontSize: 11,
                fontWeight: 700,
                angle: -90,
                offset: 15,
                fontFamily: "Inter",
              }}
            />

            {cashInEvents.map((event, index) => {
              const age = Number(event.age);
              if (!Number.isFinite(age)) return null;

              const row = chartData.find((p) => Number(p.age) === age);
              const y = (showAdjusted ? row?.wealthAdjusted : null) ?? row?.wealthOriginal ?? 0;

              return (
                <ReferenceDot
                  key={`cashin_${index}`}
                  x={age}
                  y={y}
                  r={7}
                  fill={successColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              );
            })}

            {allGoals.map((g) => (
              <ReferenceLine key={g.id} x={g.age} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.6}>
                <Label
                  value={g.name}
                  position="insideTop"
                  angle={-90}
                  fill="#f43f5e"
                  fontSize={10}
                  offset={20}
                  fontFamily="Inter"
                />
              </ReferenceLine>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartLegendFooter
        showAdjusted={showAdjusted}
        hasCashIn={hasCashIn}
        retirementAge={retirementAge}
        contributionEndAge={contributionEndAge}
        goals={allGoals}
        timelineRules={timelineRules}
      />
    </div>
  );
}

// -------------------------
// KPI Card
// -------------------------
function StyledKPICard({ label, value, subtext, icon: Icon, isHero }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-200 ${
        isHero
          ? "bg-gradient-to-br from-surface-highlight to-background-secondary border-accent/30 shadow-glow-accent/20"
          : "bg-surface border-border shadow-soft"
      }`}
    >
      {isHero && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[60px] rounded-full -mr-10 -mt-10 pointer-events-none"></div>
      )}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-accent uppercase tracking-wider">{label}</h4>
        <div className={`p-2 rounded-lg ${isHero ? "bg-accent/20 text-accent" : "bg-surface-highlight text-text-secondary"}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="font-display text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">{value}</div>
      <p className="text-sm text-text-secondary mt-2 font-medium">{subtext}</p>
    </div>
  );
}

// -------------------------
// PÁGINA PRINCIPAL
// -------------------------
export default function DashboardPage() {
  const ctx = useOutletContext() || {};
  const {
    clientData,
    analysis,
    isStressTest,
    viewMode,
    aiEnabled,
    scenarioId = null,
    trackingByScenario = null,
    setTrackingByScenario = null,
  } = ctx;

  if (!clientData) {
    return (
      <div className="p-6 rounded-2xl border border-border bg-surface/40 text-text-secondary">
        Dados do cenário indisponíveis no momento.
      </div>
    );
  }
  const [mode, setMode] = useState("simulation");
  const [selectedYear, setSelectedYear] = useState(null);

  const engineOutput = useMemo(() => {
    if (analysis) return analysis;
    try {
      return FinancialEngine.run(clientData || {}, isStressTest);
    } catch (e) {
      console.error("FinancialEngine.run error:", e);
      return { kpis: {}, series: [], succession: null };
    }
  }, [analysis, clientData, isStressTest]);

const baseKpis = engineOutput?.kpis || {};

  const kpisNormalized = useMemo(() => {
    const hasLegacy = baseKpis && ("goalPercentage" in baseKpis || "requiredCapital" in baseKpis);
    if (hasLegacy) return baseKpis;

    return {
      goalPercentage: baseKpis.coberturaMetaPct ?? 0,
      requiredCapital: baseKpis.capitalNecessario ?? 0,
      sustainableIncome: baseKpis.rendaSustentavelMensal ?? 0,
      illiquidityRatioCurrent: baseKpis.liquidityPct != null ? 100 - baseKpis.liquidityPct : 0,
      wealthScore: baseKpis.wealthScore ?? 0,
      sustainabilityLabel: baseKpis.sustainabilityLabel,
      sustainabilityStatus: baseKpis.sustainabilityStatus,
    };
  }, [baseKpis]);

  const showTracking = mode === "tracking";

  const scenarioTracking = trackingByScenario?.[scenarioId] || null;
  const startYearFromTracking = useMemo(() => {
    const s = scenarioTracking?.startDate;
    if (!s) return null;
    const y = Number(String(s).slice(0, 4));
    return Number.isFinite(y) ? y : null;
  }, [scenarioTracking?.startDate]);

  const nowYear = new Date().getFullYear();

  const yearOptions = useMemo(() => {
    return buildYearOptions({
      trackingStartYear: startYearFromTracking,
      currentYear: nowYear,
      currentAge: clientData?.currentAge,
      retirementAge: clientData?.retirementAge,
    });
  }, [startYearFromTracking, nowYear, clientData?.currentAge, clientData?.retirementAge]);

  useEffect(() => {
    if (!showTracking) return;
    if (selectedYear) return;
    setSelectedYear(yearOptions?.[0] || nowYear);
  }, [showTracking, yearOptions, nowYear, selectedYear]);

  const tracking = useMemo(() => {
    if (!scenarioId || !trackingByScenario) return null;
    try {
      return TrackingEngine.run({
        scenarioId,
        clientData,
        trackingByScenario,
        isStressTest,
        selectedYear,
      });
    } catch (e) {
      console.error("TrackingEngine.run error:", e);
      return null;
    }
  }, [scenarioId, trackingByScenario, clientData, isStressTest, selectedYear]);

  // ========================================
  // Cálculo YTD Real vs Projetado
  // ========================================
  const ytdComparison = useMemo(() => {
    const yearSummary = tracking?.yearSummary;
    const monthsCount = yearSummary?.monthsCount ?? 0;

    // Se não há lançamentos, retornar nulo
    if (monthsCount === 0) {
      return {
        hasData: false,
        monthsCount: 0,
        retorno: { real: null, projetadoReal: null, projetadoNominal: null, delta: null },
        inflacao: { real: null, projetado: null, delta: null },
      };
    }

    // ---- REAL YTD (já calculado pelo TrackingEngine) ----
    const retornoRealYTD = yearSummary?.retorno?.acumuladoPct ?? null; // em %
    const inflacaoRealYTD = yearSummary?.inflacao?.acumuladaPct ?? null; // em %

    // ---- PROJETADO YTD ----
    // Inflação anual do cenário (clientData.inflation está em %, ex: 4.5)
    const inflacaoAnual = toNumber(clientData?.inflation, 4.5) / 100; // decimal
    const inflacaoMensal = annualToMonthlyRate(inflacaoAnual);
    const inflacaoProjetadaYTD = compoundMonthlyRate(inflacaoMensal, monthsCount) * 100; // em %

    // Retorno esperado baseado no perfil (nominal)
    const retornoNominalAnual = getExpectedReturnByProfile(clientData);
    
    // Projetado NOMINAL YTD (para exibição educativa)
    const retornoNominalMensal = annualToMonthlyRate(retornoNominalAnual);
    const retornoProjetadoNominalYTD = compoundMonthlyRate(retornoNominalMensal, monthsCount) * 100; // em %
    
    // Projetado REAL YTD (após descontar inflação)
    const retornoRealAnual = nominalToRealReturn(retornoNominalAnual, inflacaoAnual);
    const retornoRealMensal = annualToMonthlyRate(retornoRealAnual);
    const retornoProjetadoRealYTD = compoundMonthlyRate(retornoRealMensal, monthsCount) * 100; // em %

    // ---- DELTAS (Real informado - Projetado real) em pp ----
    const deltaRetorno = retornoRealYTD != null ? retornoRealYTD - retornoProjetadoRealYTD : null;
    const deltaInflacao = inflacaoRealYTD != null ? inflacaoRealYTD - inflacaoProjetadaYTD : null;

    return {
      hasData: true,
      monthsCount,
      retorno: {
        real: retornoRealYTD,
        projetadoReal: retornoProjetadoRealYTD,
        projetadoNominal: retornoProjetadoNominalYTD,
        delta: deltaRetorno,
      },
      inflacao: {
        real: inflacaoRealYTD,
        projetado: inflacaoProjetadaYTD,
        delta: deltaInflacao,
      },
    };
  }, [tracking?.yearSummary, clientData]);

  // ✅ EM TRACKING: original = planejado ancorado; adjusted = real ancorado
const trackingOriginalSeries =
  tracking?.engines?.planejado?.series ||
  tracking?.engines?.original?.series ||
  tracking?.engines?.baseline?.series ||
  [];

const trackingAdjustedSeries =
  tracking?.engines?.ajustado?.series ||
  tracking?.engines?.updated?.series ||
  [];

const seriesOriginal = showTracking
  ? tracking?.engines?.original?.series || tracking?.engines?.planejado?.series || engineOutput?.series || []
  : engineOutput?.series || [];

const seriesAdjusted = showTracking
  ? tracking?.engines?.ajustado?.series || engineOutput?.series || []
  : engineOutput?.series || [];

  const displayedTopKpis = useMemo(() => {
    if (!showTracking) return kpisNormalized;
    if (!tracking) return kpisNormalized;

    return {
      ...kpisNormalized,
      sustainableIncome: tracking.renda?.planejadaAtualizada ?? kpisNormalized.sustainableIncome,
      goalPercentage: tracking.coberturaMeta?.atualizada ?? kpisNormalized.goalPercentage,
      requiredCapital:
        tracking?.engines?.ajustado?.kpis?.requiredCapital ??
        tracking?.engines?.ajustado?.kpis?.capitalNecessario ??
        kpisNormalized.requiredCapital,
    };
  }, [showTracking, tracking, kpisNormalized]);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {isStressTest && (
        <div className="p-4 rounded-2xl border border-danger/30 bg-danger-subtle/30 backdrop-blur-md flex items-start gap-4 shadow-sm">
          <div className="p-2 bg-danger/20 rounded-lg text-danger mt-1">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="font-bold text-danger text-lg font-display">Cenário de Stress Ativo</h4>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">
              Testando a robustez do plano com premissas severas: Inflação <b>+{CONFIG.STRESS_INFLATION_ADD} p.p.</b> e Retorno{" "}
              <b>-{CONFIG.STRESS_RETURN_SUB} p.p.</b>.
            </p>
          </div>
        </div>
      )}

      {/* Toggle + Ano */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="inline-flex rounded-2xl border border-border bg-surface/30 overflow-hidden">
          <button
            onClick={() => setMode("simulation")}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 transition ${
              !showTracking ? "bg-accent/15 text-accent" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <LineChart size={18} />
            Simulação
          </button>

          <button
            onClick={() => setMode("tracking")}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 transition ${
              showTracking ? "bg-accent/15 text-accent" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Calendar size={18} />
            Acompanhamento
          </button>
        </div>

        {showTracking && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary font-semibold">Ano:</span>
            <select
              value={selectedYear || ""}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <span className="text-xs text-text-secondary">
              {scenarioTracking?.monthly?.some((m) => Number(m?.year) === Number(selectedYear))
                ? ""
                : "(sem lançamentos neste ano)"}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* KPIs topo + Wealth Score */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StyledKPICard
            label="Renda Sustentável"
            value={formatCurrencyBR(displayedTopKpis.sustainableIncome || 0)}
            subtext={showTracking && tracking ? "Mensal Vitalício (Plano Atualizado)" : "Mensal Vitalício (Plano)"}
            icon={TrendingUp}
            isHero={true}
          />

          <StyledKPICard
            label="Cobertura da Meta"
            value={formatPercent(displayedTopKpis.goalPercentage || 0)}
            subtext={`Necessário: ${formatCurrencyBR(displayedTopKpis.requiredCapital || 0)}`}
            icon={Target}
          />

          {viewMode === "advisor" ? (
            <StyledKPICard
              label="Iliquidez Atual"
              value={formatPercent(displayedTopKpis.illiquidityRatioCurrent || 0)}
              subtext="Parcela do patrimônio em bens"
              icon={Building2}
            />
          ) : (
            <StyledKPICard
              label="Diagnóstico"
              value={displayedTopKpis.sustainabilityLabel || "Em análise"}
              subtext="Status do planejamento"
              icon={Sparkles}
            />
          )}

          <div className="relative overflow-hidden rounded-2xl border p-6 bg-gradient-to-br from-surface-highlight to-background-secondary border-accent/20 shadow-soft">
            <h4 className="text-accent text-xs font-bold uppercase tracking-wider mb-4">Wealth Score</h4>
            <div className="relative h-4 bg-background rounded-full overflow-hidden shadow-inner border border-border">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
                style={{ width: `${displayedTopKpis.wealthScore || 0}%` }}
              />
            </div>
            <div className="mt-4 font-display text-5xl font-bold text-text-primary">{displayedTopKpis.wealthScore || 0}</div>
            <p className="text-xs text-text-secondary mt-2">Índice de robustez do plano</p>
          </div>
        </div>

        {/* Acompanhamento Mensal */}
        {showTracking && (
          <Card
            title="Acompanhamento Mensal"
            action={
              scenarioId ? (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/20">
                  Ativo
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-surface-highlight text-text-secondary border border-border">
                  Sem cenário
                </span>
              )
            }
          >
            {!scenarioId || !setTrackingByScenario ? (
              <div className="text-sm text-text-secondary leading-relaxed">
                O Dashboard não recebeu <b>scenarioId</b> e/ou <b>setTrackingByScenario</b>. Confira o App.jsx.
              </div>
            ) : (
              <MonthlyTrackingCard
                scenarioId={scenarioId}
                trackingByScenario={trackingByScenario}
                setTrackingByScenario={setTrackingByScenario}
                selectedYear={selectedYear}
              />
            )}
          </Card>
        )}

        {/* Comparativo */}
        {showTracking && (
          <Card
            title="Acompanhamento vs Planejado"
            action={
              tracking ? (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/20">
                  Acompanhamento ativo
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-surface-highlight text-text-secondary border border-border">
                  Sem histórico ainda
                </span>
              )
            }
          >
            {!tracking ? (
              <div className="text-sm text-text-secondary leading-relaxed">
                Ainda não há dados suficientes para recalcular o plano. Lance pelo menos 1 mês no Acompanhamento Mensal.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="rounded-2xl border border-border bg-surface/30 p-5">
                  <div className="text-xs text-text-secondary font-bold uppercase">Patrimônio hoje</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Planejado</span>
                      <span className="font-bold text-text-primary">{formatCurrencyBR(tracking.patrimonio.planejadoHoje)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Real</span>
                      <span className="font-bold text-text-primary">{formatCurrencyBR(tracking.patrimonio.realHoje)}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-sm font-bold text-text-secondary">Delta</span>
                      <span className={`text-sm font-extrabold ${tracking.patrimonio.delta >= 0 ? "text-success" : "text-danger"}`}>
                        {tracking.patrimonio.delta >= 0 ? "+" : ""}
                        {formatCurrencyBR(tracking.patrimonio.delta)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/30 p-5">
                  <div className="text-xs text-text-secondary font-bold uppercase">Renda vitalícia (estimada)</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Original</span>
                      <span className="font-bold text-text-primary">{formatCurrencyBR(tracking.renda.planejadaOriginal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Atualizada</span>
                      <span className="font-bold text-text-primary">{formatCurrencyBR(tracking.renda.planejadaAtualizada)}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-sm font-bold text-text-secondary">Delta</span>
                      <span className={`text-sm font-extrabold ${tracking.renda.delta >= 0 ? "text-success" : "text-danger"}`}>
                        {tracking.renda.delta >= 0 ? "+" : ""}
                        {formatCurrencyBR(tracking.renda.delta)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/30 p-5">
                  <div className="text-xs text-text-secondary font-bold uppercase">Cobertura da meta</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Original</span>
                      <span className="font-bold text-text-primary">{formatPercent(tracking.coberturaMeta.original)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Atualizada</span>
                      <span className="font-bold text-text-primary">{formatPercent(tracking.coberturaMeta.atualizada)}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-sm font-bold text-text-secondary">Delta</span>
                      <span className={`text-sm font-extrabold ${tracking.coberturaMeta.delta >= 0 ? "text-success" : "text-danger"}`}>
                        {tracking.coberturaMeta.delta >= 0 ? "+" : ""}
                        {formatPercent(tracking.coberturaMeta.delta)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ✅ Resumo do ano (voltou) */}
                {tracking?.yearSummary?.year && (
                  <div className="md:col-span-3 rounded-2xl border border-border bg-surface/30 p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="text-sm font-extrabold text-text-primary">
                        Resumo do ano: <span className="text-accent">{tracking.yearSummary.year}</span>
                        {ytdComparison.hasData && (
                          <span className="text-text-muted font-normal text-xs ml-2">
                            ({ytdComparison.monthsCount} {ytdComparison.monthsCount === 1 ? 'mês lançado' : 'meses lançados'})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary flex items-center gap-3">
                        <span>
                          Inflação YTD:{" "}
                          <b className="text-text-primary">
                            {ytdComparison.hasData
                              ? formatPercentPtBr(ytdComparison.inflacao.real, { decimals: 2 })
                              : "—"}
                          </b>
                        </span>
                        {ytdComparison.hasData && (
                          <span className="text-text-muted">
                            vs Projetado: <b>{formatPercentPtBr(ytdComparison.inflacao.projetado, { decimals: 2 })}</b>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="rounded-xl border border-border bg-background-secondary/40 p-4">
                        <div className="text-xs text-text-secondary font-bold uppercase">Aportes (ano)</div>
                        <div className="mt-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Planejado</span>
                            <span className="font-bold">
                              {formatCurrencyBR(tracking.yearSummary.aportes?.planejado ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Real</span>
                            <span className="font-bold">
                              {formatCurrencyBR(tracking.yearSummary.aportes?.real ?? 0)}
                            </span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                            <span className="text-text-secondary font-bold">Delta</span>
                            <span className={`font-extrabold ${(tracking.yearSummary.aportes?.delta ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                              {(tracking.yearSummary.aportes?.delta ?? 0) >= 0 ? "+" : ""}
                              {formatCurrencyBR(tracking.yearSummary.aportes?.delta ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Retorno YTD com comparação */}
                      <div className="rounded-xl border border-border bg-background-secondary/40 p-4">
                        <div className="text-xs text-text-secondary font-bold uppercase">
                          Retorno Real (YTD)
                          {ytdComparison.hasData && (
                            <span className="text-text-muted font-normal ml-1">
                              ({ytdComparison.monthsCount} {ytdComparison.monthsCount === 1 ? 'mês' : 'meses'})
                            </span>
                          )}
                        </div>
                        {ytdComparison.hasData ? (
                          <div className="mt-2 text-sm space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-text-secondary">Real informado</span>
                              <span className="font-bold text-lg">
                                {formatPercentPtBr(ytdComparison.retorno.real, { decimals: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between" title="Retorno projetado após descontar inflação projetada">
                              <span className="text-text-secondary">
                                Proj. Real
                                <span className="text-text-muted text-[10px] ml-1">(líq. inflação)</span>
                              </span>
                              <span className="font-semibold text-text-muted">
                                {formatPercentPtBr(ytdComparison.retorno.projetadoReal, { decimals: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-text-muted" title="Retorno nominal bruto projetado (antes da inflação)">
                              <span className="text-[11px]">
                                Proj. Nominal
                                <span className="text-text-muted text-[10px] ml-1">(bruto)</span>
                              </span>
                              <span className="font-medium text-xs">
                                {formatPercentPtBr(ytdComparison.retorno.projetadoNominal, { decimals: 2 })}
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                              <span className="text-text-secondary font-bold">Delta (Real)</span>
                              <span className={`font-extrabold ${(ytdComparison.retorno.delta ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                                {formatDeltaPp(ytdComparison.retorno.delta, { decimals: 2 })}
                              </span>
                            </div>
                            <div className="text-[10px] text-text-muted mt-1 leading-tight">
                              Real = retorno após descontar inflação projetada
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 text-lg font-display font-extrabold text-text-muted" title="Sem lançamentos">
                            —
                          </div>
                        )}
                      </div>

                      {/* Card Inflação YTD com comparação */}
                      <div className="rounded-xl border border-border bg-background-secondary/40 p-4">
                        <div className="text-xs text-text-secondary font-bold uppercase">
                          Inflação (YTD)
                          {ytdComparison.hasData && (
                            <span className="text-text-muted font-normal ml-1">
                              ({ytdComparison.monthsCount} {ytdComparison.monthsCount === 1 ? 'mês' : 'meses'})
                            </span>
                          )}
                        </div>
                        {ytdComparison.hasData ? (
                          <div className="mt-2 text-sm space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-text-secondary">Real</span>
                              <span className="font-bold text-lg">
                                {formatPercentPtBr(ytdComparison.inflacao.real, { decimals: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-text-secondary">Projetado</span>
                              <span className="font-semibold text-text-muted">
                                {formatPercentPtBr(ytdComparison.inflacao.projetado, { decimals: 2 })}
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                              <span className="text-text-secondary font-bold">Delta</span>
                              <span className={`font-extrabold ${(ytdComparison.inflacao.delta ?? 0) <= 0 ? "text-success" : "text-danger"}`}>
                                {formatDeltaPp(ytdComparison.inflacao.delta, { decimals: 2 })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 text-lg font-display font-extrabold text-text-muted" title="Sem lançamentos">
                            —
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        <Card title={showTracking ? "Evolução Patrimonial (Original vs Atualizado)" : "Evolução Patrimonial Projetada"}>
          <WealthEvolutionChart
            seriesOriginal={seriesOriginal}
            seriesAdjusted={seriesAdjusted}
            clientData={clientData}
            showAdjusted={showTracking}
          />
        </Card>
      </div>
    </div>
  );
}
