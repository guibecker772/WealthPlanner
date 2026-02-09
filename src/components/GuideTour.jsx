import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Check, AlertCircle, Info } from "lucide-react";

// Retry: ~2s total (16 tentativas × 120ms)
const MAX_RETRIES = 16;
const RETRY_DELAY = 120;

/**
 * Componente de Tour Guiado.
 * Navega entre rotas e destaca elementos com data-guide="...".
 * 
 * Props:
 * - open: boolean - controla visibilidade
 * - steps: array de { route, guideKey, title, text }
 * - onClose: () => void
 * - readOnly: boolean - modo cliente/readOnly (fallback em etapas de edição)
 */
export default function GuideTour({ open, steps, onClose, readOnly = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetEl, setTargetEl] = useState(null);
  const [targetRect, setTargetRect] = useState(null);
  const [notice, setNotice] = useState("");
  const [stepFailed, setStepFailed] = useState(false);   // fallback: alvo não encontrado
  const [isNavigating, setIsNavigating] = useState(false);
  
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);

  const currentStep = steps[currentIndex] || null;
  const isLastStep = currentIndex === steps.length - 1;
  const isFirstStep = currentIndex === 0;

  // Etapas de edição que não devem ser guiadas em modo readOnly
  const EDIT_GUIDE_KEYS = ["add-asset", "add-previdencia", "add-goal", "contribution"];

  // Limpar ao fechar
  useEffect(() => {
    if (!open) {
      setCurrentIndex(0);
      setTargetEl(null);
      setTargetRect(null);
      setNotice("");
      setStepFailed(false);
      setIsNavigating(false);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    }
  }, [open]);

  // Buscar elemento alvo com retry (~2s total)
  const findTarget = useCallback(() => {
    if (!currentStep) return;

    // Em readOnly, etapas de edição mostram fallback direto
    if (readOnly && EDIT_GUIDE_KEYS.includes(currentStep.guideKey)) {
      setTargetEl(null);
      setTargetRect(null);
      setStepFailed(true);
      setNotice("Indisponível neste modo (somente Advisor).");
      setIsNavigating(false);
      retryCountRef.current = 0;
      return;
    }
    
    const el = document.querySelector(`[data-guide="${currentStep.guideKey}"]`);
    
    if (el) {
      setTargetEl(el);
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setNotice("");
      setStepFailed(false);
      setIsNavigating(false);
      retryCountRef.current = 0;
    } else {
      retryCountRef.current++;
      if (retryCountRef.current < MAX_RETRIES) {
        retryTimeoutRef.current = setTimeout(findTarget, RETRY_DELAY);
      } else {
        // Não encontrou após ~2s — NÃO pular: mostrar fallback
        setTargetEl(null);
        setTargetRect(null);
        setStepFailed(true);
        setNotice("Esta etapa não está disponível neste momento.");
        setIsNavigating(false);
        retryCountRef.current = 0;
      }
    }
  }, [currentStep, readOnly]);

  // Navegar para rota e buscar elemento
  useEffect(() => {
    if (!open || !currentStep) return;
    
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    // Se já estamos na rota correta, buscar direto
    if (location.pathname === currentStep.route) {
      setIsNavigating(false);
      findTarget();
    } else {
      // Navegar primeiro
      setIsNavigating(true);
      setTargetEl(null);
      setTargetRect(null);
      navigate(currentStep.route);
    }
  }, [open, currentIndex, currentStep?.route, currentStep?.guideKey]);

  // Após navegação, buscar elemento
  useEffect(() => {
    if (!open || !currentStep) return;
    if (location.pathname === currentStep.route && isNavigating) {
      // Esperar um pouco para a página renderizar
      const timeout = setTimeout(() => {
        findTarget();
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [location.pathname, open, currentStep, isNavigating, findTarget]);

  // Atualizar rect no resize/scroll
  useEffect(() => {
    if (!targetEl) return;
    
    const updateRect = () => {
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);
    };
    
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [targetEl]);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Handlers de navegação
  const handleNext = useCallback(() => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [isLastStep, onClose]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentIndex((i) => i - 1);
    }
  }, [isFirstStep]);

  // Bloquear cliques fora do elemento alvo
  const handleOverlayClick = useCallback((e) => {
    // Se clicou no overlay (não no elemento destacado), não fazer nada
    // O overlay já tem pointer-events: auto, então cliques são capturados
    e.stopPropagation();
  }, []);

  if (!open) return null;

  // Calcular posição do tooltip
  const tooltipStyle = targetRect ? {
    position: "fixed",
    top: targetRect.bottom + 12,
    left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 320)),
    maxWidth: "300px",
    zIndex: 10002,
  } : {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: "300px",
    zIndex: 10002,
  };

  // Se tooltip sairia da tela por baixo, mostrar em cima
  if (targetRect && targetRect.bottom + 200 > window.innerHeight) {
    tooltipStyle.top = targetRect.top - 12;
    tooltipStyle.transform = "translateY(-100%)";
  }

  return (
    <div
      className="fixed inset-0 z-[10000]"
      role="dialog"
      aria-modal="true"
      aria-label="Guia do app"
    >
      {/* Overlay semi-transparente */}
      <div 
        className="absolute inset-0 bg-black/60"
        onClick={handleOverlayClick}
      />
      
      {/* Highlight do elemento alvo */}
      {targetRect && (
        <div
          className="absolute border-2 border-accent rounded-lg shadow-[0_0_0_4px_rgba(255,215,0,0.3)] pointer-events-none"
          style={{
            position: "fixed",
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            zIndex: 10001,
          }}
        />
      )}

      {/* Área clicável sobre o elemento alvo (permite interação) */}
      {targetRect && (
        <div
          className="absolute"
          style={{
            position: "fixed",
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            zIndex: 10001,
            // Não bloquear cliques aqui - deixar passar para o elemento real
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip com conteúdo do step */}
      <div 
        className="bg-background-secondary border border-border rounded-2xl shadow-2xl p-5"
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-text-secondary font-medium">
            Passo {currentIndex + 1} de {steps.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
            aria-label="Fechar tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <h3 className="text-base font-semibold text-text-primary mb-2">
          {currentStep?.title || "Carregando..."}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {currentStep?.text || ""}
        </p>

        {/* Fallback: etapa não disponível — NÃO pula, mostra mensagem + Continuar */}
        {stepFailed && notice && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mb-3">
            <Info size={14} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{notice}</span>
              <button
                type="button"
                onClick={handleNext}
                className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold transition-all text-xs"
              >
                Continuar <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Aviso não-bloqueante (navegando, etc) */}
        {!stepFailed && notice && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mb-3">
            <AlertCircle size={14} />
            {notice}
          </div>
        )}

        {/* Navegando... */}
        {isNavigating && (
          <div className="text-xs text-text-secondary mb-3 animate-pulse">
            Navegando...
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstStep}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isFirstStep
                ? "opacity-50 cursor-not-allowed text-text-secondary"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-highlight"
            }`}
          >
            <ChevronLeft size={16} />
            Voltar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
            >
              Sair
            </button>
            {!stepFailed && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-accent text-background text-sm font-bold hover:bg-accent/90 transition-all"
              >
                {isLastStep ? (
                  <>
                    Concluir
                    <Check size={16} />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
