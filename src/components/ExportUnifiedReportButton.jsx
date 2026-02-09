// src/components/ExportUnifiedReportButton.jsx
import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";

import FinancialEngine from "../engine/FinancialEngine";
import { CONFIG } from "../constants/config";
import ClientUnifiedReportPDF from "../reports/ClientUnifiedReportPDF";

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getClientName(clientData) {
  return (
    clientData?.name ||
    clientData?.clientName ||
    clientData?.nomeCliente ||
    "Cliente"
  );
}

function getScenarioName(clientData) {
  return (
    clientData?.scenarioName ||
    clientData?.nomeCenario ||
    clientData?.scenario ||
    "Cenario"
  );
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

export default function ExportUnifiedReportButton({
  clientData,
  kpis,
  defaultIncomeInsuranceBase = "now", // "now" | "retirement"
  className = "",
}) {
  const [loading, setLoading] = useState(false);

  // ✅ Agora pega successionCosts junto (chamando com clientData)
  const successionInfo = useMemo(() => {
    return FinancialEngine.calculateSuccession(clientData || {});
  }, [clientData?.assets, clientData?.state, clientData?.successionCosts]);

  const incomeInsuranceBase = defaultIncomeInsuranceBase;

  const monthlyNow = getMonthlyCostNow(clientData);
  const monthlyRet = getMonthlyCostRetirement(clientData);

  const monthlyBase =
    incomeInsuranceBase === "retirement" ? monthlyRet : monthlyNow;

  const handleExport = async () => {
    try {
      setLoading(true);

      const doc = (
        <ClientUnifiedReportPDF
          clientData={clientData}
          kpis={kpis}
          succession={successionInfo}
          config={CONFIG}
          incomeInsuranceBase={incomeInsuranceBase}
          monthlyBaseCost={monthlyBase}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const clientName = getClientName(clientData).toString().trim().replace(/\s+/g, "_");
      const scenarioName = getScenarioName(clientData).toString().trim().replace(/\s+/g, "_");

      a.href = url;
      a.download = `Relatorio_Unificado_${clientName}_${scenarioName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar PDF unificado:", err);
      alert("Não foi possível gerar o PDF. Verifique se @react-pdf/renderer está instalado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={
        `
        inline-flex items-center gap-2
        px-4 py-2 rounded-lg text-sm font-bold
        border border-border
        bg-surface-1 hover:bg-surface-2
        text-text-muted
        transition
        disabled:opacity-60 disabled:cursor-not-allowed
        ` + className
      }
      title="Exporta Visão Executiva + Planejamento Sucessório em um único PDF"
    >
      <Download size={16} />
      {loading ? "Gerando PDF..." : "Exportar Relatório (PDF)"}
    </button>
  );
}
