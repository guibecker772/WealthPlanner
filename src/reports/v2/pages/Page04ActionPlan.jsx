// src/reports/v2/pages/Page04ActionPlan.jsx
// Plano de Ação: checklist 30/90 dias + top 2 alertas dinâmicos

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { C, s } from "../pdfTheme";
import PageFooter from "../components/PageFooter";

const cs = StyleSheet.create({
  checkItem: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  checkBox: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 2,
    marginTop: 1,
  },
  checkText: {
    flex: 1,
    fontSize: 9,
    color: C.ink,
    lineHeight: 1.5,
  },
  timeLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.gold,
    marginBottom: 8,
    marginTop: 14,
  },
  alertBox: {
    borderWidth: 1,
    borderColor: "#e8d5a8",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    backgroundColor: C.warningBg,
  },
  alertText: {
    fontSize: 9,
    color: C.warning,
    lineHeight: 1.4,
  },
  alertSeverity: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.warning,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priorityCard: {
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    backgroundColor: C.goldBg,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  priorityNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  priorityNumberText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  priorityContent: {
    flex: 1,
  },
  priorityText: {
    fontSize: 9,
    color: C.ink,
    lineHeight: 1.5,
  },
  priorityPageRef: {
    fontSize: 8,
    color: C.gold,
    fontFamily: "Helvetica-Bold",
    marginTop: 3,
  },
});

const CHECKLIST_30 = [
  "Revisar os dados cadastrais e premissas do planejamento.",
  "Validar composição patrimonial (ativos, previdência, bens).",
  "Confirmar meta principal e idade de aposentadoria.",
  "Avaliar liquidez disponível vs. custos sucessórios estimados.",
];

const CHECKLIST_90 = [
  "Simular ao menos um cenário alternativo (conservador ou otimista).",
  "Definir estratégia de aportes temporários, se aplicável.",
  "Agendar reunião de revisão com assessor financeiro.",
  "Avaliar proteção de renda e seguro de vida.",
];

export default function Page04ActionPlan({ data, totalPages }) {
  const clientName = data.meta?.clientName || "";
  const alerts = data.alerts || [];
  const topPriorities = data.topPriorities || [];

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Plano de Ação</Text>
        <Text style={s.sectionSubtitle}>Prioridades, checklist e alertas para o seu planejamento</Text>
      </View>

      {/* Top 3 Prioridades — V2-hardening P1 */}
      {topPriorities.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={s.bulletTitle}>Top {topPriorities.length} Prioridades</Text>
          {topPriorities.map((p, i) => (
            <View key={i} style={cs.priorityCard}>
              <View style={cs.priorityNumber}>
                <Text style={cs.priorityNumberText}>{i + 1}</Text>
              </View>
              <View style={cs.priorityContent}>
                <Text style={cs.priorityText}>{p.text}</Text>
                {p.pageRef && (
                  <Text style={cs.priorityPageRef}>ver pág. {p.pageRef}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={s.bulletTitle}>Alertas Prioritários</Text>
          {alerts.map((a, i) => (
            <View key={i} style={cs.alertBox}>
              <Text style={cs.alertSeverity}>
                {a.severity <= 1 ? "Crítico" : a.severity <= 2 ? "Importante" : "Atenção"}
              </Text>
              <Text style={cs.alertText}>{a.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 30 days */}
      <Text style={cs.timeLabel}>Próximos 30 dias</Text>
      {CHECKLIST_30.map((item, i) => (
        <View key={`30-${i}`} style={cs.checkItem}>
          <View style={cs.checkBox} />
          <Text style={cs.checkText}>{item}</Text>
        </View>
      ))}

      {/* 90 days */}
      <Text style={cs.timeLabel}>Próximos 90 dias</Text>
      {CHECKLIST_90.map((item, i) => (
        <View key={`90-${i}`} style={cs.checkItem}>
          <View style={cs.checkBox} />
          <Text style={cs.checkText}>{item}</Text>
        </View>
      ))}

      {/* Próximos passos (from engine) */}
      {data.nextSteps && data.nextSteps.length > 0 && (
        <View style={[s.bulletBox, { marginTop: 16 }]}>
          <Text style={s.bulletTitle}>Próximos Passos Recomendados</Text>
          {data.nextSteps.map((step, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={s.bulletDot} />
              <Text style={s.bulletText}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      <PageFooter pageNumber={4} totalPages={totalPages} clientName={clientName} />
    </Page>
  );
}
