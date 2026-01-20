// src/engine/TrackingEngine.js
import FinancialEngine from "./FinancialEngine";

/**
 * trackingByScenario = {
 *   [scenarioId]: {
 *     startDate: "2026-01-15",
 *     monthly: [
 *       {
 *         year: 2026,
 *         month: 1,
 *         aportePlanejado: 10000,
 *         aporteReal: 15000,
 *         rentabilidadeRealPct: 1.5, // %
 *         inflacaoPct: 0.42 // %
 *       }
 *     ]
 *   }
 * }
 */

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
  return acc; // fator (ex: 1.10)
}

function yearsAvailable(monthly) {
  const set = new Set();
  (monthly || []).forEach((m) => {
    const y = Number(m?.year);
    if (Number.isFinite(y)) set.add(y);
  });
  return Array.from(set).sort((a, b) => a - b);
}

export default class TrackingEngine {
  /**
   * Calcula acompanhamento + reprojeção
   * - delta patrimônio/renda/cobertura: acumulado TOTAL desde o início do tracking
   * - yearSummary (opcional): métricas SOMENTE do ano selecionado
   */
  static run({
    scenarioId,
    clientData,
    trackingByScenario,
    isStressTest = false,
    selectedYear = null,
  }) {
    const tracking = trackingByScenario?.[scenarioId];

    // Se não existe acompanhamento, retorna null
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

    // Engine base (plano original)
    const baseEngine = FinancialEngine.run(clientData, isStressTest);

    // ✅ CORRIGIDO: no FinancialEngine o KPI é "patrimonioAtualFinanceiro"
    // (mantém fallback legado caso exista outro nome no futuro)
    const patrimonioInicial = Number(
      baseEngine?.kpis?.patrimonioAtualFinanceiro ??
        baseEngine?.kpis?.initialFinancialWealth ??
        0
    );

    // ===============================
    // 1) HISTÓRICO REAL (TOTAL)
    // ===============================
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

    // ===============================
    // 2) PLANEJADO (TOTAL) no período do tracking
    // ===============================
    const aportePlanejadoTotal = sum(monthlyAll, (m) => Number(m?.aportePlanejado || 0));
    const aporteRealTotal = sum(monthlyAll, (m) => Number(m?.aporteReal || 0));

    const patrimonioPlanejadoHoje = patrimonioInicial + aportePlanejadoTotal;
    const deltaPatrimonio = patrimonioReal - patrimonioPlanejadoHoje;

    // ===============================
    // 3) Reancoragem do plano (para renda/cobertura)
    // ===============================
    // Mantemos "type: financeiro" porque o FinancialEngine normaliza várias strings
    // e tende a tratar como bucket financeiro (não-illiquid). Se quiser, pode trocar para "financial".
    const clientDataReanchored = {
      ...clientData,
      assets: [
        {
          type: "financeiro",
          value: patrimonioReal,
          description: "Patrimônio ajustado após acompanhamento",
        },
      ],
    };

    const adjustedEngine = FinancialEngine.run(clientDataReanchored, isStressTest);

    // ===============================
    // 4) YEAR SUMMARY (somente do ano selecionado)
    // ===============================
    const years = yearsAvailable(monthlyAll);
    const safeYear = selectedYear && years.includes(Number(selectedYear)) ? Number(selectedYear) : null;

    let yearSummary = null;

    if (safeYear) {
      const monthlyYear = monthlyAll.filter((m) => Number(m?.year) === safeYear);

      const aportePlanejadoAno = sum(monthlyYear, (m) => Number(m?.aportePlanejado || 0));
      const aporteRealAno = sum(monthlyYear, (m) => Number(m?.aporteReal || 0));
      const deltaAportesAno = aporteRealAno - aportePlanejadoAno;

      const inflacaoFactorAno = compoundFromMonthlyPct(monthlyYear, "inflacaoPct");
      const retornoFactorAno = compoundFromMonthlyPct(monthlyYear, "rentabilidadeRealPct");

      yearSummary = {
        year: safeYear,
        aportes: {
          planejado: aportePlanejadoAno,
          real: aporteRealAno,
          delta: deltaAportesAno,
        },
        inflacao: {
          acumuladaPct: (inflacaoFactorAno - 1) * 100,
        },
        retorno: {
          acumuladoPct: (retornoFactorAno - 1) * 100,
        },
      };
    }

    // ===============================
    // 5) KPIs comparativos (✅ CORRIGIDO nomes do FinancialEngine)
    // ===============================
    const rendaOriginal =
      baseEngine?.kpis?.rendaSustentavelMensal ??
      baseEngine?.kpis?.sustainableIncome ??
      0;

    const rendaAtualizada =
      adjustedEngine?.kpis?.rendaSustentavelMensal ??
      adjustedEngine?.kpis?.sustainableIncome ??
      0;

    const coberturaOriginal =
      baseEngine?.kpis?.coberturaMetaPct ??
      baseEngine?.kpis?.goalPercentage ??
      0;

    const coberturaAtualizada =
      adjustedEngine?.kpis?.coberturaMetaPct ??
      adjustedEngine?.kpis?.goalPercentage ??
      0;

    return {
      meta: {
        yearsAvailable: years,
        selectedYear: safeYear,
        lastEntry: monthlyAll.length
          ? { year: monthlyAll[monthlyAll.length - 1].year, month: monthlyAll[monthlyAll.length - 1].month }
          : null,
      },

      // Patrimônio (TOTAL desde início tracking)
      patrimonio: {
        planejadoHoje: patrimonioPlanejadoHoje,
        realHoje: patrimonioReal,
        delta: deltaPatrimonio,
      },

      // Aportes (TOTAL)
      aportes: {
        planejadoTotal: aportePlanejadoTotal,
        realTotal: aporteRealTotal,
        delta: aporteRealTotal - aportePlanejadoTotal,
      },

      // Inflação e retorno (TOTAL)
      inflacao: {
        acumuladaPct: inflacaoAcumuladaPct,
      },
      retornos: {
        acumuladoPct: retornoRealAcumuladoPct,
      },

      // Resumo do ano (somente ano selecionado)
      yearSummary,

      // Renda/cobertura (comparando plano original x reancorado no REAL)
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
        original: baseEngine,
        ajustado: adjustedEngine,
      },
    };
  }
}
