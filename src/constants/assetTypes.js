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
