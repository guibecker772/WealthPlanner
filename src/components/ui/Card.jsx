// src/components/ui/Card.jsx
import React from 'react';

const Card = ({ children, className = '', glass = false, elevated = false, title, action }) => {
  const baseClasses = "rounded-2xl border transition-all duration-200 overflow-hidden";
  
  const styleClasses = glass
    ? "bg-surface/60 backdrop-blur-xl border-white/10 shadow-glass"
    : `bg-surface border-border ${elevated ? 'shadow-elevated' : 'shadow-soft'}`;

  return (
    <div className={`${baseClasses} ${styleClasses} ${className}`}>
      {(title || action) && (
        <div className="px-6 py-5 flex items-center justify-between border-b border-border/50">
          {title && <h3 className="text-lg font-display font-semibold text-text-primary tracking-tight">{title}</h3>}
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