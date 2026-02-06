// src/components/allocation/Step2Objective.jsx
// Passo 2: "Seu objetivo (escolha 1)"
import React, { useState, useCallback } from "react";
import {
  Target,
  TrendingUp,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

import Card from "../ui/Card";
import { PROFILE_LIMITS } from "../../utils/allocationMath";

export default function Step2Objective({
  allocationGuide,
  updateAllocationGuide,
  readOnly = false,
  mode = "simple",
  recommendationFailed = false,
  recommendationMessage = null,
}) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const objective = allocationGuide.objective || {};
  const currentMode = objective.mode || "targetReturn";
  const currentProfile = objective.profile || "moderado";
  const targetRealReturn = (objective.targetRealReturn || 0.06) * 100; // em %
  const targetVol = (objective.targetVol || 0.10) * 100; // em %

  // Estado local para input (permite vírgula)
  const [localTargetStr, setLocalTargetStr] = useState(
    currentMode === "targetReturn"
      ? targetRealReturn.toFixed(1).replace('.', ',')
      : targetVol.toFixed(1).replace('.', ',')
  );

  // Sincronizar quando muda o modo
  React.useEffect(() => {
    const val = currentMode === "targetReturn" ? targetRealReturn : targetVol;
    setLocalTargetStr(val.toFixed(1).replace('.', ','));
  }, [currentMode, targetRealReturn, targetVol]);

  // Handler: Mudar modo (retorno vs risco)
  const handleModeChange = useCallback((newMode) => {
    if (readOnly) return;
    updateAllocationGuide({
      ...allocationGuide,
      objective: {
        ...objective,
        mode: newMode,
      },
    });
  }, [allocationGuide, objective, updateAllocationGuide, readOnly]);

  // Handler: Mudar perfil
  const handleProfileChange = useCallback((profile) => {
    if (readOnly) return;
    updateAllocationGuide({
      ...allocationGuide,
      objective: {
        ...objective,
        profile,
      },
    });
  }, [allocationGuide, objective, updateAllocationGuide, readOnly]);

  // Handler: Salvar valor do objetivo (onBlur)
  const handleSaveTarget = useCallback(() => {
    if (readOnly) return;
    const raw = localTargetStr.trim().replace(',', '.');
    const parsed = parseFloat(raw);

    if (!isNaN(parsed) && Number.isFinite(parsed)) {
      const key = currentMode === "targetReturn" ? "targetRealReturn" : "targetVol";
      // Limites: retorno 2-10%, vol 4-20%
      let clamped = parsed;
      if (currentMode === "targetReturn") {
        clamped = Math.max(2.0, Math.min(10.0, parsed));
      } else {
        clamped = Math.max(4.0, Math.min(20.0, parsed));
      }

      updateAllocationGuide({
        ...allocationGuide,
        objective: {
          ...objective,
          [key]: clamped / 100,
        },
      });
      setLocalTargetStr(clamped.toFixed(1).replace('.', ','));
    }
  }, [localTargetStr, currentMode, allocationGuide, objective, updateAllocationGuide, readOnly]);

  // Limites do perfil atual (usado para validação futura)
  const _profileLimits = PROFILE_LIMITS[currentProfile] || PROFILE_LIMITS.moderado;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alerta se recomendação falhou */}
      {recommendationFailed && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-400 mb-1">Não foi possível gerar sugestão</p>
              <p className="text-sm text-text-secondary">
                {recommendationMessage ||
                  "Tente ajustar o objetivo ou o perfil de risco. Se muitos ativos estão classificados como 'Outros', o guia pode não conseguir otimizar."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card Principal */}
      <Card title="Seu objetivo" icon={Target}>
        <div className="space-y-6">
          {/* Seleção: Retorno vs Estabilidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Retorno */}
            <button
              type="button"
              onClick={() => handleModeChange("targetReturn")}
              disabled={readOnly}
              className={`
                p-5 rounded-xl border-2 text-left transition-all
                ${currentMode === "targetReturn"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface-muted hover:border-accent/50"
                }
                ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  ${currentMode === "targetReturn" ? "bg-accent text-white" : "bg-surface-highlight text-text-muted"}
                `}>
                  <TrendingUp size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text-primary mb-1">Quero mais retorno</p>
                  <p className="text-xs text-text-secondary">
                    O guia buscará a alocação de menor risco que atinja seu retorno-alvo.
                  </p>
                </div>
                {currentMode === "targetReturn" && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>

            {/* Card Estabilidade */}
            <button
              type="button"
              onClick={() => handleModeChange("targetRisk")}
              disabled={readOnly}
              className={`
                p-5 rounded-xl border-2 text-left transition-all
                ${currentMode === "targetRisk"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface-muted hover:border-accent/50"
                }
                ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  ${currentMode === "targetRisk" ? "bg-accent text-white" : "bg-surface-highlight text-text-muted"}
                `}>
                  <Shield size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text-primary mb-1">Quero mais estabilidade</p>
                  <p className="text-xs text-text-secondary">
                    O guia buscará a alocação de maior retorno dentro do seu limite de risco.
                  </p>
                </div>
                {currentMode === "targetRisk" && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Input do valor-alvo */}
          <div className="p-4 rounded-xl bg-surface-muted border border-border">
            <label className="text-sm font-medium text-text-secondary block mb-2">
              {currentMode === "targetReturn"
                ? "Retorno real desejado (% a.a.)"
                : "Volatilidade máxima (% a.a.)"
              }
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={localTargetStr}
                onChange={(e) => setLocalTargetStr(e.target.value)}
                onBlur={handleSaveTarget}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                disabled={readOnly}
                className="w-24 px-3 py-2 text-center text-lg font-bold bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
              />
              <span className="text-text-muted">% a.a.</span>
              {currentMode === "targetRisk" && (
                <span
                  className="text-xs text-text-muted cursor-help"
                  title="Quanto sua carteira pode oscilar ao longo do ano (estimativa)."
                >
                  <Info size={14} className="inline" />
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-2">
              {currentMode === "targetReturn"
                ? "Intervalo recomendado: 2% a 10% a.a."
                : "Intervalo recomendado: 4% a 20% a.a."
              }
            </p>
          </div>

          {/* Perfil de risco */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-3">
              Perfil de risco
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(PROFILE_LIMITS).map(([profile, limits]) => (
                <button
                  key={profile}
                  type="button"
                  onClick={() => handleProfileChange(profile)}
                  disabled={readOnly}
                  className={`
                    p-4 rounded-xl border-2 text-center transition-all
                    ${currentProfile === profile
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-muted hover:border-accent/50"
                    }
                    ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <p className="font-semibold text-text-primary capitalize mb-1">
                    {profile === "conservador" ? "🛡️" : profile === "moderado" ? "⚖️" : "🚀"} {profile}
                  </p>
                  <p className="text-xs text-text-muted">
                    até {(limits.maxRV * 100).toFixed(0)}% em RV
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* "Como isso funciona?" (simples = 3 linhas) */}
          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors"
            >
              <Info size={14} />
              <span>Como isso funciona?</span>
              {showHowItWorks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showHowItWorks && (
              <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-text-secondary animate-fade-in">
                {mode === "simple" ? (
                  <p>
                    O guia usa modelos matemáticos (Markowitz simplificado) para sugerir uma alocação
                    que equilibre retorno e risco. Seu perfil define limites de exposição a renda variável.
                  </p>
                ) : (
                  <>
                    <p className="mb-2">
                      <strong>Buscar retorno:</strong> O otimizador encontra a carteira com menor volatilidade
                      que atinge pelo menos o retorno real desejado.
                    </p>
                    <p className="mb-2">
                      <strong>Limitar volatilidade:</strong> O otimizador encontra a carteira com maior retorno
                      que não ultrapasse a volatilidade máxima definida.
                    </p>
                    <p>
                      <strong>Perfil:</strong> Define limites máximos para renda variável e exposição internacional,
                      baseados em práticas de mercado.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
