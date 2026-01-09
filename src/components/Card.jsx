// src/components/Card.jsx
import React from "react";

export function Card({ title, action, children, className = "" }) {
  return (
    // Aplica a classe base 'private-card' definida no index.css para o efeito de vidro/escuro
    <div className={`private-card p-6 flex flex-col ${className}`}>
      {(title || action) && (
        // Header do card com borda sutil inferior
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          {/* Títulos de card usam a fonte Serif para elegância */}
          {title && <h3 className="font-serif text-xl text-white tracking-wide">{title}</h3>}
          {action && <div className="text-gold-400">{action}</div>}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Export padrão para compatibilidade
export default Card;