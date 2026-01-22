// src/pages/SuccessionPage.jsx
import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Scale, ArrowRight, AlertCircle, CheckCircle2, Shield, ScrollText, Calculator } from "lucide-react";

import { Card, StrategyView } from "../components";
import FinancialEngine from "../engine/FinancialEngine";
import { CONFIG } from "../constants/config";
import { formatCurrencyBR } from "../utils/format";
import { SUCCESSION_STRATEGIES } from "../constants/successionStrategies";
import PrevidenciaSuccessionCard from "../components/succession/PrevidenciaSuccessionCard";
import PGBLEfficiencyCard from "../components/succession/PGBLEfficiencyCard";

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getMonthlyCostNow(clientData) {
  return (
    asNumber(clientData?.monthlyCostNow) ||
    asNumber(clientData?.monthlyCostCurrent) ||
    asNumber(clientData?.monthlyCostAtual) ||
    asNumber(clientData?.custoVidaAtual) ||
    asNumber(clientData?.currentMonthlyCost) ||
    asNumber(clientData?.currentCost) ||
    0
  );
}

function getMonthlyCostRetirement(clientData) {
  return (
    asNumber(clientData?.monthlyCostRetirement) ||
    asNumber(clientData?.monthlyCostAposentadoria) ||
    asNumber(clientData?.retirementMonthlyCost) ||
    asNumber(clientData?.custoVidaAposentadoria) ||
    asNumber(clientData?.retirementCost) ||
    0
  );
}

