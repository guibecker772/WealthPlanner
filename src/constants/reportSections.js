// src/constants/reportSections.js
// Schema de seções do relatório modular - Catálogo ordenado de seções e sub-blocos

/**
 * Seções disponíveis para o relatório modular
 * IMPORTANTE: "Guia de Alocação" NUNCA deve aparecer neste catálogo
 */
export const REPORT_SECTIONS = {
  EXECUTIVE: {
    id: "executive",
    title: "Visão Executiva",
    description: "Cards de KPIs principais e resumo executivo do planejamento",
    order: 1,
    defaultEnabled: true,
  },
  ASSETS: {
    id: "assets",
    title: "Patrimônio",
    description: "Composição patrimonial detalhada por classes e categorias",
    order: 2,
    defaultEnabled: true,
  },
  SCENARIOS: {
    id: "scenarios",
    title: "Cenários",
    description: "Comparação entre cenários Base, Conservador e Otimista",
    order: 3,
    defaultEnabled: true,
  },
  GOALS: {
    id: "goals",
    title: "Metas",
    description: "Lista de metas financeiras com status e valores",
    order: 4,
    defaultEnabled: true,
  },
  SUCCESSION: {
    id: "succession",
    title: "Sucessão",
    description: "Planejamento sucessório e custos estimados",
    order: 5,
    defaultEnabled: true,
    hasSubBlocks: true,
  },
};

/**
 * Sub-blocos da seção de Sucessão
 * "Eficiência Fiscal PGBL" é opcional e default OFF
 */
export const SUCCESSION_SUB_BLOCKS = {
  OVERVIEW: {
    id: "overview",
    title: "Visão Patrimonial",
    description: "Composição do patrimônio para sucessão",
    defaultEnabled: true,
  },
  COSTS: {
    id: "costs",
    title: "Custos do Inventário",
    description: "Estimativa de ITCMD, honorários e custas",
    defaultEnabled: true,
  },
  BENEFICIARIES: {
    id: "beneficiaries",
    title: "Beneficiários",
    description: "Lista de beneficiários se informada",
    defaultEnabled: true,
  },
  RECOMMENDATIONS: {
    id: "recommendations",
    title: "Recomendações",
    description: "Sugestões para otimização sucessória",
    defaultEnabled: true,
  },
  INCOME_PROTECTION: {
    id: "incomeProtection",
    title: "Proteção de Renda",
    description: "Seguro de renda e cobertura sugerida",
    defaultEnabled: true,
  },
  PGBL_EFFICIENCY: {
    id: "pgblEfficiency",
    title: "Eficiência Fiscal PGBL",
    description: "Análise de eficiência fiscal via PGBL (opcional)",
    defaultEnabled: false, // DEFAULT OFF conforme requisito
  },
};

/**
 * Helper para obter seções ordenadas
 */
export function getOrderedSections() {
  return Object.values(REPORT_SECTIONS).sort((a, b) => a.order - b.order);
}

/**
 * Helper para obter sub-blocos de sucessão ordenados
 */
export function getSuccessionSubBlocks() {
  return Object.values(SUCCESSION_SUB_BLOCKS);
}

/**
 * Estado inicial das seções selecionadas
 */
export function getDefaultSectionState() {
  const sections = {};
  Object.values(REPORT_SECTIONS).forEach((section) => {
    sections[section.id] = section.defaultEnabled;
  });
  return sections;
}

/**
 * Estado inicial dos sub-blocos de sucessão
 */
export function getDefaultSuccessionSubBlockState() {
  const subBlocks = {};
  Object.values(SUCCESSION_SUB_BLOCKS).forEach((block) => {
    subBlocks[block.id] = block.defaultEnabled;
  });
  return subBlocks;
}

/**
 * Texto fixo de disclaimers (última página)
 */
export const DISCLAIMER_TEXT = {
  title: "Informações Importantes e Disclaimers",
  paragraphs: [
    "Este documento foi elaborado com fins exclusivamente informativos e educacionais, não constituindo oferta, solicitação ou recomendação de compra ou venda de qualquer ativo financeiro, produto de investimento ou serviço.",
    "As informações, projeções e estimativas contidas neste relatório são baseadas em dados fornecidos pelo cliente e em premissas que podem não se concretizar. Resultados passados não garantem resultados futuros.",
    "Os valores de patrimônio, custos sucessórios, impostos e demais estimativas apresentadas são aproximações e podem variar significativamente conforme legislação vigente, interpretações tributárias e condições de mercado.",
    "As alíquotas de ITCMD variam conforme o estado de domicílio do falecido e podem sofrer alterações. Consulte um advogado especializado para análise do seu caso específico.",
    "Este relatório não substitui aconselhamento jurídico, tributário, contábil ou financeiro profissional. Recomenda-se validar todas as informações com profissionais especializados antes de tomar qualquer decisão.",
    "A WealthPlanner Pro e seus colaboradores não se responsabilizam por decisões tomadas com base exclusiva neste documento ou por eventuais prejuízos decorrentes de seu uso.",
    "As informações aqui contidas são confidenciais e destinadas exclusivamente ao cliente identificado. A reprodução ou distribuição não autorizada é proibida.",
  ],
  footer: "Documento gerado automaticamente pelo WealthPlanner Pro. Todos os direitos reservados.",
};

/**
 * Metadados padrão do relatório
 */
export function getDefaultReportMeta(clientData) {
  return {
    clientName: clientData?.name || clientData?.clientName || "Cliente",
    advisorName: "",
    referenceDate: new Date().toISOString().split("T")[0],
    generatedAt: new Date().toISOString(),
  };
}
