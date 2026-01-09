// src/constants/successionStrategies.js
import { Building2, Globe, ScrollText, Umbrella } from "lucide-react";
import { formatCurrency, formatPercent } from "../utils/format";

const CTA_TEXT = "Agendar reunião com Especialista em Planejamento Patrimonial";

/**
 * Lê KPIs no formato NOVO do seu FinancialEngine e gera métricas derivadas.
 * Isso resolve o "parou de considerar % do patrimônio".
 */
export function deriveSuccessionMetrics(kpis = {}, succession = {}) {
  const financial =
    Number(kpis?.patrimonioAtualFinanceiro ?? kpis?.initialFinancialWealth ?? 0) || 0;

  const illiquid =
    Number(kpis?.patrimonioAtualBens ?? kpis?.illiquidWealth ?? 0) || 0;

  const totalNow =
    Number(kpis?.totalWealthNow ?? (financial + illiquid)) || (financial + illiquid);

  const illiquidityPct = totalNow > 0 ? (illiquid / totalNow) * 100 : 0;

  const liquidityGap = Number(succession?.liquidityGap ?? 0) || 0;
  const estateTotal = Number(succession?.totalEstate ?? totalNow) || totalNow;

  return {
    financial,
    illiquid,
    totalNow,
    illiquidityPct,
    liquidityGap,
    estateTotal,
  };
}

function priorityFromThresholds(level) {
  if (level === "high") return "Alta";
  if (level === "mid") return "Moderada";
  return "Baixa";
}

/**
 * Heurística simples e “private” para priorização, usando métricas reais.
 */
function getPriority(strategyId, d) {
  const { totalNow, illiquidityPct, liquidityGap, estateTotal } = d;

  if (strategyId === "seguro") {
    if (liquidityGap <= 0) return priorityFromThresholds("low");
    const gapRatio = estateTotal > 0 ? liquidityGap / estateTotal : 0;
    return priorityFromThresholds(gapRatio >= 0.08 ? "high" : "mid");
  }

  if (strategyId === "previdencia") {
    if (liquidityGap > 0) return priorityFromThresholds("mid");
    if (illiquidityPct >= 35) return priorityFromThresholds("mid");
    return priorityFromThresholds("low");
  }

  if (strategyId === "holding") {
    if (illiquidityPct >= 45) return priorityFromThresholds("high");
    if (illiquidityPct >= 30 || totalNow >= 2000000) return priorityFromThresholds("mid");
    return priorityFromThresholds("low");
  }

  if (strategyId === "offshore") {
    if (totalNow >= 8000000) return priorityFromThresholds("high");
    if (totalNow >= 5000000) return priorityFromThresholds("mid");
    return priorityFromThresholds("low");
  }

  return priorityFromThresholds("low");
}

export const SUCCESSION_STRATEGIES = [
  {
    id: "holding",
    title: "Holding Patrimonial",
    icon: Building2,
    color: "indigo",
    description: "Estrutura jurídica para centralizar a gestão e sucessão de bens.",
    whenToConsider: (_kpis, _succession, d) =>
      (d?.illiquidityPct || 0) >= 30 || (d?.totalNow || 0) >= 2000000,
    benefits: [
      "Organização e centralização do patrimônio",
      "Governança familiar",
      "Evita condomínio indivisível",
      "Eficiência tributária em locação",
    ],
    risks: ["Custos de abertura e manutenção", "Complexidade contábil", "Exige disciplina na gestão da PJ"],
    indicator: (_kpis, _succession, d) => ({
      label: "Exposição a Imóveis",
      // formatPercent no seu projeto parece receber "valor em %", não fração
      value: formatPercent(d?.illiquidityPct || 0),
      context:
        (d?.illiquidityPct || 0) >= 30
          ? "Exposição imobiliária relevante — vale estruturar governança e sucessão com centralização."
          : "Exposição imobiliária ainda baixa — estrutura pode ser avaliada caso haja crescimento ou objetivos sucessórios específicos.",
      priority: getPriority("holding", d || {}),
    }),
    cta: CTA_TEXT,
  },

  {
    id: "offshore",
    title: "Offshore (Internacional)",
    icon: Globe,
    color: "blue",
    description: "Veículo de investimento sediado no exterior para diversificação de jurisdição.",
    whenToConsider: (_kpis, _succession, d) => (d?.totalNow || 0) >= 5000000,
    benefits: [
      "Diversificação de risco jurisdicional",
      "Acesso a mercados globais",
      "Planejamento sucessório",
      "Diferimento fiscal",
    ],
    risks: ["Altos custos de setup", "Report fiscal complexo", "Variação cambial", "Mudanças regulatórias"],
    indicator: (_kpis, _succession, d) => ({
      label: "Patrimônio Total",
      value: formatCurrency(d?.totalNow || 0),
      context:
        (d?.totalNow || 0) >= 5000000
          ? "Patrimônio em patamar onde estruturas internacionais podem aumentar eficiência, controle e planejamento sucessório."
          : "Estrutura internacional costuma fazer mais sentido em patrimônios maiores — pode ser discutida conforme meta de crescimento e necessidade de jurisdição.",
      priority: getPriority("offshore", d || {}),
    }),
    cta: CTA_TEXT,
  },

  {
    id: "previdencia",
    title: "Previdência Privada",
    icon: ScrollText,
    color: "emerald",
    description: "Instrumento contratual de acumulação com características securitárias.",
    whenToConsider: () => true,
    benefits: [
      "Não entra em inventário",
      "Liquidez rápida (D+30)",
      "Possibilidade de tabela regressiva",
      "Flexibilidade de beneficiários",
    ],
    risks: ["Custos de administração", "Escolha inadequada do regime tributário", "Tributação no resgate curto prazo"],
    indicator: (_kpis, _succession, d) => ({
      label: "Liquidez sucessória (Financeiro)",
      value: formatCurrency(d?.financial || 0),
      context:
        (d?.financial || 0) > 0
          ? "Capital disponível fora do inventário agiliza o acesso e facilita a organização de beneficiários."
          : "Sem liquidez financeira cadastrada, a previdência pode ser avaliada como instrumento de organização sucessória e eficiência tributária.",
      priority: getPriority("previdencia", d || {}),
    }),
    cta: CTA_TEXT,
  },

  {
    id: "seguro",
    title: "Seguro de Vida",
    icon: Umbrella,
    color: "sky",
    description: "Proteção financeira e criação de liquidez imediata.",
    whenToConsider: (_kpis, succession) => (succession?.liquidityGap || 0) > 0,
    benefits: ["Isento de IR e (em muitos casos) ITCMD", "Liquidez imediata para inventário", "Proteção familiar", "Inimpenhorável*"],
    risks: ["Custo do prêmio", "Necessidade de adequação do capital segurado", "Não é investimento"],
    indicator: (_kpis, succession, d) => ({
      label: "Gap de Liquidez",
      value: formatCurrency(Number(succession?.liquidityGap || 0)),
      context:
        (d?.liquidityGap || 0) > 0
          ? "Há uma lacuna de liquidez para cobrir custos sucessórios — seguro pode equalizar rapidamente."
          : "Sem gap de liquidez no cenário atual — seguro ainda pode ser usado como proteção familiar e eficiência operacional.",
      priority: getPriority("seguro", d || {}),
    }),
    cta: CTA_TEXT,
  },
];
