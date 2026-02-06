import { useEffect, useCallback } from "react";
import { X, Rocket, ArrowRight } from "lucide-react";

/**
 * Modal de onboarding para primeiro acesso.
 * Exibido uma única vez por uid ao entrar em rotas /dashboard/*.
 * 
 * Props:
 * - open: boolean - controla visibilidade
 * - onClose: () => void - fecha e marca done (ESC, backdrop, Pular)
 * - onStart: () => void - "Começar agora" - marca done e navega
 */
export default function OnboardingModal({ open, onClose, onStart }) {
  // Fechar com ESC
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Opcional: bloquear scroll do body
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background-secondary border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header com ícone */}
        <div className="relative p-8 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent-dark rounded-2xl shadow-glow-accent flex items-center justify-center shrink-0">
              <Rocket size={28} className="text-background" />
            </div>
            <h2
              id="onboarding-title"
              className="text-2xl font-display font-bold text-text-primary"
            >
              Bem-vindo! 🎉
            </h2>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-8 pb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Vamos montar seu plano em 3 passos
          </h3>

          <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">1</span>
              <span>Preencha os <strong className="text-text-primary">dados do cliente</strong> (nome, idades, custos mensais)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">2</span>
              <span>Adicione o <strong className="text-text-primary">patrimônio</strong> (carteiras, imóveis, previdência)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">3</span>
              <span>Defina <strong className="text-text-primary">metas</strong> (opcional) e veja o diagnóstico no Dashboard</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-text-secondary">
            Depois é só exportar o relatório em PDF para seu cliente!
          </p>
        </div>

        {/* Footer com botões */}
        <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onStart}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-background font-bold text-sm shadow-lg shadow-accent/30 hover:shadow-accent/50 hover:scale-[1.02] transition-all"
            autoFocus
          >
            Começar agora
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-6 py-4 rounded-xl border border-border text-text-secondary font-semibold text-sm hover:bg-surface-highlight hover:text-text-primary transition-all"
          >
            Pular
          </button>
        </div>
      </div>
    </div>
  );
}
