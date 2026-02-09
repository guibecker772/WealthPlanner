// src/reports/v2/components/PageFooter.jsx
// Rodapé: "Página X de {total} — Confidencial" em todas as páginas

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { C, PAGE_PADDING } from "../pdfTheme";

const footerStyles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 18,
    left: PAGE_PADDING.left,
    right: PAGE_PADDING.right,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  text: {
    fontSize: 7,
    color: C.muted,
  },
  confidential: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.gold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});

/**
 * @param {{ pageNumber: number, totalPages: number, clientName?: string }} props
 */
export default function PageFooter({ pageNumber, totalPages, clientName }) {
  return (
    <View style={footerStyles.footer} fixed>
      <Text style={footerStyles.text}>
        {clientName || ""}
      </Text>
      <Text style={footerStyles.confidential}>
        Página {pageNumber} de {totalPages} — Confidencial
      </Text>
    </View>
  );
}
