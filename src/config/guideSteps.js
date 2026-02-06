/**
 * Configuração dos passos do tour guiado.
 * Cada step define: rota para navegar, chave data-guide do elemento alvo, título e texto.
 */
export const GUIDE_STEPS = [
  // ===== Settings =====
  {
    route: "/dashboard/settings",
    guideKey: "client-name",
    title: "Nome do Cliente",
    text: "Comece preenchendo o nome do seu cliente. Isso aparecerá nos relatórios.",
  },
  {
    route: "/dashboard/settings",
    guideKey: "ages",
    title: "Idades Importantes",
    text: "Defina a idade atual, idade de aposentadoria e expectativa de vida para calcular o plano.",
  },
  {
    route: "/dashboard/settings",
    guideKey: "costs",
    title: "Custos Mensais",
    text: "Informe o custo de vida atual e o esperado na aposentadoria.",
  },
  {
    route: "/dashboard/settings",
    guideKey: "contribution",
    title: "Aportes",
    text: "Defina quanto o cliente pode aportar mensalmente para atingir seus objetivos.",
  },
  // ===== Assets =====
  {
    route: "/dashboard/assets",
    guideKey: "add-asset",
    title: "Adicionar Patrimônio",
    text: "Cadastre as carteiras de investimento, imóveis e outros ativos do cliente.",
  },
  {
    route: "/dashboard/assets",
    guideKey: "add-previdencia",
    title: "Previdência Privada",
    text: "Adicione planos de previdência (PGBL/VGBL) para simular eficiência fiscal e sucessão.",
  },
  // ===== Goals (opcional) =====
  {
    route: "/dashboard/goals",
    guideKey: "add-goal",
    title: "Metas Financeiras",
    text: "Defina metas como compra de imóvel, viagem ou educação dos filhos (opcional).",
  },
  // ===== Dashboard/Overview =====
  {
    route: "/dashboard/overview",
    guideKey: "kpis",
    title: "Diagnóstico",
    text: "Aqui você vê os indicadores principais: patrimônio necessário, cobertura e projeção.",
  },
  {
    route: "/dashboard/overview",
    guideKey: "export-pdf",
    title: "Exportar Relatório",
    text: "Gere o relatório em PDF para apresentar ao cliente.",
  },
];
