// src/components/ui/Button.jsx
import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Button UI
 * Variants focados em legibilidade no tema dark.
 *
 * Variants:
 * - default: neutro
 * - gold: CTA principal (private / dourado)
 * - outlineGold: outline dourado
 * - subtle: botão escuro leve
 */
export default function Button({
  variant = "default",
  size = "md",
  className = "",
  disabled = false,
  type = "button",
  children,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all " +
    "focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:ring-offset-0 " +
    "disabled:opacity-60 disabled:cursor-not-allowed select-none";

  const variants = {
    default:
      "bg-white/10 text-white border border-white/10 hover:bg-white/15 hover:border-white/20",
    gold:
      "bg-gold-500 text-navy-950 border border-gold-500/70 " +
      "hover:bg-gold-400 hover:border-gold-400/80 " +
      "shadow-[0_10px_30px_rgba(212,175,55,0.15)]",
    outlineGold:
      "bg-transparent text-gold-200 border border-gold-500/45 " +
      "hover:bg-gold-500/10 hover:border-gold-500/70",
    subtle:
      "bg-navy-900/40 text-slate-100 border border-white/10 hover:bg-navy-900/60 hover:border-white/15",
  };

  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(base, variants[variant] || variants.default, sizes[size] || sizes.md, className)}
      {...props}
    >
      {children}
    </button>
  );
}
