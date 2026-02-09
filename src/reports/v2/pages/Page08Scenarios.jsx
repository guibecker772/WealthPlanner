// src/reports/v2/pages/Page08Scenarios.jsx
// Cenários: SEMPRE Base + Consumo + Preservação (V2-hardening)

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { C, s } from "../pdfTheme";
import PageFooter from "../components/PageFooter";

const cs = StyleSheet.create({
  scenarioCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    backgroundColor: C.white,
  },
  scenarioCardBase: {
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    backgroundColor: C.goldBg,
  },
  scenarioUnavailable: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fafafa",
    opacity: 0.7,
  },
  scenarioName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 6,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  metricBox: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    backgroundColor: C.cream,
  },
  metricLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  unavailableText: {
    fontSize: 9,
    color: C.muted,
    fontStyle: "italic",
  },
  statusBadge: {
    fontSize: 8,
    marginTop: 2,
  },
});

function fmtCurrency(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } catch { return `R$ ${Math.round(v)}`; }
}
function fmtPct(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1).replace(".", ",")}%`;
}

function BaseScenarioCard({ base, hasMeta, capitalAtRetirement }) {
  if (!base) return null;
  return (
    <View style={cs.scenarioCardBase}>
      <Text style={cs.scenarioName}>Cenário Base (Referência)</Text>
      <View style={cs.metricsRow}>
        <View style={cs.metricBox}>
          <Text style={cs.metricLabel}>Renda Sustentável</Text>
          <Text style={cs.metricValue}>
            {base.sustainableIncome != null ? `${fmtCurrency(base.sustainableIncome)}/mês` : "—"}
          </Text>
        </View>
        <View style={cs.metricBox}>
          <Text style={cs.metricLabel}>
            {hasMeta && base.coverage != null ? "Cobertura da Meta" : "Capital na Aposentadoria"}
          </Text>
          <Text style={cs.metricValue}>
            {hasMeta && base.coverage != null
              ? fmtPct(base.coverage)
              : fmtCurrency(capitalAtRetirement)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function AltScenarioCard({ scenario, label, hasMeta, capitalAtRetirement }) {
  if (!scenario) return null;

  if (!scenario.available) {
    return (
      <View style={cs.scenarioUnavailable}>
        <Text style={cs.scenarioName}>{label}</Text>
        <Text style={cs.unavailableText}>
          {scenario.reason || "Não disponível — preencher dados básicos para habilitar este cenário."}
        </Text>
      </View>
    );
  }

  const contribution = scenario.requiredContribution;
  const age = scenario.requiredAge;
  const statusOk = scenario.status === "ok";

  return (
    <View style={cs.scenarioCard}>
      <Text style={cs.scenarioName}>{scenario.name || label}</Text>
      {scenario.description ? (
        <Text style={{ fontSize: 8, color: C.secondary, marginBottom: 6 }}>{scenario.description}</Text>
      ) : null}
      <View style={cs.metricsRow}>
        <View style={cs.metricBox}>
          <Text style={cs.metricLabel}>Aporte Mensal Necessário</Text>
          <Text style={cs.metricValue}>
            {contribution != null ? fmtCurrency(contribution) : "—"}
          </Text>
          {statusOk && (
            <Text style={[cs.statusBadge, { color: C.success }]}>✓ Viável</Text>
          )}
          {!statusOk && scenario.explain && (
            <Text style={[cs.statusBadge, { color: C.warning }]}>{scenario.explain}</Text>
          )}
        </View>
        <View style={cs.metricBox}>
          <Text style={cs.metricLabel}>Idade Necessária</Text>
          <Text style={cs.metricValue}>
            {age != null ? `${age} anos` : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function Page08Scenarios({ data, totalPages }) {
  const clientName = data.meta?.clientName || "";
  const { scenarioComparison } = data;
  const base = scenarioComparison?.base;
  const consumption = scenarioComparison?.consumption;
  const preservation = scenarioComparison?.preservation;

  const hasMeta = data.hasMeta ?? false;
  const capitalAtRetirement = data.capitalAtRetirement ?? 0;

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Cenários Comparativos</Text>
        <Text style={s.sectionSubtitle}>
          Base • Consumo do Patrimônio • Preservação do Patrimônio
        </Text>
      </View>

      {/* Base scenario — always shown */}
      <BaseScenarioCard base={base} hasMeta={hasMeta} capitalAtRetirement={capitalAtRetirement} />

      {/* Consumption scenario */}
      <Text style={[s.bulletTitle, { color: C.blue, marginBottom: 4, marginTop: 8 }]}>
        Consumo do Patrimônio
      </Text>
      <AltScenarioCard
        scenario={consumption}
        label="Consumo do Patrimônio"
        hasMeta={hasMeta}
        capitalAtRetirement={capitalAtRetirement}
      />

      {/* Preservation scenario */}
      <Text style={[s.bulletTitle, { color: C.success, marginBottom: 4, marginTop: 8 }]}>
        Preservação do Patrimônio
      </Text>
      <AltScenarioCard
        scenario={preservation}
        label="Preservação do Patrimônio"
        hasMeta={hasMeta}
        capitalAtRetirement={capitalAtRetirement}
      />

      {/* Explanation */}
      <View style={[s.bulletBox, { marginTop: 14 }]}>
        <Text style={s.bulletTitle}>Metodologia</Text>
        <View style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>
            Consumo: projeção que permite consumir 100% do patrimônio financeiro até a expectativa de vida.
          </Text>
        </View>
        <View style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>
            Preservação: projeção que mantém o patrimônio financeiro intacto ao final da expectativa de vida.
          </Text>
        </View>
        <View style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>
            {hasMeta
              ? "Métrica secundária: cobertura da meta de renda."
              : "Capital na aposentadoria é exibido quando não há meta de renda definida."}
          </Text>
        </View>
      </View>

      <PageFooter pageNumber={8} totalPages={totalPages} clientName={clientName} />
    </Page>
  );
}
