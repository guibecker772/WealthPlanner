// src/components/charts/projection/useChartColors.js
// Hook que resolve CSS vars (HSL tokens) em strings de cor para Recharts.
// Elimina 100% das cores hardcoded – responde automaticamente a dark ↔ light.

import { useMemo } from "react";

/**
 * Lê uma CSS custom property e devolve a string hsl(...) ou hsla(...).
 * Se a var contiver " / <alpha>", gera hsla.
 *
 * Exemplo:
 *   getComputedVar("--chart-1")  → "hsl(44, 90%, 55%)"
 *   getComputedVar("--chart-grid") → "hsla(222, 20%, 16%, 0.6)"
 */
function getComputedVar(prop) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(prop)
    .trim();

  if (!raw) return "transparent";

  // Se já for rgb/hsl/hex completo, devolver como está
  if (/^(hsl|rgb|#)/i.test(raw)) return raw;

  // "h s% l% / a" → hsla(h, s%, l%, a)
  const parts = raw.split("/").map((s) => s.trim());
  const hsl = parts[0].split(/\s+/);

  if (hsl.length < 3) return raw; // fallback

  const [h, s, l] = hsl;
  if (parts[1]) {
    return `hsla(${h}, ${s}, ${l}, ${parts[1]})`;
  }
  return `hsl(${h}, ${s}, ${l})`;
}

/**
 * Paleta de cores para gráficos derivada inteiramente de CSS vars.
 *
 * @param {string} effectiveTheme  "dark" | "light" (usado apenas como dep de
 *                                 recálculo — as vars mudam via :root / html.light)
 * @returns {Record<string, string>}
 */
export function useChartColors(effectiveTheme) {
  return useMemo(() => {
    const accent    = getComputedVar("--chart-1");
    const adjusted  = getComputedVar("--chart-2");
    const success   = getComputedVar("--chart-3");
    const warning   = getComputedVar("--chart-4");
    const purple    = getComputedVar("--chart-5");
    const grid      = getComputedVar("--chart-grid");
    const axis      = getComputedVar("--chart-axis");

    return {
      // Séries
      accent,       // wealthOriginal (gold)
      adjusted,     // wealthAdjusted (blue)
      success,      // cashIn / aposentadoria (green)
      warning,      // fim aportes (orange)
      purple,       // extra 5th series

      // Estruturais
      grid,
      axis,

      // Gradientes
      gradientOriginalStart: accent,
      gradientOriginalEnd:   accent,
      gradientAdjustedStart: adjusted,
      gradientAdjustedEnd:   adjusted,

      // Marcadores
      retirementStroke: success,
      contributionEndStroke: warning,
      goalStroke: getComputedVar("--danger"),
      nowStroke: getComputedVar("--text-faint"),
    };
  // effectiveTheme como dep força recálculo quando o tema muda
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTheme]);
}

export { getComputedVar };
export default useChartColors;
