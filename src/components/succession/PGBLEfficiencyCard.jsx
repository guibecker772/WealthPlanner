// src/components/succession/PGBLEfficiencyCard.jsx
import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Calculator, TrendingUp, Info, AlertCircle } from "lucide-react";

import Card from "../ui/Card";
import Input from "../ui/Input";
import { formatCurrencyBR, safeNumber } from "../../utils/format";
import PGBLEngine from "../../engine/pgblEngine";

const { IR_MARGINAL_RATES, projectPGBLAccumulation, formatChartData, calculateProjectionSummary } = PGBLEngine;

// Normaliza valor de input (pode vir como número direto ou evento)
const normalizeInputValue = (valOrEvent) => {
  if (valOrEvent && typeof valOrEvent === 'object' && valOrEvent.target) {
    return valOrEvent.target.value;
  }
  return valOrEvent;
};

export default function PGBLEfficiencyCard({ clientData, readOnly = false }) {
  // ✅ Calcular saldo inicial de PGBL a partir dos ativos existentes
  const initialPgblBalance = useMemo(() => {
    const assets = clientData?.assets || [];
    return assets
      .filter(a => a.type === 'previdencia' && a.planType === 'PGBL')
      .reduce((sum, a) => sum + safeNumber(a.value, 0), 0);
  }, [clientData?.assets]);

  // Inputs do formulário
  const [profession, setProfession] = useState(clientData?.pgblConfig?.profession || "");
  const [currentAge, setCurrentAge] = useState(clientData?.currentAge || 35);
  const [targetAge, setTargetAge] = useState(clientData?.retirementAge || 65);
  const [monthlyIncome, setMonthlyIncome] = useState(25000); // NOVO: Renda mensal
  const [annualIncome, setAnnualIncome] = useState(300000);
  const [annualContribution, setAnnualContribution] = useState(36000);
  const [marginalRate, setMarginalRate] = useState(0.275);
  const [isCompleteDeclaration, setIsCompleteDeclaration] = useState(true);
  const [contributesToINSS, setContributesToINSS] = useState(true);
  const [reinvestTaxSavings, setReinvestTaxSavings] = useState(true);
  const [annualReturnRate, setAnnualReturnRate] = useState(0.08);
  const [adminFeeRate, setAdminFeeRate] = useState(0.01);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Flag para saber se usuário editou manualmente a contribuição
  const [userEditedContribution, setUserEditedContribution] = useState(false);

  // Quando renda mensal muda, atualizar renda anual e contribuição (se não foi editada manualmente)
  useEffect(() => {
    const newAnnualIncome = safeNumber(monthlyIncome) * 12;
    setAnnualIncome(newAnnualIncome);
    
    // Auto-calcular contribuição como 12% da renda anual (limite PGBL)
    if (!userEditedContribution) {
      setAnnualContribution(Math.round(newAnnualIncome * 0.12));
    }
  }, [monthlyIncome, userEditedContribution]);

  // Projeção
  const projection = useMemo(() => {
    return projectPGBLAccumulation({
      currentAge,
      targetAge,
      annualTaxableIncome: annualIncome,
      annualContribution,
      marginalTaxRate: marginalRate,
      annualReturnRate,
      isCompleteDeclaration,
      contributesToINSS,
      reinvestTaxSavings,
      adminFeeRate,
      initialPgblBalance, // ✅ Usar saldo de PGBL existente no patrimônio
    });
  }, [
    currentAge,
    targetAge,
    annualIncome,
    annualContribution,
    marginalRate,
    annualReturnRate,
    isCompleteDeclaration,
    contributesToINSS,
    reinvestTaxSavings,
    adminFeeRate,
    initialPgblBalance, // ✅ Dependência do saldo inicial
  ]);

  const chartData = useMemo(() => formatChartData(projection), [projection]);
  const summary = useMemo(() => calculateProjectionSummary(projection), [projection]);

  // Dedução anual
  const deductionLimit = useMemo(() => {
    if (!isCompleteDeclaration || !contributesToINSS) return 0;
    return Math.min(annualContribution, annualIncome * 0.12);
  }, [annualContribution, annualIncome, isCompleteDeclaration, contributesToINSS]);

  const annualTaxSavings = deductionLimit * marginalRate;

  // Validações
  const warnings = useMemo(() => {
    const w = [];
    if (!isCompleteDeclaration) {
      w.push("Declaração simplificada não permite dedução do PGBL.");
    }
    if (!contributesToINSS) {
      w.push("Sem contribuição ao INSS/regime próprio, não há dedução.");
    }
    if (annualContribution > annualIncome * 0.12) {
      w.push(`Contribuição excede o limite de 12% (${formatCurrencyBR(annualIncome * 0.12)}). O excedente não será dedutível.`);
    }
    return w;
  }, [isCompleteDeclaration, contributesToINSS, annualContribution, annualIncome]);

  return (
    <div className="space-y-6">
      {/* Formulário de Inputs */}
      <Card title="Simulação de Eficiência Fiscal PGBL" className="bg-surface-highlight/20">
        {/* ✅ Saldo inicial de PGBL se existir */}
        {initialPgblBalance > 0 && (
          <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-xl">
            <p className="text-sm text-text-secondary">
              <strong>Saldo PGBL existente:</strong>{" "}
              <span className="text-accent font-semibold">{formatCurrencyBR(initialPgblBalance)}</span>
              <span className="text-text-muted ml-2">(será usado como base da simulação)</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ✅ Campo Profissão */}
          <div className="lg:col-span-2">
            <label className="text-xs text-text-secondary font-semibold">Profissão</label>
            <Input
              type="text"
              placeholder="Ex: Médico, Advogado, Empresário..."
              value={profession}
              onChange={(v) => setProfession(normalizeInputValue(v))}
              disabled={readOnly}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary font-semibold">Idade Atual</label>
            <Input
              type="number"
              min="18"
              max="100"
              value={currentAge}
              onChange={(v) => setCurrentAge(safeNumber(normalizeInputValue(v), 35))}
              disabled={readOnly}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary font-semibold">Idade Alvo (resgate)</label>
            <Input
              type="number"
              min={currentAge + 1}
              max="100"
              value={targetAge}
              onChange={(v) => setTargetAge(safeNumber(normalizeInputValue(v), 65))}
              disabled={readOnly}
              className="mt-1"
            />
          </div>

          {/* NOVO: Renda Mensal */}
          <div>
            <label className="text-xs text-text-secondary font-semibold">Renda Bruta Mensal</label>
            <Input
              type="currency"
              value={monthlyIncome}
              onChange={(v) => {
                const val = safeNumber(normalizeInputValue(v), 0);
                setMonthlyIncome(val);
                // Resetar flag de edição manual quando usuário altera mensal
                setUserEditedContribution(false);
              }}
              disabled={readOnly}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary font-semibold">Renda Tributável Anual</label>
            <Input
              type="currency"
              value={annualIncome}
              onChange={(v) => {
                const val = safeNumber(normalizeInputValue(v), 0);
                setAnnualIncome(val);
                // Atualizar mensal também (sincronizar)
                setMonthlyIncome(Math.round(val / 12));
              }}
              disabled={readOnly}
              className="mt-1"
            />
            <p className="text-[10px] text-text-muted mt-1">= Mensal × 12</p>
          </div>

          <div>
            <label className="text-xs text-text-secondary font-semibold">Contribuição Anual PGBL</label>
            <Input
              type="currency"
              value={annualContribution}
              onChange={(v) => {
                const val = safeNumber(normalizeInputValue(v), 0);
                setAnnualContribution(val);
                setUserEditedContribution(true); // Marcar que usuário editou manualmente
              }}
              disabled={readOnly}
              className="mt-1"
            />
            <p className="text-[10px] text-text-muted mt-1">Limite: 12% = {formatCurrencyBR(annualIncome * 0.12)}</p>
          </div>

          <div>
            <label className="text-xs text-text-secondary font-semibold">Alíquota Marginal IR</label>
            <select
              className="mt-1 w-full bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
              value={marginalRate}
              onChange={(e) => setMarginalRate(Number(e.target.value))}
              disabled={readOnly}
            >
              {IR_MARGINAL_RATES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCompleteDeclaration}
                onChange={(e) => setIsCompleteDeclaration(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
              />
              <span className="text-sm text-text-secondary">Declaração Completa</span>
            </label>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={contributesToINSS}
                onChange={(e) => setContributesToINSS(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
              />
              <span className="text-sm text-text-secondary">Contribui INSS</span>
            </label>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reinvestTaxSavings}
                onChange={(e) => setReinvestTaxSavings(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
              />
              <span className="text-sm text-text-secondary">Investir Economia Fiscal</span>
            </label>
          </div>
        </div>

        {/* Configurações avançadas */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-4 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          {showAdvanced ? "− Ocultar avançado" : "+ Configurações avançadas"}
        </button>

        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-secondary font-semibold">Rentabilidade Anual (%)</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="30"
                value={(annualReturnRate * 100).toFixed(1)}
                onChange={(v) => {
                  const val = safeNumber(normalizeInputValue(v), 8);
                  setAnnualReturnRate(val / 100);
                }}
                disabled={readOnly}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary font-semibold">Taxa Admin PGBL (% a.a.)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={(adminFeeRate * 100).toFixed(1)}
                onChange={(v) => {
                  const val = safeNumber(normalizeInputValue(v), 0);
                  setAdminFeeRate(val / 100);
                }}
                disabled={readOnly}
                className="mt-1"
              />
            </div>

            <div className="flex items-end">
              <p className="text-xs text-text-muted">
                Rentabilidade líquida: {((annualReturnRate - adminFeeRate) * 100).toFixed(1)}% a.a.
              </p>
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-300 space-y-1">
                {warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Calculator size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-amber-400 font-bold uppercase">Dedução Anual</p>
              <p className="text-lg font-bold text-amber-300">{formatCurrencyBR(deductionLimit)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-bold uppercase">Economia Fiscal/Ano</p>
              <p className="text-lg font-bold text-emerald-300">{formatCurrencyBR(annualTaxSavings)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Calculator size={20} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-indigo-400 font-bold uppercase">Saldo PGBL Final</p>
              <p className="text-lg font-bold text-indigo-300">{formatCurrencyBR(summary.finalPgblBalance)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-sky-500/10 border-sky-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/20">
              <TrendingUp size={20} className="text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-sky-400 font-bold uppercase">Benefício Investido</p>
              <p className="text-lg font-bold text-sky-300">{formatCurrencyBR(summary.finalBenefitBalance)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráfico */}
      <Card title="Projeção de Acumulação" className="min-h-[400px]">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="age"
                stroke="hsl(var(--text-faint))"
                tick={{ fill: "hsl(var(--text-faint))", fontSize: 12 }}
                tickFormatter={(v) => `${v}a`}
              />
              <YAxis
                stroke="hsl(var(--text-faint))"
                tick={{ fill: "hsl(var(--text-faint))", fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--chart-tooltip-bg))",
                  border: "1px solid hsl(var(--chart-tooltip-border))",
                  borderRadius: "8px",
                  color: "hsl(var(--chart-tooltip-text))",
                }}
                formatter={(value, name) => [
                  formatCurrencyBR(value),
                  name === "pgbl" ? "Aplicação PGBL" : "Benefício Fiscal",
                ]}
                labelFormatter={(label, payload) => {
                  // Tooltip mostra que o valor é ao final do ano correspondente
                  const year = payload?.[0]?.payload?.year ?? 0;
                  if (year === 0) {
                    return `Aos ${label} anos (final do 1º ano)`;
                  }
                  return `Aos ${label} anos (após ${year + 1} anos de aportes)`;
                }}
              />
              <Legend
                wrapperStyle={{ color: "hsl(var(--text-muted))" }}
                formatter={(value) => (value === "pgbl" ? "Aplicação PGBL" : "Benefício Fiscal")}
              />
              <Bar dataKey="pgbl" stackId="a" fill="#f59e0b" name="pgbl" radius={[0, 0, 0, 0]} />
              <Bar dataKey="benefit" stackId="a" fill="#0ea5e9" name="benefit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500" />
              <span className="text-text-secondary">Aplicação em PGBL</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-sky-500" />
              <span className="text-text-secondary">Benefício Fiscal (economia investida)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Resumo Final */}
      <Card title="Resumo da Projeção" className="bg-gradient-to-br from-indigo-900/30 to-sky-900/30 border-indigo-500/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 rounded-xl bg-surface/30 border border-border">
            <p className="text-xs text-text-muted font-bold uppercase mb-1">Total Aportes</p>
            <p className="text-2xl font-bold text-text">{formatCurrencyBR(summary.totalContributions)}</p>
          </div>

          <div className="text-center p-4 rounded-xl bg-surface/30 border border-border">
            <p className="text-xs text-text-muted font-bold uppercase mb-1">Total Economia Fiscal</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrencyBR(summary.totalTaxSavings)}</p>
          </div>

          <div className="text-center p-4 rounded-xl bg-surface/30 border border-border">
            <p className="text-xs text-text-muted font-bold uppercase mb-1">Patrimônio Final</p>
            <p className="text-2xl font-bold text-accent">{formatCurrencyBR(summary.finalTotal)}</p>
            <p className="text-xs text-text-muted mt-1">
              Crescimento: {formatCurrencyBR(summary.totalGrowth)}
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-surface/20 border border-border">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-text-muted mt-0.5 shrink-0" />
            <p className="text-xs text-text-muted leading-relaxed">
              <b>Nota:</b> Esta simulação considera aportes constantes, rentabilidade fixa e não inclui tributação na saída.
              Os valores são projeções e não garantem resultados futuros. Consulte um profissional para análise personalizada.
              O benefício fiscal só se aplica a quem faz declaração completa e contribui para INSS/regime próprio.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
