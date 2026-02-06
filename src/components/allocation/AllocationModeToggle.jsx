// src/components/allocation/AllocationModeToggle.jsx
// Toggle "Simples | Avançado" para o Guia de Alocação
import React from "react";

export default function AllocationModeToggle({
  mode = "simple", // "simple" | "advanced"
  onChange,
  disabled = false,
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-muted border border-border">
      <button
        type="button"
        onClick={() => onChange?.("simple")}
        disabled={disabled}
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          ${mode === "simple"
            ? "bg-accent text-white shadow-sm"
            : "text-text-secondary hover:text-text-primary"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        Simples
      </button>
      <button
        type="button"
        onClick={() => onChange?.("advanced")}
        disabled={disabled}
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          ${mode === "advanced"
            ? "bg-accent text-white shadow-sm"
            : "text-text-secondary hover:text-text-primary"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        Avançado
      </button>
    </div>
  );
}
