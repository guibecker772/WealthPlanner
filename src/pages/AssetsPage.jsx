// src/pages/AssetsPage.jsx
import React, { useMemo } from "react";
import { Plus, Wallet, Building2, Car, Briefcase, Box, Trash2 } from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { formatCurrencyBR, safeNumber } from "../utils/format";

const TYPE_ICONS = {
  financial: Wallet,
  real_estate: Building2,
  vehicle: Car,
  business: Briefcase,
  other: Box,
};

// ✅ Normaliza o retorno do Input (currency mask / event / etc)
// Evita salvar objeto no estado (causa [object Object])
function normalizeCurrencyValue(v) {
  // 1) Se veio um evento padrão de input
  if (v && typeof v === "object" && v.target && typeof v.target.value !== "undefined") {
    v = v.target.value;
  }

  // 2) Se veio objeto de máscara (react-number-format, etc)
  if (v && typeof v === "object") {
    if (typeof v.floatValue !== "undefined") return Number.isFinite(v.floatValue) ? v.floatValue : "";
    if (typeof v.value !== "undefined") return v.value === "" ? "" : safeNumber(v.value);
    if (typeof v.rawValue !== "undefined") return v.rawValue === "" ? "" : safeNumber(v.rawValue);
    if (typeof v.formattedValue !== "undefined") return v.formattedValue === "" ? "" : safeNumber(v.formattedValue);

    // Se cair aqui, é algum objeto inesperado -> não salva objeto
    return "";
  }

  // 3) Se veio string/number simples
  if (v === "" || v === null || typeof v === "undefined") return "";

  // safeNumber deve lidar com "R$ 1.234,56" e "1234,56"
  const n = safeNumber(v);
  return Number.isFinite(n) ? n : "";
}

export default function AssetsPage({ clientData, updateField, readOnly }) {
  const assets = clientData.assets || [];

  const addAsset = () => {
    const newAsset = {
      id: Date.now().toString(),
      name: "Novo Ativo",
      value: "", // ✅ manter string vazia é ok; ao digitar vira number pelo normalize
      type: "financial",
    };

    updateField("assets", [...assets, newAsset]);
  };

  const removeAsset = (id) => {
    updateField("assets", assets.filter((a) => a.id !== id));
  };

  const updateAsset = (id, key, val) => {
    updateField(
      "assets",
      assets.map((a) => (a.id === id ? { ...a, [key]: val } : a))
    );
  };

  const totalWealth = useMemo(
    () => assets.reduce((acc, a) => acc + safeNumber(a.value), 0),
    [assets]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in items-start font-sans">
      <Card
        title="Estrutura Patrimonial"
        className="lg:col-span-2"
        action={
          !readOnly && (
            <Button variant="outline" size="sm" icon={Plus} onClick={addAsset}>
              Adicionar
            </Button>
          )
        }
      >
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
          {assets.length === 0 ? (
            <p className="text-text-muted text-sm italic py-4 text-center">
              Nenhum ativo cadastrado.
            </p>
          ) : (
            assets.map((asset) => {
              const Icon = TYPE_ICONS[asset.type] || Box;

              return (
                <div
                  key={asset.id}
                  className="group bg-surface-highlight/30 border border-border p-5 rounded-xl hover:border-accent/50 transition-all flex flex-col md:flex-row gap-6 items-center"
                >
                  <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                    <div className="p-3 rounded-xl bg-surface border border-border text-accent shadow-sm">
                      <Icon size={20} />
                    </div>

                    <div className="flex-1 space-y-2">
                      <Input
                        value={asset.name}
                        onChange={(e) => updateAsset(asset.id, "name", e.target.value)}
                        disabled={readOnly}
                        placeholder="Nome do ativo"
                        className="font-display font-semibold text-lg bg-transparent border-none px-0 py-1 focus:ring-0 placeholder:text-text-muted/50"
                      />

                      <select
                        className="bg-transparent text-sm text-text-secondary outline-none cursor-pointer appearance-none pr-4 w-full md:w-auto font-medium focus:text-accent transition-colors"
                        value={asset.type}
                        onChange={(e) => updateAsset(asset.id, "type", e.target.value)}
                        disabled={readOnly}
                        style={{
                          colorScheme: "dark",
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23D4AF37' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: `right center`,
                          backgroundRepeat: `no-repeat`,
                          backgroundSize: `1em 1em`,
                        }}
                      >
                        <option value="financial" className="bg-surface text-text-primary">
                          Financeiro (Líquido)
                        </option>
                        <option value="real_estate" className="bg-surface text-text-primary">
                          Imóvel
                        </option>
                        <option value="business" className="bg-surface text-text-primary">
                          Empresa
                        </option>
                        <option value="vehicle" className="bg-surface text-text-primary">
                          Veículo
                        </option>
                        <option value="other" className="bg-surface text-text-primary">
                          Outros
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="w-44">
                      <Input
                        label="Valor de Mercado"
                        type="currency"
                        value={asset.value}
                        // ✅ AQUI está a correção do [object Object]
                        onChange={(v) => updateAsset(asset.id, "value", normalizeCurrencyValue(v))}
                        readOnly={readOnly}
                      />
                    </div>

                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAsset(asset.id)}
                        className="text-text-muted hover:text-danger hover:bg-danger-subtle opacity-0 group-hover:opacity-100 self-end mb-1"
                      >
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
          <span className="font-medium text-text-secondary uppercase tracking-wider text-sm">
            Patrimônio Total Declarado
          </span>
          <span className="font-display text-3xl font-bold text-text-primary">
            {formatCurrencyBR(totalWealth)}
          </span>
        </div>
      </Card>

      <Card title="Resumo da Alocação" className="bg-surface-highlight/20">
        <div className="text-text-secondary text-sm">
          <p>
            A distribuição entre ativos financeiros (líquidos) e bens patrimoniais impacta
            diretamente a projeção de renda na aposentadoria e os custos sucessórios.
          </p>
        </div>
      </Card>
    </div>
  );
}
