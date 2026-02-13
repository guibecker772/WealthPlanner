import React, { useMemo } from "react";

function ToolPill({
  label,
  mark,
  active = false,
  disabled = false,
  compact = false,
  onClick,
  ariaLabel,
  title,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        active
          ? "border border-accent/45 bg-accent-subtle/25 text-accent"
          : "border border-transparent text-text-muted hover:border-border-highlight hover:bg-surface-2 hover:text-text"
      } ${disabled ? "cursor-not-allowed opacity-45" : ""} ${compact ? "flex-1 text-xs" : ""}`}
    >
      <span
        className={`grid h-6 w-6 place-items-center rounded-md border text-[11px] font-bold ${
          mark === "PW"
            ? "border-accent/50 bg-accent-subtle/25 text-accent"
            : "border-sky-400/30 bg-sky-500/10 text-sky-300"
        }`}
      >
        {mark}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function SuiteSwitcher({ current = "pw", advisorUrl = "", compact = false }) {
  const normalizedAdvisorUrl = useMemo(() => String(advisorUrl || "").trim(), [advisorUrl]);
  const hasAdvisorUrl = normalizedAdvisorUrl.length > 0;

  const openAdvisorControl = () => {
    if (!hasAdvisorUrl) return;
    window.open(normalizedAdvisorUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-2">
      <div
        className={`inline-flex items-center gap-1 rounded-2xl border border-border bg-surface-1/70 p-1 backdrop-blur-md ${
          compact ? "w-full" : ""
        }`}
      >
        <ToolPill
          label="Private Wealth"
          mark="PW"
          active={current === "pw"}
          compact={compact}
          onClick={() => {}}
          ariaLabel="Ferramenta atual: Private Wealth"
          title="Private Wealth"
        />
        <ToolPill
          label="Advisor Control"
          mark="AC"
          active={current === "advisor"}
          disabled={!hasAdvisorUrl}
          compact={compact}
          onClick={openAdvisorControl}
          ariaLabel="Abrir Advisor Control em nova aba"
          title={hasAdvisorUrl ? "Abrir Advisor Control em nova aba" : "Configurar URL do Advisor Control"}
        />
      </div>

      {!hasAdvisorUrl && (
        <p className="text-[11px] text-text-faint" role="status" aria-live="polite">
          Configurar URL do Advisor Control
        </p>
      )}
    </div>
  );
}

