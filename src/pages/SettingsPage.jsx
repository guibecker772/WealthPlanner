// src/pages/SettingsPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ToggleLeft,
  ToggleRight,
  UserCircle2, // ✅ ícone novo no header
  User,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";

import {
  Card,
  InputField,
  ApiKeyManager,
  ExportUnifiedReportButton,
} from "../components";
import SelectField from "../components/SelectField";

import { UF_OPTIONS, getStateRule } from "../constants/stateTaxRules";
import { formatPercent, formatMoneyBRL, parsePtBrMoney } from "../utils/format";

const PROFILE_OPTIONS = [
  { value: "Conservador", label: "Conservador" },
  { value: "Moderado", label: "Moderado" },
  { value: "Arrojado", label: "Arrojado" },
];

// ✅ Mês de aniversário (1..12)
const BIRTH_MONTH_OPTIONS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

// ✅ defaults pedidos
const DEFAULT_HONORARIOS_PCT = 0.05; // 5%
const DEFAULT_CUSTAS_PCT = 0.02; // 2%

function normalizePctInputToRate(v, fallbackRate) {
  // aceita "5" => 0.05, aceita 0.05 => 0.05
  const n = Number(v);
  if (!Number.isFinite(n)) return fallbackRate;
  return Math.abs(n) > 1 ? n / 100 : n;
}

