// src/components/tracking/MonthlyTrackingCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import { formatCurrencyBR, formatMoneyBRL, parsePtBrMoney } from "../../utils/format";

function safeNum(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

const MONTHS = [
  { value: 1, label: "Jan (01)" },
  { value: 2, label: "Fev (02)" },
  { value: 3, label: "Mar (03)" },
  { value: 4, label: "Abr (04)" },
  { value: 5, label: "Mai (05)" },
  { value: 6, label: "Jun (06)" },
  { value: 7, label: "Jul (07)" },
  { value: 8, label: "Ago (08)" },
  { value: 9, label: "Set (09)" },
  { value: 10, label: "Out (10)" },
  { value: 11, label: "Nov (11)" },
  { value: 12, label: "Dez (12)" },
];

export default function MonthlyTrackingCard({
  scenarioId,
  trackingByScenario,
  setTrackingByScenario,
  selectedYear,
}) {
  const scenarioTracking = trackingByScenario?.[scenarioId] || null;
  const monthly = Array.isArray(scenarioTracking?.monthly) ? scenarioTracking.monthly : [];

  const [month, setMonth] = useState(1);

  // inputs - agora usam estado local string para formatação visual
  const [localAportePlanejado, setLocalAportePlanejado] = useState("");
  const [localAporteReal, setLocalAporteReal] = useState("");
  const [rentabilidadeRealPct, setRentabilidadeRealPct] = useState("");
  const [inflacaoPct, setInflacaoPct] = useState("");

  // para editar mês existente
  const [pickedKey, setPickedKey] = useState("");

  const entriesForYear = useMemo(() => {
    const y = Number(selectedYear);
    if (!Number.isFinite(y)) return [];
    return monthly
      .filter((m) => Number(m?.year) === y)
      .sort((a, b) => Number(a?.month || 0) - Number(b?.month || 0));
  }, [monthly, selectedYear]);

  const keyOf = (y, m) => `${y}-${pad2(m)}`;

  const existingKeys = useMemo(() => {
    return new Set(entriesForYear.map((m) => keyOf(m.year, m.month)));
  }, [entriesForYear]);

  // quando troca o ano, reseta seleção do mês e “puxar existente”
  useEffect(() => {
    setPickedKey("");
    // tenta sugerir o próximo mês disponível
    const y = Number(selectedYear);
    if (!Number.isFinite(y)) return;

    for (let mm = 1; mm <= 12; mm++) {
      if (!existingKeys.has(keyOf(y, mm))) {
        setMonth(mm);
        return;
      }
    }
    setMonth(12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  function clearInputs() {
    setLocalAportePlanejado("");
    setLocalAporteReal("");
    setRentabilidadeRealPct("");
    setInflacaoPct("");
  }

  function pullExisting() {
    const y = Number(selectedYear);
    if (!Number.isFinite(y)) return;
    if (!pickedKey) return;

    const [, mmStr] = pickedKey.split("-");
    const mm = Number(mmStr);
    const found = entriesForYear.find((e) => Number(e.month) === mm);
    if (!found) return;

    setMonth(mm);
    // Formatar valores como BRL visual ao puxar
    const ap = safeNum(found.aportePlanejado, 0);
    const ar = safeNum(found.aporteReal, 0);
    setLocalAportePlanejado(ap > 0 ? formatMoneyBRL(ap) : "");
    setLocalAporteReal(ar > 0 ? formatMoneyBRL(ar) : "");
    setRentabilidadeRealPct(String(found.rentabilidadeRealPct ?? ""));
    setInflacaoPct(String(found.inflacaoPct ?? ""));
  }

  function saveMonth() {
    if (!scenarioId) return;

    const y = Number(selectedYear);
    const m = Number(month);

    if (!Number.isFinite(y) || y <= 1900) return;
    if (!Number.isFinite(m) || m < 1 || m > 12) return;

    // Parse os valores monetários usando parsePtBrMoney
    const payload = {
      year: y,
      month: m,
      aportePlanejado: parsePtBrMoney(localAportePlanejado, 0),
      aporteReal: parsePtBrMoney(localAporteReal, 0),
      rentabilidadeRealPct: safeNum(rentabilidadeRealPct, 0),
      inflacaoPct: safeNum(inflacaoPct, 0),
    };

    setTrackingByScenario((prev) => {
      const base = prev && typeof prev === "object" ? prev : {};
      const prevScenario = base[scenarioId] || {};
      const prevMonthly = Array.isArray(prevScenario.monthly) ? prevScenario.monthly : [];

      const idx = prevMonthly.findIndex(
        (it) => Number(it?.year) === y && Number(it?.month) === m
      );

      const nextMonthly =
        idx >= 0
          ? prevMonthly.map((it, i) => (i === idx ? { ...it, ...payload } : it))
          : [...prevMonthly, payload];

      // startDate: define quando cria o primeiro registro
      let startDate = prevScenario.startDate;
      if (!startDate) {
        startDate = `${y}-${pad2(m)}-01`;
      }

      return {
        ...base,
        [scenarioId]: {
          ...prevScenario,
          startDate,
          monthly: nextMonthly,
        },
      };
    });

    setPickedKey("");
    clearInputs();
  }

  function removeMonth(y, m) {
    setTrackingByScenario((prev) => {
      const base = prev && typeof prev === "object" ? prev : {};
      const prevScenario = base[scenarioId] || {};
      const prevMonthly = Array.isArray(prevScenario.monthly) ? prevScenario.monthly : [];

      const nextMonthly = prevMonthly.filter(
        (it) => !(Number(it?.year) === Number(y) && Number(it?.month) === Number(m))
      );

      return {
        ...base,
        [scenarioId]: {
          ...prevScenario,
          monthly: nextMonthly,
        },
      };
    });
  }

  const totalPlanejadoAno = useMemo(
    () => entriesForYear.reduce((acc, it) => acc + safeNum(it?.aportePlanejado, 0), 0),
    [entriesForYear]
  );

  const totalRealAno = useMemo(
    () => entriesForYear.reduce((acc, it) => acc + safeNum(it?.aporteReal, 0), 0),
    [entriesForYear]
  );

  const deltaAno = totalRealAno - totalPlanejadoAno;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ano é controlado no topo do Dashboard (selectedYear) */}
        <div>
          <label className="text-xs text-text-secondary font-bold uppercase">Ano</label>
          <div className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary">
            {selectedYear || "—"}
          </div>
        </div>

        <div>
          <label className="text-xs text-text-secondary font-bold uppercase">Mês</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
          >
            {MONTHS.map((mo) => (
              <option key={mo.value} value={mo.value}>
                {mo.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-text-secondary font-bold uppercase">
            Puxar mês existente
          </label>
          <div className="mt-2 flex gap-2">
            <select
              value={pickedKey}
              onChange={(e) => setPickedKey(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
            >
              <option value="">—</option>
              {entriesForYear.map((e) => (
                <option key={keyOf(e.year, e.month)} value={keyOf(e.year, e.month)}>
                  {pad2(e.month)}/{e.year}
                </option>
              ))}
            </select>

            <button
              onClick={pullExisting}
              disabled={!pickedKey}
              className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
                pickedKey
                  ? "border-border text-text-primary hover:bg-surface-highlight"
                  : "opacity-50 cursor-not-allowed border-border text-text-secondary"
              }`}
            >
              Puxar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-text-secondary font-bold uppercase">Aporte planejado (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            value={localAportePlanejado}
            onChange={(e) => setLocalAportePlanejado(e.target.value)}
            onBlur={(e) => {
              const n = parsePtBrMoney(e.target.value, 0);
              setLocalAportePlanejado(n > 0 ? formatMoneyBRL(n) : "");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.target.blur();
            }}
            placeholder="R$ 0,00"
            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <div>
          <label className="text-xs text-text-secondary font-bold uppercase">Aporte real (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            value={localAporteReal}
            onChange={(e) => setLocalAporteReal(e.target.value)}
            onBlur={(e) => {
              const n = parsePtBrMoney(e.target.value, 0);
              setLocalAporteReal(n > 0 ? formatMoneyBRL(n) : "");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.target.blur();
            }}
            placeholder="R$ 0,00"
            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <div>
          <label className="text-xs text-text-secondary font-bold uppercase">Rentabilidade real do mês (%)</label>
          <input
            value={rentabilidadeRealPct}
            onChange={(e) => setRentabilidadeRealPct(e.target.value)}
            placeholder="Ex: 2"
            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <div>
          <label className="text-xs text-text-secondary font-bold uppercase">Inflação do mês (%)</label>
          <input
            value={inflacaoPct}
            onChange={(e) => setInflacaoPct(e.target.value)}
            placeholder="Ex: 0,57"
            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-text-secondary">
          Novo lançamento: <b className="text-text-primary">{pad2(month)}/{selectedYear || "—"}</b>
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearInputs}
            className="px-4 py-3 rounded-xl text-sm font-bold border border-border text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
          >
            Limpar
          </button>

          <button
            onClick={saveMonth}
            className="px-5 py-3 rounded-xl text-sm font-extrabold border border-accent/30 text-accent hover:bg-accent/10 transition-all"
          >
            Salvar mês
          </button>
        </div>
      </div>

      {/* Resumo + Lista */}
      <div className="rounded-2xl border border-border bg-surface/25 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-text-primary">Lançamentos • {entriesForYear.length}</div>
          <div className="text-xs text-text-secondary">
            Planejado: <b className="text-text-primary">{formatCurrencyBR(totalPlanejadoAno)}</b> • Real:{" "}
            <b className="text-text-primary">{formatCurrencyBR(totalRealAno)}</b> • Delta:{" "}
            <b className={deltaAno >= 0 ? "text-success" : "text-danger"}>
              {deltaAno >= 0 ? "+" : ""}
              {formatCurrencyBR(deltaAno)}
            </b>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {entriesForYear.length === 0 ? (
            <div className="text-sm text-text-secondary">Nenhum lançamento neste ano.</div>
          ) : (
            entriesForYear.map((e) => (
              <div
                key={keyOf(e.year, e.month)}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 rounded-xl border border-border bg-background-secondary/30 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {pad2(e.month)}/{e.year}
                  </span>

                  <div className="text-sm text-text-secondary">
                    Planejado <b className="text-text-primary">{formatCurrencyBR(safeNum(e.aportePlanejado, 0))}</b> • Real{" "}
                    <b className="text-text-primary">{formatCurrencyBR(safeNum(e.aporteReal, 0))}</b>
                    {" • "}
                    Retorno <b className="text-text-primary">{safeNum(e.rentabilidadeRealPct, 0).toFixed(2)}%</b> • Inflação{" "}
                    <b className="text-text-primary">{safeNum(e.inflacaoPct, 0).toFixed(2)}%</b>
                  </div>
                </div>

                <button
                  onClick={() => removeMonth(e.year, e.month)}
                  className="self-start lg:self-auto px-4 py-2 rounded-xl text-xs font-extrabold border border-danger/30 text-danger hover:bg-danger-subtle/20 transition-all"
                >
                  Remover
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 text-xs text-text-secondary">
          Dica: use <b>Puxar</b> para editar um mês já lançado e depois clique em <b>Salvar mês</b>.
        </div>
      </div>
    </div>
  );
}
