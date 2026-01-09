// src/components/InputField.jsx
import React, { useEffect, useState } from "react";
import Input from "./ui/Input";
import { formatCurrencyBR, safeNumber } from "../utils/format";

// Parser BR: aceita "1.234,56" e também "-" etc.
function parseBRNumber(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;

  const neg = s.includes("-");
  const cleaned = s.replace(/[^\d.,-]/g, "");
  const normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(normalized);

  if (!Number.isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

export default function InputField({
  label,
  value,
  onChange,
  readOnly,
  disabled,
  type = "text", // "text" | "number" | "currency"
  placeholder,
  suffix,
  className = "",
  inputClassName = "",
}) {
  const isCurrency = type === "currency";
  const isNumber = type === "number";

  // Currency: display controlado (texto), grava número no onChange
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!isCurrency) return;
    if (value === "" || value == null) {
      setDisplay("");
      return;
    }
    setDisplay(formatCurrencyBR(safeNumber(value, 0)));
  }, [value, isCurrency]);

  const handleCurrencyRawChange = (e) => {
    const raw = e.target.value;
    setDisplay(raw);
    const n = parseBRNumber(raw);
    onChange?.(n);
  };

  const handleCurrencyBlur = () => {
    const n = parseBRNumber(display);
    setDisplay(display ? formatCurrencyBR(n) : "");
  };

  // Campo com sufixo (ex: anos)
  if (suffix) {
    const rawVal = value ?? "";

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          <Input
            type={isNumber ? "number" : "text"}
            value={rawVal}
            onChange={(vOrEvent) => {
              if (isNumber) {
                const v = vOrEvent === "" ? "" : safeNumber(vOrEvent, 0);
                onChange?.(v);
                return;
              }
              onChange?.(vOrEvent?.target ? vOrEvent.target.value : vOrEvent);
            }}
            disabled={disabled || readOnly}
            placeholder={placeholder}
            className={`pr-14 ${inputClassName}`}
          />

          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted whitespace-nowrap pointer-events-none">
            {suffix}
          </span>
        </div>
      </div>
    );
  }

  // Currency
  if (isCurrency) {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}

        <input
          type="text"
          value={display}
          disabled={disabled || readOnly}
          placeholder={placeholder}
          onChange={handleCurrencyRawChange}
          onBlur={handleCurrencyBlur}
          className={`
            block w-full rounded-xl
            bg-surface-muted border border-border
            text-text-primary placeholder:text-text-muted/70
            focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/50
            transition-all duration-200
            px-4 py-3
            ${disabled || readOnly ? "opacity-80 cursor-not-allowed" : ""}
            ${inputClassName}
          `}
        />
      </div>
    );
  }

  // Default
  return (
    <Input
      label={label}
      type={type}
      value={value ?? ""}
      onChange={(vOrEvent) => {
        if (isNumber) {
          onChange?.(vOrEvent === "" ? "" : safeNumber(vOrEvent, 0));
          return;
        }
        onChange?.(vOrEvent?.target ? vOrEvent.target.value : vOrEvent);
      }}
      disabled={disabled || readOnly}
      placeholder={placeholder}
      className={`${className} ${inputClassName}`}
    />
  );
}
