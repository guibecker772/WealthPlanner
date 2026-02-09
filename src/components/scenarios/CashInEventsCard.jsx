// src/components/scenarios/CashInEventsCard.jsx
import React from "react";
import { Plus, Trash2, TrendingUp, Calendar, PiggyBank } from "lucide-react";

import { Card, Button, InputField } from "../../components";

export default function CashInEventsCard({ clientData, updateField, readOnly }) {
  const events = clientData.cashInEvents || [];

  const addEvent = () => {
    const newEvent = {
      id: Date.now().toString(),
      name: "Nova Entrada/Herança",
      value: 0,
      age: (clientData.currentAge || 35) + 5,
      type: "financial",
      enabled: true,
    };
    updateField("cashInEvents", [...events, newEvent]);
  };

  const updateEvent = (id, key, val) => {
    updateField(
      "cashInEvents",
      events.map((e) => (e.id === id ? { ...e, [key]: val } : e))
    );
  };

  const removeEvent = (id) => {
    updateField("cashInEvents", events.filter((e) => e.id !== id));
  };

  const currentYear = new Date().getFullYear();
  const currentAge = clientData.currentAge || 35;
  const getYearFromAge = (age) => currentYear + (Number(age) > currentAge ? Number(age) - currentAge : 0);

  return (
    <Card
      title="Entradas Futuras Pontuais (Cash-in)"
      action={
        !readOnly && (
          <Button variant="outline" size="sm" icon={Plus} onClick={addEvent}>
            Adicionar
          </Button>
        )
      }
    >
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
        {events.length === 0 ? (
          <p className="text-text-faint text-sm py-8 italic text-center bg-surface-1 rounded-xl border border-border">
            Nenhuma entrada futura cadastrada (ex: venda de imóvel, herança, bônus).
          </p>
        ) : (
          events.map((item) => (
            <div
              key={item.id}
              className="group bg-surface-1 border border-border p-4 rounded-xl hover:border-gold-500/30 transition-all backdrop-blur-sm flex flex-col md:flex-row gap-5 items-start md:items-center"
            >
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm shrink-0">
                <PiggyBank size={22} />
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 w-full items-start">
                <div className="md:col-span-5">
                  <InputField
                    value={item.name}
                    onChange={(v) => updateEvent(item.id, "name", v)}
                    readOnly={readOnly}
                    placeholder="Descrição da entrada"
                    inputClassName="font-bold text-base bg-transparent border-none px-0 py-0 h-auto focus:ring-0 placeholder:text-slate-600"
                    containerClassName="bg-transparent"
                  />
                </div>

                <div className="md:col-span-4">
                  <InputField
                    label="Valor Previsto (Hoje)"
                    value={item.value}
                    onChange={(v) => updateEvent(item.id, "value", v)}
                    readOnly={readOnly}
                    type="currency"
                    inputClassName="text-emerald-300"
                  />
                </div>

                <div className="md:col-span-3 flex items-end gap-3">
                  <div className="flex-1 min-w-[110px]">
                    <InputField
                      label="Na Idade"
                      value={item.age}
                      onChange={(v) => updateEvent(item.id, "age", v)}
                      readOnly={readOnly}
                      type="number"
                      suffix="anos"
                      inputClassName="text-center"
                    />
                  </div>

                  <div className="text-xs text-text-faint mb-1 flex items-center gap-1 shrink-0 bg-surface-3/50 px-2 py-1 rounded-md">
                    <Calendar size={12} />
                    <span>Ano: {getYearFromAge(item.age)}</span>
                  </div>
                </div>
              </div>

              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEvent(item.id)}
                  className="text-text-faint hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all self-center shrink-0"
                >
                  <Trash2 size={18} />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-text-faint mt-4 border-t border-border pt-4 flex items-center gap-2">
        <TrendingUp size={14} className="text-gold-400" />
        <span>Valores lançados aqui são somados ao capital investido na idade indicada, potencializando os juros compostos.</span>
      </p>
    </Card>
  );
}
