// src/reports/v2/ReportV2Document.jsx
// Main PDF Document — assembles all 10 fixed pages + optional appendix
// Receives raw dashboard data, delegates to adapter internally.

import React from "react";
import { Document, Font } from "@react-pdf/renderer";

// V2-hardening: prevent hyphenation breaks ("aposen-tadoria" → "aposentadoria")
Font.registerHyphenationCallback((word) => [word]);

import { createReportV2Data } from "./reportDataAdapter";
import { countAppendixPages } from "./pages/PageAppendixAssets";

// Pages
import Page01Cover from "./pages/Page01Cover";
import Page02TOC from "./pages/Page02TOC";
import Page03ExecutiveSummary from "./pages/Page03ExecutiveSummary";
import Page04ActionPlan from "./pages/Page04ActionPlan";
import Page05Projection from "./pages/Page05Projection";
import Page06Income from "./pages/Page06Income";
import Page07AssetsLiquidity from "./pages/Page07AssetsLiquidity";
import Page08Scenarios from "./pages/Page08Scenarios";
import Page09Succession from "./pages/Page09Succession";
import Page10Assumptions from "./pages/Page10Assumptions";
import PageAppendixAssets from "./pages/PageAppendixAssets";

const FIXED_PAGES = 10;

/**
 * PDF V2 — "Private Wealth / Premium Executivo"
 *
 * @param {object}  clientData      – active scenario data (from Dashboard)
 * @param {object}  engineOutput    – FinancialEngine.run() output (from Dashboard)
 * @param {object}  reportMeta      – { clientName, advisorName, referenceDate, advisorEmail, advisorPhone, bookingLink }
 * @param {string}  advisorNotes    – free-text notes from advisor
 * @param {boolean} includeAppendix – show appendix pages
 */
export default function ReportV2Document({
  clientData,
  engineOutput,
  reportMeta,
  advisorNotes = "",
  includeAppendix = false,
}) {
  // V2-HARDENING: always compute fresh — no stale memo possible
  // (component is instantiated fresh on each pdf().toBlob() call anyway)
  const data = createReportV2Data({
    clientData,
    engineOutput,
    reportMeta,
    advisorNotes,
    includeAppendix,
  });

  // Compute total pages
  const appendixPageCount = includeAppendix
    ? countAppendixPages(data.assets)
    : 0;
  const totalPages = FIXED_PAGES + appendixPageCount;

  return (
    <Document
      title={`Relatório Premium — ${data.meta?.clientName || "Cliente"}`}
      author={data.meta?.advisorName || "WealthPlanner Pro"}
      subject="Private Wealth Report V2"
      creator="WealthPlanner Pro"
    >
      <Page01Cover data={data} totalPages={totalPages} />
      <Page02TOC data={data} totalPages={totalPages} />
      <Page03ExecutiveSummary data={data} totalPages={totalPages} />
      <Page04ActionPlan data={data} totalPages={totalPages} />
      <Page05Projection data={data} totalPages={totalPages} />
      <Page06Income data={data} totalPages={totalPages} />
      <Page07AssetsLiquidity data={data} totalPages={totalPages} />
      <Page08Scenarios data={data} totalPages={totalPages} />
      <Page09Succession data={data} totalPages={totalPages} />
      <Page10Assumptions data={data} totalPages={totalPages} />

      {includeAppendix && (
        <PageAppendixAssets
          data={data}
          startPage={FIXED_PAGES + 1}
          totalPages={totalPages}
        />
      )}
    </Document>
  );
}
