// src/reports/v2/pages/Page02TOC.jsx
// Sumário + "Como ler este relatório"

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { C, s } from "../pdfTheme";
import PageFooter from "../components/PageFooter";

const cs = StyleSheet.create({
  tocTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 20,
  },
  tocItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  tocLabel: { fontSize: 10, color: C.ink },
  tocPage: { fontSize: 10, color: C.muted },

  howTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginTop: 28,
    marginBottom: 10,
  },
  howText: {
    fontSize: 9,
    color: C.secondary,
    lineHeight: 1.6,
    marginBottom: 6,
  },
});

const PAGES = [
  { label: "Capa", page: 1 },
  { label: "Sumário & Como Ler", page: 2 },
  { label: "Resumo Executivo", page: 3 },
  { label: "Plano de Ação", page: 4 },
  { label: "Projeção Patrimonial", page: 5 },
  { label: "Renda e Aposentadoria", page: 6 },
  { label: "Patrimônio e Liquidez", page: 7 },
  { label: "Cenários Comparativos", page: 8 },
  { label: "Planejamento Sucessório", page: 9 },
  { label: "Premissas, Disclaimers & Contato", page: 10 },
];

export default function Page02TOC({ data, totalPages }) {
  const clientName = data.meta?.clientName || "";
  const hasAppendix = data.includeAppendix && (data.assets?.normalized?.length || 0) > 0;

  const items = [...PAGES];
  if (hasAppendix) {
    items.push({ label: "Apêndice — Detalhe dos Ativos", page: 11 });
  }

  return (
    <Page size="A4" style={s.page}>
      <Text style={cs.tocTitle}>Sumário</Text>

      {items.map((item, i) => (
        <View key={i} style={cs.tocItem}>
          <Text style={cs.tocLabel}>
            {i + 1}. {item.label}
          </Text>
          <Text style={cs.tocPage}>Página {item.page}</Text>
        </View>
      ))}

      <Text style={cs.howTitle}>Como ler este relatório</Text>
      <Text style={cs.howText}>
        • Os KPIs e valores apresentados refletem o cenário ativo no momento da geração. Eles são os mesmos exibidos no Dashboard do WealthPlanner Pro.
      </Text>
      <Text style={cs.howText}>
        • O gráfico de projeção (página 5) mostra a evolução do patrimônio financeiro ao longo do tempo, com marcadores para eventos relevantes.
      </Text>
      <Text style={cs.howText}>
        • Cenários comparativos (página 8) ajudam a visualizar impactos de premissas diferentes.
      </Text>
      <Text style={cs.howText}>
        • Valores em "—" indicam dados ainda não preenchidos ou indisponíveis para o cenário atual.
      </Text>
      <Text style={cs.howText}>
        • Este relatório é confidencial e destinado exclusivamente ao cliente identificado na capa.
      </Text>

      <PageFooter pageNumber={2} totalPages={totalPages} clientName={clientName} />
    </Page>
  );
}
