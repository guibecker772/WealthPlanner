// src/components/scenarios/TrackingCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Plus, Save, Trash2, Info } from "lucide-react";

import { Card, Button, InputField } from "../../components";
import { formatCurrencyBR } from "../../utils/format";

function ymKey(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return "";
  return `${y}-${String(m).padStart(2, "0")}`;
}

function monthLabel(m) {
  const map = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return map[(Number(m) || 1) - 1] || `M${m}`;
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampMonth(m) {
  const n = toNumber(m, 1);
  return Math.min(12, Math.max(1, Math.round(n)));
}

function uniqYearsFromMonthly(monthly) {
  const set = new Set();
  (monthly || []).forEach((m) => {
    const y = Number(m.year);
    if (Number.isFinite(y)) set.add(y);
  });
  return Array.from(set).sort((a, b) => b - a);
}

function buildYearRows({ year, basePlanned = 0, existingMonthly = [] }) {
  const map = {};
  existingMonthly.forEach((m) => {
    map[ymKey(m.year, m.month)] = m;
  });

  const rows = [];
  for (let month = 1; month <= 12; month += 1) {
    const key = ymKey(year, month);
    const existing = map[key];
    rows.push({
      year,
      month,
      aportePlanejado: existing?.aportePlanejado ?? basePlanned,
      aporteReal: existing?.aporteReal ?? "",
      rentabilidadeRealPct: existing?.rentabilidadeRealPct ?? "",
      inflacaoPct: existing?.inflacaoPct ?? "",
    });
  }
  return rows;
}

export default function TrackingCard({
  scenarioId,
  clientData,
  trackingByScenario,
  setTrackingByScenario,
  readOnly,
}) {
  const basePlanned = useMemo(() => toNumber(clientData?.monthlyContribution, 0), [clientData?.monthlyContribution]);

  const scenarioTracking = trackingByScenario?.[scenarioId] || {};
  const monthly = Array.isArray(scenarioTracking?.monthly) ? scenarioTracking.monthly : [];

  const years = useMemo(() => {
    const fromData = uniqYearsFromMonthly(monthly);
    const currentYear = new Date().getFullYear();
    const fallback = fromData.length ? fromData : [currentYear];
    return fallback;
  }, [monthly]);

  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear());
  const [rows, setRows] = useState(() =>
    buildYearRows({ year: years[0] || new Date().getFullYear(), basePlanned, existingMonthly: monthly })
  );

  // Quando muda ano / base / monthly, reconstruir linhas do ano selecionado
  useEffect(() => {
    setRows(buildYearRows({ year: selectedYear, basePlanned, existingMonthly: monthly }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, basePlanned, scenarioId]);

  // Se years mudar e o selectedYear não existe mais, reajusta
  useEffect(() => {
    if (!years.includes(selectedYear)) {
      const next = years[0] || new Date().getFullYear();
      setSelectedYear(next);
      setRows(buildYearRows({ year: next, basePlanned, existingMonthly: monthly }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years.join("|")]);

  const totals = useMemo(() => {
    const planned = rows.reduce((acc, r) => acc + toNumber(r.aportePlanejado, 0), 0);
    const real = rows.reduce((acc, r) => acc + toNumber(r.aporteReal, 0), 0);

    // inflação acumulada (multiplicativa)
    let infAcc = 1;
    rows.forEach((r) => {
      const inf = toNumber(r.inflacaoPct, 0) / 100;
      infAcc *= 1 + inf;
    });

    return {
      planned,
      real,
      delta: real - planned,
      inflacaoAcumuladaPct: (infAcc - 1) * 100,
    };
  }, [rows]);

  const updateRow = (idx, key, value) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const handleSave = () => {
    if (!scenarioId) return;

    // remove do monthly antigo os meses do selectedYear e substitui pelos rows
    const kept = (monthly || []).filter((m) => Number(m.year) !== Number(selectedYear));
    const nextYearRows = rows
      .map((r) => ({
        year: Number(selectedYear),
        month: clampMonth(r.month),
        aportePlanejado: toNumber(r.aportePlanejado, 0),
        aporteReal: toNumber(r.aporteReal, 0),
        rentabilidadeRealPct: toNumber(r.rentabilidadeRealPct, 0),
        inflacaoPct: toNumber(r.inflacaoPct, 0),
      }))
      .filter((r) => r.year && r.month);

    const nextMonthly = [...kept, ...nextYearRows].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    setTrackingByScenario((prev) => ({
      ...(prev || {}),
      [scenarioId]: {
        ...(prev?.[scenarioId] || {}),
        startDate: prev?.[scenarioId]?.startDate || new Date().toISOString().slice(0, 10),
        monthly: nextMonthly,
      },
    }));
  };

  const handleClearYear = () => {
    if (!scenarioId) return;

    const kept = (monthly || []).filter((m) => Number(m.year) !== Number(selectedYear));
    setTrackingByScenario((prev) => ({
      ...(prev || {}),
      [scenarioId]: {
        ...(prev?.[scenarioId] || {}),
        startDate: prev?.[scenarioId]?.startDate || new Date().toISOString().slice(0, 10),
        monthly: kept,
      },
    }));

    setRows(buildYearRows({ year: selectedYear, basePlanned, existingMonthly: kept }));
  };

  const handleAddYear = () => {
    const nextYear = Math.max(...years, new Date().getFullYear()) + 1;
    setSelectedYear(nextYear);
    setRows(buildYearRows({ year: nextYear, basePlanned, existingMonthly: monthly }));
  };

  return (
    <Card
      title="Acompanhamento (Mensal)"
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Plus} onClick={handleAddYear} disabled={readOnly}>
            Novo ano
          </Button>

          <Button variant="outline" size="sm" icon={Trash2} onClick={handleClearYear} disabled={readOnly}>
            Limpar ano
          </Button>

          <Button variant="primary" size="sm" icon={Save} onClick={handleSave} disabled={readOnly}>
            Salvar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Calendar size={16} className="text-accent" />
            <span className="font-semibold">Ano:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 rounded-xl bg-surface-muted border border-border text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
              disabled={readOnly}
            >
              {[...new Set([...years, selectedYear])].sort((a, b) => b - a).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
            <div className="px-3 py-2 rounded-xl bg-surface-muted border border-border">
              <span className="font-bold text-text-primary">Planejado:</span> {formatCurrencyBR(totals.planned)}
            </div>
            <div className="px-3 py-2 rounded-xl bg-surface-muted border border-border">
              <span className="font-bold text-text-primary">Real:</span> {formatCurrencyBR(totals.real)}
            </div>
            <div className="px-3 py-2 rounded-xl bg-surface-muted border border-border">
              <span className="font-bold text-text-primary">Delta:</span> {formatCurrencyBR(totals.delta)}
            </div>
            <div className="px-3 py-2 rounded-xl bg-surface-muted border border-border">
              <span className="font-bold text-text-primary">Inflação acum.:</span>{" "}
              {totals.inflacaoAcumuladaPct.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="bg-accent-subtle/30 border border-accent/15 p-4 rounded-xl flex gap-3 items-start text-sm text-text-secondary">
          <Info size={18} className="text-accent shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Preencha os dados do mês (aporte real, rentabilidade e inflação). Ao clicar em <b>Salvar</b>, isso fica
            vinculado ao cenário atual e o Dashboard pode comparar <b>Plano vs Real</b>.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-secondary">
                <th className="text-left py-2 pr-3">Mês</th>
                <th className="text-left py-2 pr-3">Aporte planejado</th>
                <th className="text-left py-2 pr-3">Aporte real</th>
                <th className="text-left py-2 pr-3">Rentab. real (%)</th>
                <th className="text-left py-2 pr-3">Inflação (%)</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {rows.map((r, idx) => (
                <tr key={`${r.year}-${r.month}`} className="border-t border-border/60">
                  <td className="py-3 pr-3 font-semibold text-text-primary">
                    {monthLabel(r.month)}
                  </td>

                  <td className="py-3 pr-3 min-w-[210px]">
                    <InputField
                      value={r.aportePlanejado}
                      onChange={(v) => updateRow(idx, "aportePlanejado", v)}
                      readOnly={readOnly}
                      type="currency"
                    />
                  </td>

                  <td className="py-3 pr-3 min-w-[210px]">
                    <InputField
                      value={r.aporteReal}
                      onChange={(v) => updateRow(idx, "aporteReal", v)}
                      readOnly={readOnly}
                      type="currency"
                      placeholder="Ex: 15000"
                    />
                  </td>

                  <td className="py-3 pr-3 min-w-[180px]">
                    <InputField
                      value={r.rentabilidadeRealPct}
                      onChange={(v) => updateRow(idx, "rentabilidadeRealPct", v)}
                      readOnly={readOnly}
                      type="number"
                      suffix="%"
                      placeholder="Ex: 1.5"
                      inputClassName="text-center"
                    />
                  </td>

                  <td className="py-3 pr-3 min-w-[180px]">
                    <InputField
                      value={r.inflacaoPct}
                      onChange={(v) => updateRow(idx, "inflacaoPct", v)}
                      readOnly={readOnly}
                      type="number"
                      suffix="%"
                      placeholder="Ex: 0.42"
                      inputClassName="text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-text-secondary">
          Dica: se você quiser “automatizar” o planejado, mantenha o aporte planejado igual ao aporte base do cenário
          e só preencha os campos “real / rentabilidade / inflação”.
        </p>
      </div>
    </Card>
  );
}
