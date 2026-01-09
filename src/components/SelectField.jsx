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
        <label className="block text-sm font-medium text-slate-300 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          // CORREÇÃO PROBLEMA 1: colorScheme força o navegador a usar controles escuros
          style={{ colorScheme: "dark" }}
          className={`
            w-full appearance-none rounded-xl border border-white/10 
            bg-navy-900/50 px-4 py-3 pr-10 text-white 
            placeholder-slate-500 transition-all duration-200
            focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:bg-navy-900
            disabled:cursor-not-allowed disabled:opacity-50 group-hover:border-white/20
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          `}
        >
          <option value="" disabled className="bg-navy-950 text-slate-500">
            Selecione...
          </option>
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              // CORREÇÃO PROBLEMA 1: Força fundo escuro e texto claro nas opções
              className="bg-navy-950 text-white hover:bg-navy-800 py-2"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {/* Ícone customizado posicionado absolutamente */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 group-hover:text-gold-400 transition-colors">
          <ChevronDown size={20} />
        </div>
      </div>
    </div>
  );
}