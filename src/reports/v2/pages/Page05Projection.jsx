// src/reports/v2/pages/Page05Projection.jsx
// Projeção: gráfico SVG com mesma série do Dashboard + marcadores + ponto sensível + anti-nonsense

import React from "react";
import { Page, View, Text } from "@react-pdf/renderer";
import { C, s } from "../pdfTheme";
import PageFooter from "../components/PageFooter";
import ProjectionChart from "../components/ProjectionChart";

function fmtCurrency(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } catch { return `R$ ${Math.round(v)}`; }
}

export default function Page05Projection({ data, totalPages }) {
  const clientName = data.meta?.clientName || "";
  const { flags, premiseWarnings, sensitivePoint, topEvents, chartSeries, chartPremises } = data;
  const retirementAge = data.clientData?.retirementAge || 60;
  const contributionEndAge = data.clientData?.contributionEndAge || retirementAge;

  const hasSeries = flags.hasSeries;
  // V2-hardening: only render chart + sensitive point when assumptions are valid
  const assumptionsValid = data.assumptionsValid ?? true;
  const canProject = hasSeries && assumptionsValid && flags.hasAssets;

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Projeção Patrimonial</Text>
        <Text style={s.sectionSubtitle}>
          Evolução do patrimônio ao longo do tempo com base nas premissas do cenário
        </Text>
      </View>

      {/* Premise warnings */}
      {premiseWarnings && premiseWarnings.length > 0 && (
        <View style={s.warningBanner}>
          <Text style={s.warningText}>
            ⚠ {Array.isArray(premiseWarnings) ? premiseWarnings.join(" | ") : premiseWarnings}
          </Text>
        </View>
      )}

      {/* Chart or empty state */}
      {canProject ? (
        <>
          <ProjectionChart
            series={chartSeries}
            retirementAge={retirementAge}
            contributionEndAge={contributionEndAge}
            events={topEvents}
            sensitivePoint={sensitivePoint}
          />

          {/* Sensitive point warning — only shown when assumptionsValid */}
          {sensitivePoint && (
            <View style={s.warningBanner}>
              <Text style={s.warningText}>
                ⚠ {sensitivePoint.warning}
              </Text>
            </View>
          )}

          {/* How to read */}
          <View style={s.bulletBox}>
            <Text style={s.bulletTitle}>Como interpretar o gráfico</Text>
            <View style={s.bulletRow}>
              <View style={s.bulletDot} />
              <Text style={s.bulletText}>
                Eixo horizontal: idade do cliente. Eixo vertical: patrimônio financeiro projetado.
              </Text>
            </View>
            <View style={s.bulletRow}>
              <View style={s.bulletDot} />
              <Text style={s.bulletText}>
                A linha tracejada verde indica a aposentadoria ({retirementAge} anos). Após ela, saques para renda reduzem o patrimônio.
              </Text>
            </View>
            {topEvents.length > 0 && (
              <View style={s.bulletRow}>
                <View style={s.bulletDot} />
                <Text style={s.bulletText}>
                  Marcadores indicam os {topEvents.length} eventos de maior impacto na projeção.
                </Text>
              </View>
            )}
          </View>

          {/* Premises */}
          {chartPremises && chartPremises.length > 0 && (
            <View style={s.bulletBox}>
              <Text style={s.bulletTitle}>Premissas utilizadas</Text>
              {chartPremises.map((p, i) => (
                <View key={i} style={s.bulletRow}>
                  <View style={s.bulletDot} />
                  <Text style={s.bulletText}>{p}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={s.emptyState}>
          <Text style={s.emptyStateText}>
            {!flags.hasAssets
              ? "Cadastre ativos no planejamento para visualizar a projeção patrimonial."
              : !assumptionsValid
                ? "Projeção indisponível — revise as premissas de retorno e inflação nos Dados do Cliente para garantir que estejam em faixas válidas."
                : "Dados insuficientes para gerar a projeção. Verifique as premissas do cenário (idades, rentabilidade, aportes)."}
          </Text>
        </View>
      )}

      <PageFooter pageNumber={5} totalPages={totalPages} clientName={clientName} />
    </Page>
  );
}
