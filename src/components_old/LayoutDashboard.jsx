import React from 'react';

export default function LayoutDashboard({ children }) {
  return (
    <div className="layout-dashboard" style={{ padding: '20px', backgroundColor: '#f0f2f5' }}>
      <aside style={{ width: '250px', float: 'left', backgroundColor: '#fff', padding: '20px', boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>
        <h3>Menu</h3>
        <ul>
          <li>Dashboard</li>
          <li>Carteira</li>
          <li>Relatórios</li>
          <li>Configurações</li>
        </ul>
      </aside>
      <main style={{ marginLeft: '270px', padding: '20px' }}>
        {children}
      </main>
    </div>
  );
}
