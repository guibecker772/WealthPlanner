import React, { useMemo, useState } from "react";
import { Plus, Save, Trash2, Eye, EyeOff, Shield } from "lucide-react";
import { useToast } from "./ui/Toast";

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Gera um label genérico para a simulação ativa sem expor PII
 * @param {number} index - índice da simulação na lista
 * @param {string} scenarioName - nome do cenário (ex: "Cenário 2")
 */
function getActiveLabel(index, scenarioName) {
  // Se o scenarioName parece um "Cenário N", extrair o número
  const match = scenarioName?.match(/Cen[aá]rio\s*(\d+)/i);
  if (match) {
    return `Cenário ${match[1]}`;
  }
  // Fallback: usar índice + 1
  return `Cenário ${index + 1}`;
}

export default function SimulationsSidebar({
  simulations,
  activeId,
  isDirty,
  onSelect,
  onCreate,
  onSave,
  onDelete,
  readOnly,
}) {
  const { showToast } = useToast();
  
  // Estado de privacidade - default OFF, sem persistência
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  
  const active = useMemo(() => simulations.find((s) => s.id === activeId), [simulations, activeId]);
  const activeIndex = useMemo(() => simulations.findIndex((s) => s.id === activeId), [simulations, activeId]);

  // Handler para toggle de privacidade
  const handleTogglePrivacy = () => {
    setIsPrivacyMode((prev) => !prev);
  };

  // Handler para seleção com bloqueio quando privacidade ON
  const handleSelect = (simId) => {
    if (isPrivacyMode && simId !== activeId) {
      showToast({
        type: "warning",
        title: "Modo Privacidade Ativo",
        message: "Desative o modo privacidade para trocar de simulação.",
        duration: 3500,
      });
      return;
    }
    onSelect(simId);
  };

  // Label genérico para exibir quando privacidade ON
  const activeGenericLabel = useMemo(() => {
    if (!active) return "Simulação ativa";
    return getActiveLabel(activeIndex, active.scenarioName || active.name);
  }, [active, activeIndex]);

  return (
    <div className="h-screen sticky top-0 bg-white border-r border-slate-100 flex flex-col">
      <div className="p-4 border-b border-slate-100">
        {/* Header com título e toggle de privacidade */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-slate-900">Simulações</div>
          <button
            onClick={handleTogglePrivacy}
            aria-pressed={isPrivacyMode}
            aria-label={isPrivacyMode ? "Desativar modo privacidade" : "Ativar modo privacidade"}
            title={isPrivacyMode ? "Desativar modo privacidade" : "Ativar modo privacidade"}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
              isPrivacyMode
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
            {isPrivacyMode && (
              <span className="text-xs font-bold">ON</span>
            )}
          </button>
        </div>

        {/* Indicador de simulação ativa - mascarado quando privacidade ON */}
        <div className="text-xs text-slate-500 mt-1">
          {active ? (
            isPrivacyMode ? (
              <>
                Ativa: <span className="font-bold text-slate-700">{activeGenericLabel}</span>{" "}
                {isDirty ? <span className="text-amber-600 font-bold">• não salvo</span> : null}
              </>
            ) : (
              <>
                Ativa: <span className="font-bold text-slate-700">{active.name}</span>{" "}
                {isDirty ? <span className="text-amber-600 font-bold">• não salvo</span> : null}
              </>
            )
          ) : (
            "—"
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-95"
            onClick={onCreate}
            disabled={readOnly}
            title={readOnly ? "Disponível apenas no modo Advisor" : "Criar nova simulação"}
          >
            <Plus size={16} />
            Novo
          </button>

          <button
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border ${
              isDirty ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-400 border-slate-200"
            }`}
            onClick={onSave}
            disabled={readOnly || !isDirty}
            title={readOnly ? "Disponível apenas no modo Advisor" : "Salvar alterações"}
          >
            <Save size={16} />
            Salvar
          </button>
        </div>

        <button
          className="mt-2 w-full px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-50"
          onClick={onDelete}
          disabled={readOnly || simulations.length === 0}
          title={readOnly ? "Disponível apenas no modo Advisor" : "Excluir simulação atual"}
        >
          <Trash2 size={16} />
          Excluir
        </button>
      </div>

      <div className="p-2 overflow-auto">
        {simulations.map((s, idx) => {
          const activeRow = s.id === activeId;
          
          // MODO PRIVACIDADE: não renderizar dados sensíveis no DOM
          // Quando privacyMode ON, usar placeholders genéricos (não só CSS blur)
          const displayName = isPrivacyMode
            ? (activeRow ? activeGenericLabel : "Cliente ••••")
            : s.name;
          
          const displayDate = isPrivacyMode
            ? "—"
            : formatDate(s.updatedAt);

          return (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              disabled={isPrivacyMode && !activeRow}
              className={`w-full text-left px-3 py-3 rounded-xl border mb-2 transition ${
                activeRow
                  ? "bg-slate-900 text-white border-slate-900"
                  : isPrivacyMode
                    ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="text-sm font-extrabold flex-1">{displayName}</div>
                {activeRow && (
                  <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                    ATIVO
                  </span>
                )}
                {isPrivacyMode && !activeRow && (
                  <Shield size={12} className="text-slate-400" />
                )}
              </div>
              <div className={`text-xs mt-1 ${activeRow ? "text-slate-200" : "text-slate-500"}`}>
                Atualizado: {displayDate}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
