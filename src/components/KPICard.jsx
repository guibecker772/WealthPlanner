import React from "react";

/**
 * KPICard - Card de métrica premium
 * 
 * Suporta tokens do design system e client mode (kpi-value class)
 */
export default function KPICard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = "default", // default, accent, success, warning, danger
  status, // Compat legacy: danger, warning, safe
  active,
}) {
  // Mapear status legacy para variant
  const effectiveVariant = status === "danger" ? "danger" 
    : status === "warning" ? "warning"
    : status === "safe" ? "success"
    : variant;

  // Classes baseadas em tokens
  const variantClasses = {
    default: "bg-surface-2 border-border text-text",
    accent: "bg-accent-subtle border-accent/30 text-text",
    success: "bg-success-subtle border-success/30 text-success",
    warning: "bg-warning-subtle border-warning/30 text-warning",
    danger: "bg-danger-subtle border-danger/30 text-danger",
  };

  const iconBgClasses = {
    default: "bg-surface-3",
    accent: "bg-accent/20 text-accent",
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
    danger: "bg-danger/20 text-danger",
  };

  // Active state override
  const baseClasses = active
    ? "bg-accent border-accent text-accent-fg shadow-soft ring-2 ring-accent/30"
    : variantClasses[effectiveVariant] || variantClasses.default;

  const iconClasses = active
    ? "bg-accent-2/30 text-accent-fg"
    : iconBgClasses[effectiveVariant] || iconBgClasses.default;

  return (
    <div
      className={`p-5 rounded-2xl border transition-all flex items-start justify-between ${baseClasses} print:border-slate-200 print:bg-white print:text-slate-900 print:p-2`}
    >
      <div>
        <p
          className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
            active ? "text-accent-fg/70" : "text-text-muted"
          } print:text-slate-500`}
        >
          {label}
        </p>
        <h4
          className={`text-2xl font-bold kpi-value ${
            active ? "text-accent-fg" : "text-text"
          } print:text-slate-900 print:text-xl`}
        >
          {value}
        </h4>
        {subtext && (
          <p
            className={`text-xs mt-1 ${
              active ? "text-accent-fg/70" : "text-text-faint"
            } print:text-slate-500`}
          >
            {subtext}
          </p>
        )}
      </div>

      <div
        className={`p-2.5 rounded-xl ${iconClasses} print:hidden`}
      >
        {Icon ? <Icon size={24} /> : null}
      </div>
    </div>
  );
}
