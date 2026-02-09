// src/components/StrategyView.jsx
import React, { useMemo } from "react";
import { CalendarDays, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { CONFIG } from "../constants/config";
import { formatCurrencyBR } from "../utils/format";
import { deriveSuccessionMetrics } from "../constants/successionStrategies";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toGoogleCalDateUTC(d) {
  // YYYYMMDDTHHMMSSZ
  return (
    d.getUTCFullYear() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    "T" +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) +
    pad2(d.getUTCSeconds()) +
    "Z"
  );
}

function buildGoogleCalendarUrl({ title, details, location, start, end }) {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const dates = `${toGoogleCalDateUTC(start)}/${toGoogleCalDateUTC(end)}`;
  const params = new URLSearchParams({
    text: title,
    details,
    location: location || "Online",
    dates,
  });
  return `${base}&${params.toString()}`;
}

function getNextSlotDate() {
  // Slot padrão: amanhã, próximo “cheio” (arredonda para próxima hora), duração 30min
  const now = new Date();
  const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  start.setHours(Math.min(17, Math.max(9, start.getHours() + 1)));
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return { start, end };
}

export default function StrategyView({ strategy, kpis, succession, clientData }) {
  const d = useMemo(() => deriveSuccessionMetrics(kpis, succession), [kpis, succession]);

  const indicator = useMemo(() => {
    const fn = strategy?.indicator;
    if (typeof fn !== "function") {
      return { label: "Indicador", value: "-", context: "", priority: "Baixa" };
    }
    // passamos (kpis, succession, derived)
    const out = fn(kpis, succession, d) || {};
    return {
      label: out.label ?? "Indicador relevante",
      value: out.value ?? "-",
      context: out.context ?? "",
      priority: out.priority ?? "Baixa",
    };
  }, [strategy, kpis, succession, d]);

  const shouldConsider = useMemo(() => {
    const fn = strategy?.whenToConsider;
    if (typeof fn !== "function") return true;
    return !!fn(kpis, succession, d);
  }, [strategy, kpis, succession, d]);

  const handleScheduleClick = () => {
    const clientName = clientData?.name || clientData?.clientName || "Cliente";
    const scenarioName = clientData?.scenarioName || clientData?.nomeCenario || "";
    const meetingLink = CONFIG?.MEETING_LINK || ""; // opcional no seu config

    const { start, end } = getNextSlotDate();

    const title = `Reunião | Planejamento Patrimonial — ${clientName} (${strategy.title})`;

    const detailsLines = [
      `Cliente: ${clientName}`,
      scenarioName ? `Cenário: ${scenarioName}` : null,
      "",
      `Patrimônio total (informado): ${formatCurrencyBR(d.totalNow)}`,
      `Patrimônio financeiro: ${formatCurrencyBR(d.financial)}`,
      `Patrimônio imobilizado: ${formatCurrencyBR(d.illiquid)} (${d.illiquidityPct.toFixed(1)}%)`,
      `Gap de liquidez (inventário): ${formatCurrencyBR(d.liquidityGap)}`,
      "",
      meetingLink ? `Link: ${meetingLink}` : null,
      "",
      "Observação: recomendação baseada no patrimônio informado e premissas do cenário.",
    ].filter(Boolean);

    const url = buildGoogleCalendarUrl({
      title,
      details: detailsLines.join("\n"),
      location: meetingLink || "Online",
      start,
      end,
    });

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const Icon = strategy?.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Coluna esquerda: conteúdo */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-border bg-surface-1 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-surface-3/50 border border-border">
              {Icon ? <Icon className="text-text-muted" size={22} /> : null}
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-serif text-text">{strategy?.title}</h3>
              <p className="text-sm text-text-faint mt-1">{strategy?.description}</p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-text-faint mb-3">
                    Benefícios
                  </div>
                  <ul className="space-y-2">
                    {(strategy?.benefits || []).map((b, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-text-muted">
                        <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-text-faint mb-3">
                    Riscos e cuidados
                  </div>
                  <ul className="space-y-2">
                    {(strategy?.risks || []).map((r, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-text-muted">
                        <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {!shouldConsider && (
                <div className="mt-6 p-3 rounded-xl border border-border bg-surface-3/50 text-xs text-text-muted">
                  Esta estratégia pode não ser prioridade no cenário atual, mas pode ser reavaliada conforme metas, patrimônio e estrutura familiar.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Coluna direita: insight card */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-border bg-surface-2 p-6">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-faint">
              Indicador relevante
            </div>
            <div className="text-[11px] font-bold px-2 py-1 rounded-full border border-border bg-surface-3/50 text-text-muted">
              Prioridade: {indicator.priority}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-surface-3/50 border border-border">
              <CheckCircle2 size={16} className="text-emerald-300" />
            </div>

            <div className="flex-1">
              <div className="text-2xl font-bold text-text leading-none">
                {indicator.value}
              </div>
              <div className="text-xs text-text-muted mt-1">
                {indicator.label}
              </div>
            </div>
          </div>

          {indicator.context ? (
            <div className="mt-4 text-xs text-text-faint leading-relaxed border-l border-border pl-3 italic">
              “{indicator.context}”
            </div>
          ) : null}

          {/* CTA: agora legível e com clique abrindo calendário */}
          <button
            onClick={handleScheduleClick}
            className="
              mt-6 w-full
              inline-flex items-center justify-center gap-2
              rounded-xl
              px-4 py-3
              border border-border
              bg-surface-3
              text-text font-bold text-sm
              hover:bg-surface-3/80 hover:border-border
              active:scale-[0.99]
              transition
            "
          >
            <CalendarDays size={16} className="text-text/90" />
            {strategy?.cta || "Agendar reunião"}
            <ArrowRight size={16} className="text-text/70 ml-1" />
          </button>

          <div className="mt-3 text-[11px] text-text-faint text-center">
            Recomendação baseada no patrimônio informado e premissas do cenário.
          </div>
        </div>
      </div>
    </div>
  );
}
