import { useEffect, useState, useRef } from "react";
import { HelpCircle, X } from "lucide-react";

/**
 * Callout/popover sutil que aponta para o botão Guia (?).
 * Aparece 1x por uid apenas em /dashboard/overview com pendências.
 * 
 * Props:
 * - open: boolean
 * - anchorRef: RefObject<HTMLButtonElement> - referência ao botão ?
 * - onClose: () => void - fecha e marca como visto
 * - onStartTour: () => void - clica no ?, marca como visto e inicia tour
 */
export default function GuideHint({ open, anchorRef, onClose, onStartTour }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const hintRef = useRef(null);

  // Calcular posição baseada no anchorRef
  useEffect(() => {
    if (!open || !anchorRef?.current) return;

    const updatePosition = () => {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const hintWidth = 260;
      
      // Posicionar abaixo e à esquerda do botão
      setPosition({
        top: anchorRect.bottom + 12,
        left: Math.max(16, anchorRect.left + anchorRect.width / 2 - hintWidth / 2),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open, anchorRef]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (hintRef.current && !hintRef.current.contains(e.target)) {
        onClose();
      }
    };

    // Delay para evitar fechar imediatamente
    const timeout = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={hintRef}
      className="fixed z-[9999] animate-in fade-in slide-in-from-top-2 duration-300"
      style={{
        top: position.top,
        left: position.left,
        maxWidth: "260px",
      }}
    >
      {/* Setinha apontando para cima */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-accent/20"
      />

      {/* Conteúdo */}
      <div className="bg-background-secondary border border-accent/30 rounded-xl p-4 shadow-lg shadow-accent/10">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent shrink-0">
            <HelpCircle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary font-medium mb-2">
              Precisa de ajuda?
            </p>
            <p className="text-xs text-text-secondary leading-relaxed mb-3">
              Use o <b>Guia</b> para conhecer as principais funcionalidades do app.
            </p>
            <button
              type="button"
              onClick={onStartTour}
              className="text-xs font-bold text-accent hover:text-accent/80 transition-colors"
            >
              Iniciar tour →
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all shrink-0"
            aria-label="Fechar dica"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
