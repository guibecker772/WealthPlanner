import React from 'react';

export default function CopilotModule({ title, description, children }) {
  return (
    <div
      className="copilot-module"
      style={{
        backgroundColor: '#e8f0fe',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px',
      }}
    >
      {title && <h3 style={{ marginBottom: '10px' }}>{title}</h3>}
      {description && <p style={{ marginBottom: '15px' }}>{description}</p>}
      {children}
    </div>
  );
}
