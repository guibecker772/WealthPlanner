// src/reports/v2/pages/Page10Assumptions.jsx
// Premissas + Disclaimers + Contato + Observações do assessor

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { C, s } from "../pdfTheme";
import { DISCLAIMER_TEXT } from "../../../constants/reportSections";
import PageFooter from "../components/PageFooter";

const cs = StyleSheet.create({
  notesBox: {
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
    backgroundColor: C.goldBg,
  },
  notesTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.gold,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: C.ink,
    lineHeight: 1.5,
  },
  disclaimerText: {
    fontSize: 8,
    color: C.secondary,
    lineHeight: 1.5,
    marginBottom: 6,
    textAlign: "justify",
  },
  contactRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  contactLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.secondary,
    width: 60,
  },
  contactValue: {
    fontSize: 8,
    color: C.ink,
  },
  genFooter: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    fontSize: 7,
    color: C.muted,
    textAlign: "center",
  },
});

export default function Page10Assumptions({ data, totalPages }) {
  const clientName = data.meta?.clientName || "";
  const advisorName = data.meta?.advisorName || "";
  const advisorCompany = data.meta?.advisorCompany || "";
  const advisorRegistry = data.meta?.advisorRegistry || "";
  const advisorEmail = data.meta?.advisorEmail || "";
  const advisorPhone = data.meta?.advisorPhone || "";
  const bookingLink = data.meta?.bookingLink || "";
  const notes = data.advisorNotes || "";
  const assumptions = data.assumptions || {};
  const assumptionsDisplay = data.assumptionsDisplay || {};
  const premiseWarnings = data.premiseWarnings || [];
  const generatedAt = data.meta?.generatedAt
    ? new Date(data.meta.generatedAt).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");

  // V2-hardening: use pre-formatted text from snapshot when available
  const inflationText = assumptionsDisplay.inflationPctText || assumptions.inflation || "—";
  const nominalText = assumptionsDisplay.nominalPctText || assumptions.nominalReturn || "—";
  const realText = assumptionsDisplay.realPctText || assumptions.realReturn || "—";
  const invalidMsg = assumptionsDisplay.invalidMessage || assumptions.invalidMessage || null;

  // TEMP DEBUG — build watermark (remove after validation)
  const buildId = data.meta?.buildId || "";

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Premissas e Informações</Text>
        <Text style={s.sectionSubtitle}>
          Premissas do cenário, disclaimers e contato
        </Text>
      </View>

      {/* Advisor notes */}
      {notes ? (
        <View style={cs.notesBox}>
          <Text style={cs.notesTitle}>Observações do Assessor</Text>
          <Text style={cs.notesText}>{notes}</Text>
        </View>
      ) : null}

      {/* Premises — using snapshot's text (V2-hardening) */}
      <View style={s.bulletBox}>
        <Text style={s.bulletTitle}>Premissas do Cenário Ativo</Text>
        {invalidMsg && (
          <View style={s.bulletRow}>
            <View style={[s.bulletDot, { backgroundColor: C.danger }]} />
            <Text style={[s.bulletText, { color: C.danger }]}>⚠ {invalidMsg}</Text>
          </View>
        )}
        <View style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>
            Inflação: {inflationText}
          </Text>
        </View>
        <View style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>
            Retorno nominal: {nominalText}
          </Text>
        </View>
        <View style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>
            Retorno real: {realText}
          </Text>
        </View>
        {premiseWarnings.length > 0 &&
          premiseWarnings.map((w, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={[s.bulletDot, { backgroundColor: C.warning }]} />
              <Text style={[s.bulletText, { color: C.warning }]}>⚠ {w}</Text>
            </View>
          ))}
      </View>

      {/* Contact */}
      {(advisorName || advisorEmail || advisorPhone || advisorCompany) && (
        <View style={[s.bulletBox, { marginBottom: 14 }]}>
          <Text style={s.bulletTitle}>Contato do Assessor</Text>
          {advisorName ? (
            <View style={cs.contactRow}>
              <Text style={cs.contactLabel}>Nome</Text>
              <Text style={cs.contactValue}>{advisorName}</Text>
            </View>
          ) : null}
          {advisorCompany ? (
            <View style={cs.contactRow}>
              <Text style={cs.contactLabel}>Empresa</Text>
              <Text style={cs.contactValue}>{advisorCompany}</Text>
            </View>
          ) : null}
          {advisorRegistry ? (
            <View style={cs.contactRow}>
              <Text style={cs.contactLabel}>Registro</Text>
              <Text style={cs.contactValue}>{advisorRegistry}</Text>
            </View>
          ) : null}
          {advisorEmail ? (
            <View style={cs.contactRow}>
              <Text style={cs.contactLabel}>E-mail</Text>
              <Text style={cs.contactValue}>{advisorEmail}</Text>
            </View>
          ) : null}
          {advisorPhone ? (
            <View style={cs.contactRow}>
              <Text style={cs.contactLabel}>Telefone</Text>
              <Text style={cs.contactValue}>{advisorPhone}</Text>
            </View>
          ) : null}
          {bookingLink ? (
            <View style={cs.contactRow}>
              <Text style={cs.contactLabel}>Agendar</Text>
              <Text style={cs.contactValue}>{bookingLink}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Disclaimers (compact) */}
      <Text style={[s.bulletTitle, { marginBottom: 6 }]}>{DISCLAIMER_TEXT.title}</Text>
      {DISCLAIMER_TEXT.paragraphs.slice(0, 4).map((p, i) => (
        <Text key={i} style={cs.disclaimerText}>{p}</Text>
      ))}

      <Text style={cs.genFooter}>
        {buildId ? `V2-PREMIUM:${buildId} • ` : ""}{DISCLAIMER_TEXT.footer}
        {"\n"}Powered by WealthPlanner Pro • Gerado em {generatedAt}
      </Text>

      <PageFooter pageNumber={10} totalPages={totalPages} clientName={clientName} />
    </Page>
  );
}
