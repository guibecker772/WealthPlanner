// src/reports/v2/pdfTheme.js
// Paleta "Paper Premium" — tipografia Helvetica (Inter não disponível no repo)
// Usado por todas as páginas do PDF V2

import { StyleSheet } from "@react-pdf/renderer";

// ─── Color palette (paper premium) ───
export const C = {
  // Text
  ink:        "#1a1a2e",    // quase-preto acolhedor
  secondary:  "#4a4a68",    // cinza-escuro muted
  muted:      "#8888a4",    // cinza médio
  faint:      "#b0b0c4",    // cinza claro

  // Backgrounds
  white:      "#ffffff",
  paper:      "#faf9f6",    // ivory off-white
  cream:      "#f4f2ed",    // cream card
  warm:       "#eae7df",    // warm border

  // Accents
  gold:       "#b08d4c",    // gold premium
  goldLight:  "#d4b977",    // gold lighter
  goldBg:     "#f7f3ea",    // gold background
  blue:       "#2e5da8",    // corporate blue
  blueLight:  "#e8eef8",    // blue background

  // Semantic
  success:    "#2d7a4d",
  successBg:  "#edf7f0",
  warning:    "#b07a1b",
  warningBg:  "#fdf5e6",
  danger:     "#b63636",
  dangerBg:   "#fdeaea",

  // Borders
  border:     "#e0ddd6",
  borderLight:"#eeebe4",

  // Cover
  coverBg:    "#1a1a2e",
  coverText:  "#f4f2ed",
  coverMuted: "#8888a4",
  coverGold:  "#d4b977",
};

// ─── Base page style ───
export const PAGE_PADDING = { top: 48, right: 42, bottom: 64, left: 42 };

// ─── Shared stylesheet ───
export const s = StyleSheet.create({
  // Pages
  page: {
    paddingTop: PAGE_PADDING.top,
    paddingRight: PAGE_PADDING.right,
    paddingBottom: PAGE_PADDING.bottom,
    paddingLeft: PAGE_PADDING.left,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.ink,
    backgroundColor: C.white,
  },
  coverPage: {
    padding: 0,
    backgroundColor: C.coverBg,
  },

  // Section headers
  sectionHeader: {
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.gold,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 3,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: C.secondary,
  },

  // Cards
  cardGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 12,
    backgroundColor: C.white,
  },
  cardHighlight: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 6,
    padding: 12,
    backgroundColor: C.goldBg,
  },
  cardTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 3,
  },
  cardValueSmall: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 3,
  },
  cardHint: {
    fontSize: 8,
    color: C.secondary,
    lineHeight: 1.4,
  },
  cardNote: {
    fontSize: 7,
    color: C.muted,
    fontStyle: "italic",
    marginTop: 3,
  },

  // Tables
  table: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.cream,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 8,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.secondary,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  tableRowLast: {
    flexDirection: "row",
  },
  tableRowTotal: {
    flexDirection: "row",
    backgroundColor: C.cream,
    borderTopWidth: 2,
    borderTopColor: C.border,
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 9,
    color: C.ink,
  },
  tableCellBold: {
    flex: 1,
    padding: 8,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },

  // Bullets box
  bulletBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
    backgroundColor: C.paper,
  },
  bulletTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.gold,
    marginTop: 3,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: C.secondary,
    lineHeight: 1.5,
  },

  // Badges
  badgeOk: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 99,
    backgroundColor: C.successBg,
    color: C.success,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  badgeWarn: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 99,
    backgroundColor: C.warningBg,
    color: C.warning,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  badgeDanger: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 99,
    backgroundColor: C.dangerBg,
    color: C.danger,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },

  // Progress bar
  progressContainer: {
    height: 6,
    backgroundColor: C.warm,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 5,
  },
  progressBar: {
    height: "100%",
    backgroundColor: C.gold,
    borderRadius: 3,
  },

  // Warning banner
  warningBanner: {
    flexDirection: "row",
    gap: 6,
    padding: 8,
    backgroundColor: C.warningBg,
    borderRadius: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e8d5a8",
  },
  warningText: {
    fontSize: 8,
    color: C.warning,
    flex: 1,
  },

  // Empty state
  emptyState: {
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    backgroundColor: C.paper,
    marginBottom: 14,
  },
  emptyStateText: {
    fontSize: 9,
    color: C.muted,
    textAlign: "center",
    lineHeight: 1.5,
  },
});
