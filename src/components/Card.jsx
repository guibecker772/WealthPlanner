// src/components/Card.jsx
import React from "react";

export function Card({ title, action, children, className = "" }) {
  return (
    <div className={`bg-surface-2 rounded-2xl border border-border shadow-soft p-6 flex flex-col ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-divider">
          {title && <h3 className="font-serif text-xl text-text tracking-wide">{title}</h3>}
          {action && <div className="text-accent">{action}</div>}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Export padrão para compatibilidade
export default Card;