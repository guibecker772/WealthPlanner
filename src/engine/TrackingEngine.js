// src/engine/TrackingEngine.js
import FinancialEngine from "./FinancialEngine";

function pctToRate(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

function sum(arr, fn) {
  return (arr || []).reduce((acc, x) => acc + fn(x), 0);
}

function compoundFromMonthlyPct(items, keyPct) {
  let acc = 1;
  (items || []).forEach((m) => {
    const r = pctToRate(m?.[keyPct] || 0);
    acc *= 1 + r;
  });
  return acc;
}

function yearsAvailable(monthly) {
  const set = new Set();
  (monthly || []).forEach((m) => {
    const y = Number(m?.year);
    if (Number.isFinite(y)) set.add(y);
  });
  return Array.from(set).sort((a, b) => a - b);
}

function annualToMonthlyRate(annualRealRate) {
  const r = Number(annualRealRate);
  if (!Number.isFinite(r)) return 0;
  // (1+r)^(1/12) - 1
  return Math.pow(1 + r, 1 / 12) - 1;
}

export default class TrackingEngine {
  /**
   * Tracking:
   * - patrimonioRealHoje: calcula usando aportes reais + rentabilidades reais (mês a mês)
   * - patrimonioPlanejadoHoje: calcula usando aportes planejados + retorno ASSUMIDO do plano (mês a mês)
   * - gera 2 engines ancorados no "AGORA":
   *    - planejado (plano original ancorado no planejadoHoje)
   *    - ajustado (plano atualizado ancorado no realHoje)
   */
  static run({
    scenarioId,
    clientData,
    trackingByScenario,
    isStressTest = false,
    selectedYear = null,
  }) {
    const tracking = trackingByScenario?.[scenarioId];

    if (!tracking || !Array.isArray(tracking.monthly) || tracking.monthly.length === 0) {
      return null;
    }

    const monthlyAll = [...tracking.monthly].sort((a, b) => {
      const ya = Number(a?.year || 0);
      const yb = Number(b?.year || 0);
      const ma = Number(a?.month || 0);
      const mb = Number(b?.month || 0);
      if (ya !== yb) return ya - yb;
      return ma - mb;
    });

    // Engine base só para pegar patrimonio inicial + taxa real do plano (effReal)
    const baseEngine = FinancialEngine.run(clientData || {}, isStressTest);

    // ✅ Baseline = financeiro + previdência (total líquido do cenário para plano)
    // Usa baselineWealthBRL se disponível, senão fallback para financeiro + previdência
    const patrimonioInicial = Number(
      baseEngine?.kpis?.baselineWealthBRL ??
        (baseEngine?.kpis?.patrimonioAtualFinanceiro ?? 0) +
        (baseEngine?.kpis?.patrimonioAtualPrevidencia ?? 0)
    ) || 0;

    // ✅ Log temporário para debug (remover depois)
    console.log('[TrackingEngine] patrimonioInicial (baseline):', patrimonioInicial, {
      baselineWealthBRL: baseEngine?.kpis?.baselineWealthBRL,
      patrimonioAtualFinanceiro: baseEngine?.kpis?.patrimonioAtualFinanceiro,
      patrimonioAtualPrevidencia: baseEngine?.kpis?.patrimonioAtualPrevidencia,
    });

    const effRealAnnual = Number(baseEngine?.kpis?._inputs?.effReal ?? 0);
    const effRealMonthly = annualToMonthlyRate(effRealAnnual);

    // 1) HISTÓRICO REAL (TOTAL) — mês a mês (aporte -> retorno)
    let patrimonioReal = patrimonioInicial;

    monthlyAll.forEach((m) => {
      const aporteReal = Number(m?.aporteReal || 0);
      const rentab = pctToRate(m?.rentabilidadeRealPct || 0);

      patrimonioReal += aporteReal;
      patrimonioReal *= 1 + rentab;
    });

    // inflação e retorno acumulados (TOTAL)
    const inflacaoFactorTotal = compoundFromMonthlyPct(monthlyAll, "inflacaoPct");
    const retornoFactorTotal = compoundFromMonthlyPct(monthlyAll, "rentabilidadeRealPct");

    const inflacaoAcumuladaPct = (inflacaoFactorTotal - 1) * 100;
    const retornoRealAcumuladoPct = (retornoFactorTotal - 1) * 100;

    // 2) PLANEJADO (TOTAL) no período — mês a mês (aporte planejado -> retorno ASSUMIDO do plano)
    let patrimonioPlanejadoHoje = patrimonioInicial;

    monthlyAll.forEach((m) => {
      const aportePlanejado = Number(m?.aportePlanejado || 0);
      patrimonioPlanejadoHoje += aportePlanejado;
      patrimonioPlanejadoHoje *= 1 + effRealMonthly;
    });

    const aportePlanejadoTotal = sum(monthlyAll, (m) => Number(m?.aportePlanejado || 0));
    const aporteRealTotal = sum(monthlyAll, (m) => Number(m?.aporteReal || 0));

    const deltaPatrimonio = patrimonioReal - patrimonioPlanejadoHoje;

    // 3) Engines ancorados no "AGORA"
    const clientDataPlannedAnchored = {
      ...clientData,
      assets: [
        {
          type: "financeiro",
          value: patrimonioPlanejadoHoje,
          description: "Patrimônio planejado (ancorado no acompanhamento)",
        },
      ],
    };

    const clientDataRealAnchored = {
      ...clientData,
      assets: [
        {
          type: "financeiro",
          value: patrimonioReal,
          description: "Patrimônio real (ancorado no acompanhamento)",
        },
      ],
    };

    const plannedEngine = FinancialEngine.run(clientDataPlannedAnchored, isStressTest);
    const adjustedEngine = FinancialEngine.run(clientDataRealAnchored, isStressTest);

    // 4) YEAR SUMMARY
    const years = yearsAvailable(monthlyAll);
    const ySel = selectedYear ? Number(selectedYear) : null;

    const monthlyYear = Number.isFinite(ySel)
      ? monthlyAll.filter((m) => Number(m?.year) === ySel)
      : [];

    const aportePlanejadoAno = sum(monthlyYear, (m) => Number(m?.aportePlanejado || 0));
    const aporteRealAno = sum(monthlyYear, (m) => Number(m?.aporteReal || 0));
    const deltaAportesAno = aporteRealAno - aportePlanejadoAno;

    const inflacaoFactorAno = compoundFromMonthlyPct(monthlyYear, "inflacaoPct");
    const retornoFactorAno = compoundFromMonthlyPct(monthlyYear, "rentabilidadeRealPct");

    const yearSummary =
      Number.isFinite(ySel)
        ? {
            year: ySel,
            monthsCount: monthlyYear.length,
            aportes: {
              planejado: aportePlanejadoAno,
              real: aporteRealAno,
              delta: deltaAportesAno,
            },
            inflacao: { acumuladaPct: (inflacaoFactorAno - 1) * 100 },
            retorno: { acumuladoPct: (retornoFactorAno - 1) * 100 },
          }
        : null;

    // 5) KPIs comparativos (no "AGORA")
    const rendaOriginal =
      plannedEngine?.kpis?.rendaSustentavelMensal ?? plannedEngine?.kpis?.sustainableIncome ?? 0;
    const rendaAtualizada =
      adjustedEngine?.kpis?.rendaSustentavelMensal ?? adjustedEngine?.kpis?.sustainableIncome ?? 0;

    const coberturaOriginal =
      plannedEngine?.kpis?.coberturaMetaPct ?? plannedEngine?.kpis?.goalPercentage ?? 0;
    const coberturaAtualizada =
      adjustedEngine?.kpis?.coberturaMetaPct ?? adjustedEngine?.kpis?.goalPercentage ?? 0;

    return {
      meta: {
        yearsAvailable: years,
        selectedYear: Number.isFinite(ySel) ? ySel : null,
        lastEntry: monthlyAll.length
          ? { year: monthlyAll[monthlyAll.length - 1].year, month: monthlyAll[monthlyAll.length - 1].month }
          : null,
      },

      patrimonio: {
        planejadoHoje: patrimonioPlanejadoHoje,
        realHoje: patrimonioReal,
        delta: deltaPatrimonio,
      },

      aportes: {
        planejadoTotal: aportePlanejadoTotal,
        realTotal: aporteRealTotal,
        delta: aporteRealTotal - aportePlanejadoTotal,
      },

      inflacao: { acumuladaPct: inflacaoAcumuladaPct },
      retornos: { acumuladoPct: retornoRealAcumuladoPct },

      yearSummary,

      renda: {
        planejadaOriginal: rendaOriginal,
        planejadaAtualizada: rendaAtualizada,
        delta: rendaAtualizada - rendaOriginal,
      },

      coberturaMeta: {
        original: coberturaOriginal,
        atualizada: coberturaAtualizada,
        delta: coberturaAtualizada - coberturaOriginal,
      },

      engines: {
        base: baseEngine,
        planejado: plannedEngine,
        ajustado: adjustedEngine,
      },
    };
  }
}
