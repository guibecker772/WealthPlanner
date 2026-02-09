// src/reports/v2/pages/PageAppendixAssets.jsx
// Apêndice — Detalhe completo dos ativos (sem limite de 15)

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { C, s, PAGE_PADDING } from "../pdfTheme";
import PageFooter from "../components/PageFooter";

const cs = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    minHeight: 22,
    alignItems: "center",
  },
  rowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    minHeight: 22,
    alignItems: "center",
    backgroundColor: C.paper,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: C.cream,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    minHeight: 24,
    alignItems: "center",
  },
  cellName: { flex: 3, paddingHorizontal: 6, paddingVertical: 4 },
  cellType: { flex: 2, paddingHorizontal: 6, paddingVertical: 4 },
  cellValue: { flex: 2, paddingHorizontal: 6, paddingVertical: 4, textAlign: "right" },
  cellPct: { flex: 1, paddingHorizontal: 6, paddingVertical: 4, textAlign: "right" },
  headerText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.secondary, textTransform: "uppercase" },
  cellText: { fontSize: 8, color: C.ink },
  cellTextMuted: { fontSize: 8, color: C.secondary },
  totalRow: {
    flexDirection: "row",
    backgroundColor: C.cream,
    borderTopWidth: 2,
    borderTopColor: C.border,
    minHeight: 26,
    alignItems: "center",
  },
  totalText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.ink },
  footerNote: {
    marginTop: 8,
    fontSize: 7,
    color: C.muted,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
});

// Format BRL compact
function fmtBRL(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtPct(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1).replace(".", ",")}%`;
}

// Max rows that fit on one page (after header section)
const ROWS_FIRST_PAGE = 28;
const ROWS_SUBSEQUENT = 34;

// Type labels
const TYPE_LABELS = {
  financial: "Financeiro",
  international: "Internacional",
  previdencia: "Previdência",
  real_estate: "Imóvel",
  vehicle: "Veículo",
  crypto: "Cripto",
  stock: "Ações",
  fixed_income: "Renda Fixa",
  fund: "Fundo",
};

export default function PageAppendixAssets({ data, startPage, totalPages }) {
  const assets = data.assets?.normalized || [];
  const totalValue = data.assets?.totals?.brl || 0;
  const clientName = data.meta?.clientName || "";

  if (assets.length === 0) {
    return (
      <Page size="A4" style={s.page}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Apêndice — Detalhe dos Ativos</Text>
        </View>
        <View style={s.emptyState}>
          <Text style={s.emptyStateText}>Nenhum ativo cadastrado.</Text>
        </View>
        <PageFooter pageNumber={startPage} totalPages={totalPages} clientName={clientName} />
      </Page>
    );
  }

  // Sort by value descending
  const sorted = [...assets].sort((a, b) => (b.amountBRL || 0) - (a.amountBRL || 0));

  // Enrich with % of total
  const enriched = sorted.map((a) => ({
    ...a,
    pct: totalValue > 0 ? ((a.amountBRL || 0) / totalValue) * 100 : 0,
    typeLabel: TYPE_LABELS[a.type] || a.type || "Outro",
    displayName: a.name || a.label || "Ativo sem nome",
    displayValue: a.amountBRL || 0,
  }));

  // Split into pages
  const pages = [];
  let remaining = [...enriched];
  let pageIdx = 0;

  while (remaining.length > 0) {
    const limit = pageIdx === 0 ? ROWS_FIRST_PAGE : ROWS_SUBSEQUENT;
    pages.push(remaining.splice(0, limit));
    pageIdx++;
  }

  const renderHeader = () => (
    <View style={cs.headerRow}>
      <View style={cs.cellName}><Text style={cs.headerText}>Ativo</Text></View>
      <View style={cs.cellType}><Text style={cs.headerText}>Tipo</Text></View>
      <View style={cs.cellValue}><Text style={cs.headerText}>Valor (BRL)</Text></View>
      <View style={cs.cellPct}><Text style={cs.headerText}>%</Text></View>
    </View>
  );

  return pages.map((pageAssets, pIdx) => {
    const currentPage = startPage + pIdx;
    const isFirst = pIdx === 0;
    const isLast = pIdx === pages.length - 1;

    return (
      <Page key={pIdx} size="A4" style={s.page}>
        {isFirst && (
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Apêndice — Detalhe dos Ativos</Text>
            <Text style={s.sectionSubtitle}>
              {enriched.length} ativos • Total: {fmtBRL(totalValue)}
            </Text>
          </View>
        )}

        <View style={s.table}>
          {renderHeader()}
          {pageAssets.map((a, i) => (
            <View key={i} style={i % 2 === 0 ? cs.row : cs.rowAlt}>
              <View style={cs.cellName}>
                <Text style={cs.cellText} numberOfLines={1}>{a.displayName}</Text>
              </View>
              <View style={cs.cellType}>
                <Text style={cs.cellTextMuted}>{a.typeLabel}</Text>
              </View>
              <View style={cs.cellValue}>
                <Text style={cs.cellText}>{fmtBRL(a.displayValue)}</Text>
              </View>
              <View style={cs.cellPct}>
                <Text style={cs.cellTextMuted}>{fmtPct(a.pct)}</Text>
              </View>
            </View>
          ))}
          {isLast && (
            <View style={cs.totalRow}>
              <View style={cs.cellName}>
                <Text style={cs.totalText}>TOTAL</Text>
              </View>
              <View style={cs.cellType} />
              <View style={cs.cellValue}>
                <Text style={cs.totalText}>{fmtBRL(totalValue)}</Text>
              </View>
              <View style={cs.cellPct}>
                <Text style={cs.totalText}>100%</Text>
              </View>
            </View>
          )}
        </View>

        {isLast && (
          <Text style={cs.footerNote}>
            Valores em reais (BRL) na data de referência. Ativos internacionais convertidos pela cotação do dia.
            Posições sujeitas a variação de mercado.
          </Text>
        )}

        <PageFooter pageNumber={currentPage} totalPages={totalPages} clientName={clientName} />
      </Page>
    );
  });
}

/** Helper to compute how many appendix pages this will generate */
export function countAppendixPages(assets) {
  const count = assets?.normalized?.length || 0;
  if (count === 0) return 1; // empty state page
  let pages = 1;
  let remaining = count - ROWS_FIRST_PAGE;
  while (remaining > 0) {
    pages++;
    remaining -= ROWS_SUBSEQUENT;
  }
  return pages;
}
