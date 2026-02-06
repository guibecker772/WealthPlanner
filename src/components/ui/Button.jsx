// src/components/ui/Button.jsx
import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Button - Componente de botão premium
 *
 * Variants:
 * - primary: CTA principal (dourado/accent)
 * - secondary: Botão neutro com borda
 * - ghost: Transparente, sutil
 * - danger: Ações destrutivas
 * - outline: Borda accent, fundo transparente
 * 
 * Compat legacy: "gold" = primary, "subtle" = secondary, "default" = secondary
 */
export default function Button({
  variant = "secondary",
  size = "md",
  className = "",
  disabled = false,
  type = "button",
  children,
  ...props
}) {
  // Base com focus visível acessível
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none";

  const variants = {
    // CTA Principal (gold)
    primary:
      "bg-accent text-accent-fg border border-accent/70 " +
      "hover:bg-accent-2 hover:border-accent-2/80 " +
      "shadow-soft hover:shadow-glow-accent",
    
    // Neutro com borda
    secondary:
      "bg-surface-2 text-text border border-border " +
      "hover:bg-surface-3 hover:border-border-highlight hover:text-text",
    
    // Transparente, sutil
    ghost:
      "bg-transparent text-text-muted border border-transparent " +
      "hover:bg-surface-2/60 hover:text-text",
    
    // Outline accent
    outline:
      "bg-transparent text-accent border border-accent/40 " +
      "hover:bg-accent-subtle hover:border-accent/70",
    
    // Danger
    danger:
      "bg-danger-subtle text-danger border border-danger/30 " +
      "hover:bg-danger/20 hover:border-danger/50",

    // Compat legacy
    gold:
      "bg-accent text-accent-fg border border-accent/70 " +
      "hover:bg-accent-2 hover:border-accent-2/80 " +
      "shadow-soft hover:shadow-glow-accent",
    subtle:
      "bg-surface-1/40 text-text border border-border " +
      "hover:bg-surface-2/60 hover:border-border-highlight",
    default:
      "bg-surface-2 text-text border border-border " +
      "hover:bg-surface-3 hover:border-border-highlight",
    outlineGold:
      "bg-transparent text-accent border border-accent/40 " +
      "hover:bg-accent-subtle hover:border-accent/70",
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
      className={cn(base, variants[variant] || variants.secondary, sizes[size] || sizes.md, className)}
      {...props}
    >
      {children}
    </button>
  );
}
