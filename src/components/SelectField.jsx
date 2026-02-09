// src/components/SelectField.jsx
import React from "react";
import { ChevronDown } from "lucide-react";

export default function SelectField({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  className = "",
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-muted tracking-wide">
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full appearance-none rounded-xl border border-border 
            bg-surface-1 px-4 py-3 pr-10 text-text 
            placeholder:text-text-faint transition-all duration-200
            focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-surface-1
            disabled:cursor-not-allowed disabled:opacity-50 group-hover:border-border-highlight
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          `}
        >
          <option value="" disabled className="bg-surface-1 text-text-faint">
            Selecione...
          </option>
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-surface-1 text-text"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {/* Ícone customizado posicionado absolutamente */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-faint group-hover:text-accent transition-colors">
          <ChevronDown size={20} />
        </div>
      </div>
    </div>
  );
}