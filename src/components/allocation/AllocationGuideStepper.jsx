// src/components/allocation/AllocationGuideStepper.jsx
// Stepper visual para o fluxo de 3 etapas do Guia de Alocação
import React from "react";
import { Check, Lock } from "lucide-react";

/**
 * Estados do step:
 * - "completed": Passo completo (check verde)
 * - "active": Passo atual (accent)
 * - "locked": Passo bloqueado (cadeado)
 * - "pending": Passo pendente mas acessível
 */

const STEP_LABELS = [
  "Sua carteira",
  "Seu objetivo",
  "Sugestão",
];

const STEP_SUBTITLES = [
  "ponto de partida",
  "escolha 1",
  "o que fazer agora?",
];

export default function AllocationGuideStepper({
  activeStep = 1,
  step1Complete = false,
  step2Complete = false,
  onStepClick,
  readOnly = false,
}) {
  const getStepState = (stepNum) => {
    if (stepNum === 1) {
      if (step1Complete && activeStep !== 1) return "completed";
      if (activeStep === 1) return "active";
      return "pending";
    }
    if (stepNum === 2) {
      if (!step1Complete) return "locked";
      if (step2Complete && activeStep !== 2) return "completed";
      if (activeStep === 2) return "active";
      return "pending";
    }
    if (stepNum === 3) {
      if (!step1Complete || !step2Complete) return "locked";
      if (activeStep === 3) return "active";
      return "pending";
    }
    return "pending";
  };

  const handleClick = (stepNum) => {
    const state = getStepState(stepNum);
    if (state === "locked") return;
    onStepClick?.(stepNum);
  };

  const getBlockedMessage = (stepNum) => {
    if (stepNum === 2 && !step1Complete) return "Complete o passo 1 para continuar";
    if (stepNum === 3 && !step1Complete) return "Complete o passo 1 para continuar";
    if (stepNum === 3 && !step2Complete) return "Complete o passo 2 para continuar";
    return null;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {[1, 2, 3].map((stepNum) => {
        const state = getStepState(stepNum);
        const isLocked = state === "locked";
        const isActive = state === "active";
        const isCompleted = state === "completed";
        const blockedMsg = getBlockedMessage(stepNum);

        return (
          <React.Fragment key={stepNum}>
            {stepNum > 1 && (
              <div className={`hidden sm:block w-8 h-0.5 ${isLocked ? "bg-border" : "bg-accent/30"}`} />
            )}
            <button
              type="button"
              onClick={() => handleClick(stepNum)}
              disabled={isLocked}
              title={blockedMsg || `Passo ${stepNum}: ${STEP_LABELS[stepNum - 1]}`}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
                ${isActive
                  ? "bg-accent/10 border-accent text-accent"
                  : isCompleted
                    ? "bg-success/10 border-success/30 text-success"
                    : isLocked
                      ? "bg-surface-muted border-border text-text-muted cursor-not-allowed opacity-60"
                      : "bg-surface-muted border-border text-text-secondary hover:border-accent/50 hover:text-accent"
                }
              `}
            >
              {/* Número ou ícone */}
              <span className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${isCompleted
                  ? "bg-success text-white"
                  : isActive
                    ? "bg-accent text-white"
                    : isLocked
                      ? "bg-border text-text-muted"
                      : "bg-surface-highlight text-text-secondary"
                }
              `}>
                {isCompleted ? (
                  <Check size={14} />
                ) : isLocked ? (
                  <Lock size={12} />
                ) : (
                  stepNum
                )}
              </span>

              {/* Label */}
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight">{STEP_LABELS[stepNum - 1]}</p>
                <p className="text-xs opacity-70 leading-tight">({STEP_SUBTITLES[stepNum - 1]})</p>
              </div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
