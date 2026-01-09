// src/components/ui/Input.jsx
import React, { useEffect, useMemo, useState } from "react";
import { formatCurrencyBR, safeNumber } from "../../utils/format";

// --- helpers ---
function parseBRNumber(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;

  // permite negativo
  const neg = s.includes("-");

  // mantém apenas dígitos, vírgula e ponto
  const cleaned = s.replace(/[^\d.,-]/g, "");

  // padrão BR: "." milhar, "," decimal
  // remove pontos (milhar) e troca vírgula por ponto
  const normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");

  const n = Number(normalized);
  if (!Number.isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

const Input = React.forwardRef(
  (
    {
      label,
      error,
      icon: Icon,
      className = "",
      type = "text",
      value,
      onChange,
      onBlur,
      onFocus,
      disabled,
      readOnly,
      placeholder,
      ...props
    },
    ref
  ) => {
    const isCurrency = type === "currency";
    const isNumber = type === "number";

    // Para currency, controlamos uma string de exibição
    const [display, setDisplay] = useState("");

    // value numérico “confiável”
    const numericValue = useMemo(() => {
      if (isCurrency || isNumber) return safeNumber(value, 0);
      return null;
    }, [value, isCurrency, isNumber]);

    useEffect(() => {
      if (!isCurrency) return;
      // se value vier vazio, mostra vazio
      if (value === "" || value == null) {
        setDisplay("");
        return;
      }
      setDisplay(formatCurrencyBR(safeNumber(value, 0)));
    }, [value, isCurrency]);

    const handleChange = (e) => {
      if (!onChange) return;

      if (isCurrency) {
        const raw = e.target.value;
        setDisplay(raw);

        const n = parseBRNumber(raw);
        onChange(n);
        return;
      }

      if (isNumber) {
        const raw = e.target.value;
        // aceita vazio durante digitação
        if (raw === "" || raw == null) {
          onChange("");
          return;
        }
        const n = Number(raw);
        onChange(Number.isFinite(n) ? n : "");
        return;
      }

      // text e outros: mantém padrão event
      onChange(e);
    };

    const handleBlur = (e) => {
      if (isCurrency) {
        const n = parseBRNumber(display);
        // ao sair, formata bonitinho
        setDisplay(display ? formatCurrencyBR(n) : "");
      }
      onBlur?.(e);
    };

    const inputType = isCurrency ? "text" : type;

    return (
      <div className="w-full space-y-1.5">
        {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}

        <div className="relative group">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-accent transition-colors">
              <Icon className="w-5 h-5" />
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            value={isCurrency ? display : isNumber ? (value ?? "") : value}
            placeholder={placeholder}
            disabled={disabled || readOnly}
            className={`
              block w-full rounded-xl
              bg-surface-muted border border-border
              text-text-primary placeholder:text-text-muted/70
              focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50
              transition-all duration-200
              ${Icon ? "pl-12 pr-4" : "px-4"} py-3
              ${disabled || readOnly ? "opacity-80 cursor-not-allowed" : ""}
              ${error ? "!border-danger focus:!border-danger focus:!ring-danger/50" : ""}
              ${className}
            `}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={onFocus}
            {...props}
          />
        </div>

        {error && <p className="text-sm text-danger font-medium mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