export default function SettingsPage() {
  const ctx = useOutletContext() || {};
  const {
    clientData,
    analysis,
    updateField,
    readOnly,
    aiEnabled,
    setAiEnabled,
  } = ctx;

  const kpis = analysis?.kpis;
  const handleUpdate = updateField;
  const toggleAi = () => setAiEnabled?.((v) => !v);

  if (!clientData || typeof handleUpdate !== "function") {
    return (
      <div className="p-6 rounded-2xl border border-border bg-surface/40 text-text-secondary">
        Dados do cenário indisponíveis no momento.
      </div>
    );
  }
  const handleNumericChange = (field, rawValue) => {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      handleUpdate(field, "");
      return;
    }
    const numValue = Number(rawValue);
    if (!isNaN(numValue)) {
      handleUpdate(field, rawValue);
    }
  };

  const getContributionAgeError = () => {
    const age = Number(clientData.contributionEndAge);
    const current = Number(clientData.currentAge);
    const retirement = Number(clientData.retirementAge);

    if (clientData.contributionEndAge && clientData.currentAge && age <= current)
      return "Deve ser maior que idade atual";
    if (clientData.contributionEndAge && clientData.retirementAge && age > retirement)
      return "Deve ser menor/igual aposentadoria";
    return null;
  };

  const uf = clientData.state || "SP";
  const rule = useMemo(() => getStateRule(uf), [uf]);

  // ✅ Honorários/Custas agora vêm do clientData (com fallback)
  const successionCfg = clientData.successionCosts || {};
  const honorariosRate = normalizePctInputToRate(
    successionCfg.legalPct ?? successionCfg.honorariosPct,
    DEFAULT_HONORARIOS_PCT
  );
  const custasRate = normalizePctInputToRate(
    successionCfg.feesPct ?? successionCfg.custasPct,
    DEFAULT_CUSTAS_PCT
  );

  const hasRetirementIncome =
    clientData.monthlyCostRetirement !== "" &&
    clientData.monthlyCostRetirement !== null &&
    clientData.monthlyCostRetirement !== undefined &&
    Number(clientData.monthlyCostRetirement) > 0;

  // ✅ Estados locais para inputs monetários com formatação BRL visual
  const [localMonthlyContribution, setLocalMonthlyContribution] = useState('');
  const [localMonthlyCostRetirement, setLocalMonthlyCostRetirement] = useState('');
  const [localMonthlyCostCurrent, setLocalMonthlyCostCurrent] = useState('');

  // Sincronizar estados locais quando clientData muda (ex: ao trocar cenário)
  useEffect(() => {
    const mc = clientData.monthlyContribution;
    setLocalMonthlyContribution(
      mc !== '' && mc !== null && mc !== undefined && Number(mc) > 0
        ? formatMoneyBRL(Number(mc))
        : ''
    );
  }, [clientData.monthlyContribution]);

  useEffect(() => {
    const mcr = clientData.monthlyCostRetirement;
    setLocalMonthlyCostRetirement(
      mcr !== '' && mcr !== null && mcr !== undefined && Number(mcr) > 0
        ? formatMoneyBRL(Number(mcr))
        : ''
    );
  }, [clientData.monthlyCostRetirement]);

  useEffect(() => {
    const mcc = clientData.monthlyCostCurrent;
    setLocalMonthlyCostCurrent(
      mcc !== '' && mcc !== null && mcc !== undefined && Number(mcc) > 0
        ? formatMoneyBRL(Number(mcc))
        : ''
    );
  }, [clientData.monthlyCostCurrent]);

  // Handler para blur/Enter nos inputs monetários
  const handleMoneyBlur = (field, localValue, setLocalValue, fallbackValue) => {
    const parsed = parsePtBrMoney(localValue, null);
    if (parsed !== null && parsed >= 0) {
      handleUpdate(field, parsed);
      setLocalValue(parsed > 0 ? formatMoneyBRL(parsed) : '');
    } else {
      // Inválido: restaurar do state atual
      const current = Number(fallbackValue);
      setLocalValue(current > 0 ? formatMoneyBRL(current) : '');
    }
  };

  const updateSuccessionCostField = (key, value) => {
    const next = { ...(clientData.successionCosts || {}) };
    next[key] = value;
    handleUpdate("successionCosts", next);
  };

  const birthMonthValue = (() => {
    const bm = Number(clientData.birthMonth);
    return Number.isFinite(bm) && bm >= 1 && bm <= 12 ? bm : 1;
  })();

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Cabeçalho + Botão PDF (canto superior direito) */}
      <div className="flex items-start justify-between gap-4 mb-8 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-surface-2 rounded-xl border border-border shadow-inner">
            <UserCircle2 className="text-gold-400" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-serif text-text tracking-wide">
              Dados do Cliente
            </h2>
            <p className="text-text-faint mt-1">
              Configure os dados do cliente e as bases do cálculo.
            </p>
          </div>
        </div>

        {/* ✅ Botão PDF Unificado */}
        <div className="shrink-0">
          <ExportUnifiedReportButton
            clientData={clientData}
            kpis={kpis}
            defaultIncomeInsuranceBase="now"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- COLUNA DA ESQUERDA --- */}
        <div className="space-y-8">
          {/* Card: Dados do Cliente */}
          <Card title="Dados do Cliente" icon={User}>
            <div className="grid grid-cols-1 gap-5 relative z-10">
              <div data-guide="client-name">
                <InputField
                  label="Nome do Cliente"
                  value={clientData.name}
                  onChange={(v) => handleUpdate("name", v)}
                  type="text"
                  readOnly={readOnly}
                  placeholder="Ex: João Silva"
                />
              </div>
              <InputField
                label="Nome do Cenário"
                value={clientData.scenarioName}
                onChange={(v) => handleUpdate("scenarioName", v)}
                type="text"
                readOnly={readOnly}
                placeholder="Ex: Cenário Base"
              />

              {/* ✅ NOVO: mês de aniversário */}
              <SelectField
                label="Mês de aniversário"
                value={birthMonthValue}
                options={BIRTH_MONTH_OPTIONS}
                onChange={(v) => handleUpdate("birthMonth", Number(v) || 1)}
                disabled={readOnly}
              />

              <div className="pt-4 border-t border-border space-y-4">
                <SelectField
                  label="Estado (UF) - Impacta Custos de Sucessão"
                  value={uf}
                  options={UF_OPTIONS}
                  onChange={(v) => handleUpdate("state", v)}
                  disabled={readOnly}
                />

                {/* ✅ Inputs para Honorários/Custas (%) */}
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Honorários (%)"
                    type="number"
                    step="0.1"
                    value={successionCfg.legalPct ?? "5"}
                    onChange={(v) => updateSuccessionCostField("legalPct", v)}
                    readOnly={readOnly}
                    suffix="%"
                    placeholder="5"
                  />
                  <InputField
                    label="Custas (%)"
                    type="number"
                    step="0.1"
                    value={successionCfg.feesPct ?? "2"}
                    onChange={(v) => updateSuccessionCostField("feesPct", v)}
                    readOnly={readOnly}
                    suffix="%"
                    placeholder="2"
                  />
                </div>

                {/* Bloco de informações de custos */}
                <div className="bg-surface-1 p-3 rounded-lg border border-border text-xs text-text-faint grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block font-bold text-text-muted mb-1">
                      ITCMD (máx)
                    </span>
                    {formatPercent(rule.itcmdMax * 100, 2)}
                  </div>
                  <div className="border-l border-border">
                    <span className="block font-bold text-text-muted mb-1">
                      Honorários
                    </span>
                    {formatPercent(honorariosRate * 100, 2)}
                  </div>
                  <div className="border-l border-border">
                    <span className="block font-bold text-text-muted mb-1">
                      Custas
                    </span>
                    {formatPercent(custasRate * 100, 2)}
                  </div>
                </div>

                <p className="text-xs text-text-faint italic">
                  *Ao trocar a UF, o ITCMD muda. Honorários/Custas seguem as porcentagens acima.
                </p>
              </div>
            </div>

            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl pointer-events-none"></div>
          </Card>

          {/* Card: Aportes & Renda */}
          <div data-guide="costs">
            <Card title="Aportes & Renda do Plano" icon={AlertTriangle}>
              <div className="grid grid-cols-1 gap-5 relative z-10">
                {/* Aporte Mensal Base - com formatação BRL visual */}
                <div data-guide="contribution">
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Aporte Mensal Base (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={localMonthlyContribution}
                    onChange={(e) => setLocalMonthlyContribution(e.target.value)}
                    onBlur={() => handleMoneyBlur('monthlyContribution', localMonthlyContribution, setLocalMonthlyContribution, clientData.monthlyContribution)}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    disabled={readOnly}
                    placeholder="R$ 3.000,00"
                    className="w-full rounded-xl bg-surface-muted border border-border text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50 transition-all duration-200 px-4 py-3 disabled:opacity-60"
                  />
                </div>

                {/* Renda/Custo desejado na Aposentadoria - com formatação BRL visual */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Renda/Custo desejado na Aposentadoria (R$/mês)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={localMonthlyCostRetirement}
                    onChange={(e) => setLocalMonthlyCostRetirement(e.target.value)}
                    onBlur={() => handleMoneyBlur('monthlyCostRetirement', localMonthlyCostRetirement, setLocalMonthlyCostRetirement, clientData.monthlyCostRetirement)}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    disabled={readOnly}
                    placeholder="R$ 15.000,00"
                    className="w-full rounded-xl bg-surface-muted border border-border text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50 transition-all duration-200 px-4 py-3 disabled:opacity-60"
                  />
                </div>

                {/* Custo de Vida Atual - com formatação BRL visual */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Custo de Vida Atual (R$/mês) — opcional
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={localMonthlyCostCurrent}
                    onChange={(e) => setLocalMonthlyCostCurrent(e.target.value)}
                    onBlur={() => handleMoneyBlur('monthlyCostCurrent', localMonthlyCostCurrent, setLocalMonthlyCostCurrent, clientData.monthlyCostCurrent)}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    disabled={readOnly}
                    placeholder="R$ 12.000,00"
                    className="w-full rounded-xl bg-surface-muted border border-border text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50 transition-all duration-200 px-4 py-3 disabled:opacity-60"
                  />
                </div>

                {!readOnly && !hasRetirementIncome && (
                  <div className="mt-2 p-3 bg-danger/10 rounded-lg border border-danger/25 flex gap-3 items-start">
                    <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
                    <p className="text-xs text-danger/90 leading-relaxed">
                      <b>Atenção:</b> sem preencher a{" "}
                      <b>renda/custo desejado na aposentadoria</b>, a{" "}
                      <b>cobertura da meta</b> ficará em <b>0%</b>.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Card: Horizonte Temporal */}
          <div data-guide="ages">
            <Card title="Horizonte Temporal" icon={Calendar}>
              <div className="grid grid-cols-2 gap-5 relative z-10">
              <InputField
                label="Idade Atual"
                type="number"
                value={clientData.currentAge}
                onChange={(v) => handleNumericChange("currentAge", v)}
                readOnly={readOnly}
                suffix="anos"
                min="0"
                max="120"
                placeholder="Ex: 35"
              />
              <InputField
                label="Fim dos Aportes"
                type="number"
                value={clientData.contributionEndAge}
                onChange={(v) => handleNumericChange("contributionEndAge", v)}
                readOnly={readOnly}
                suffix="anos"
                placeholder="Idade"
                error={getContributionAgeError()}
              />
              <InputField
                label="Idade Aposentadoria"
                type="number"
                value={clientData.retirementAge}
                onChange={(v) => handleNumericChange("retirementAge", v)}
                readOnly={readOnly}
                suffix="anos"
                placeholder="Início renda"
              />
              <InputField
                label="Expectativa de Vida"
                type="number"
                value={clientData.lifeExpectancy}
                onChange={(v) => handleNumericChange("lifeExpectancy", v)}
                readOnly={readOnly}
                suffix="anos"
                placeholder="Fim do plano"
              />
            </div>

            <div className="mt-6 p-3 bg-surface-1 rounded-lg border border-indigo-500/20 flex gap-3 items-start">
              <AlertTriangle size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-300 leading-relaxed">
                O período de usufruto da renda será dos{" "}
                <b>{clientData.retirementAge || 60}</b> aos{" "}
                <b>{clientData.lifeExpectancy || 90}</b> anos.
              </p>
            </div>
            </Card>
          </div>
        </div>

        {/* --- COLUNA DA DIREITA --- */}
        <div className="space-y-8">
          <Card
            title="Premissas Econômicas & Perfil"
            icon={TrendingUp}
            className="border-gold-500/20 shadow-glow-gold-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-[50px] -mr-12 -mt-12 pointer-events-none"></div>

            <div className="space-y-6 relative z-10">
              <SelectField
                label="Perfil de Investidor (Referência)"
                value={clientData.profile}
                options={PROFILE_OPTIONS}
                onChange={(v) => handleUpdate("profile", v)}
                disabled={readOnly}
              />

              <InputField
                label="Inflação Projetada (IPCA a.a.)"
                type="number"
                step="0.1"
                value={clientData.inflation}
                onChange={(v) => handleNumericChange("inflation", v)}
                readOnly={readOnly}
                suffix="%"
                placeholder="Ex: 4.0"
                className="font-bold text-gold-100 border-gold-500/30 focus:border-gold-500"
              />

              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-bold text-text-muted mb-4 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={16} className="text-gold-500" /> Rentabilidade
                  Nominal Bruta (a.a.)
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  <InputField
                    label="Cenário Conservador"
                    type="number"
                    step="0.1"
                    value={clientData.returnRateConservative}
                    onChange={(v) => handleNumericChange("returnRateConservative", v)}
                    readOnly={readOnly}
                    suffix="%"
                    placeholder="Ex: 8.0"
                  />
                  <InputField
                    label="Cenário Moderado (Padrão)"
                    type="number"
                    step="0.1"
                    value={clientData.returnRateModerate}
                    onChange={(v) => handleNumericChange("returnRateModerate", v)}
                    readOnly={readOnly}
                    suffix="%"
                    placeholder="Ex: 10.0"
                    className="border-gold-500/30 focus:border-gold-500 bg-surface-1"
                  />
                  <InputField
                    label="Cenário Arrojado"
                    type="number"
                    step="0.1"
                    value={clientData.returnRateBold}
                    onChange={(v) => handleNumericChange("returnRateBold", v)}
                    readOnly={readOnly}
                    suffix="%"
                    placeholder="Ex: 12.0"
                  />
                </div>
              </div>
            </div>
          </Card>

          {!readOnly && (
            <>
              <Card title="Inteligência Artificial">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h4 className="text-sm font-bold text-text-muted">
                      Ativar Smart Copilot
                    </h4>
                    <p className="text-xs text-text-faint mt-1">
                      A IA gera insights educativos sobre o cenário, mas não
                      executa cálculos financeiros.
                    </p>
                  </div>

                  <button
                    onClick={toggleAi}
                    className={`p-2 rounded-full transition-colors ${
                      aiEnabled
                        ? "bg-indigo-500/20 text-indigo-400 shadow-sm"
                        : "bg-surface-3 text-text-faint"
                    }`}
                  >
                    {aiEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
              </Card>

              <ApiKeyManager />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
