// src/components/ui/Toast.jsx
import React, { useState, useCallback, createContext, useContext } from "react";
import { Check, X, AlertTriangle, Info } from "lucide-react";

/**
 * Context para gerenciar toasts globalmente
 */
const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback se usado fora do provider
    return {
      showToast: () => console.warn("Toast provider not found"),
      toasts: [],
    };
  }
  return context;
}

/**
 * Provider de Toast - envolve a aplicação
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type = "success", title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random();
    
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);

    // Auto-remove após duração
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Container que renderiza os toasts
 */
function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

/**
 * Item individual de toast
 */
function ToastItem({ type, title, message, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(onRemove, 200);
  };

  const icons = {
    success: <Check size={18} />,
    error: <X size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  };

  const styles = {
    success: {
      bg: "bg-gradient-to-r from-emerald-500/20 to-teal-500/10",
      border: "border-emerald-500/30",
      icon: "bg-emerald-500/20 text-emerald-400",
    },
    error: {
      bg: "bg-gradient-to-r from-red-500/20 to-rose-500/10",
      border: "border-red-500/30",
      icon: "bg-red-500/20 text-red-400",
    },
    warning: {
      bg: "bg-gradient-to-r from-amber-500/20 to-orange-500/10",
      border: "border-amber-500/30",
      icon: "bg-amber-500/20 text-amber-400",
    },
    info: {
      bg: "bg-gradient-to-r from-blue-500/20 to-sky-500/10",
      border: "border-blue-500/30",
      icon: "bg-blue-500/20 text-blue-400",
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      className={`pointer-events-auto min-w-[300px] max-w-md rounded-2xl border ${style.border} ${style.bg} backdrop-blur-xl p-4 shadow-elevated transition-all duration-200 ${
        isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0 animate-slide-in-right"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl ${style.icon} flex-shrink-0`}>
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <div className="text-sm font-bold text-text-primary">{title}</div>
          )}
          {message && (
            <div className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              {message}
            </div>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="p-1.5 rounded-lg hover:bg-surface-highlight text-text-muted hover:text-text-secondary transition flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default ToastProvider;
