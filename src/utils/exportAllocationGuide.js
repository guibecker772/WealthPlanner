// src/utils/exportAllocationGuide.js
// ========================================
// Funções de exportação para o Guia de Alocação
// Export CSV e Print-friendly HTML
// ========================================

import { ASSET_CLASSES, ASSET_CLASS_LABELS, getPortfolioValueBRL } from './allocationMath';

/**
 * Formata número para CSV pt-BR (decimal com vírgula)
 */
function formatNumberPtBR(n, decimals = 2) {
  const val = Number(n);
  if (!Number.isFinite(val)) return '';
  return val.toFixed(decimals).replace('.', ',');
}

/**
 * Formata data/hora pt-BR
 */
function formatDateTimePtBR() {
  const now = new Date();
  return now.toLocaleString('pt-BR');
}

/**
 * Escapa valor para CSV (se tiver ; ou ")
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Gera CSV do Guia de Alocação
 * @param {object} params
 * @param {Array} params.portfolios - Lista de carteiras
 * @param {object} params.assumptions - Premissas de retorno/volatilidade
 * @param {object} params.scenarioFx - Câmbio do cenário { USD_BRL, EUR_BRL }
 * @param {string} params.scenarioName - Nome do cenário
 * @returns {string} CSV string em pt-BR (separador ;)
 */
export function generateAllocationGuideCSV({ portfolios, assumptions, scenarioFx, scenarioName = 'Cenário' }) {
  const lines = [];
  const timestamp = formatDateTimePtBR();
  
  // Header com metadados
  lines.push(`# Guia de Alocação - Exportado em ${timestamp}`);
  lines.push(`# Cenário: ${escapeCsvValue(scenarioName)}`);
  lines.push(`# Câmbio: USD/BRL ${formatNumberPtBR(scenarioFx?.USD_BRL || 5.0, 2)}; EUR/BRL ${formatNumberPtBR(scenarioFx?.EUR_BRL || 5.5, 2)}`);
  lines.push('');
  
  // Cabeçalho das colunas
  const headers = [
    'Carteira',
    'Moeda',
    'Valor Original',
    'Valor BRL',
    ...ASSET_CLASSES.map(cls => ASSET_CLASS_LABELS[cls] + ' (%)'),
    'Retorno Nominal (%)',
    'Retorno Real (%)',
    'Volatilidade (%)',
    'Notas',
  ];
  lines.push(headers.map(escapeCsvValue).join(';'));
  
  // Dados de cada carteira
  for (const portfolio of portfolios) {
    const breakdown = portfolio.breakdown || {};
    const valueBRL = getPortfolioValueBRL(portfolio, scenarioFx);
    
    // Calcular métricas
    let returnNominal = 0;
    let volatility = 0;
    for (const cls of ASSET_CLASSES) {
      const weight = (breakdown[cls] || 0) / 100;
      returnNominal += weight * ((assumptions?.classReturnsNominal?.[cls] || 0) * 100);
      volatility += Math.pow(weight * ((assumptions?.classVolAnnual?.[cls] || 0) * 100), 2);
    }
    volatility = Math.sqrt(volatility);
    const inflation = (assumptions?.inflationAnnual || 0.05) * 100;
    const returnReal = returnNominal - inflation;
    
    const row = [
      portfolio.name || 'Sem nome',
      portfolio.currency || 'BRL',
      formatNumberPtBR(portfolio.totalValue || 0),
      formatNumberPtBR(valueBRL),
      ...ASSET_CLASSES.map(cls => formatNumberPtBR(breakdown[cls] || 0, 1)),
      formatNumberPtBR(returnNominal, 2),
      formatNumberPtBR(returnReal, 2),
      formatNumberPtBR(volatility, 2),
      portfolio.notes || '',
    ];
    lines.push(row.map(escapeCsvValue).join(';'));
  }
  
  return lines.join('\n');
}

/**
 * Baixa o CSV como arquivo
 */
