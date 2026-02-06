// src/reports/ModularReportPDF.jsx
// Relatório PDF Modular - Versão corrigida com fonte única de dados
import React, { useMemo } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Line,
  Path,
} from "@react-pdf/renderer";
import { DISCLAIMER_TEXT } from "../constants/reportSections";
import { createReportSnapshot } from "./reportSnapshot";

// ========================================
// HELPERS
// ========================================

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrencyBR(v, decimals = 0) {
  const n = asNumber(v);
  try {
    return n.toLocaleString("pt-BR", { 
      style: "currency", 
      currency: "BRL", 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  } catch {
    return `R$ ${n.toFixed(decimals)}`;
  }
}

function formatCurrencyOriginal(value, currency) {
  const n = asNumber(value);
  const symbols = { USD: "$", EUR: "€", BRL: "R$" };
  const symbol = symbols[currency] || currency;
  return `${symbol} ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(v, digits = 1) {
  const n = asNumber(v);
  return `${n.toFixed(digits).replace(".", ",")}%`;
}

function formatDate(dateStr) {
  try {
    if (!dateStr) return new Date().toLocaleDateString("pt-BR");
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function formatDateTime(dateStr) {
  try {
    if (!dateStr) return new Date().toLocaleString("pt-BR");
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function safeText(v) {
  return (v ?? "").toString();
}

function pct(part, total) {
  const t = asNumber(total);
  if (t <= 0) return 0;
  return (asNumber(part) / t) * 100;
}

/**
 * Formata valor de KPI, retornando "—" se indisponível
 */
function displayKpi(kpiObj, formatter = null) {
  if (!kpiObj?.available) {
    return "—";
  }
  if (formatter) {
    return formatter(kpiObj.raw);
  }
  return String(kpiObj.value);
}

// ========================================
// CORES E ESTILOS - TEMA WHITE PAPER
// ========================================

const colors = {
  // Cores principais
  primary: "#0f172a",      // Slate 900 - texto principal
  secondary: "#475569",    // Slate 600 - texto secundário
  muted: "#94a3b8",        // Slate 400 - texto muted
  
  // Acentos
  accent: "#3b82f6",       // Blue 500 - destaque
  accentDark: "#1e40af",   // Blue 800 - destaque escuro
  gold: "#d97706",         // Amber 600 - destaque dourado
  
  // Fundos
  background: "#ffffff",   // Branco puro
  surface: "#f8fafc",      // Slate 50 - superfície
  surfaceAlt: "#f1f5f9",   // Slate 100 - superfície alternativa
  
  // Bordas
  border: "#e2e8f0",       // Slate 200
  borderLight: "#f1f5f9",  // Slate 100
  
  // Status
  success: "#16a34a",      // Green 600
  warning: "#d97706",      // Amber 600
  danger: "#dc2626",       // Red 600
  
  // Capa (tema escuro para contraste)
  coverBg: "#0f172a",      // Slate 900
  coverText: "#ffffff",
  coverMuted: "#94a3b8",
};

const styles = StyleSheet.create({
  // ========== PÁGINAS ==========
  page: {
    padding: 40,
    paddingBottom: 60,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.primary,
    backgroundColor: colors.background,
  },
  
  coverPage: {
    padding: 0,
    backgroundColor: colors.coverBg,
  },

  // ========== CAPA ==========
  coverContainer: {
    flex: 1,
    padding: 50,
    justifyContent: "space-between",
  },
  
  coverHeader: {
    marginBottom: 40,
  },
  
  coverBrand: {
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 30,
  },
  
  coverTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.coverText,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  
  coverSubtitle: {
    fontSize: 14,
    color: colors.coverMuted,
    marginBottom: 20,
  },
  
  coverThesis: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: 700,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  
  coverMeta: {
    marginTop: "auto",
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  
  coverMetaRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  
  coverMetaLabel: {
    width: 130,
    fontSize: 10,
    color: colors.coverMuted,
  },
  
  coverMetaValue: {
    fontSize: 10,
    color: colors.coverText,
    fontWeight: 700,
  },
  
  coverSectionsTitle: {
    fontSize: 10,
    color: colors.coverMuted,
    marginTop: 25,
    marginBottom: 8,
  },
  
  coverSectionsList: {
    fontSize: 10,
    color: colors.coverText,
    lineHeight: 1.6,
  },
  
  coverFooter: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  
  coverFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  
  coverFooterText: {
    fontSize: 8,
    color: colors.coverMuted,
  },
  
  coverConfidential: {
    fontSize: 8,
    color: colors.gold,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // ========== ÍNDICE ==========
  tocTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 24,
    color: colors.primary,
  },
  
  tocItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  tocLabel: {
    fontSize: 11,
    color: colors.primary,
  },
  
  tocPage: {
    fontSize: 11,
    color: colors.muted,
  },

  // ========== CABEÇALHOS DE SEÇÃO ==========
  sectionHeader: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  
  sectionSubtitle: {
    fontSize: 10,
    color: colors.secondary,
  },

  // ========== CARDS ==========
  cardGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.background,
  },
  
  cardHighlight: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.surface,
  },
  
  cardTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  
  cardValue: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  
  cardValueSmall: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  
  cardHint: {
    fontSize: 9,
    color: colors.secondary,
    lineHeight: 1.4,
  },
  
  cardNote: {
    fontSize: 8,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: 4,
  },

  // ========== TABELAS ==========
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  tableHeaderCell: {
    flex: 1,
    padding: 10,
    fontSize: 9,
    fontWeight: 700,
    color: colors.secondary,
    textTransform: "uppercase",
  },
  
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  
  tableRowLast: {
    flexDirection: "row",
  },
  
  tableRowTotal: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  
  tableCell: {
    flex: 1,
    padding: 10,
    fontSize: 10,
    color: colors.primary,
  },
  
  tableCellBold: {
    flex: 1,
    padding: 10,
    fontSize: 10,
    color: colors.primary,
    fontWeight: 700,
  },
  
  tableCellMuted: {
    flex: 1,
    padding: 10,
    fontSize: 9,
    color: colors.muted,
  },

  // ========== BADGES ==========
  badgeOk: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    color: colors.success,
    fontSize: 9,
    fontWeight: 700,
  },
  
  badgeWarn: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fef3c7",
    color: colors.warning,
    fontSize: 9,
    fontWeight: 700,
  },
  
  badgeDanger: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fee2e2",
    color: colors.danger,
    fontSize: 9,
    fontWeight: 700,
  },

  // ========== BARRA DE PROGRESSO ==========
  progressContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 6,
  },
  
  progressBar: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 4,
  },

  // ========== BULLETS ==========
  bulletBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    backgroundColor: colors.surface,
  },
  
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: colors.secondary,
    lineHeight: 1.5,
  },
  
  bulletTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 10,
  },

  // ========== FOOTER (fixo em todas as páginas) ==========
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  
  pageFooterText: {
    fontSize: 8,
    color: colors.muted,
  },
  
  pageNumber: {
    fontSize: 8,
    color: colors.muted,
  },

  // ========== DISCLAIMERS ==========
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 16,
  },
  
  disclaimerText: {
    fontSize: 9,
    color: colors.secondary,
    lineHeight: 1.6,
    marginBottom: 10,
    textAlign: "justify",
  },
  
  disclaimerFooter: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: 8,
    color: colors.muted,
    textAlign: "center",
  },

  // ========== ESTADOS VAZIOS ==========
  emptyState: {
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  
  emptyStateText: {
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
  },

  // ========== GRÁFICO ==========
  chartContainer: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  
  chartTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
  },
  
  chartLegend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  chartLegendText: {
    fontSize: 8,
    color: colors.secondary,
  },

  // ========== AVISO DE ARREDONDAMENTO ==========
  roundingWarning: {
    flexDirection: "row",
    gap: 6,
    padding: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    marginBottom: 12,
  },
  
  roundingWarningText: {
    fontSize: 8,
    color: colors.warning,
  },
});

// ========================================
// COMPONENTE DE GRÁFICO SVG SIMPLIFICADO
// ========================================

function SimpleWealthChart({ series, retirementAge }) {
  if (!series || series.length < 2) return null;
  
  const chartWidth = 480;
  const chartHeight = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  // Filtrar série para pontos válidos
  const validPoints = series.filter(p => p?.age != null && p?.wealth != null);
  if (validPoints.length < 2) return null;
  
  const minAge = Math.min(...validPoints.map(p => p.age));
  const maxAge = Math.max(...validPoints.map(p => p.age));
  const maxWealth = Math.max(...validPoints.map(p => p.wealth)) * 1.1;
  
  if (maxWealth <= 0) return null;
  
  // Escalas
  const xScale = (age) => padding.left + ((age - minAge) / (maxAge - minAge || 1)) * innerWidth;
  const yScale = (wealth) => padding.top + innerHeight - (wealth / maxWealth) * innerHeight;
  
  // Path da linha
  const pathData = validPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.age).toFixed(1)} ${yScale(p.wealth).toFixed(1)}`)
    .join(" ");
  
  // Path da área preenchida
  const areaPath = `${pathData} L ${xScale(maxAge).toFixed(1)} ${yScale(0).toFixed(1)} L ${xScale(minAge).toFixed(1)} ${yScale(0).toFixed(1)} Z`;
  
  // Ticks do eixo Y (simplificado)
  const yTicks = [0, maxWealth * 0.25, maxWealth * 0.5, maxWealth * 0.75, maxWealth].map(v => ({
    value: v,
    y: yScale(v),
    label: `${(v / 1000000).toFixed(1)}M`,
  }));
  
  // Ticks do eixo X (a cada 10 anos)
  const xTicks = [];
  for (let age = minAge; age <= maxAge; age += 10) {
    xTicks.push({ age, x: xScale(age) });
  }
  
  const retirementX = retirementAge && retirementAge >= minAge && retirementAge <= maxAge 
    ? xScale(retirementAge) 
    : null;
  
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Evolução Patrimonial Projetada</Text>
      
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid horizontal */}
        {yTicks.map((tick, i) => (
          <Line
            key={`grid-${i}`}
            x1={padding.left}
            y1={tick.y}
            x2={chartWidth - padding.right}
            y2={tick.y}
            stroke={colors.border}
            strokeWidth={0.5}
          />
        ))}
        
        {/* Área preenchida */}
        <Path
          d={areaPath}
          fill={colors.accent}
          opacity={0.1}
        />
        
        {/* Linha principal */}
        <Path
          d={pathData}
          stroke={colors.accent}
          strokeWidth={2}
          fill="none"
        />
        
        {/* Linha de aposentadoria */}
        {retirementX && (
          <Line
            x1={retirementX}
            y1={padding.top}
            x2={retirementX}
            y2={chartHeight - padding.bottom}
            stroke={colors.success}
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
        )}
      </Svg>
      
      <View style={styles.chartLegend}>
        <View style={styles.chartLegendItem}>
          <View style={[styles.chartLegendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.chartLegendText}>Patrimônio projetado</Text>
        </View>
        {retirementAge && (
          <View style={styles.chartLegendItem}>
            <View style={[styles.chartLegendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.chartLegendText}>Aposentadoria ({retirementAge} anos)</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function ModularReportPDF({
  clientData,
  kpis,
  succession,
  reportMeta,
  selectedSections,
  successionSubBlocks,
  engineOutput,
}) {
  // Criar snapshot normalizado
  const snapshot = useMemo(() => {
    return createReportSnapshot({
      clientData,
      engineOutput: engineOutput || (kpis ? { kpis, succession } : null),
      reportMeta,
      selectedSections,
      successionSubBlocks,
    });
  }, [clientData, kpis, succession, reportMeta, selectedSections, successionSubBlocks, engineOutput]);

  // Extrair dados do snapshot
  const {
    meta,
    planningThesis,
    includedSections,
    executiveDiagnostic,
    nextSteps,
    assets,
    totalsValidation,
    kpis: kpisDisplay,
    scenarioFx,
    fxExposure,
    goals,
    succession: successionData,
    scenarios,
    cashInEvents,
    contributionTimeline,
    chartSeries,
    chartPremises,
  } = snapshot;

  const clientName = safeText(meta.clientName);
  const advisorName = safeText(meta.advisorName);
  const referenceDate = formatDate(meta.referenceDate);
  const generatedAt = formatDateTime(meta.generatedAt);
  const scenarioName = safeText(meta.scenarioName);
  const appVersion = safeText(meta.appVersion);

  // Patrimônios (do snapshot, já validados)
  const totalWealth = kpisDisplay.patrimonioTotal?.raw || 0;
  const financial = kpisDisplay.patrimonioFinanceiro?.raw || 0;
  const illiquid = kpisDisplay.patrimonioImobilizado?.raw || 0;
  const previdencia = kpisDisplay.patrimonioPrevidencia?.raw || 0;

  // Sucessão
  const totalCosts = successionData.costs.total;
  const liquidityGap = successionData.liquidityGap;

  // Lista de seções habilitadas para índice dinâmico (inclui Evolução)
  const enabledSections = useMemo(() => {
    const sections = [];
    if (selectedSections.executive) sections.push({ id: "executive", title: "Visão Executiva" });
    if (selectedSections.executive) sections.push({ id: "evolution", title: "Evolução Patrimonial" });
    if (selectedSections.assets) sections.push({ id: "assets", title: "Patrimônio" });
    if (selectedSections.scenarios) sections.push({ id: "scenarios", title: "Cenários e Estratégias" });
    if (selectedSections.goals) sections.push({ id: "goals", title: "Metas" });
    if (selectedSections.succession) sections.push({ id: "succession", title: "Sucessão" });
    sections.push({ id: "disclaimers", title: "Informações Importantes" });
    return sections;
  }, [selectedSections]);

  // Cálculo dinâmico de páginas (inclui Evolução como seção própria)
  const pageNumbers = useMemo(() => {
    const pages = { toc: 2 };
    let currentPage = 3;

    if (selectedSections.executive) {
      pages.executive = currentPage++;
      pages.evolution = currentPage++; // Evolução é seção própria após Executive
    }
    if (selectedSections.assets) {
      pages.assets = currentPage++;
    }
    if (selectedSections.scenarios) {
      pages.scenarios = currentPage++;
    }
    if (selectedSections.goals) {
      pages.goals = currentPage++;
    }
    if (selectedSections.succession) {
      pages.succession = currentPage++;
    }
    pages.disclaimers = currentPage++;
    pages.total = currentPage - 1;

    return pages;
  }, [selectedSections]);

  // Dados para cenários
  const retirementAge = asNumber(clientData?.retirementAge ?? 60);

  return (
    <Document>
      {/* ====================== CAPA ====================== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverContainer}>
          <View style={styles.coverHeader}>
            <Text style={styles.coverBrand}>WEALTHPLANNER PRO</Text>
            <Text style={styles.coverTitle}>Relatório de{"\n"}Planejamento Financeiro</Text>
            <Text style={styles.coverSubtitle}>
              Documento personalizado para {clientName}
            </Text>
            <Text style={styles.coverThesis}>{planningThesis}</Text>
          </View>

          {/* Diagnóstico Executivo */}
          {executiveDiagnostic && executiveDiagnostic.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 9, color: colors.coverMuted, marginBottom: 8 }}>
                Resumo Executivo:
              </Text>
              {executiveDiagnostic.map((bullet, i) => (
                <Text key={i} style={{ fontSize: 10, color: colors.coverText, marginBottom: 4 }}>
                  • {bullet}
                </Text>
              ))}
            </View>
          )}

          {/* Próximos Passos */}
          {nextSteps && nextSteps.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 9, color: colors.gold, marginBottom: 8, fontWeight: 700 }}>
                Próximos Passos Recomendados:
              </Text>
              {nextSteps.map((step, i) => (
                <Text key={i} style={{ fontSize: 10, color: colors.coverText, marginBottom: 4 }}>
                  {i + 1}. {step}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.coverMeta}>
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Cliente</Text>
              <Text style={styles.coverMetaValue}>{clientName}</Text>
            </View>
            {advisorName && (
              <View style={styles.coverMetaRow}>
                <Text style={styles.coverMetaLabel}>Assessor</Text>
                <Text style={styles.coverMetaValue}>{advisorName}</Text>
              </View>
            )}
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Data de Referência</Text>
              <Text style={styles.coverMetaValue}>{referenceDate}</Text>
            </View>
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Cenário</Text>
              <Text style={styles.coverMetaValue}>{scenarioName}</Text>
            </View>

            <Text style={styles.coverSectionsTitle}>Este documento cobre:</Text>
            <Text style={styles.coverSectionsList}>
              {includedSections.map((s, i) => `${i > 0 ? " • " : ""}${s}`).join("")}
            </Text>
          </View>

          <View style={styles.coverFooter}>
            <View style={styles.coverFooterRow}>
              <Text style={styles.coverConfidential}>Confidencial</Text>
              <Text style={styles.coverFooterText}>
                {appVersion} • Gerado em {generatedAt}
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ====================== ÍNDICE ====================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tocTitle}>Índice</Text>
        {enabledSections.map((section, idx) => (
          <View key={section.id} style={styles.tocItem}>
            <Text style={styles.tocLabel}>
              {idx + 1}. {section.title}
            </Text>
            <Text style={styles.tocPage}>
              Página {pageNumbers[section.id] || "—"}
            </Text>
          </View>
        ))}
        <View style={styles.pageFooter}>
          <Text style={styles.pageFooterText}>
            {clientName} • Confidencial
          </Text>
          <Text style={styles.pageNumber}>
            Página 2 de {pageNumbers.total}
          </Text>
        </View>
      </Page>

      {/* ====================== VISÃO EXECUTIVA ====================== */}
      {selectedSections.executive && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Visão Executiva</Text>
            <Text style={styles.sectionSubtitle}>
              Resumo dos principais indicadores do seu planejamento
            </Text>
          </View>

          {/* Patrimônio e Capital */}
          <View style={styles.cardGrid}>
            <View style={styles.cardHighlight}>
              <Text style={styles.cardTitle}>Patrimônio Total</Text>
              <Text style={styles.cardValue}>
                {displayKpi(kpisDisplay.patrimonioTotal, formatCurrencyBR)}
              </Text>
              <Text style={styles.cardHint}>
                Líquido: {formatPercent(pct(financial + previdencia, totalWealth))} • Bens: {formatPercent(pct(illiquid, totalWealth))}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Capital na Aposentadoria</Text>
              <Text style={styles.cardValue}>
                {displayKpi(kpisDisplay.capitalAposentadoria, formatCurrencyBR)}
              </Text>
              <Text style={styles.cardHint}>
                Projeção aos {retirementAge} anos
              </Text>
            </View>
          </View>

          {/* Renda e Cobertura */}
          <View style={styles.cardGrid}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Renda Sustentável</Text>
              <Text style={styles.cardValue}>
                {displayKpi(kpisDisplay.rendaSustentavel, v => `${formatCurrencyBR(v)}/mês`)}
              </Text>
              <Text style={styles.cardHint}>
                Renda mensal viável preservando o capital
              </Text>
              {!kpisDisplay.rendaSustentavel?.available && (
                <Text style={styles.cardNote}>{kpisDisplay.rendaSustentavel?.note}</Text>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cobertura da Meta</Text>
              <Text style={styles.cardValue}>
                {displayKpi(kpisDisplay.coberturaMeta, v => formatPercent(v, 0))}
              </Text>
              {kpisDisplay.coberturaMeta?.available && (
                <View style={styles.progressContainer}>
                  <View
                    style={[styles.progressBar, { width: `${Math.min(100, kpisDisplay.coberturaMeta.raw)}%` }]}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Wealth Score e Sucessão */}
          <View style={styles.cardGrid}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Wealth Score</Text>
              <Text style={styles.cardValue}>
                {displayKpi(kpisDisplay.wealthScore, v => `${Math.round(v)}/100`)}
              </Text>
              <Text style={styles.cardHint}>
                Índice de saúde financeira do planejamento
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Custos Sucessórios Est.</Text>
              <Text style={styles.cardValue}>{formatCurrencyBR(totalCosts)}</Text>
              {liquidityGap <= 0 ? (
                <Text style={styles.badgeOk}>Liquidez suficiente</Text>
              ) : (
                <Text style={styles.badgeDanger}>Gap: {formatCurrencyBR(liquidityGap)}</Text>
              )}
            </View>
          </View>

          {/* Cenários Consumo/Preservação - com mensagem correta */}
          <View style={styles.cardGrid}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Consumo do Patrimônio</Text>
              <Text style={styles.cardValueSmall}>
                Aporte: {displayKpi(kpisDisplay.consumoAporte, v => `${formatCurrencyBR(v)}/mês`)}
              </Text>
              <Text style={styles.cardHint}>
                Idade necessária: {displayKpi(kpisDisplay.consumoIdade, v => `${v} anos`)}
              </Text>
              {!kpisDisplay.consumoAporte?.available && kpisDisplay.consumoStatus === "impossible" && (
                <Text style={styles.cardNote}>
                  Cenário inviável com premissas atuais. Considere aumentar aportes ou postergar aposentadoria.
                </Text>
              )}
              {!kpisDisplay.consumoAporte?.available && kpisDisplay.consumoStatus !== "impossible" && (
                <Text style={styles.cardNote}>Indicador indisponível para este cenário</Text>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Preservação do Patrimônio</Text>
              <Text style={styles.cardValueSmall}>
                Aporte: {displayKpi(kpisDisplay.preservacaoAporte, v => `${formatCurrencyBR(v)}/mês`)}
              </Text>
              <Text style={styles.cardHint}>
                Idade necessária: {displayKpi(kpisDisplay.preservacaoIdade, v => `${v} anos`)}
              </Text>
              {!kpisDisplay.preservacaoAporte?.available && kpisDisplay.preservacaoStatus === "impossible" && (
                <Text style={styles.cardNote}>
                  Cenário inviável com premissas atuais. Considere aumentar aportes ou postergar aposentadoria.
                </Text>
              )}
              {!kpisDisplay.preservacaoAporte?.available && kpisDisplay.preservacaoStatus !== "impossible" && (
                <Text style={styles.cardNote}>Indicador indisponível para este cenário</Text>
              )}
            </View>
          </View>

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              {clientName} • Confidencial
            </Text>
            <Text style={styles.pageNumber}>
              Página {pageNumbers.executive} de {pageNumbers.total}
            </Text>
          </View>
        </Page>
      )}

      {/* ====================== EVOLUÇÃO PATRIMONIAL (Seção própria) ====================== */}
      {selectedSections.executive && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Evolução Patrimonial</Text>
            <Text style={styles.sectionSubtitle}>
              Projeção do patrimônio ao longo do tempo com base nas premissas do cenário
            </Text>
          </View>

          {/* Gráfico de Evolução */}
          <SimpleWealthChart series={chartSeries} retirementAge={retirementAge} />

          {/* Explicação do gráfico */}
          <View style={styles.bulletBox}>
            <Text style={styles.bulletTitle}>Como interpretar o gráfico</Text>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                O eixo horizontal representa a idade do cliente (anos).
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                O eixo vertical representa o patrimônio financeiro projetado em R$.
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                A linha tracejada verde indica o momento da aposentadoria ({retirementAge} anos).
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                Após a aposentadoria, o patrimônio tende a decrescer conforme os saques para renda.
              </Text>
            </View>
          </View>

          {/* Premissas utilizadas */}
          {chartPremises && chartPremises.length > 0 && (
            <View style={styles.bulletBox}>
              <Text style={styles.bulletTitle}>Premissas utilizadas no gráfico</Text>
              {chartPremises.map((premise, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{premise}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              {clientName} • Confidencial
            </Text>
            <Text style={styles.pageNumber}>
              Página {pageNumbers.evolution} de {pageNumbers.total}
            </Text>
          </View>
        </Page>
      )}

      {/* ====================== PATRIMÔNIO ====================== */}
      {selectedSections.assets && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Patrimônio</Text>
            <Text style={styles.sectionSubtitle}>
              Composição detalhada do seu patrimônio • FX: USD/BRL {scenarioFx.USD_BRL?.toFixed(2)} | EUR/BRL {scenarioFx.EUR_BRL?.toFixed(2)}
            </Text>
          </View>

          {/* Resumo por tipo */}
          <View style={styles.cardGrid}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Patrimônio Financeiro</Text>
              <Text style={styles.cardValue}>{formatCurrencyBR(financial)}</Text>
              <Text style={styles.cardHint}>{formatPercent(pct(financial, totalWealth))} do total</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Previdência</Text>
              <Text style={styles.cardValue}>{formatCurrencyBR(previdencia)}</Text>
              <Text style={styles.cardHint}>{formatPercent(pct(previdencia, totalWealth))} do total</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bens Imobilizados</Text>
              <Text style={styles.cardValue}>{formatCurrencyBR(illiquid)}</Text>
              <Text style={styles.cardHint}>{formatPercent(pct(illiquid, totalWealth))} do total</Text>
            </View>
          </View>

          {/* Aviso de arredondamento se houver */}
          {!totalsValidation.valid && totalsValidation.warning && (
            <View style={styles.roundingWarning}>
              <Text style={styles.roundingWarningText}>⚠ {totalsValidation.warning}</Text>
            </View>
          )}

          {/* Tabela de Ativos */}
          {assets.normalized.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Ativo</Text>
                <Text style={styles.tableHeaderCell}>Tipo</Text>
                <Text style={styles.tableHeaderCell}>Moeda</Text>
                <Text style={styles.tableHeaderCell}>Valor Original</Text>
                <Text style={styles.tableHeaderCell}>Valor em BRL</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>%</Text>
              </View>
              {assets.normalized.slice(0, 15).map((asset, idx) => (
                <View
                  key={asset.key}
                  style={idx === Math.min(assets.normalized.length - 1, 14) ? styles.tableRowLast : styles.tableRow}
                >
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {asset.name}
                    {asset.fxWarning && " ⚠"}
                  </Text>
                  <Text style={styles.tableCell}>{asset.typeLabel}</Text>
                  <Text style={styles.tableCell}>{asset.currency}</Text>
                  <Text style={styles.tableCell}>
                    {formatCurrencyOriginal(asset.amountOriginal, asset.currency)}
                  </Text>
                  <Text style={styles.tableCellBold}>
                    {formatCurrencyBR(asset.amountBRL)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 0.5 }]}>
                    {formatPercent(pct(asset.amountBRL, totalWealth), 1)}
                  </Text>
                </View>
              ))}
              {assets.normalized.length > 15 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellMuted, { flex: 6 }]}>
                    ... e mais {assets.normalized.length - 15} ativos
                  </Text>
                </View>
              )}
              {/* Linha de total */}
              <View style={styles.tableRowTotal}>
                <Text style={[styles.tableCellBold, { flex: 2 }]}>TOTAL</Text>
                <Text style={styles.tableCell}>—</Text>
                <Text style={styles.tableCell}>—</Text>
                <Text style={styles.tableCell}>—</Text>
                <Text style={styles.tableCellBold}>{formatCurrencyBR(assets.totals.brl)}</Text>
                <Text style={[styles.tableCellBold, { flex: 0.5 }]}>100%</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhum ativo cadastrado</Text>
            </View>
          )}

          {/* Exposição Cambial */}
          {fxExposure && fxExposure.internationalPct > 0 && (
            <View style={styles.bulletBox}>
              <Text style={styles.bulletTitle}>Exposição Cambial</Text>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  {formatPercent(fxExposure.percentages?.BRL || 100, 1)} em BRL • {formatPercent(fxExposure.percentages?.USD || 0, 1)} em USD • {formatPercent(fxExposure.percentages?.EUR || 0, 1)} em EUR
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Total exposto ao câmbio: {formatCurrencyBR(fxExposure.internationalBRL || 0)} ({formatPercent(fxExposure.internationalPct || 0, 1)})
                </Text>
              </View>
            </View>
          )}

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              {clientName} • Confidencial
            </Text>
            <Text style={styles.pageNumber}>
              Página {pageNumbers.assets} de {pageNumbers.total}
            </Text>
          </View>
        </Page>
      )}

      {/* ====================== CENÁRIOS ====================== */}
      {selectedSections.scenarios && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cenários</Text>
            <Text style={styles.sectionSubtitle}>
              Comparativo de estratégias e eventos que impactam a projeção
            </Text>
          </View>

          {/* Tabela comparativa de cenários: Base vs Aporte Temporário vs Entradas Pontuais */}
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.bulletTitle}>Comparativo de Estratégias</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Cenário</Text>
                <Text style={styles.tableHeaderCell}>Aporte Mensal</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Descrição</Text>
              </View>
              {/* Cenário Base */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCellBold, { flex: 2 }]}>Cenário Base</Text>
                <Text style={styles.tableCellBold}>{formatCurrencyBR(scenarios.base.monthlyContribution)}/mês</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  Aporte fixo de {formatCurrencyBR(scenarios.base.monthlyContribution)} até os {scenarios.base.retirementAge} anos
                </Text>
              </View>
              {/* Cenário com Aporte Temporário */}
              {contributionTimeline && contributionTimeline.length > 0 ? (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellBold, { flex: 2 }]}>Com Aporte Temporário</Text>
                  <Text style={styles.tableCellBold}>Variável</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {contributionTimeline.map((ct, _i) => 
                      `${formatCurrencyBR(ct.value)}/mês dos ${ct.startAge} aos ${ct.endAge} anos`
                    ).join('; ')}
                  </Text>
                </View>
              ) : (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2, color: '#6b7280' }]}>Com Aporte Temporário</Text>
                  <Text style={[styles.tableCell, { color: '#6b7280' }]}>—</Text>
                  <Text style={[styles.tableCell, { flex: 2, color: '#6b7280' }]}>
                    Nenhum aporte temporário configurado
                  </Text>
                </View>
              )}
              {/* Cenário com Entradas Pontuais */}
              {cashInEvents && cashInEvents.length > 0 ? (
                <View style={styles.tableRowLast}>
                  <Text style={[styles.tableCellBold, { flex: 2 }]}>Com Entradas Pontuais</Text>
                  <Text style={styles.tableCellBold}>{cashInEvents.length} evento(s)</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {cashInEvents.slice(0, 3).map((ev, _i) => 
                      `${formatCurrencyBR(ev.value)} aos ${ev.age} anos`
                    ).join('; ')}{cashInEvents.length > 3 ? ` (+${cashInEvents.length - 3} mais)` : ''}
                  </Text>
                </View>
              ) : (
                <View style={styles.tableRowLast}>
                  <Text style={[styles.tableCell, { flex: 2, color: '#6b7280' }]}>Com Entradas Pontuais</Text>
                  <Text style={[styles.tableCell, { color: '#6b7280' }]}>—</Text>
                  <Text style={[styles.tableCell, { flex: 2, color: '#6b7280' }]}>
                    Nenhuma entrada pontual configurada
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Detalhamento das Entradas Pontuais */}
          {cashInEvents && cashInEvents.length > 0 && (
            <View style={styles.bulletBox}>
              <Text style={styles.bulletTitle}>Detalhamento das Entradas Pontuais</Text>
              {cashInEvents.slice(0, 6).map((ev, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Aos {ev.age} anos: {formatCurrencyBR(ev.value)}{ev.description ? ` — ${ev.description}` : ''}
                  </Text>
                </View>
              ))}
              {cashInEvents.length > 6 && (
                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.bulletText, { fontStyle: 'italic', color: '#6b7280' }]}>
                    ... e mais {cashInEvents.length - 6} entrada(s) pontual(is)
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Detalhamento do Aporte Temporário */}
          {contributionTimeline && contributionTimeline.length > 0 && (
            <View style={styles.bulletBox}>
              <Text style={styles.bulletTitle}>Detalhamento do Aporte Temporário</Text>
              {contributionTimeline.map((ct, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Dos {ct.startAge} aos {ct.endAge} anos: {formatCurrencyBR(ct.value)}/mês
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Premissas gerais */}
          <View style={styles.bulletBox}>
            <Text style={styles.bulletTitle}>Premissas do Cenário Base</Text>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                Rentabilidade real de {formatPercent((scenarios.base.returnRate - scenarios.base.inflation) * 100)} a.a. (nominal {formatPercent(scenarios.base.returnRate * 100)} − inflação {formatPercent(scenarios.base.inflation * 100)})
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                Aposentadoria planejada aos {scenarios.base.retirementAge} anos
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                Renda mensal desejada de {formatCurrencyBR(scenarios.base.monthlyIncome || 0)} na aposentadoria
              </Text>
            </View>
          </View>

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              {clientName} • Confidencial
            </Text>
            <Text style={styles.pageNumber}>
              Página {pageNumbers.scenarios} de {pageNumbers.total}
            </Text>
          </View>
        </Page>
      )}

      {/* ====================== METAS ====================== */}
      {selectedSections.goals && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Metas</Text>
            <Text style={styles.sectionSubtitle}>
              Suas metas financeiras e status atual
            </Text>
          </View>

          {goals.length > 0 ? (
            <>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Meta</Text>
                  <Text style={styles.tableHeaderCell}>Valor</Text>
                  <Text style={styles.tableHeaderCell}>Idade</Text>
                  <Text style={styles.tableHeaderCell}>Tipo</Text>
                  <Text style={styles.tableHeaderCell}>Prioridade</Text>
                </View>
                {goals.map((goal, idx) => (
                  <View
                    key={goal.id}
                    style={idx === goals.length - 1 ? styles.tableRowLast : styles.tableRow}
                  >
                    <Text style={[styles.tableCell, { flex: 2 }]}>{goal.name}</Text>
                    <Text style={styles.tableCellBold}>{formatCurrencyBR(goal.value)}</Text>
                    <Text style={styles.tableCell}>
                      {goal.age ? `${goal.age} anos` : "—"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {goal.type === "impact" ? "Impacto" : goal.type}
                    </Text>
                    <Text style={styles.tableCell}>
                      {goal.priority === "high" ? "Alta" : goal.priority === "low" ? "Baixa" : "Média"}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.bulletBox}>
                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Metas do tipo "Impacto" são consideradas na projeção patrimonial e afetam o capital disponível.
                  </Text>
                </View>
                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    O valor total das metas é de {formatCurrencyBR(goals.reduce((sum, g) => sum + g.value, 0))}.
                  </Text>
                </View>
                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Revise suas metas periodicamente para garantir alinhamento com seus objetivos de vida.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nenhuma meta cadastrada. Adicione metas no seu planejamento para acompanhar o progresso.
              </Text>
            </View>
          )}

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              {clientName} • Confidencial
            </Text>
            <Text style={styles.pageNumber}>
              Página {pageNumbers.goals} de {pageNumbers.total}
            </Text>
          </View>
        </Page>
      )}

      {/* ====================== SUCESSÃO ====================== */}
      {selectedSections.succession && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sucessão</Text>
            <Text style={styles.sectionSubtitle}>
              Planejamento sucessório e custos estimados • Estado: {successionData.state}
            </Text>
          </View>

          {/* Overview */}
          {successionSubBlocks.overview && (
            <View style={styles.cardGrid}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Patrimônio Líquido</Text>
                <Text style={styles.cardValue}>{formatCurrencyBR(financial + previdencia)}</Text>
                <Text style={styles.cardHint}>Capital com maior liquidez</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Patrimônio Imobilizado</Text>
                <Text style={styles.cardValue}>{formatCurrencyBR(illiquid)}</Text>
                <Text style={styles.cardHint}>Bens que entram em inventário</Text>
              </View>
            </View>
          )}

          {/* Custos do Inventário */}
          {successionSubBlocks.costs && (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Custo do Inventário</Text>
                <Text style={styles.tableHeaderCell}>Alíquota</Text>
                <Text style={styles.tableHeaderCell}>Valor Estimado</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>ITCMD (Imposto)</Text>
                <Text style={styles.tableCell}>
                  {formatPercent((successionData.inputs?.itcmdRate || 0.04) * 100, 1)}
                </Text>
                <Text style={styles.tableCellBold}>{formatCurrencyBR(successionData.costs.itcmd)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Honorários Advocatícios</Text>
                <Text style={styles.tableCell}>
                  {formatPercent((successionData.inputs?.legalPct || 0.05) * 100, 1)}
                </Text>
                <Text style={styles.tableCellBold}>{formatCurrencyBR(successionData.costs.legal)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Custas Cartoriais</Text>
                <Text style={styles.tableCell}>
                  {formatPercent((successionData.inputs?.feesPct || 0.02) * 100, 1)}
                </Text>
                <Text style={styles.tableCellBold}>{formatCurrencyBR(successionData.costs.fees)}</Text>
              </View>
              <View style={styles.tableRowTotal}>
                <Text style={[styles.tableCellBold, { flex: 2 }]}>Total Estimado</Text>
                <Text style={styles.tableCell}>—</Text>
                <Text style={[styles.tableCellBold, { color: colors.danger }]}>
                  {formatCurrencyBR(successionData.costs.total)}
                </Text>
              </View>
            </View>
          )}

          {successionSubBlocks.costs && (
            <View style={{ marginBottom: 16 }}>
              {liquidityGap <= 0 ? (
                <Text style={styles.badgeOk}>Liquidez suficiente para cobrir custos</Text>
              ) : (
                <Text style={styles.badgeDanger}>
                  Gap de liquidez: {formatCurrencyBR(liquidityGap)} - Pode haver venda forçada de ativos
                </Text>
              )}
            </View>
          )}

          {/* Previdência */}
          {(successionData.previdenciaPGBL > 0 || successionData.previdenciaVGBL > 0) && (
            <View style={styles.bulletBox}>
              <Text style={styles.bulletTitle}>Previdência Privada</Text>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  PGBL: {formatCurrencyBR(successionData.previdenciaPGBL)} • VGBL: {formatCurrencyBR(successionData.previdenciaVGBL)}
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  {successionData.previdenciaConfig?.excludeFromInventory !== false 
                    ? "Previdência excluída do inventário (transferência direta aos beneficiários)"
                    : "Previdência incluída no inventário"}
                </Text>
              </View>
            </View>
          )}

          {/* Recomendações */}
          {successionSubBlocks.recommendations && (
            <View style={styles.bulletBox}>
              <Text style={styles.bulletTitle}>Recomendações</Text>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Revisar a estrutura sucessória para reduzir custos e tempo de transferência.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Planejar liquidez para cobrir custos sem venda forçada de ativos.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Agendar reunião com especialista para avaliar holding, previdência e seguro.
                </Text>
              </View>
            </View>
          )}

          {/* PGBL Efficiency - só aparece se toggle ligado */}
          {successionSubBlocks.pgblEfficiency && (
            <View style={styles.bulletBox}>
              <Text style={styles.bulletTitle}>Eficiência Fiscal PGBL</Text>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  A utilização de PGBL pode proporcionar benefícios fiscais significativos, 
                  permitindo dedução de até 12% da renda bruta tributável do IR.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  O PGBL não entra em inventário, proporcionando maior agilidade na 
                  transferência para beneficiários.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Consulte seu assessor para uma análise personalizada considerando 
                  sua situação tributária específica.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              {clientName} • Confidencial
            </Text>
            <Text style={styles.pageNumber}>
              Página {pageNumbers.succession} de {pageNumbers.total}
            </Text>
          </View>
        </Page>
      )}

      {/* ====================== DISCLAIMERS ====================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.disclaimerTitle}>{DISCLAIMER_TEXT.title}</Text>
        {DISCLAIMER_TEXT.paragraphs.map((para, idx) => (
          <Text key={idx} style={styles.disclaimerText}>
            {para}
          </Text>
        ))}
        <Text style={styles.disclaimerFooter}>
          {DISCLAIMER_TEXT.footer}
          {"\n\n"}
          {appVersion} • Documento gerado em {generatedAt}
        </Text>
        <View style={styles.pageFooter}>
          <Text style={styles.pageFooterText}>
            {clientName} • Confidencial
          </Text>
          <Text style={styles.pageNumber}>
            Página {pageNumbers.disclaimers} de {pageNumbers.total}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
