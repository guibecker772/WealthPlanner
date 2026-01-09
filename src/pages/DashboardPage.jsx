// src/pages/DashboardPage.jsx
import React, { useMemo } from "react";
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
  Label,
} from "recharts";
import { Target, TrendingUp, Building2, Sparkles, AlertTriangle } from "lucide-react";
import { CONFIG } from "../constants/config";

import Card from "../components/ui/Card";
import CopilotModule from "../components/CopilotModule";

import FinancialEngine from "../engine/FinancialEngine";
import useSmartCopilot from "../hooks/useSmartCopilot";
import { formatCurrencyBR, formatPercent } from "../utils/format";

// --- Tooltip Customizado ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const wealthData = payload.find((p) => p.dataKey === "wealth" || p.dataKey === "financial");
    const cashInData = payload.find((p) => p.dataKey === "chartCashIn");

    return (
      <div className="bg-surface-highlight/95 border border-accent/20 p-4 rounded-xl shadow-glass backdrop-blur-md relative z-50">
        <p className="text-text-secondary text-sm mb-2 font-medium">Aos {label} anos</p>

        {wealthData && (
          <div>
            <p className="text-2xl font-display font-bold text-text-primary leading-none">
              {formatCurrencyBR(wealthData.value)}
            </p>
            <p className="text-xs text-accent mt-1 font-medium">Patrimônio Projetado</p>
          </div>
        )}

        {cashInData && cashInData.value > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-lg font-display font-bold text-success leading-none flex items-center gap-1">
              + {formatCurrencyBR(cashInData.value)}
            </p>
            <p className="text-xs text-success/80 mt-1 font-medium">Entrada Extraordinária</p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// --- Gráfico de Evolução ---
function WealthEvolutionChart({ series, clientData }) {
  const allGoals = (clientData?.financialGoals || []).filter((g) => (g?.value || 0) > 0);

  const retirementAge = clientData?.retirementAge ?? clientData?.endContributionsAge ?? 60;
  const contributionEndAge = clientData?.contributionEndAge ?? clientData?.endContributionsAge ?? 60;

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
    if (!Array.isArray(series) || series.length === 0) return [];
    return series.map((point) => ({
      ...point,
      wealth: point.financial ?? point.wealth ?? 0,
      chartCashIn: cashInMap[String(point.age)] || null,
    }));
  }, [series, cashInMap]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-text-muted text-sm">
        Sem dados para projeção (verifique idade atual, ativos e premissas).
      </div>
    );
  }

  const maxCashIn = Math.max(...Object.values(cashInMap), 0);
  const maxWealth = Math.max(...chartData.map((d) => d.wealth || 0), 0);
  const yDomainMax = Math.max(maxWealth, maxCashIn) * 1.1;

  const accentColor = "#D4AF37";
  const successColor = "#10b981";
  const gridColor = "rgba(255,255,255,0.05)";
  const axisTextColor = "#9CA3AF";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 10 }}>
        <defs>
          <linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopOpacity={0.3} stopColor={accentColor} />
            <stop offset="100%" stopOpacity={0.05} stopColor={accentColor} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />

        <XAxis
          dataKey="age"
          tick={{ fill: axisTextColor, fontSize: 12, fontFamily: "Inter" }}
          axisLine={{ stroke: gridColor }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
          tick={{ fill: axisTextColor, fontSize: 12, fontFamily: "Inter" }}
          axisLine={false}
          tickLine={false}
          domain={[0, yDomainMax]}
        />

        <Tooltip cursor={false} content={<CustomTooltip />} />

        <Bar dataKey="chartCashIn" name="Entrada de Recurso" fill={successColor} barSize={6} radius={[4, 4, 0, 0]} />

        <Area
          type="monotone"
          dataKey="wealth"
          stroke={accentColor}
          strokeWidth={3}
          fill="url(#colorFin)"
          activeDot={{ r: 6, stroke: accentColor, strokeWidth: 2, fill: "#1A1D2E" }}
        />

        <ReferenceLine
          x={retirementAge}
          stroke={successColor}
          strokeDasharray="5 5"
          label={{ value: "Aposentadoria", position: "top", fill: successColor, fontSize: 11, fontWeight: 600, fontFamily: "Inter" }}
        />

        <ReferenceLine
          x={contributionEndAge}
          stroke="#f97316"
          strokeDasharray="3 3"
          label={{
            value: "Fim Aportes",
            position: "insideTopLeft",
            fill: "#f97316",
            fontSize: 11,
            fontWeight: 600,
            angle: -90,
            offset: 15,
            fontFamily: "Inter",
          }}
        />

        {allGoals.map((g) => (
          <ReferenceLine key={g.id} x={g.age} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.6}>
            <Label value={g.name} position="insideTop" angle={-90} fill="#f43f5e" fontSize={10} offset={20} fontFamily="Inter" />
          </ReferenceLine>
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// --- PÁGINA PRINCIPAL DO DASHBOARD ---
export default function DashboardPage({ clientData, analysis, isStressTest, viewMode, aiEnabled }) {
  const engineOutput = useMemo(() => {
    try {
      return FinancialEngine.run(clientData || {}, isStressTest);
    } catch (e) {
      console.error("FinancialEngine.run error:", e);
      return { kpis: {}, series: [], succession: null };
    }
    // ✅ depende explicitamente de premissas que mudam
  }, [
    clientData,
    isStressTest,
    clientData?.profile,
    clientData?.returnRateConservative,
    clientData?.returnRateModerate,
    clientData?.returnRateBold,
    clientData?.inflation,
    clientData?.assets,
    clientData?.contributionTimeline,
    clientData?.contributionRanges,
    clientData?.cashInEvents,
    clientData?.financialGoals,
    clientData?.state,
    clientData?.successionCosts,
  ]);

  const baseKpis =
    analysis?.kpis && Object.keys(analysis.kpis).length ? analysis.kpis : engineOutput.kpis || {};

  const kpis = useMemo(() => {
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

  const series = engineOutput?.series || [];

  const successionInfo = useMemo(() => {
    try {
      // ✅ isso garante que honorários/custas do clientData entram no cálculo
      return FinancialEngine.calculateSuccession(clientData || {});
    } catch (e) {
      console.error("FinancialEngine.calculateSuccession error:", e);
      return null;
    }
  }, [clientData?.assets, clientData?.state, clientData?.successionCosts]);

  const { generateAnalysis, insights, loading } = useSmartCopilot(
    { kpis, successionInfo, clientData, isStressTest },
    viewMode,
    aiEnabled
  );

  const StyledKPICard = ({ label, value, subtext, icon: Icon, isHero }) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StyledKPICard
              label="Renda Sustentável"
              value={formatCurrencyBR(kpis.sustainableIncome || 0)}
              subtext="Mensal Vitalício (Projetado)"
              icon={TrendingUp}
              isHero={true}
            />

            <StyledKPICard
              label="Cobertura da Meta"
              value={formatPercent(kpis.goalPercentage || 0)}
              subtext={`Necessário: ${formatCurrencyBR(kpis.requiredCapital || 0)}`}
              icon={Target}
            />

            {viewMode === "advisor" ? (
              <StyledKPICard
                label="Iliquidez Atual"
                value={formatPercent(kpis.illiquidityRatioCurrent || 0)}
                subtext="Parcela do patrimônio em bens"
                icon={Building2}
              />
            ) : (
              <StyledKPICard
                label="Diagnóstico"
                value={kpis.sustainabilityLabel || "Em análise"}
                subtext="Status do planejamento"
                icon={Sparkles}
              />
            )}
          </div>

          <Card title="Evolução Patrimonial Projetada">
            <div className="h-[360px] w-full">
              <WealthEvolutionChart series={series} clientData={clientData} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-surface-highlight to-background-secondary border-accent/20">
            <div className="text-center p-2">
              <h4 className="text-accent text-xs font-bold uppercase tracking-wider mb-4">Wealth Score</h4>
              <div className="relative h-4 bg-background rounded-full overflow-hidden shadow-inner border border-border">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
                  style={{ width: `${kpis.wealthScore || 0}%` }}
                />
              </div>
              <div className="mt-4 font-display text-5xl font-bold text-text-primary">{kpis.wealthScore || 0}</div>
              <p className="text-xs text-text-secondary mt-2">Índice de robustez do plano</p>
            </div>
          </Card>

          <CopilotModule
            insights={insights}
            loading={loading}
            onGenerate={generateAnalysis}
            hasData={!!insights}
            aiEnabled={aiEnabled}
          />
        </div>
      </div>
    </div>
  );
}
