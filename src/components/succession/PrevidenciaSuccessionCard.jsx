// src/components/succession/PrevidenciaSuccessionCard.jsx
import React, { useMemo } from "react";
import { ScrollText, AlertCircle, Info, ToggleLeft, ToggleRight } from "lucide-react";

import Card from "../ui/Card";
import { formatCurrencyBR } from "../../utils/format";

export default function PrevidenciaSuccessionCard({ clientData, succession, updateField, readOnly = false }) {
  const assets = clientData?.assets || [];
  const previdenciaConfig = clientData?.previdenciaSuccession || {
    excludeFromInventory: true,
    applyITCMD: false,
  };

  // Filtrar ativos de previdência
  const previdenciaAssets = useMemo(() => {
    return assets.filter((a) => a.type === "previdencia");
  }, [assets]);

  const previdenciaTotal = succession?.previdenciaTotal || 0;
  const previdenciaVGBL = succession?.previdenciaVGBL || 0;
  const previdenciaPGBL = succession?.previdenciaPGBL || 0;

  const toggleExcludeFromInventory = () => {
    if (readOnly) return;
    updateField("previdenciaSuccession", {
      ...previdenciaConfig,
      excludeFromInventory: !previdenciaConfig.excludeFromInventory,
    });
  };

  const toggleApplyITCMD = () => {
    if (readOnly) return;
    updateField("previdenciaSuccession", {
      ...previdenciaConfig,
      applyITCMD: !previdenciaConfig.applyITCMD,
    });
  };

  if (previdenciaAssets.length === 0) {
    return (
      <Card title="Previdência na Sucessão" className="bg-violet-900/20 border-violet-500/20">
        <div className="flex items-center gap-3 text-text-muted">
          <ScrollText size={24} className="text-violet-400/50" />
          <p className="text-sm">
            Nenhum ativo de previdência cadastrado. Adicione VGBL/PGBL na aba Patrimônio para ver a análise sucessória.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo de Previdência */}
      <Card title="Previdência Privada (VGBL/PGBL)" className="bg-violet-900/20 border-violet-500/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <p className="text-xs text-violet-400 font-bold uppercase">Total Previdência</p>
            <p className="text-2xl font-bold text-violet-300">{formatCurrencyBR(previdenciaTotal)}</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-emerald-400 font-bold uppercase">VGBL</p>
            <p className="text-2xl font-bold text-emerald-300">{formatCurrencyBR(previdenciaVGBL)}</p>
            <p className="text-xs text-text-muted mt-1">Tributa só o rendimento</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400 font-bold uppercase">PGBL</p>
            <p className="text-2xl font-bold text-amber-300">{formatCurrencyBR(previdenciaPGBL)}</p>
            <p className="text-xs text-text-muted mt-1">Tributa valor total</p>
          </div>
        </div>

        {/* Lista de planos */}
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-text-secondary mb-3">Planos cadastrados</h4>
          <div className="space-y-2">
            {previdenciaAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface/30 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded text-xs font-bold ${
                    asset.previdencia?.planType === "PGBL"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {asset.previdencia?.planType || "VGBL"}
                  </div>
                  <span className="text-sm text-text-primary">{asset.name}</span>
                  <span className="text-xs text-text-muted">
                    ({asset.previdencia?.taxRegime === "progressivo" ? "Progressivo" : "Regressivo"})
                  </span>
                </div>
                <span className="font-semibold text-text-primary">{formatCurrencyBR(asset.value || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Configurações para Sucessão */}
      <Card title="Tratamento na Sucessão" className="bg-surface-highlight/20">
        <div className="space-y-4">
          {/* Toggle: Fora do Inventário */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface/30 border border-border">
            <div className="flex-1">
              <h4 className="font-semibold text-text-primary">Considerar fora do inventário?</h4>
              <p className="text-xs text-text-muted mt-1">
                VGBL/PGBL são pagos diretamente aos beneficiários, sem passar pelo inventário tradicional.
              </p>
            </div>
            <button
              onClick={toggleExcludeFromInventory}
              disabled={readOnly}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                previdenciaConfig.excludeFromInventory
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-surface-muted text-text-secondary border border-border"
              } ${readOnly ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
            >
              {previdenciaConfig.excludeFromInventory ? (
                <>
                  <ToggleRight size={20} />
                  SIM
                </>
              ) : (
                <>
                  <ToggleLeft size={20} />
                  NÃO
                </>
              )}
            </button>
          </div>

          {/* Toggle: ITCMD */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface/30 border border-border">
            <div className="flex-1">
              <h4 className="font-semibold text-text-primary">Incide ITCMD sobre previdência?</h4>
              <p className="text-xs text-text-muted mt-1">
                Alguns estados entendem que ITCMD incide sobre VGBL/PGBL. A jurisprudência ainda é controversa.
              </p>
            </div>
            <button
              onClick={toggleApplyITCMD}
              disabled={readOnly}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                previdenciaConfig.applyITCMD
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-surface-muted text-text-secondary border border-border"
              } ${readOnly ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
            >
              {previdenciaConfig.applyITCMD ? (
                <>
                  <ToggleRight size={20} />
                  SIM
                </>
              ) : (
                <>
                  <ToggleLeft size={20} />
                  NÃO
                </>
              )}
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-300 space-y-2">
              <p>
                <b>Atenção:</b> O tratamento tributário de VGBL/PGBL na sucessão pode variar conforme
                legislação estadual e entendimento jurisprudencial. Consulte um advogado tributarista
                para análise específica do seu caso.
              </p>
              <p>
                Em geral, previdência privada possui características de contrato de seguro, sendo paga
                diretamente aos beneficiários indicados, fora do inventário. Porém, há discussões sobre
                a incidência de ITCMD em alguns estados.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Benefícios */}
      <Card title="Vantagens da Previdência na Sucessão" className="bg-gradient-to-br from-violet-900/30 to-indigo-900/30 border-violet-500/20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface/30 border border-border">
            <h4 className="font-semibold text-text mb-2">🚀 Liquidez Rápida</h4>
            <p className="text-xs text-text-muted">
              Pagamento em ~30 dias diretamente aos beneficiários, sem aguardar conclusão do inventário.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/30 border border-border">
            <h4 className="font-semibold text-text mb-2">📋 Fora do Inventário</h4>
            <p className="text-xs text-text-muted">
              Não compõe a massa de bens a inventariar, simplificando o processo sucessório.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/30 border border-border">
            <h4 className="font-semibold text-text mb-2">👥 Flexibilidade de Beneficiários</h4>
            <p className="text-xs text-text-muted">
              Você escolhe quem recebe e em qual proporção, podendo alterar a qualquer momento.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/30 border border-border">
            <h4 className="font-semibold text-text mb-2">💰 Eficiência Tributária</h4>
            <p className="text-xs text-text-muted">
              Tabela regressiva (até 10% após 10 anos) e possível isenção de ITCMD conforme estado.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-surface/20 border border-border">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-text-muted mt-0.5 shrink-0" />
            <p className="text-xs text-text-muted">
              <b>PGBL:</b> Permite dedução de até 12% da renda tributável (declaração completa + INSS).
              <b className="ml-2">VGBL:</b> Indicado para quem faz declaração simplificada ou já atingiu o limite do PGBL.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
