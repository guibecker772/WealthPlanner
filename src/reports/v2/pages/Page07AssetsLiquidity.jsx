// src/reports/v2/pages/Page07AssetsLiquidity.jsx
// Patrimônio e Liquidez: categorias Financeiro/Previdência/Imóveis/Outros + insights

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { C, s } from "../pdfTheme";
import PageFooter from "../components/PageFooter";

const cs = StyleSheet.create({
  barContainer: {
    flexDirection: "row",
    height: 18,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
});

function fmtCurrency(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } catch { return `R$ ${Math.round(v)}`; }
}

const CATEGORY_COLORS = {
  Financeiro: C.blue,
  Previdência: C.gold,
  Imóveis: "#7c6f4f",
  Outros: C.muted,
};

export default function Page07AssetsLiquidity({ data, totalPages }) {
  const clientName = data.meta?.clientName || "";
  const { flags, fxExposure, kpis } = data;

  // V2-hardening: use 4-category breakdown from snapshot (always 4 items)
  const categories = data.assetCategories || data.assetBreakdown || [];
  const categoryInsights = data.assetInsights || [];

  const totalWealth = kpis?.patrimonioTotal?.raw ?? 0;
  const illiquid = kpis?.patrimonioImobilizado?.raw ?? 0;
  const illiquidPct = totalWealth > 0 ? (illiquid / totalWealth) * 100 : 0;

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Patrimônio e Liquidez</Text>
        <Text style={s.sectionSubtitle}>
          Composição patrimonial por categoria e análise de liquidez
        </Text>
      </View>

      {flags.hasAssets ? (
        <>
          {/* Stacked bar — only segments with value */}
          {categories.some(c => c.pct > 0) && (
            <View style={cs.barContainer}>
              {categories.filter(c => c.pct > 0).map((cat, i) => (
                <View
                  key={i}
                  style={{
                    flex: cat.pct,
                    backgroundColor: CATEGORY_COLORS[cat.label] || C.muted,
                  }}
                />
              ))}
            </View>
          )}

          {/* Category cards — ALWAYS 4, even with 0% (V2-hardening) */}
          <View style={s.cardGrid}>
            {categories.map((cat, i) => (
              <View key={i} style={s.card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: CATEGORY_COLORS[cat.label] || C.muted }} />
                  <Text style={s.cardTitle}>{cat.label}</Text>
                </View>
                <Text style={s.cardValue}>
                  {cat.value > 0 ? fmtCurrency(cat.value) : "—"}
                </Text>
                <Text style={s.cardHint}>
                  {cat.pct > 0
                    ? `${cat.pct.toFixed(1).replace(".", ",")}% do total`
                    : "Sem alocação nesta categoria"}
                </Text>
              </View>
            ))}
          </View>

          {/* FX exposure */}
          {fxExposure && fxExposure.internationalPct > 0 && (
            <View style={s.bulletBox}>
              <Text style={s.bulletTitle}>Exposição Cambial</Text>
              <View style={s.bulletRow}>
                <View style={s.bulletDot} />
                <Text style={s.bulletText}>
                  {(fxExposure.percentages?.BRL ?? 100).toFixed(0)}% BRL • {(fxExposure.percentages?.USD ?? 0).toFixed(0)}% USD • {(fxExposure.percentages?.EUR ?? 0).toFixed(0)}% EUR
                </Text>
              </View>
            </View>
          )}

          {/* Insights — from snapshot (V2-hardening) */}
          <View style={s.bulletBox}>
            <Text style={s.bulletTitle}>Insights Automáticos</Text>
            {categoryInsights.length > 0 ? (
              categoryInsights.map((insight, i) => (
                <View key={i} style={s.bulletRow}>
                  <View style={[s.bulletDot, insight.type === "warning" ? { backgroundColor: C.warning } : {}]} />
                  <Text style={s.bulletText}>{insight.text}</Text>
                </View>
              ))
            ) : (
              <>
                {illiquidPct > 60 && (
                  <View style={s.bulletRow}>
                    <View style={[s.bulletDot, { backgroundColor: C.warning }]} />
                    <Text style={s.bulletText}>
                      Mais de {Math.round(illiquidPct)}% do patrimônio é imobilizado. Considere estratégias para melhorar a liquidez.
                    </Text>
                  </View>
                )}
                {illiquidPct <= 60 && illiquidPct > 0 && (
                  <View style={s.bulletRow}>
                    <View style={[s.bulletDot, { backgroundColor: C.success }]} />
                    <Text style={s.bulletText}>
                      Boa relação entre liquidez e patrimônio imobilizado ({Math.round(100 - illiquidPct)}% líquido).
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </>
      ) : (
        <View style={s.emptyState}>
          <Text style={s.emptyStateText}>
            Nenhum ativo cadastrado. Adicione ativos no planejamento para visualizar a composição patrimonial.
          </Text>
        </View>
      )}

      <PageFooter pageNumber={7} totalPages={totalPages} clientName={clientName} />
    </Page>
  );
}
