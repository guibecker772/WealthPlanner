// src/reports/SuccessionReportPDF.jsx
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
    backgroundColor: "#0b1220",
    color: "#e5e7eb",
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 6,
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 11,
    color: "#94a3b8",
  },
  grid2: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  card: {
    flexGrow: 1,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
  },
  cardTitle: { fontSize: 10, color: "#a1a1aa", marginBottom: 6, textTransform: "uppercase" },
  cardValue: { fontSize: 16, fontWeight: 700, color: "#f8fafc" },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 12, fontWeight: 700, color: "#f8fafc" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottom: "1px solid rgba(255,255,255,0.08)" },
  rowLabel: { color: "#cbd5e1" },
  rowValue: { color: "#f8fafc", fontWeight: 700 },
  small: { marginTop: 8, color: "#94a3b8", fontSize: 9 },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    border: "1px solid rgba(245,158,11,0.35)",
    color: "#fbbf24",
    fontSize: 9,
    marginTop: 6,
  },
});

function formatBRL(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SuccessionReportPDF({
  clientData,
  kpis,
  succession,
  incomeInsuranceBase,
  monthlyBaseCost,
}) {
  const clientName = clientData?.name || "Cliente";
  const scenarioName = clientData?.scenarioName || "Cenário";
  const dateStr = new Date().toLocaleString("pt-BR");

  const financial = succession?.financialTotal || 0;
  const illiquid = succession?.illiquidTotal || 0;
  const total = succession?.totalEstate || 0;

  const itcmd = succession?.costs?.itcmd || 0;
  const legal = succession?.costs?.legal || 0;
  const fees = succession?.costs?.fees || 0;
  const totalCosts = succession?.costs?.total || 0;
  const gap = succession?.liquidityGap || 0;

  const cover12 = (Number(monthlyBaseCost) || 0) * 12;
  const cover60 = (Number(monthlyBaseCost) || 0) * 60;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Planejamento Sucessório</Text>
          <Text style={styles.subtitle}>
            {clientName} • {scenarioName} • Gerado em {dateStr}
          </Text>
          <Text style={styles.badge}>
            Base do Seguro de Renda: {incomeInsuranceBase === "retirement" ? "Aposentadoria" : "Atual"}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Composição Patrimonial</Text>
        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Liquidez Imediata</Text>
            <Text style={styles.cardValue}>{formatBRL(financial)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patrimônio Imobilizado</Text>
            <Text style={styles.cardValue}>{formatBRL(illiquid)}</Text>
          </View>
        </View>

        <View style={{ ...styles.card, marginTop: 12 }}>
          <Text style={styles.cardTitle}>Patrimônio Total</Text>
          <Text style={styles.cardValue}>{formatBRL(total)}</Text>
          <Text style={styles.small}>
            “Financeiro” é o que suporta liquidez imediata. “Bens” entra em sucessão, mas não sustenta usufruto direto.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Custos do Inventário (Estimativa)</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Imposto (ITCMD)</Text>
            <Text style={styles.rowValue}>{formatBRL(itcmd)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Honorários</Text>
            <Text style={styles.rowValue}>{formatBRL(legal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Custas</Text>
            <Text style={styles.rowValue}>{formatBRL(fees)}</Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>Total Estimado</Text>
            <Text style={{ fontSize: 14, fontWeight: 800, color: "#fb7185" }}>{formatBRL(totalCosts)}</Text>
          </View>

          <Text style={styles.small}>
            Gap de liquidez: {formatBRL(gap)} {gap > 0 ? "(necessário planejar liquidez)" : "(liquidez suficiente)"}.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Seguro de Renda (Incapacidade)</Text>
        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Base Mensal</Text>
            <Text style={styles.cardValue}>{formatBRL(monthlyBaseCost || 0)}</Text>
            <Text style={styles.small}>Base usada para estimar capital de proteção.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cobertura 12 meses</Text>
            <Text style={styles.cardValue}>{formatBRL(cover12)}</Text>
            <Text style={styles.small}>Estimativa para manter padrão por 1 ano.</Text>
          </View>
        </View>

        <View style={{ ...styles.card, marginTop: 12 }}>
          <Text style={styles.cardTitle}>Cobertura 60 meses</Text>
          <Text style={styles.cardValue}>{formatBRL(cover60)}</Text>
          <Text style={styles.small}>Estimativa para manter padrão por 5 anos.</Text>
        </View>

        <Text style={styles.sectionTitle}>Recomendação Private</Text>
        <View style={styles.card}>
          <Text style={{ color: "#e5e7eb", fontSize: 11, lineHeight: 1.4 }}>
            Recomendação: <Text style={{ fontWeight: 700 }}>Agendar reunião com Especialista em Planejamento Patrimonial</Text>{"\n"}
            para revisar estrutura sucessória, liquidez e instrumentos (holding, previdência, seguro).
          </Text>
          <Text style={styles.small}>
            Este relatório é uma visão educacional e estimativa. Validações jurídicas/tributárias dependem do caso concreto.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
