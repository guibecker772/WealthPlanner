import React, { useMemo } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
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
  const active = useMemo(() => simulations.find((s) => s.id === activeId), [simulations, activeId]);

  return (
    <div className="h-screen sticky top-0 bg-white border-r border-slate-100 flex flex-col">
      <div className="p-4 border-b border-slate-100">
        <div className="text-sm font-extrabold text-slate-900">Simulações</div>
        <div className="text-xs text-slate-500 mt-1">
          {active ? (
            <>
              Ativa: <span className="font-bold text-slate-700">{active.name}</span>{" "}
              {isDirty ? <span className="text-amber-600 font-bold">• não salvo</span> : null}
            </>
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
        {simulations.map((s) => {
          const activeRow = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left px-3 py-3 rounded-xl border mb-2 transition ${
                activeRow
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="text-sm font-extrabold">{s.name}</div>
              <div className={`text-xs mt-1 ${activeRow ? "text-slate-200" : "text-slate-500"}`}>
                Atualizado: {formatDate(s.updatedAt)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
