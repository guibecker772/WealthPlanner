// src/components/ui/Card.jsx
import React from 'react';

/**
 * Card - Componente de superfície premium
 * 
 * Variants:
 * - default: bg-surface-2 com borda sutil
 * - glass: backdrop-blur para overlays
 * - elevated: sombra mais pronunciada
 */
const Card = ({ 
  children, 
  className = '', 
  glass = false, 
  elevated = false, 
  interactive = false,
  title, 
  action 
}) => {
  const baseClasses = "rounded-2xl border transition-all duration-200 overflow-hidden";
  
  // Estilos baseados em tokens
  const styleClasses = glass
    ? "bg-surface-2/60 backdrop-blur-xl border-border-highlight shadow-soft"
    : `bg-surface-2 border-border ${elevated ? 'shadow-elevated' : 'shadow-soft'}`;

  // Interativo (hover)
  const interactiveClasses = interactive
    ? "hover:bg-surface-3 hover:border-border-highlight hover:shadow-soft-2 cursor-pointer"
    : "";

  return (
    <div className={`${baseClasses} ${styleClasses} ${interactiveClasses} ${className}`}>
      {(title || action) && (
        <div className="px-6 py-5 flex items-center justify-between border-b border-divider">
          {title && (
            <h3 className="text-lg font-display font-semibold text-text tracking-tight">
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;