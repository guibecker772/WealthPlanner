// src/reports/v2/pages/Page09Succession.jsx
// Sucessão: custos ITCMD+honorários+custas, regra liquidez suficiente, recomendações

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
function fmtPct(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(d).replace(".", ",")}%`;
}

export default function Page09Succession({ data, totalPages }) {
  const clientName = data.meta?.clientName || "";
  const succ = data.succession || {};
  const costs = succ.costs || {};
  const gap = succ.liquidityGap ?? 0;
  const sufficient = data.successionLiquiditySufficient;

  const financial = succ.financialTotal ?? 0;
  const previdencia = succ.previdenciaTotal ?? 0;
  const illiquid = succ.illiquidTotal ?? 0;
  const estate = succ.totalEstate ?? 0;
  const state = succ.state || "SP";

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Planejamento Sucessório</Text>
        <Text style={s.sectionSubtitle}>
          Custos estimados do inventário e análise de liquidez • Estado: {state}
        </Text>
      </View>

      {/* Patrimônio overview */}
      <View style={s.cardGrid}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Patrimônio Líquido</Text>
          <Text style={s.cardValue}>{fmtCurrency(financial + previdencia)}</Text>
          <Text style={s.cardHint}>Capital com maior liquidez</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Patrimônio Imobilizado</Text>
          <Text style={s.cardValue}>{fmtCurrency(illiquid)}</Text>
          <Text style={s.cardHint}>Bens que entram em inventário</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Patrimônio Total</Text>
          <Text style={s.cardValue}>{fmtCurrency(estate)}</Text>
        </View>
      </View>

      {/* Costs table */}
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, { flex: 2 }]}>Custo do Inventário</Text>
          <Text style={s.tableHeaderCell}>Alíquota</Text>
          <Text style={s.tableHeaderCell}>Valor Estimado</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tableCell, { flex: 2 }]}>ITCMD (Imposto)</Text>
          <Text style={s.tableCell}>{fmtPct(succ.inputs?.itcmdRate ?? 0.04)}</Text>
          <Text style={s.tableCellBold}>{fmtCurrency(costs.itcmd)}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tableCell, { flex: 2 }]}>Honorários Advocatícios</Text>
          <Text style={s.tableCell}>{fmtPct(succ.inputs?.legalPct ?? 0.05)}</Text>
          <Text style={s.tableCellBold}>{fmtCurrency(costs.legal)}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tableCell, { flex: 2 }]}>Custas Cartoriais</Text>
          <Text style={s.tableCell}>{fmtPct(succ.inputs?.feesPct ?? 0.02)}</Text>
          <Text style={s.tableCellBold}>{fmtCurrency(costs.fees)}</Text>
        </View>
        <View style={s.tableRowTotal}>
          <Text style={[s.tableCellBold, { flex: 2 }]}>Total Estimado</Text>
          <Text style={s.tableCell}>—</Text>
          <Text style={[s.tableCellBold, { color: C.danger }]}>
            {fmtCurrency(costs.total)}
          </Text>
        </View>
      </View>

      {/* Liquidity badge */}
      {sufficient ? (
        <Text style={s.badgeOk}>Liquidez suficiente para cobrir custos</Text>
      ) : (
        <View style={{ marginBottom: 10 }}>
          <Text style={s.badgeDanger}>
            Gap de liquidez: {fmtCurrency(gap)} — Risco de venda forçada de ativos
          </Text>
        </View>
      )}

      {/* Previdência */}
      {(succ.previdenciaPGBL > 0 || succ.previdenciaVGBL > 0) && (
        <View style={[s.bulletBox, { marginTop: 12 }]}>
          <Text style={s.bulletTitle}>Previdência Privada</Text>
          <View style={s.bulletRow}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>
              PGBL: {fmtCurrency(succ.previdenciaPGBL)} • VGBL: {fmtCurrency(succ.previdenciaVGBL)}
            </Text>
          </View>
          <View style={s.bulletRow}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>
              {succ.previdenciaConfig?.excludeFromInventory !== false
                ? "Previdência excluída do inventário (transferência direta aos beneficiários)"
                : "Previdência incluída no inventário"}
            </Text>
          </View>
        </View>
      )}

      {/* Recommendations */}
      <View style={[s.bulletBox, { marginTop: 10 }]}>
        <Text style={s.bulletTitle}>Recomendações</Text>
        <View style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>
            Revisar a estrutura sucessória para reduzir custos e tempo de transferência.
          </Text>
        </View>
        <View style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>
            Planejar liquidez para cobrir custos sem venda forçada de ativos.
          </Text>
        </View>
        <View style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>
            Agendar reunião com especialista para avaliar holding, previdência e seguro.
          </Text>
        </View>
        {!sufficient && (
          <View style={s.bulletRow}>
            <View style={[s.bulletDot, { backgroundColor: C.danger }]} />
            <Text style={s.bulletText}>
              Urgente: constituir reserva líquida de {fmtCurrency(gap)} para cobrir gap de sucessão.
            </Text>
          </View>
        )}
      </View>

      <PageFooter pageNumber={9} totalPages={totalPages} clientName={clientName} />
    </Page>
  );
}
