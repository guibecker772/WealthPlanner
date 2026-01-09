import React, { useMemo, useState } from "react";
import { Building2, Globe, Landmark, Umbrella, CalendarDays, ChevronRight } from "lucide-react";
import FinancialEngine from "../../engine/FinancialEngine";
import { formatCurrencyBR } from "../../utils/format";

// ---------- helpers ----------
function toNumber(v, fallback = 0) {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// “Detecta” grupos extras (offshore e previdência) a partir do type/category do ativo
function detectAssetGroup(asset) {
  const raw = asset?.type ?? asset?.assetType ?? asset?.category ?? asset?.bucket ?? "";
  const t = normalizeText(raw);

  // Previdência
  if (t.includes("previd") || t.includes("pgbl") || t.includes("vgbl") || t.includes("prev")) {
    return "previdencia";
  }

  // Offshore / Exterior
  if (
    t.includes("offshore") ||
    t.includes("exterior") ||
    t.includes("internacional") ||
    t.includes("international") ||
    t.includes("usa") ||
    t.includes("eua") ||
    t.includes("usd") ||
    t.includes("dolar")
  ) {
    return "offshore";
  }

  return "other";
}

function sumAssetsByGroup(assets = [], group) {
  const list = Array.isArray(assets) ? assets : [];
  return list.reduce((acc, a) => {
    if (detectAssetGroup(a) !== group) return acc;
    const val = toNumber(a?.value ?? a?.amount ?? a?.valor, 0);
    return acc + Math.max(0, val);
  }, 0);
}

function formatPct01(x) {
  const v = toNumber(x, 0) * 100;
  return `${v.toFixed(2)}%`;
}

// ---------- modal private ----------
function SpecialistModal({ open, onClose, title, message }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-navy-950/90 shadow-2xl">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold text-lg">{title}</h3>
              <p className="text-slate-400 text-sm mt-1">
                Encaminhamento para análise especializada
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5">
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
            {message}
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-200 hover:bg-white/5 transition"
            >
              Fechar
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(message).catch(() => {});
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-gold-500/90 hover:bg-gold-500 text-black font-semibold transition"
            >
              Copiar briefing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- main component ----------
export default function SuccessionInsightCard({
  variant = "holding", // holding | offshore | previdencia | seguro
  clientData,
  className = "",
}) {
  const [open, setOpen] = useState(false);

  const info = useMemo(() => {
    // Usa o motor para manter coerência (financeiro vs bens) com o resto do app
    const succession = FinancialEngine.calculateSuccession(
      clientData?.assets || [],
      clientData?.state
    );

    const total = toNumber(succession?.totalEstate, 0);
    const financial = toNumber(succession?.financialTotal, 0);
    const illiquid = toNumber(succession?.illiquidTotal, 0);

    const costsTotal = toNumber(succession?.costs?.total, 0);
    const gap = toNumber(succession?.liquidityGap, 0);

    // Extras por “categoria” do ativo (se você tiver esses labels no seu cadastro)
    const offshore = sumAssetsByGroup(clientData?.assets || [], "offshore");
    const previd = sumAssetsByGroup(clientData?.assets || [], "previdencia");

    const illiquidPct = total > 0 ? illiquid / total : 0;
    const offshorePct = total > 0 ? offshore / total : 0;
    const previdCoverPct = costsTotal > 0 ? previd / costsTotal : 0;

    return {
      state: succession?.state ?? (clientData?.state || "SP"),
      total,
      financial,
      illiquid,
      offshore,
      previd,
      costsTotal,
      gap,
      illiquidPct,
      offshorePct,
      previdCoverPct,
    };
  }, [clientData]);

  const cfg = useMemo(() => {
    const CTA = "Agendar reunião com Especialista em Planejamento Patrimonial";

    // thresholds (ajustáveis)
    const HOLDING_RECOMMENDED_FROM = 0.25; // 25%+ em bens
    const OFFSHORE_RECOMMENDED_TOTAL = 2000000; // 2MM+
    const OFFSHORE_RECOMMENDED_FROM = 0.10; // 10%+ offshore detectado

    if (variant === "holding") {
      const recommended = info.illiquidPct >= HOLDING_RECOMMENDED_FROM;
      return {
        tone: "indigo",
        icon: Building2,
        badge: recommended ? "RECOMENDADO" : "AVALIAR",
        priority: recommended ? "Alta" : "Moderada",
        value: formatPct01(info.illiquidPct),
        label: "Exposição a bens / imóveis",
        hint: recommended
          ? "Parcela relevante do patrimônio está imobilizada. Estruturação pode melhorar governança, sucessão e reduzir fricções operacionais."
          : "Exposição a bens ainda moderada. Pode fazer sentido conforme complexidade familiar, quantidade de herdeiros e objetivos.",
        cta: CTA,
        message: [
          `Encaminhamento: Holding Patrimonial`,
          ``,
          `Cliente: ${clientData?.name || "—"} | Cenário: ${clientData?.scenarioName || "—"}`,
          `UF (ITCMD): ${info.state}`,
          ``,
          `Patrimônio total estimado: ${formatCurrencyBR(info.total)}`,
          `Bens / Imóveis (imobilizado): ${formatCurrencyBR(info.illiquid)} (${formatPct01(info.illiquidPct)})`,
          `Liquidez financeira estimada: ${formatCurrencyBR(info.financial)}`,
          ``,
          `Custos de inventário (estimativa): ${formatCurrencyBR(info.costsTotal)}`,
          `Gap de liquidez estimado: ${formatCurrencyBR(info.gap)}`,
          ``,
          `Objetivo da reunião: avaliar viabilidade, desenho da estrutura, governança, custos, prazos e próximos passos.`,
        ].join("\n"),
      };
    }

    if (variant === "offshore") {
      const recommended =
        info.total >= OFFSHORE_RECOMMENDED_TOTAL || info.offshorePct >= OFFSHORE_RECOMMENDED_FROM;

      return {
        tone: "blue",
        icon: Globe,
        badge: recommended ? "RECOMENDADO" : "AVALIAR",
        priority: recommended ? "Alta" : "Moderada",
        value: formatCurrencyBR(info.total),
        label: "Patrimônio total",
        hint: recommended
          ? "Patrimônio em patamar onde estrutura internacional pode otimizar diversificação de jurisdição e planejamento sucessório."
          : "Estrutura internacional pode fazer sentido conforme objetivos, herdeiros e necessidade de diversificação/risco Brasil.",
        cta: CTA,
        message: [
          `Encaminhamento: Estrutura Internacional (Offshore)`,
          ``,
          `Cliente: ${clientData?.name || "—"} | Cenário: ${clientData?.scenarioName || "—"}`,
          `UF (ITCMD): ${info.state}`,
          ``,
          `Patrimônio total estimado: ${formatCurrencyBR(info.total)}`,
          `Ativos detectados como Offshore/Exterior: ${formatCurrencyBR(info.offshore)} (${formatPct01(info.offshorePct)})`,
          ``,
          `Custos de inventário (estimativa): ${formatCurrencyBR(info.costsTotal)}`,
          `Gap de liquidez estimado: ${formatCurrencyBR(info.gap)}`,
          ``,
          `Objetivo da reunião: avaliar alternativas (conta internacional, estrutura, compliance, tributação e sucessão).`,
        ].join("\n"),
      };
    }

    if (variant === "previdencia") {
      const recommended = info.gap > 0;
      return {
        tone: "emerald",
        icon: Landmark,
        badge: recommended ? "RECOMENDADO" : "AVALIAR",
        priority: recommended ? "Alta" : "Moderada",
        value: formatCurrencyBR(info.previd),
        label: "Liquidez sucessória (Previdência)",
        hint: recommended
          ? "Há gap de liquidez para custos do inventário. Previdência pode acelerar liquidez e reduzir fricção no acesso dos beneficiários."
          : "Mesmo sem gap, previdência pode ajudar na organização de beneficiários e planejamento tributário conforme perfil e objetivos.",
        cta: CTA,
        message: [
          `Encaminhamento: Previdência (foco sucessório)`,
          ``,
          `Cliente: ${clientData?.name || "—"} | Cenário: ${clientData?.scenarioName || "—"}`,
          `UF (ITCMD): ${info.state}`,
          ``,
          `Patrimônio total estimado: ${formatCurrencyBR(info.total)}`,
          `Previdência detectada: ${formatCurrencyBR(info.previd)}`,
          `Custos de inventário (estimativa): ${formatCurrencyBR(info.costsTotal)}`,
          `Cobertura estimada dos custos via previdência: ${(info.previdCoverPct * 100).toFixed(2)}%`,
          `Gap de liquidez estimado: ${formatCurrencyBR(info.gap)}`,
          ``,
          `Objetivo da reunião: avaliar desenho (PGBL/VGBL, beneficiários, tributação, prazo e estratégia).`,
        ].join("\n"),
      };
    }

    // seguro
    const recommended = info.gap > 0;
    return {
      tone: "indigo",
      icon: Umbrella,
      badge: recommended ? "RECOMENDADO" : "AVALIAR",
      priority: recommended ? "Alta" : "Moderada",
      value: formatCurrencyBR(info.gap),
      label: "Gap de liquidez (inventário)",
      hint: recommended
        ? "Há falta estimada de liquidez para cobrir custos sucessórios. Seguro pode criar liquidez imediata para herdeiros e reduzir risco operacional."
        : "Seguro pode ser útil como planejamento sucessório mesmo sem gap, conforme herdeiros, objetivos e necessidade de liquidez imediata.",
      cta: "Agendar reunião com Especialista em Planejamento Patrimonial",
      message: [
        `Encaminhamento: Seguro de Vida (liquidez sucessória)`,
        ``,
        `Cliente: ${clientData?.name || "—"} | Cenário: ${clientData?.scenarioName || "—"}`,
        `UF (ITCMD): ${info.state}`,
        ``,
        `Custos de inventário (estimativa): ${formatCurrencyBR(info.costsTotal)}`,
        `Liquidez financeira estimada: ${formatCurrencyBR(info.financial)}`,
        `Gap de liquidez estimado: ${formatCurrencyBR(info.gap)}`,
        ``,
        `Objetivo da reunião: dimensionar capital segurado para cobrir custos e acelerar acesso dos beneficiários.`,
      ].join("\n"),
    };
  }, [variant, info, clientData]);

  const ToneGlow = {
    indigo: "from-indigo-500/15 via-transparent to-transparent",
    blue: "from-blue-500/15 via-transparent to-transparent",
    emerald: "from-emerald-500/15 via-transparent to-transparent",
  }[cfg.tone || "indigo"];

  const Icon = cfg.icon;

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-navy-950/55 shadow-xl ${className}`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${ToneGlow}`} />

        <div className="relative p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-widest uppercase text-slate-400">
                Indicador relevante
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <Icon className="text-slate-200" size={18} />
                </div>
                <div>
                  <div className="text-3xl font-semibold text-white">{cfg.value}</div>
                  <div className="text-sm text-slate-300">{cfg.label}</div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-gold-500" />
                <span className="text-xs text-slate-200 font-semibold">{cfg.badge}</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Prioridade: <span className="text-slate-200 font-semibold">{cfg.priority}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-l border-white/10 pl-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              “{cfg.hint}”
            </p>
          </div>

          <div className="mt-6">
            <button
              onClick={() => setOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold-500/90 hover:bg-gold-500 text-black font-semibold transition shadow-glow-gold-sm"
            >
              <CalendarDays size={18} />
              {cfg.cta}
              <ChevronRight size={18} />
            </button>

            <p className="mt-3 text-xs text-slate-500 text-center">
              Recomendação baseada no patrimônio informado e premissas do cenário.
            </p>
          </div>
        </div>
      </div>

      <SpecialistModal
        open={open}
        onClose={() => setOpen(false)}
        title={cfg.cta}
        message={cfg.message}
      />
    </>
  );
}
