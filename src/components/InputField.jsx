// src/components/InputField.jsx
import React from "react";
import Input from "./ui/Input";
import { safeNumber } from "../utils/format";

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

  // ✅ Campo com sufixo (ex: anos)
  // Mantemos o sufixo aqui e delegamos o input para o componente base.
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
              // Input (ui) para number chama onChange(n) ou onChange("")
              if (isNumber) {
                const v = vOrEvent === "" ? "" : safeNumber(vOrEvent, 0);
                onChange?.(v);
                return;
              }
              // text normal
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

  // ✅ Currency: delega 100% pro Input base (sem máscara dupla)
  if (isCurrency) {
    return (
      <Input
        label={label}
        type="currency"
        value={value ?? ""}
        onChange={(n) => onChange?.(n)}
        disabled={disabled || readOnly}
        placeholder={placeholder}
        className={`${className} ${inputClassName}`}
      />
    );
  }

  // ✅ Number: delega pro Input base
  if (isNumber) {
    return (
      <Input
        label={label}
        type="number"
        value={value ?? ""}
        onChange={(nOrEmpty) => {
          if (nOrEmpty === "") {
            onChange?.("");
            return;
          }
          onChange?.(safeNumber(nOrEmpty, 0));
        }}
        disabled={disabled || readOnly}
        placeholder={placeholder}
        className={`${className} ${inputClassName}`}
      />
    );
  }

  // ✅ Default text
  return (
    <Input
      label={label}
      type={type}
      value={value ?? ""}
      onChange={(vOrEvent) => {
        onChange?.(vOrEvent?.target ? vOrEvent.target.value : vOrEvent);
      }}
      disabled={disabled || readOnly}
      placeholder={placeholder}
      className={`${className} ${inputClassName}`}
    />
  );
}
