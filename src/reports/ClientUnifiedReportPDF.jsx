// src/reports/ClientUnifiedReportPDF.jsx
import React, { useMemo } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// helpers simples (não dependem do seu utils/format)
function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrencyBR(v) {
  const n = asNumber(v);
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${n.toFixed(2)}`;
  }
}

function formatPercent(v) {
  const n = asNumber(v);
  return `${n.toFixed(1).replace(".", ",")}%`;
}

function safeText(v) {
  return (v ?? "").toString();
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
    "Cenário"
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

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: "#334155",
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginBottom: 16,
  },
  grid2: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: "#334155",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  bigNumber: {
    fontSize: 16,
    fontWeight: 900,
    marginBottom: 4,
  },
  small: {
    fontSize: 10,
    color: "#475569",
    lineHeight: 1.35,
  },
  badgeOk: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    color: "#166534",
    fontSize: 10,
    fontWeight: 800,
  },
  badgeWarn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    fontSize: 10,
    fontWeight: 800,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 900,
    marginTop: 10,
    marginBottom: 8,
  },
  bulletBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  bullet: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    marginTop: 4,
  },
  footer: {
    marginTop: 18,
    fontSize: 9,
    color: "#64748b",
  },
  rowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1px solid #e2e8f0",
    paddingVertical: 6,
  },
  rowLabel: { color: "#334155" },
  rowValue: { fontWeight: 900 },
});

export default function ClientUnifiedReportPDF({
  clientData,
  kpis,
  succession,
  config,
  incomeInsuranceBase = "now", // "now" | "retirement"
}) {
  const clientName = getClientName(clientData);
  const scenarioName = getScenarioName(clientData);

  const generatedAt = useMemo(() => {
    try {
      return new Date().toLocaleString("pt-BR");
    } catch {
      return "—";
    }
  }, []);

  const financial = asNumber(succession?.financialTotal);
  const illiquid = asNumber(succession?.illiquidTotal);
  const totalWealth = financial + illiquid;

  const itcmd = asNumber(succession?.costs?.itcmd);
  const legal = asNumber(succession?.costs?.legal);
  const fees = asNumber(succession?.costs?.fees);
  const totalCosts = asNumber(succession?.costs?.total);
  const liquidityGap = asNumber(succession?.liquidityGap);

  const illiquidityPct = totalWealth > 0 ? (illiquid / totalWealth) * 100 : 0;
  const financialPct = totalWealth > 0 ? (financial / totalWealth) * 100 : 0;

  const monthlyNow = getMonthlyCostNow(clientData);
  const monthlyRet = getMonthlyCostRetirement(clientData);
  const monthlyBase =
    incomeInsuranceBase === "retirement" ? monthlyRet : monthlyNow;

  const coverage12 = monthlyBase * 12;
  const coverage60 = monthlyBase * 60;

  const savingsPct = asNumber(config?.SUCCESSION_SAVINGS_PCT || 0.2);
  const estimatedSavings = totalCosts * savingsPct;

  const liquidityOk = liquidityGap <= 0;

  // Recomendações (executivo) - simples e boas
  const executiveBullets = [
    "Revisar a estrutura sucessória para reduzir fricção (inventário), custos e tempo de transferência.",
    "Planejar liquidez para cobrir custos sucessórios sem necessidade de venda forçada de ativos.",
    "Agendar reunião com Especialista em Planejamento Patrimonial para avaliar holding, previdência e seguro conforme perfil e objetivos.",
  ];

  return (
    <Document>
      {/* ======================
          PÁGINA 1 — VISÃO EXECUTIVA
         ====================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Visão Executiva — Planejamento do Cliente</Text>
        <Text style={styles.subtitle}>
          {safeText(clientName)} • {safeText(scenarioName)} • Gerado em {generatedAt}
        </Text>
        <View style={styles.divider} />

        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patrimônio total</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(totalWealth)}</Text>
            <Text style={styles.small}>
              Financeiro: {formatCurrencyBR(financial)} ({formatPercent(financialPct)}) •{" "}
              Bens: {formatCurrencyBR(illiquid)} ({formatPercent(illiquidityPct)})
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Custos sucessórios estimados</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(totalCosts)}</Text>
            <Text style={styles.small}>
              ITCMD: {formatCurrencyBR(itcmd)} • Honorários: {formatCurrencyBR(legal)} •
              Custas: {formatCurrencyBR(fees)}
            </Text>

            {liquidityOk ? (
              <Text style={styles.badgeOk}>Liquidez suficiente</Text>
            ) : (
              <Text style={styles.badgeWarn}>
                Gap de liquidez: {formatCurrencyBR(liquidityGap)}
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Proteção de Renda (Incapacidade)</Text>
        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Base mensal usada</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(monthlyBase)}</Text>
            <Text style={styles.small}>
              Base de cálculo: {incomeInsuranceBase === "retirement" ? "Aposentadoria" : "Atual"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cobertura sugerida</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(coverage12)} (12m)</Text>
            <Text style={styles.small}>{formatCurrencyBR(coverage60)} (60m)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recomendações (executivo)</Text>
        <View style={styles.bulletBox}>
          {executiveBullets.map((t, idx) => (
            <View key={idx} style={styles.bullet}>
              <View style={styles.dot} />
              <Text style={{ ...styles.small, flex: 1 }}>{t}</Text>
            </View>
          ))}

          <View style={{ marginTop: 8, ...styles.rowLine, borderBottom: "none" }}>
            <Text style={styles.small}>Próximo passo</Text>
            <Text style={{ ...styles.small, fontWeight: 900 }}>Reunião com especialista</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Este documento é uma visão educacional e estimativa. Validações jurídicas/tributárias dependem do caso concreto.
        </Text>
      </Page>

      {/* ======================
          PÁGINA 2 — PLANEJAMENTO SUCESSÓRIO
         ====================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Planejamento Sucessório</Text>
        <Text style={styles.subtitle}>
          {safeText(clientName)} • {safeText(scenarioName)} • Gerado em {generatedAt}
        </Text>
        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Composição Patrimonial</Text>
        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Liquidez imediata</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(financial)}</Text>
            <Text style={styles.small}>
              Capital com maior liquidez para sustentar renda/aposentadoria.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patrimônio imobilizado</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(illiquid)}</Text>
            <Text style={styles.small}>
              Bens entram em sucessão, mas não devem inflar o “capital de aposentadoria”.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Custos do Inventário (estimativa)</Text>
        <View style={styles.card}>
          <View style={styles.rowLine}>
            <Text style={styles.rowLabel}>Imposto (ITCMD)</Text>
            <Text style={styles.rowValue}>{formatCurrencyBR(itcmd)}</Text>
          </View>
          <View style={styles.rowLine}>
            <Text style={styles.rowLabel}>Honorários</Text>
            <Text style={styles.rowValue}>{formatCurrencyBR(legal)}</Text>
          </View>
          <View style={styles.rowLine}>
            <Text style={styles.rowLabel}>Custas</Text>
            <Text style={styles.rowValue}>{formatCurrencyBR(fees)}</Text>
          </View>
          <View style={{ ...styles.rowLine, borderBottom: "none" }}>
            <Text style={{ ...styles.rowLabel, fontWeight: 900 }}>Total estimado</Text>
            <Text style={{ ...styles.rowValue, color: "#b91c1c" }}>
              {formatCurrencyBR(totalCosts)}
            </Text>
          </View>

          {liquidityOk ? (
            <Text style={styles.badgeOk}>Liquidez suficiente</Text>
          ) : (
            <Text style={styles.badgeWarn}>
              Gap de liquidez: {formatCurrencyBR(liquidityGap)}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Seguro de Renda (incapacidade)</Text>
        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Base mensal</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(monthlyBase)}</Text>
            <Text style={styles.small}>Base usada para estimar capital de proteção.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cobertura 12 meses</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(coverage12)}</Text>
            <Text style={styles.small}>Para manter padrão de vida por 1 ano.</Text>
          </View>
        </View>

        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cobertura 60 meses</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(coverage60)}</Text>
            <Text style={styles.small}>Para manter padrão de vida por 5 anos.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Economia potencial com planejamento</Text>
            <Text style={styles.bigNumber}>{formatCurrencyBR(estimatedSavings)}</Text>
            <Text style={styles.small}>
              Estimativa ({formatPercent(savingsPct * 100)}) sobre o custo total de inventário.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Este documento é uma visão educacional e estimativa. Validações jurídicas/tributárias dependem do caso concreto.
        </Text>
      </Page>
    </Document>
  );
}
