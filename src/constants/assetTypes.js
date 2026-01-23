import { Wallet, Building2, Car, Briefcase, ScrollText, Globe } from "lucide-react";

export const ASSET_TYPES = {
  financial: {
    label: "Financeiro",
    icon: Wallet,
    color: "#10b981",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
  },
  real_estate: {
    label: "Imóvel",
    icon: Building2,
    color: "#6366f1",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
  },
  vehicle: {
    label: "Veículo",
    icon: Car,
    color: "#f59e0b",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  previdencia: {
    label: "Previdência",
    icon: ScrollText,
    color: "#8b5cf6",
    bg: "bg-violet-100",
    text: "text-violet-700",
  },
  international: {
    label: "Internacional",
    icon: Globe,
    color: "#0ea5e9",
    bg: "bg-sky-100",
    text: "text-sky-700",
  },
  other: {
    label: "Outros",
    icon: Briefcase,
    color: "#64748b",
    bg: "bg-slate-100",
    text: "text-slate-700",
  },
};

// Tipos de planos de previdência
export const PREVIDENCIA_PLAN_TYPES = [
  { value: "VGBL", label: "VGBL" },
  { value: "PGBL", label: "PGBL" },
];

// Regimes tributários
export const PREVIDENCIA_TAX_REGIMES = [
  { value: "progressivo", label: "Progressivo" },
  { value: "regressivo", label: "Regressivo" },
];

// Moedas suportadas
export const CURRENCIES = [
  { value: "BRL", label: "BRL (R$)", symbol: "R$" },
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
];

// Classes de ativos para breakdown de carteira (Brasil - padrão do Guia de Alocação)
export const PORTFOLIO_CLASSES_BR = [
  { key: 'caixa', label: 'Caixa / Liquidez', description: 'Reserva de emergência, poupança' },
  { key: 'pos', label: 'Pós-fixado (CDI)', description: 'CDBs, LCI, LCA, fundos DI' },
  { key: 'pre', label: 'Pré-fixado', description: 'LTN, CDB pré, debêntures pré' },
  { key: 'ipca', label: 'Inflação (IPCA+)', description: 'Tesouro IPCA+, NTN-B, debêntures IPCA' },
  { key: 'acoes', label: 'Ações Brasil', description: 'Ações B3, fundos de ações, small caps' },
  { key: 'fiis', label: 'FIIs', description: 'Fundos imobiliários' },
  { key: 'exterior', label: 'Exterior', description: 'ETFs, BDRs, stocks internacionais' },
  { key: 'outros', label: 'Outros', description: 'Multimercado, COE, cripto, alternativos' },
];

// Classes de ativos para breakdown internacional
export const PORTFOLIO_CLASSES_INTL = [
  { key: 'cash', label: 'Cash', description: 'Money market, short-term bonds' },
  { key: 'bonds_nominal', label: 'Bonds (Nominal)', description: 'Treasury bonds, corporate bonds' },
  { key: 'bonds_inflation', label: 'Bonds (TIPS)', description: 'Inflation-protected bonds' },
  { key: 'equities', label: 'Equities', description: 'Stocks, equity ETFs' },
  { key: 'reits', label: 'REITs', description: 'Real estate investment trusts' },
  { key: 'alternatives', label: 'Alternatives', description: 'Hedge funds, private equity' },
  { key: 'crypto_other', label: 'Crypto / Other', description: 'Cryptocurrencies, commodities' },
];

// Modos de detalhamento de carteira
export const PORTFOLIO_DETAIL_MODES = [
  { value: 'BR', label: 'Brasil (8 classes)' },
  { value: 'INTL', label: 'Internacional (7 classes)' },
  { value: 'CUSTOM', label: 'Personalizado (usar classes BR)' },
];
