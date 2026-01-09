import { Wallet, Building2, Car, Briefcase } from "lucide-react";

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
  other: {
    label: "Outros",
    icon: Briefcase,
    color: "#64748b",
    bg: "bg-slate-100",
    text: "text-slate-700",
  },
};