export default function SuccessionPage() {
  const ctx = useOutletContext() || {};
  const { clientData, analysis, updateField, readOnly } = ctx;
  const kpis = analysis?.kpis;

  if (!clientData) {
    return (
      <div className="p-6 rounded-2xl border border-border bg-surface/40 text-text-secondary">
        Dados do cenário indisponíveis no momento.
      </div>
    );
  }
  const [activeStrategyId, setActiveStrategyId] = useState("overview");
  const [incomeInsuranceBase, setIncomeInsuranceBase] = useState("now");
  const [previdenciaSubTab, setPrevidenciaSubTab] = useState("overview"); // "overview" | "efficiency"

  const monthlyCostNow = useMemo(() => getMonthlyCostNow(clientData), [clientData]);
  const monthlyCostRetirement = useMemo(() => getMonthlyCostRetirement(clientData), [clientData]);

  const monthlyBaseCost =
    incomeInsuranceBase === "retirement" ? monthlyCostRetirement : monthlyCostNow;

  // ✅ Passa o clientData inteiro para considerar successionCosts, state e assets
  const successionInfo = useMemo(() => {
    return FinancialEngine.calculateSuccession(clientData);
  }, [clientData?.state, clientData?.assets, clientData?.successionCosts]);

  const pieData = useMemo(
    () => [
      { name: "Financeiro", value: successionInfo?.financialTotal || 0, color: "#10b981" },
      { name: "Bens", value: successionInfo?.illiquidTotal || 0, color: "#6366f1" },
    ],
    [successionInfo]
  );

  const estimatedSavings = useMemo(() => {
    const total = successionInfo?.costs?.total || 0;
    return total * (CONFIG?.SUCCESSION_SAVINGS_PCT || 0.2);
  }, [successionInfo]);

  const activeStrategy = useMemo(
    () => SUCCESSION_STRATEGIES.find((s) => s.id === activeStrategyId),
    [activeStrategyId]
  );

  const incomeInsurance12 = useMemo(
    () => (asNumber(monthlyBaseCost) || 0) * 12,
    [monthlyBaseCost]
  );
  const incomeInsurance60 = useMemo(
    () => (asNumber(monthlyBaseCost) || 0) * 60,
    [monthlyBaseCost]
  );

  return (
    <div className="space-y-6">
      {/* Navegação de Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveStrategyId("overview")}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
            activeStrategyId === "overview"
              ? "bg-gold-500 text-navy-950"
              : "bg-navy-800 text-slate-300 hover:bg-navy-700 border border-white/10"
          }`}
        >
          Visão Geral
        </button>

        {SUCCESSION_STRATEGIES.map((st) => (
          <button
            key={st.id}
            onClick={() => setActiveStrategyId(st.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeStrategyId === st.id
                ? "bg-gold-500 text-navy-950"
                : "bg-navy-800 text-slate-300 hover:bg-navy-700 border border-white/10"
            }`}
          >
            {activeStrategyId === st.id && <CheckCircle2 size={14} />}
            {st.title}
          </button>
        ))}

        {/* Nova aba: Previdência Privada */}
        <button
          onClick={() => setActiveStrategyId("previdencia-tab")}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeStrategyId === "previdencia-tab"
              ? "bg-violet-500 text-white"
              : "bg-navy-800 text-slate-300 hover:bg-navy-700 border border-white/10"
          }`}
        >
          {activeStrategyId === "previdencia-tab" && <ScrollText size={14} />}
          Previdência Privada
        </button>

        {/* Nova aba: Eficiência PGBL */}
        <button
          onClick={() => setActiveStrategyId("pgbl-efficiency")}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeStrategyId === "pgbl-efficiency"
              ? "bg-amber-500 text-navy-950"
              : "bg-navy-800 text-slate-300 hover:bg-navy-700 border border-white/10"
          }`}
        >
          {activeStrategyId === "pgbl-efficiency" && <Calculator size={14} />}
          Eficiência Fiscal PGBL
        </button>
      </div>

      {activeStrategyId === "overview" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Composição Patrimonial */}
          <Card title="Composição Patrimonial" className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row items-center gap-8 h-full">
              <div className="w-full sm:w-1/2 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                      {pieData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatCurrencyBR(v)}
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend verticalAlign="bottom" wrapperStyle={{ color: "#cbd5e1" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 font-bold uppercase">Liquidez Imediata</p>
                    <p className="text-lg font-bold text-emerald-300">
                      {formatCurrencyBR(successionInfo?.financialTotal || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <p className="text-xs text-indigo-400 font-bold uppercase">Patrimônio Imobilizado</p>
                    <p className="text-lg font-bold text-indigo-300">
                      {formatCurrencyBR(successionInfo?.illiquidTotal || 0)}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed">
                  <b>Obs.:</b> “Financeiro” é o que pode sustentar renda/aposentadoria (alta liquidez). “Bens” entra em
                  sucessão, mas não deve inflar o capital de aposentadoria.
                </div>
              </div>
            </div>
          </Card>

          {/* Custos do Inventário */}
          <Card title="Custos do Inventário">
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-white/10 py-2">
                  <span className="text-slate-300">Imposto (ITCMD)</span>
                  <span className="font-bold text-white">
                    {formatCurrencyBR(successionInfo?.costs?.itcmd || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 py-2">
                  <span className="text-slate-300">Honorários</span>
                  <span className="font-bold text-white">
                    {formatCurrencyBR(successionInfo?.costs?.legal || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 py-2">
                  <span className="text-slate-300">Custas</span>
                  <span className="font-bold text-white">
                    {formatCurrencyBR(successionInfo?.costs?.fees || 0)}
                  </span>
                </div>
              </div>

              <div className="bg-navy-900/50 -mx-6 -mb-6 p-6 border-t border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300 font-bold">Total Estimado</span>
                  <span className="text-xl font-bold text-rose-400">
                    {formatCurrencyBR(successionInfo?.costs?.total || 0)}
                  </span>
                </div>

                {(successionInfo?.liquidityGap || 0) > 0 ? (
                  <div className="mt-3 p-3 bg-rose-950/30 border border-rose-500/30 rounded-lg shadow-sm flex items-center gap-2 text-rose-300 text-xs">
                    <AlertCircle size={16} /> Gap de liquidez:{" "}
                    {formatCurrencyBR(successionInfo?.liquidityGap || 0)}
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg shadow-sm flex items-center gap-2 text-emerald-300 text-xs">
                    <CheckCircle2 size={16} /> Liquidez suficiente
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Seguro de Renda (Incapacidade) */}
          <Card title="Seguro de Renda (Incapacidade)" className="lg:col-span-3">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-start gap-3 md:w-1/3">
                <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                  <Shield size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">Capital de proteção</h4>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    Estimativa do capital necessário para cobrir o custo de vida caso o cliente fique incapaz de gerar renda.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setIncomeInsuranceBase("now")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        incomeInsuranceBase === "now"
                          ? "bg-gold-500 text-navy-950 border-gold-500"
                          : "bg-transparent text-slate-300 border-slate-600 hover:bg-white/5"
                      }`}
                    >
                      Usar custo atual
                    </button>
                    <button
                      onClick={() => setIncomeInsuranceBase("retirement")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        incomeInsuranceBase === "retirement"
                          ? "bg-gold-500 text-navy-950 border-gold-500"
                          : "bg-transparent text-slate-300 border-slate-600 hover:bg-white/5"
                      }`}
                    >
                      Usar custo aposentadoria
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-slate-400">
                    Base mensal: <b className="text-slate-200">{formatCurrencyBR(monthlyBaseCost || 0)}</b>
                    {incomeInsuranceBase === "now" && monthlyCostNow === 0 ? (
                      <span className="block mt-1 text-amber-300">
                        Obs.: “Custo de Vida Atual” não foi encontrado no cenário. Verifique o campo salvo no clientData.
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-white/10 bg-navy-900/30">
                  <div className="text-xs font-bold uppercase text-slate-400">Cobertura 12 meses</div>
                  <div className="mt-1 text-2xl font-bold text-white">{formatCurrencyBR(incomeInsurance12)}</div>
                  <div className="mt-2 text-xs text-slate-500">Para manter o padrão de vida por 1 ano.</div>
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-navy-900/30">
                  <div className="text-xs font-bold uppercase text-slate-400">Cobertura 60 meses</div>
                  <div className="mt-1 text-2xl font-bold text-white">{formatCurrencyBR(incomeInsurance60)}</div>
                  <div className="mt-2 text-xs text-slate-500">Para manter o padrão de vida por 5 anos.</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Economia Potencial */}
          <div className="lg:col-span-3">
            <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-xl p-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                <Scale size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Economia Potencial com Planejamento</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  Com estratégias como holding e previdência, é possível reduzir custos e agilizar o processo.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                  <div className="px-4 py-2 bg-navy-950/50 rounded-lg border border-white/10 shadow-sm w-full sm:w-auto text-center sm:text-left">
                    <span className="block text-xs font-bold text-slate-400 uppercase">Custo Atual</span>
                    <span className="font-bold text-white">
                      {formatCurrencyBR(successionInfo?.costs?.total || 0)}
                    </span>
                  </div>
                  <ArrowRight className="text-indigo-400 hidden sm:block" />
                  <div className="px-4 py-2 bg-emerald-900/30 rounded-lg border border-emerald-500/20 shadow-sm w-full sm:w-auto text-center sm:text-left">
                    <span className="block text-xs font-bold text-emerald-400 uppercase">Economia Estimada (~20%)</span>
                    <span className="font-bold text-emerald-300">{formatCurrencyBR(estimatedSavings)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco de Previdência na Visão Geral */}
          {(successionInfo?.previdenciaTotal || 0) > 0 && (
            <div className="lg:col-span-3">
              <Card title="Previdência na Sucessão" className="bg-violet-900/20 border-violet-500/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-xs text-violet-400 font-bold uppercase">Total Previdência</p>
                    <p className="text-2xl font-bold text-violet-300">{formatCurrencyBR(successionInfo.previdenciaTotal)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 font-bold uppercase">VGBL</p>
                    <p className="text-2xl font-bold text-emerald-300">{formatCurrencyBR(successionInfo.previdenciaVGBL || 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400 font-bold uppercase">PGBL</p>
                    <p className="text-2xl font-bold text-amber-300">{formatCurrencyBR(successionInfo.previdenciaPGBL || 0)}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-text-muted">
                  Previdência privada costuma ficar fora do inventário e ser paga diretamente aos beneficiários.
                  Clique na aba "Previdência Privada" para mais detalhes.
                </p>
              </Card>
            </div>
          )}
        </div>
      ) : activeStrategyId === "previdencia-tab" ? (
        <PrevidenciaSuccessionCard
          clientData={clientData}
          succession={successionInfo}
          updateField={updateField}
          readOnly={readOnly}
        />
      ) : activeStrategyId === "pgbl-efficiency" ? (
        <PGBLEfficiencyCard clientData={clientData} readOnly={readOnly} />
      ) : (
        activeStrategy && (
          <StrategyView
            strategy={activeStrategy}
            kpis={kpis}
            succession={successionInfo}
            clientData={clientData}
          />
        )
      )}
    </div>
  );
}
