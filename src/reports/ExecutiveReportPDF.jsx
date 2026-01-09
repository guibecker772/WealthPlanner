// src/reports/ExecutiveReportPDF.jsx
import React, { useMemo } from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrencyBR } from "../utils/format";

// Helpers seguros
function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function pct(part, total) {
  const t = asNumber(total);
  if (t <= 0) return 0;
  return (asNumber(part) / t) * 100;
}
function formatPct(v, digits = 1) {
  const n = asNumber(v);
  return `${n.toFixed(digits).replace(".", ",")}%`;
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#0b1220",
  },
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { marginTop: 4, color: "#334155" },

  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  col: { flex: 1 },

  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  cardTitle: { fontSize: 10, color: "#475569", textTransform: "uppercase", fontWeight: 700 },
  cardValue: { marginTop: 6, fontSize: 16, fontWeight: 700, color: "#0b1220" },
  cardHint: { marginTop: 6, fontSize: 10, color: "#475569" },

  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#0b1220" },

  hr: { marginTop: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },

  kvRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  kvKey: { color: "#334155" },
  kvVal: { fontWeight: 700, color: "#0b1220" },

  pill: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    marginTop: 8,
  },
  pillOk: { backgroundColor: "#dcfce7", color: "#166534" },
  pillWarn: { backgroundColor: "#ffedd5", color: "#9a3412" },
  pillBad: { backgroundColor: "#ffe4e6", color: "#9f1239" },

  bullet: { flexDirection: "row", gap: 6, marginTop: 6 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4, backgroundColor: "#111827" },
  footer: { marginTop: 14, color: "#64748b", fontSize: 9 },
});

// Critério simples de “status” pro executivo (ajuste se quiser)
function liquidityStatus(liquidityGap) {
  const g = asNumber(liquidityGap);
  if (g <= 0) return { label: "Liquidez suficiente", tone: "ok" };
  if (g <= 50000) return { label: "Atenção: pequeno gap de liquidez", tone: "warn" };
  return { label: "Prioridade: gap de liquidez relevante", tone: "bad" };
}

export default function ExecutiveReportPDF({
  clientData,
  kpis,
  succession,
  generatedAt = new Date(),
  incomeInsuranceBaseLabel = "Atual",
  monthlyBaseCost = 0,
}) {
  const clientName = (clientData?.name || clientData?.clientName || "Cliente").toString();
  const scenarioName = (clientData?.scenarioName || clientData?.nomeCenario || "Cenário").toString();

  const financial = asNumber(succession?.financialTotal ?? kpis?.initialFinancialWealth);
  const illiquid = asNumber(succession?.illiquidTotal);
  const total =
    asNumber(kpis?.totalWealthNow) ||
    (financial + illiquid) ||
    asNumber(clientData?.totalWealthNow) ||
    0;

  const invTotal = asNumber(succession?.costs?.total);
  const itcmd = asNumber(succession?.costs?.itcmd);
  const legal = asNumber(succession?.costs?.legal);
  const fees = asNumber(succession?.costs?.fees);

  const liquidityGap = asNumber(succession?.liquidityGap);
  const illiqPct = pct(illiquid, total);
  const finPct = pct(financial, total);

  const income12 = asNumber(monthlyBaseCost) * 12;
  const income60 = asNumber(monthlyBaseCost) * 60;

  const status = useMemo(() => liquidityStatus(liquidityGap), [liquidityGap]);
  const pillStyle =
    status.tone === "ok" ? styles.pillOk : status.tone === "warn" ? styles.pillWarn : styles.pillBad;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Visão Executiva — Planejamento do Cliente</Text>
          <Text style={styles.subtitle}>
            {clientName} • {scenarioName} • Gerado em{" "}
            {generatedAt.toLocaleString("pt-BR")}
          </Text>
        </View>

        {/* Cards principais */}
        <View style={styles.row}>
          <View style={[styles.card, styles.col]}>
            <Text style={styles.cardTitle}>Patrimônio total</Text>
            <Text style={styles.cardValue}>{formatCurrencyBR(total)}</Text>
            <Text style={styles.cardHint}>
              Financeiro: {formatCurrencyBR(financial)} ({formatPct(finPct)}) •
              Bens: {formatCurrencyBR(illiquid)} ({formatPct(illiqPct)})
            </Text>
          </View>

          <View style={[styles.card, styles.col]}>
            <Text style={styles.cardTitle}>Custos sucessórios estimados</Text>
            <Text style={styles.cardValue}>{formatCurrencyBR(invTotal)}</Text>
            <Text style={styles.cardHint}>
              ITCMD: {formatCurrencyBR(itcmd)} • Honorários: {formatCurrencyBR(legal)} • Custas:{" "}
              {formatCurrencyBR(fees)}
            </Text>

            <Text style={[styles.pill, pillStyle]}>{status.label}</Text>
            {liquidityGap > 0 ? (
              <Text style={styles.cardHint}>Gap de liquidez: {formatCurrencyBR(liquidityGap)}</Text>
            ) : null}
          </View>
        </View>

        {/* Seguro de renda (executivo) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proteção de Renda (Incapacidade)</Text>

          <View style={styles.row}>
            <View style={[styles.card, styles.col]}>
              <Text style={styles.cardTitle}>Base mensal usada</Text>
              <Text style={styles.cardValue}>{formatCurrencyBR(monthlyBaseCost)}</Text>
              <Text style={styles.cardHint}>Base do cálculo: {incomeInsuranceBaseLabel}</Text>
            </View>

            <View style={[styles.card, styles.col]}>
              <Text style={styles.cardTitle}>Cobertura sugerida</Text>
              <Text style={styles.cardValue}>{formatCurrencyBR(income12)} (12m)</Text>
              <Text style={styles.cardHint}>{formatCurrencyBR(income60)} (60m)</Text>
            </View>
          </View>
        </View>

        {/* Recomendações executivas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recomendações (executivo)</Text>

          <View style={[styles.card]}>
            <View style={styles.bullet}>
              <View style={styles.bulletDot} />
              <Text>
                Revisar a estrutura sucessória para reduzir fricção (inventário), custos e tempo de
                transferência.
              </Text>
            </View>

            <View style={styles.bullet}>
              <View style={styles.bulletDot} />
              <Text>
                Planejar liquidez para cobrir custos sucessórios sem necessidade de venda forçada de
                ativos.
              </Text>
            </View>

            <View style={styles.bullet}>
              <View style={styles.bulletDot} />
              <Text>
                Agendar reunião com Especialista em Planejamento Patrimonial para avaliar holding,
                previdência e seguro (conforme perfil e objetivos).
              </Text>
            </View>

            <View style={styles.hr} />
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Próximo passo</Text>
              <Text style={styles.kvVal}>Reunião com especialista</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Este documento é uma visão educacional e estimativa. Validações jurídicas/tributárias
          dependem do caso concreto.
        </Text>
      </Page>
    </Document>
  );
}
