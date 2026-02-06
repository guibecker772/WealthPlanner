// src/utils/exportSuccessionExecutivePDF.js
import jsPDF from "jspdf";
import { formatCurrencyBR } from "./format";

// helpers
const safe = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

function brDateTime(d = new Date()) {
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}

function percent(v, decimals = 1) {
  const n = safe(v, 0);
  return `${n.toFixed(decimals)}%`;
}

function priorityLabel(p) {
  const val = (p || "").toLowerCase();
  if (val.includes("alta")) return "Alta";
  if (val.includes("moder")) return "Moderada";
  return "Baixa";
}

/**
 * Gera PDF executivo para o cliente (1-2 páginas, layout “private”)
 */
export function exportSuccessionExecutivePDF({
  clientData,
  kpis,
  successionInfo,
  derived, // opcional (se você já calcula em outro lugar)
  strategies = [], // SUCCESSION_STRATEGIES
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 44; // margem

  // Dados base
  const clientName = clientData?.name || clientData?.clientName || "Cliente";
  const scenarioName = clientData?.scenarioName || clientData?.nomeCenario || "Cenário";
  const stateUF = clientData?.state || clientData?.uf || "-";

  const totalWealthNow = safe(kpis?.totalWealthNow, 0);
  const initialFinancialWealth = safe(kpis?.initialFinancialWealth, 0);

  const financialTotal = safe(successionInfo?.financialTotal, 0);
  const illiquidTotal = safe(successionInfo?.illiquidTotal, 0);

  const total = financialTotal + illiquidTotal;
  const illiquidityPct = total > 0 ? (illiquidTotal / total) * 100 : safe(kpis?.illiquidityRatioCurrent, 0);

  const itcmd = safe(successionInfo?.costs?.itcmd, 0);
  const legal = safe(successionInfo?.costs?.legal, 0);
  const fees = safe(successionInfo?.costs?.fees, 0);
  const invTotal = safe(successionInfo?.costs?.total, itcmd + legal + fees);

  const liquidityGap = safe(successionInfo?.liquidityGap, 0);
  const liquidityStatus = liquidityGap > 0 ? "Gap de liquidez" : "Liquidez suficiente";

  // fallback “derived”
  const d = derived || {
    totalNow: totalWealthNow || total,
    financial: initialFinancialWealth || financialTotal,
    illiquid: illiquidTotal,
    illiquidityPct,
    liquidityGap,
  };

  // ======== Layout helpers ========
  const setHeader = () => {
    // background header
    doc.setFillColor(10, 15, 25);
    doc.rect(0, 0, W, 92, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Planejamento Sucessório — Visão Executiva", M, 40);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(200, 210, 225);
    doc.text(`${clientName} • ${scenarioName} • UF: ${stateUF}`, M, 62);
    doc.text(`Gerado em ${brDateTime(new Date())}`, W - M, 62, { align: "right" });
  };

  const sectionTitle = (txt, y) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 40, 60);
    doc.text(txt, M, y);
    doc.setDrawColor(230, 234, 242);
    doc.line(M, y + 8, W - M, y + 8);
    return y + 26;
  };

  const kpiCard = ({ x, y, w, h, title, value, subtitle, tone = "dark" }) => {
    // container
    doc.setDrawColor(230, 234, 242);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, w, h, 10, 10, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90, 100, 120);
    doc.text(title.toUpperCase(), x + 14, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(tone === "danger" ? 190 : 20, tone === "danger" ? 50 : 30, tone === "danger" ? 60 : 60);
    doc.text(value, x + 14, y + 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 110, 130);
    if (subtitle) doc.text(subtitle, x + 14, y + 60);
  };

  const bulletList = ({ x, y, items, maxWidth }) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 85);
    let yy = y;
    items.forEach((it) => {
      if (!it) return;
      doc.text("•", x, yy);
      const lines = doc.splitTextToSize(String(it), maxWidth);
      doc.text(lines, x + 10, yy);
      yy += lines.length * 14;
    });
    return yy;
  };

  const recommendationBox = ({ y, title, rows }) => {
    const x = M;
    const w = W - 2 * M;
    const h = 18 + rows.length * 22 + 16;

    doc.setDrawColor(230, 234, 242);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, w, h, 12, 12, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(25, 35, 55);
    doc.text(title, x + 14, y + 22);

    let yy = y + 44;
    rows.forEach((r) => {
      // label left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(25, 35, 55);
      doc.text(r.left, x + 14, yy);

      // priority pill right
      const pill = `Prioridade: ${r.priority}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(70, 85, 110);

      const pillW = doc.getTextWidth(pill) + 16;
      doc.setDrawColor(230, 234, 242);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x + w - 14 - pillW, yy - 12, pillW, 18, 9, 9, "FD");
      doc.text(pill, x + w - 14 - pillW + 8, yy);

      // why line
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90, 100, 120);
      const whyLines = doc.splitTextToSize(r.why, w - 28);
      doc.text(whyLines, x + 14, yy + 14);

      yy += 22;
      yy += whyLines.length * 12;
    });

    return y + h + 18;
  };

  // ======== Page 1 ========
  setHeader();

  let y = 120;
  y = sectionTitle("Resumo Executivo", y);

  const colGap = 14;
  const cardW = (W - 2 * M - colGap) / 2;

  kpiCard({
    x: M,
    y,
    w: cardW,
    h: 78,
    title: "Patrimônio total (informado)",
    value: formatCurrencyBR(d.totalNow || total),
    subtitle: `UF: ${stateUF}`,
  });

  kpiCard({
    x: M + cardW + colGap,
    y,
    w: cardW,
    h: 78,
    title: "Exposição a bens (imobilizado)",
    value: percent(d.illiquidityPct || illiquidityPct),
    subtitle: `${formatCurrencyBR(d.illiquid || illiquidTotal)} em bens`,
  });

  y += 96;

  kpiCard({
    x: M,
    y,
    w: cardW,
    h: 78,
    title: "Patrimônio financeiro",
    value: formatCurrencyBR(d.financial || financialTotal),
    subtitle: "Liquidez para execução e transição",
  });

  kpiCard({
    x: M + cardW + colGap,
    y,
    w: cardW,
    h: 78,
    title: "Custos do inventário (estimativa)",
    value: formatCurrencyBR(invTotal),
    subtitle: liquidityGap > 0 ? `Gap: ${formatCurrencyBR(liquidityGap)}` : "Sem gap de liquidez",
    tone: liquidityGap > 0 ? "danger" : "dark",
  });

  y += 110;

  y = sectionTitle("Inventário e Liquidez", y);

  const invLines = [
    `ITCMD (estim.): ${formatCurrencyBR(itcmd)}`,
    `Honorários (estim.): ${formatCurrencyBR(legal)}`,
    `Custas (estim.): ${formatCurrencyBR(fees)}`,
    `Total: ${formatCurrencyBR(invTotal)}`,
    "",
    liquidityGap > 0
      ? `Situação: ${liquidityStatus} — faltariam ${formatCurrencyBR(liquidityGap)} para cobrir os custos no cenário atual.`
      : `Situação: ${liquidityStatus} — o patrimônio financeiro cobre os custos estimados no cenário atual.`,
  ];

  y = bulletList({ x: M, y, items: invLines, maxWidth: W - 2 * M });

  y += 10;

  // ======== Recommendations ========
  // Gera "porquês" simples e coerentes com os indicadores
  const recs = (strategies || []).map((s) => {
    let out = null;
    try {
      out = typeof s.indicator === "function" ? s.indicator(kpis, successionInfo, d) : null;
    } catch (_e) {
      // Silently fail - indicator may throw
      out = null;
    }

    // tenta inferir prioridade: se whenToConsider true => moderada/alta (bem simples)
    let pr = "Baixa";
    try {
      const consider = typeof s.whenToConsider === "function" ? !!s.whenToConsider(kpis, successionInfo, d) : true;
      pr = consider ? "Moderada" : "Baixa";
      if (s.id === "seguro" && liquidityGap > 0) pr = "Alta";
      if (s.id === "offshore" && safe(kpis?.totalWealthNow, 0) > 5000000) pr = "Alta";
      if (s.id === "holding" && (d.illiquidityPct || 0) > 40) pr = "Alta";
    } catch (_e) {
      // Silently fail - whenToConsider may throw
    }

    const why = out?.context
      ? out.context
      : "Recomendação baseada no patrimônio informado e premissas do cenário.";

    return {
      left: s.title,
      priority: priorityLabel(pr),
      why,
    };
  });

  // quebra se estiver perto do fim
  if (y > H - 230) {
    doc.addPage();
    setHeader();
    y = 120;
  }

  y = recommendationBox({
    y,
    title: "Recomendações (próximos passos)",
    rows: recs.length ? recs : [{ left: "Análise", priority: "Baixa", why: "Sem recomendações disponíveis." }],
  });

  // Call-to-action
  if (y > H - 120) {
    doc.addPage();
    setHeader();
    y = 120;
  }

  doc.setDrawColor(230, 234, 242);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(M, y, W - 2 * M, 70, 12, 12, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(25, 35, 55);
  doc.text("Próximo passo recomendado", M + 14, y + 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 120);
  doc.text(
    "Agendar reunião com Especialista em Planejamento Patrimonial para validar estrutura, custos e execução.",
    M + 14,
    y + 48
  );

  // salvar
  const fileName = `Planejamento_Sucessorio_${clientName.replace(/\s+/g, "_")}_${scenarioName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
