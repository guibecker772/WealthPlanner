// src/reports/v2/pages/Page06Income.jsx
// Renda: cards com renda sustentável, capital aposentadoria, horizonte idades

import React from "react";
import { Page, View, Text } from "@react-pdf/renderer";
import { C, s } from "../pdfTheme";
import PageFooter from "../components/PageFooter";

function fmtCurrency(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } catch { return `R$ ${Math.round(v)}`; }
}

export default function Page06Income({ data, totalPages }) {
  const clientName = data.meta?.clientName || "";
  const { incomeData, flags } = data;

  const hasAges = incomeData.currentAge != null && incomeData.retirementAge != null;
  const yearsToRetire = hasAges ? incomeData.retirementAge - incomeData.currentAge : null;
  const retirementYears = hasAges && incomeData.lifeExpectancy
    ? incomeData.lifeExpectancy - incomeData.retirementAge
    : null;

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Renda e Aposentadoria</Text>
        <Text style={s.sectionSubtitle}>
          Projeção de renda sustentável e horizonte de aposentadoria
        </Text>
      </View>

      {/* Row 1: Renda + Capital */}
      <View style={s.cardGrid}>
        <View style={s.cardHighlight}>
          <Text style={s.cardTitle}>Renda Sustentável Mensal</Text>
          <Text style={s.cardValue}>
            {incomeData.sustainableIncome != null ? `${fmtCurrency(incomeData.sustainableIncome)}/mês` : "—"}
          </Text>
          <Text style={s.cardHint}>
            Renda viável preservando o capital na aposentadoria
          </Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Capital na Aposentadoria</Text>
          <Text style={s.cardValue}>
            {fmtCurrency(incomeData.capitalAtRetirement)}
          </Text>
          <Text style={s.cardHint}>
            Projeção aos {incomeData.retirementAge ?? "—"} anos
          </Text>
        </View>
      </View>

      {/* Row 2: Horizonte */}
      <View style={s.cardGrid}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Idade Atual</Text>
          <Text style={s.cardValue}>
            {incomeData.currentAge != null ? `${incomeData.currentAge} anos` : "—"}
          </Text>
          <Text style={s.cardHint}>
            {yearsToRetire != null ? `${yearsToRetire} anos até a aposentadoria` : "Preencha a idade de aposentadoria"}
          </Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Aposentadoria</Text>
          <Text style={s.cardValue}>
            {incomeData.retirementAge != null ? `${incomeData.retirementAge} anos` : "—"}
          </Text>
          <Text style={s.cardHint}>
            {incomeData.contributionEndAge && incomeData.contributionEndAge !== incomeData.retirementAge
              ? `Fim dos aportes aos ${incomeData.contributionEndAge} anos`
              : "Fim dos aportes coincide com aposentadoria"}
          </Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Expectativa de Vida</Text>
          <Text style={s.cardValue}>
            {incomeData.lifeExpectancy != null ? `${incomeData.lifeExpectancy} anos` : "—"}
          </Text>
          <Text style={s.cardHint}>
            {retirementYears != null ? `${retirementYears} anos de aposentadoria` : ""}
          </Text>
        </View>
      </View>

      {/* Fallback: missing ages */}
      {!hasAges && (
        <View style={s.warningBanner}>
          <Text style={s.warningText}>
            ⚠ Dados de idade incompletos. Preencha a idade atual e de aposentadoria para uma projeção de renda mais precisa.
          </Text>
        </View>
      )}

      {/* Interpretation */}
      {flags.hasAssets && incomeData.sustainableIncome != null && (
        <View style={s.bulletBox}>
          <Text style={s.bulletTitle}>Interpretação</Text>
          <View style={s.bulletRow}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>
              A renda sustentável é calculada com base na regra dos 4% (Safe Withdrawal Rate), considerando o capital projetado na aposentadoria.
            </Text>
          </View>
          <View style={s.bulletRow}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>
              Essa estimativa assume que o patrimônio continue investido na aposentadoria, gerando rendimentos que complementam os saques.
            </Text>
          </View>
          {retirementYears != null && retirementYears > 30 && (
            <View style={s.bulletRow}>
              <View style={[s.bulletDot, { backgroundColor: C.warning }]} />
              <Text style={s.bulletText}>
                Horizonte de aposentadoria acima de 30 anos exige atenção especial à sustentabilidade dos saques.
              </Text>
            </View>
          )}
        </View>
      )}

      <PageFooter pageNumber={6} totalPages={totalPages} clientName={clientName} />
    </Page>
  );
}