export function downloadCSV(csvContent, filename = 'guia-alocacao.csv') {
  // Adicionar BOM para Excel reconhecer UTF-8
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gera HTML print-friendly para o Guia de Alocação
 */
export function generatePrintHTML({ portfolios, assumptions, scenarioFx, scenarioName = 'Cenário', currentAllocation }) {
  const timestamp = formatDateTimePtBR();
  
  // Estilos para impressão
  const styles = `
    <style>
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      body {
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 12px;
        color: #333;
        padding: 20px;
        max-width: 1000px;
        margin: 0 auto;
      }
      h1 { font-size: 20px; margin-bottom: 5px; }
      h2 { font-size: 16px; margin: 20px 0 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
      .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; }
      .num { text-align: right; }
      .bar-container { width: 100%; background: #eee; height: 16px; border-radius: 4px; overflow: hidden; }
      .bar { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); }
      .portfolio-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
      .portfolio-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .portfolio-name { font-weight: 600; font-size: 14px; }
      .portfolio-value { color: #666; }
      .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
      .metric { background: #f9f9f9; padding: 8px; border-radius: 4px; }
      .metric-label { font-size: 10px; color: #666; }
      .metric-value { font-weight: 600; }
      .breakdown-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .breakdown-item { display: flex; flex-direction: column; }
      .breakdown-label { font-size: 10px; color: #666; }
      .breakdown-value { font-weight: 600; }
      .notes { background: #fffbe6; padding: 8px; border-radius: 4px; font-style: italic; margin-top: 10px; }
      .current-allocation { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
      .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
    </style>
  `;
  
  // Função helper para formatar moeda
  const fmtMoney = (n) => {
    const val = Number(n);
    if (!Number.isFinite(val)) return 'R$ 0,00';
    return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const fmtPct = (n) => {
    const val = Number(n);
    if (!Number.isFinite(val)) return '0,0%';
    return val.toFixed(1).replace('.', ',') + '%';
  };
  
  // Gerar HTML das carteiras
  let portfoliosHTML = '';
  for (const portfolio of portfolios) {
    const breakdown = portfolio.breakdown || {};
    const valueBRL = getPortfolioValueBRL(portfolio, scenarioFx);
    
    // Calcular métricas
    let returnNominal = 0;
    let volatility = 0;
    for (const cls of ASSET_CLASSES) {
      const weight = (breakdown[cls] || 0) / 100;
      returnNominal += weight * ((assumptions?.classReturnsNominal?.[cls] || 0) * 100);
      volatility += Math.pow(weight * ((assumptions?.classVolAnnual?.[cls] || 0) * 100), 2);
    }
    volatility = Math.sqrt(volatility);
    const inflation = (assumptions?.inflationAnnual || 0.05) * 100;
    const returnReal = returnNominal - inflation;
    
    portfoliosHTML += `
      <div class="portfolio-card">
        <div class="portfolio-header">
          <span class="portfolio-name">${portfolio.name || 'Sem nome'}</span>
          <span class="portfolio-value">${fmtMoney(valueBRL)}</span>
        </div>
        <div class="breakdown-grid">
          ${ASSET_CLASSES.map(cls => `
            <div class="breakdown-item">
              <span class="breakdown-label">${ASSET_CLASS_LABELS[cls]}</span>
              <span class="breakdown-value">${fmtPct(breakdown[cls] || 0)}</span>
            </div>
          `).join('')}
        </div>
        <div class="metrics">
          <div class="metric">
            <div class="metric-label">Retorno Nominal</div>
            <div class="metric-value">${fmtPct(returnNominal)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Retorno Real</div>
            <div class="metric-value">${fmtPct(returnReal)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Volatilidade</div>
            <div class="metric-value">${fmtPct(volatility)}</div>
          </div>
        </div>
        ${portfolio.notes ? `<div class="notes">${portfolio.notes}</div>` : ''}
      </div>
    `;
  }
  
  // Alocação atual (se disponível)
  let currentAllocationHTML = '';
  if (currentAllocation && currentAllocation.totalBRL > 0) {
    currentAllocationHTML = `
      <div class="current-allocation">
        <h2 style="margin-top: 0;">Carteira Atual (Patrimônio)</h2>
        <p><strong>Total Investível:</strong> ${fmtMoney(currentAllocation.totalBRL)}</p>
        <div class="breakdown-grid">
          ${ASSET_CLASSES.map(cls => `
            <div class="breakdown-item">
              <span class="breakdown-label">${ASSET_CLASS_LABELS[cls]}</span>
              <span class="breakdown-value">${fmtPct(currentAllocation.byClassPercent?.[cls] || 0)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Guia de Alocação - ${scenarioName}</title>
      ${styles}
    </head>
    <body>
      <h1>📊 Guia de Alocação</h1>
      <div class="meta">
        <strong>Cenário:</strong> ${scenarioName} | 
        <strong>Exportado em:</strong> ${timestamp} | 
        <strong>Câmbio:</strong> USD/BRL ${formatNumberPtBR(scenarioFx?.USD_BRL || 5.0)} | EUR/BRL ${formatNumberPtBR(scenarioFx?.EUR_BRL || 5.5)}
      </div>
      
      ${currentAllocationHTML}
      
      <h2>Carteiras Planejadas</h2>
      ${portfoliosHTML || '<p>Nenhuma carteira cadastrada.</p>'}
      
      <div class="footer">
        WealthPlanner Pro - Este documento é apenas para fins educacionais e de planejamento.
        Consulte um profissional antes de tomar decisões de investimento.
      </div>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Abre janela de impressão com o HTML gerado
 */
export function printAllocationGuide(params) {
  const html = generatePrintHTML(params);
  
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Aguardar carregar e imprimir
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
}
