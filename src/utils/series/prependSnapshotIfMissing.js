// src/utils/series/prependSnapshotIfMissing.js
// Utilitário para inserir ponto de snapshot (idade inicial) em séries de projeção

/**
 * Insere ponto de snapshot no início da série se não existir ponto para currentAgeInt.
 * 
 * @param {Array} series - Série de pontos { age, wealth, financial, ... }
 * @param {number} currentAgeInt - Idade atual (inteiro)
 * @param {number} initialWealthBRL - Patrimônio inicial em BRL
 * @returns {Array} - Série com snapshot prepended se necessário
 */
export function prependSnapshotIfMissing(series, currentAgeInt, initialWealthBRL) {
  // Validações básicas
  if (!Array.isArray(series)) {
    return [];
  }

  const ageInt = Math.floor(Number(currentAgeInt));
  if (!Number.isFinite(ageInt)) {
    return series;
  }

  const wealthBRL = Number(initialWealthBRL);
  if (!Number.isFinite(wealthBRL)) {
    return series;
  }

  // Verifica se já existe ponto para a idade atual (anti-duplicação)
  const hasCurrentAge = series.some((p) => Number(p?.age) === ageInt);
  if (hasCurrentAge) {
    return series;
  }

  // Cria snapshot com estrutura mínima (financial + wealth)
  // Não inclui totalWealth pois o gráfico usa apenas wealth/financial
  const snapshot = {
    age: ageInt,
    wealth: wealthBRL,
    financial: wealthBRL,
  };

  return [snapshot, ...series];
}

export default prependSnapshotIfMissing;
