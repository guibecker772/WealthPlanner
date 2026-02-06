// src/pages/GoalsPage.jsx
import React from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Trash2, Flag, Target, Milestone, Compass } from "lucide-react";
import { generateUUID } from "../utils/format";
import InputField from "../components/InputField";

export default function GoalsPage() {
  const ctx = useOutletContext() || {};
  const { clientData, updateField, readOnly } = ctx;

  if (!clientData || typeof updateField !== "function") {
    return (
      <div className="p-6 rounded-2xl border border-border bg-surface/40 text-text-secondary">
        Dados do cenário indisponíveis no momento.
      </div>
    );
  }

  const goals = clientData.financialGoals || [];

  const GOAL_TYPES = [
    { value: "impact", label: "Impacta Patrimônio (Saque)", icon: Target },
    { value: "no_impact", label: "Apenas Marco Visual", icon: Milestone },
  ];

  const addGoal = () =>
    updateField("financialGoals", [
      ...goals,
      { id: generateUUID(), name: "Novo Objetivo", value: 0, age: (clientData.currentAge || 0) + 5, type: "impact" },
    ]);

  const removeGoal = (id) => updateField("financialGoals", goals.filter((g) => g.id !== id));

  const updateGoal = (id, key, val) =>
    updateField("financialGoals", goals.map((g) => (g.id === id ? { ...g, [key]: val } : g)));

  // ✅ Empty State quando não há metas
  if (goals.length === 0) {
    return (
      <div className="animate-fade-in font-sans">
        <div className="max-w-lg mx-auto p-8 rounded-2xl border border-border bg-background-secondary/60 backdrop-blur-sm text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Compass size={32} className="text-accent" />
          </div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-2">
            Nenhuma meta cadastrada
          </h2>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            Metas ajudam a simular eventos futuros e objetivos financeiros (opcional).
            <br />
            Exemplos: comprar imóvel, viagem, educação dos filhos, etc.
          </p>

          {!readOnly && (
            <button
              type="button"
              onClick={addGoal}
              data-guide="add-goal"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-background font-bold text-sm shadow-lg shadow-accent/30 hover:shadow-accent/50 hover:scale-[1.02] transition-all"
            >
              <Plus size={18} />
              Adicionar meta
            </button>
          )}

          {readOnly && (
            <p className="text-xs text-text-muted italic">
              Modo visualização — edição desabilitada.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif text-white tracking-wide">Metas & Objetivos</h2>
        {!readOnly && (
          <button onClick={addGoal} data-guide="add-goal" className="btn-outline py-2 px-4 text-sm flex items-center gap-2 text-slate-200 hover:text-white">
            <Plus size={16} /> Adicionar Nova Meta
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {goals.map((goal) => {
          const goalTypeInfo = GOAL_TYPES.find((t) => t.value === goal.type) || GOAL_TYPES[0];
          const Icon = goalTypeInfo.icon;
          const isImpact = goal.type === "impact";

          return (
            <div
              key={goal.id}
              className={`group bg-navy-900/50 border p-5 rounded-xl transition-all backdrop-blur-sm flex flex-col md:flex-row gap-6 items-start md:items-center ${
                isImpact ? "border-rose-500/20 hover:border-rose-500/40" : "border-white/5 hover:border-gold-500/30"
              }`}
            >
              <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                <div
                  className={`p-3 rounded-xl border shadow-sm ${
                    isImpact ? "bg-rose-950/50 border-rose-500/30 text-rose-400" : "bg-navy-950 border-white/10 text-gold-500"
                  }`}
                >
                  <Icon size={20} />
                </div>

                <div className="flex-1 space-y-1">
                  <input
                    className="bg-transparent font-bold text-white text-lg outline-none w-full placeholder:text-slate-200"
                    value={goal.name}
                    onChange={(e) => updateGoal(goal.id, "name", e.target.value)}
                    disabled={readOnly}
                    placeholder="Nome do objetivo"
                  />

                  <select
                    className="bg-transparent text-sm text-white outline-none cursor-pointer appearance-none w-full pr-4"
                    value={goal.type}
                    onChange={(e) => updateGoal(goal.id, "type", e.target.value)}
                    disabled={readOnly}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23d4af37' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: `right center`,
                      backgroundRepeat: `no-repeat`,
                      backgroundSize: `1em 1em`,
                    }}
                  >
                    {GOAL_TYPES.map((o) => (
                      <option key={o.value} value={o.value} className="bg-navy-900 text-white">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end bg-navy-950/30 p-3 rounded-lg border border-white/5">
                <div className="w-44">
                  <InputField
                    label={isImpact ? "Valor (Saque)" : "Valor (Marco)"}
                    value={goal.value}
                    onChange={(v) => updateGoal(goal.id, "value", v)}
                    readOnly={readOnly}
                    type="currency"
                  />
                </div>

                <div className="w-32">
                  <InputField
                    label="Idade"
                    value={goal.age}
                    onChange={(v) => updateGoal(goal.id, "age", v)}
                    readOnly={readOnly}
                    type="number"
                    suffix="anos"
                    inputClassName="text-center"
                  />
                </div>

                {!readOnly && (
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="text-slate-200 hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-rose-500/10 ml-2"
                    title="Excluir meta"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="text-center py-12 px-4 rounded-xl border border-white/5 bg-navy-900/30 text-slate-400">
            <Flag size={32} className="mx-auto mb-3 opacity-50" />
            <p>Nenhuma meta cadastrada para este cenário.</p>
            {!readOnly && (
              <p className="text-sm mt-2 text-gold-400 cursor-pointer hover:underline" onClick={addGoal}>
                Clique aqui para adicionar a primeira.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
