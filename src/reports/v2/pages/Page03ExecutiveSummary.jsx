// src/reports/v2/pages/Page03ExecutiveSummary.jsx
// Resumo Executivo: KPI cards grandes, status textual, fallbacks

import React from "react";
import { Page, View, Text } from "@react-pdf/renderer";
import { C, s } from "../pdfTheme";
import PageFooter from "../components/PageFooter";
import { safePrint } from "../reportDataAdapter";

function fmtCurrency(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } catch { return `R$ ${Math.round(v).toLocaleString("pt-BR")}`; }
}
function fmtPct(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(d).replace(".", ",")}%`;
}

function coverageStatus(pct) {
  if (pct == null) return null;
  if (pct >= 95) return { label: "Em linha", style: s.badgeOk };
  if (pct >= 80) return { label: "Em ajuste", style: s.badgeWarn };
  return { label: "Abaixo do ideal", style: s.badgeDanger };
}

export default function Page03ExecutiveSummary({ data, totalPages }) {
  const { kpis, flags } = data;
  const clientName = data.meta?.clientName || "";

  const patrimonio = kpis?.patrimonioTotal?.raw ?? null;
  const income = kpis?.rendaSustentavel?.raw ?? null;
  const coverage = kpis?.coberturaMeta?.raw ?? null;
  const score = kpis?.wealthScore?.raw ?? null;

  // Liquidity = financial+previdencia / total
  const fin = (kpis?.patrimonioFinanceiro?.raw ?? 0) + (kpis?.patrimonioPrevidencia?.raw ?? 0);
  const total = kpis?.patrimonioTotal?.raw ?? 0;
  const liquidityPct = total > 0 ? (fin / total) * 100 : null;

  const cStatus = coverageStatus(coverage);

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Resumo Executivo</Text>
        <Text style={s.sectionSubtitle}>Principais indicadores do planejamento</Text>
      </View>

      {/* Row 1: Patrimônio + Renda */}
      <View style={s.cardGrid}>
        <View style={s.cardHighlight}>
          <Text style={s.cardTitle}>Patrimônio Total</Text>
          <Text style={s.cardValue}>{fmtCurrency(patrimonio)}</Text>
          {liquidityPct != null && (
            <Text style={s.cardHint}>Liquidez: {fmtPct(liquidityPct, 0)}</Text>
          )}
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Renda Sustentável Estimada</Text>
          <Text style={s.cardValue}>
            {income != null ? `${fmtCurrency(income)}/mês` : "—"}
          </Text>
          <Text style={s.cardHint}>
            Renda mensal viável preservando o capital
          </Text>
        </View>
      </View>

      {/* Row 2: Cobertura (hasMeta) ou Capital */}
      <View style={s.cardGrid}>
        {data.hasMeta && coverage != null ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Cobertura da Meta</Text>
            <Text style={s.cardValue}>{data.coverageDisplay || fmtPct(coverage, 0)}</Text>
            {cStatus && <Text style={cStatus.style}>{cStatus.label}</Text>}
            {coverage != null && (
              <View style={[s.progressContainer, { marginTop: 6 }]}>
                <View style={[s.progressBar, { width: `${Math.min(100, coverage)}%` }]} />
              </View>
            )}
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.cardTitle}>{data.hasMeta ? "Cobertura da Meta" : "Capital na Aposentadoria"}</Text>
            <Text style={[s.cardValue, data.hasMeta ? { color: C.muted } : {}]}>
              {data.hasMeta ? "—" : fmtCurrency(data.capitalAtRetirement ?? null)}
            </Text>
            <Text style={s.cardNote}>
              {data.hasMeta
                ? "Dados insuficientes para calcular a cobertura."
                : "Defina uma meta de renda mensal para calcular a cobertura."}
            </Text>
          </View>
        )}

        {flags.hasScore ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Wealth Score</Text>
            <Text style={s.cardValue}>{Math.round(score)}/100</Text>
            <Text style={s.cardHint}>
              Índice de saúde financeira do planejamento
            </Text>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.cardTitle}>Wealth Score</Text>
            <Text style={[s.cardValue, { color: C.muted }]}>—</Text>
            <Text style={s.cardNote}>
              Complete os dados para gerar o score.
            </Text>
          </View>
        )}
      </View>

      {/* Row 3: Liquidez + Aposentadoria */}
      <View style={s.cardGrid}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Liquidez</Text>
          <Text style={s.cardValue}>{liquidityPct != null ? fmtPct(liquidityPct, 0) : "—"}</Text>
          <Text style={s.cardHint}>
            % do patrimônio em ativos financeiros/previdência
          </Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Capital na Aposentadoria</Text>
          <Text style={s.cardValue}>{fmtCurrency(kpis?.capitalAposentadoria?.raw ?? null)}</Text>
          <Text style={s.cardHint}>
            Projeção aos {data.clientData?.retirementAge || "—"} anos
          </Text>
        </View>
      </View>

      {/* Interpretive copy */}
      {flags.hasAssets && (
        <View style={s.bulletBox}>
          <Text style={s.bulletTitle}>Diagnóstico</Text>
          {(data.executiveDiagnostic || []).map((b, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={s.bulletDot} />
              <Text style={s.bulletText}>{b}</Text>
            </View>
          ))}
          {data.hasMeta && coverage != null && coverage < 80 && (
            <View style={s.bulletRow}>
              <View style={[s.bulletDot, { backgroundColor: C.danger }]} />
              <Text style={s.bulletText}>
                A cobertura da meta está abaixo de 80%. Considere revisar aportes ou ajustar a meta.
              </Text>
            </View>
          )}
        </View>
      )}

      <PageFooter pageNumber={3} totalPages={totalPages} clientName={clientName} />
    </Page>
  );
}
