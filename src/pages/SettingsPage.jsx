// src/pages/SettingsPage.jsx
import React, { useMemo } from "react";
import {
  ToggleLeft,
  ToggleRight,
  Settings,
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
import { formatPercent } from "../utils/format";

const PROFILE_OPTIONS = [
  { value: "Conservador", label: "Conservador" },
  { value: "Moderado", label: "Moderado" },
  { value: "Arrojado", label: "Arrojado" },
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

export default function SettingsPage({
  clientData,
  kpis, // ✅ necessário para o PDF unificado
  handleUpdate,
  readOnly,
  aiEnabled,
  toggleAi,
}) {
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

  const updateSuccessionCostField = (key, value) => {
    const next = { ...(clientData.successionCosts || {}) };
    next[key] = value;
    handleUpdate("successionCosts", next);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Cabeçalho + Botão PDF (canto superior direito) */}
      <div className="flex items-start justify-between gap-4 mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-navy-800/50 rounded-xl border border-white/5 shadow-inner">
            <Settings className="text-gold-400" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-serif text-white tracking-wide">
              Ajustes & Premissas
            </h2>
            <p className="text-slate-400 mt-1">
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
          <Card title="Dados da Simulação" icon={User}>
            <div className="grid grid-cols-1 gap-5 relative z-10">
              <InputField
                label="Nome do Cliente"
                value={clientData.name}
                onChange={(v) => handleUpdate("name", v)}
                type="text"
                readOnly={readOnly}
                placeholder="Ex: João Silva"
              />
              <InputField
                label="Nome do Cenário"
                value={clientData.scenarioName}
                onChange={(v) => handleUpdate("scenarioName", v)}
                type="text"
                readOnly={readOnly}
                placeholder="Ex: Cenário Base"
              />

              <div className="pt-4 border-t border-white/10 space-y-4">
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
                <div className="bg-navy-900/50 p-3 rounded-lg border border-white/10 text-xs text-slate-400 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block font-bold text-slate-300 mb-1">
                      ITCMD (máx)
                    </span>
                    {formatPercent(rule.itcmdMax * 100, 2)}
                  </div>
                  <div className="border-l border-white/10">
                    <span className="block font-bold text-slate-300 mb-1">
                      Honorários
                    </span>
                    {formatPercent(honorariosRate * 100, 2)}
                  </div>
                  <div className="border-l border-white/10">
                    <span className="block font-bold text-slate-300 mb-1">
                      Custas
                    </span>
                    {formatPercent(custasRate * 100, 2)}
                  </div>
                </div>

                <p className="text-xs text-slate-500 italic">
                  *Ao trocar a UF, o ITCMD muda. Honorários/Custas seguem as porcentagens acima.
                </p>
              </div>
            </div>

            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl pointer-events-none"></div>
          </Card>

          {/* Card: Aportes & Renda */}
          <Card title="Aportes & Renda do Plano" icon={AlertTriangle}>
            <div className="grid grid-cols-1 gap-5 relative z-10">
              <InputField
                label="Aporte Mensal Base (R$)"
                type="number"
                step="1"
                value={clientData.monthlyContribution}
                onChange={(v) => handleNumericChange("monthlyContribution", v)}
                readOnly={readOnly}
                placeholder="Ex: 3000"
              />

              <InputField
                label="Renda/Custo desejado na Aposentadoria (R$/mês)"
                type="number"
                step="1"
                value={clientData.monthlyCostRetirement}
                onChange={(v) =>
                  handleNumericChange("monthlyCostRetirement", v)
                }
                readOnly={readOnly}
                placeholder="Ex: 15000"
              />

              <InputField
                label="Custo de Vida Atual (R$/mês) — opcional"
                type="number"
                step="1"
                value={clientData.monthlyCostCurrent ?? ""}
                onChange={(v) => handleNumericChange("monthlyCostCurrent", v)}
                readOnly={readOnly}
                placeholder="Ex: 12000"
              />

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

          {/* Card: Horizonte Temporal */}
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

            <div className="mt-6 p-3 bg-navy-900/50 rounded-lg border border-indigo-500/20 flex gap-3 items-start">
              <AlertTriangle size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-300 leading-relaxed">
                O período de usufruto da renda será dos{" "}
                <b>{clientData.retirementAge || 60}</b> aos{" "}
                <b>{clientData.lifeExpectancy || 90}</b> anos.
              </p>
            </div>
          </Card>
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

              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={16} className="text-gold-500" /> Rentabilidade
                  Nominal Bruta (a.a.)
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  <InputField
                    label="Cenário Conservador"
                    type="number"
                    step="0.1"
                    value={clientData.returnRateConservative}
                    onChange={(v) =>
                      handleNumericChange("returnRateConservative", v)
                    }
                    readOnly={readOnly}
                    suffix="%"
                    placeholder="Ex: 8.0"
                  />
                  <InputField
                    label="Cenário Moderado (Padrão)"
                    type="number"
                    step="0.1"
                    value={clientData.returnRateModerate}
                    onChange={(v) =>
                      handleNumericChange("returnRateModerate", v)
                    }
                    readOnly={readOnly}
                    suffix="%"
                    placeholder="Ex: 10.0"
                    className="border-gold-500/30 focus:border-gold-500 bg-navy-900/80"
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
                    <h4 className="text-sm font-bold text-slate-300">
                      Ativar Smart Copilot
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      A IA gera insights educativos sobre o cenário, mas não
                      executa cálculos financeiros.
                    </p>
                  </div>

                  <button
                    onClick={toggleAi}
                    className={`p-2 rounded-full transition-colors ${
                      aiEnabled
                        ? "bg-indigo-500/20 text-indigo-400 shadow-sm"
                        : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    {aiEnabled ? (
                      <ToggleRight size={32} />
                    ) : (
                      <ToggleLeft size={32} />
                    )}
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
