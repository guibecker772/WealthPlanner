// src/reports/v2/pages/Page01Cover.jsx
// Capa: Logo "Private Wealth", títulos, cliente, cenário, data, assessor, QR/link

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { C } from "../pdfTheme";
import PageFooter from "../components/PageFooter";

const cs = StyleSheet.create({
  page: { padding: 0, backgroundColor: C.coverBg },
  container: { flex: 1, padding: 48, justifyContent: "space-between" },

  brand: {
    fontSize: 10,
    color: C.coverGold,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 28,
    fontFamily: "Helvetica-Bold",
  },
  title: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: C.coverText,
    marginBottom: 6,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: C.coverMuted,
    marginBottom: 18,
  },
  thesis: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.coverGold,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },

  meta: {
    marginTop: "auto",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  metaRow: { flexDirection: "row", marginBottom: 8 },
  metaLabel: { width: 130, fontSize: 9, color: C.coverMuted },
  metaValue: { fontSize: 9, color: C.coverText, fontFamily: "Helvetica-Bold" },

  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerConfidential: {
    fontSize: 7,
    color: C.coverGold,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footerVersion: {
    fontSize: 7,
    color: C.coverMuted,
  },
});

export default function Page01Cover({ data, totalPages }) {
  const m = data.meta || {};
  const clientName = m.clientName || "Cliente";
  const advisorName = m.advisorName || "";
  const advisorCompany = m.advisorCompany || "";
  const advisorRegistry = m.advisorRegistry || "";
  const advisorEmail = m.advisorEmail || "";
  const advisorPhone = m.advisorPhone || "";
  const bookingLink = m.bookingLink || "";
  const referenceDate = formatDateBR(m.referenceDate);
  const scenarioName = m.scenarioName || "Cenário Base";
  const thesis = data.planningThesis || "";

  return (
    <Page size="A4" style={cs.page}>
      <View style={cs.container}>
        {/* Header */}
        <View>
          <Text style={cs.brand}>PRIVATE WEALTH</Text>
          <Text style={cs.title}>Relatório de{"\n"}Planejamento Financeiro</Text>
          <Text style={cs.subtitle}>Documento personalizado para {clientName}</Text>
          {thesis ? <Text style={cs.thesis}>{thesis}</Text> : null}
        </View>

        {/* Metadata */}
        <View style={cs.meta}>
          <MetaRow label="Cliente" value={clientName} />
          {advisorName ? <MetaRow label="Assessor" value={advisorName} /> : null}
          {advisorCompany ? <MetaRow label="Empresa" value={advisorCompany} /> : null}
          {advisorRegistry ? <MetaRow label="Registro" value={advisorRegistry} /> : null}
          {advisorEmail ? <MetaRow label="E-mail" value={advisorEmail} /> : null}
          {advisorPhone ? <MetaRow label="Telefone" value={advisorPhone} /> : null}
          <MetaRow label="Data de Referência" value={referenceDate} />
          <MetaRow label="Cenário" value={scenarioName} />
          {bookingLink ? <MetaRow label="Agendar Revisão" value={bookingLink} /> : null}
        </View>

        {/* Footer */}
        <View style={cs.footer}>
          <Text style={cs.footerConfidential}>Confidencial</Text>
          <Text style={cs.footerVersion}>
            Página 1 de {totalPages} — Confidencial
          </Text>
        </View>
      </View>
    </Page>
  );
}

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={cs.metaRow}>
      <Text style={cs.metaLabel}>{label}</Text>
      <Text style={cs.metaValue}>{value}</Text>
    </View>
  );
}

function formatDateBR(dateStr) {
  try {
    if (!dateStr) return new Date().toLocaleDateString("pt-BR");
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}
