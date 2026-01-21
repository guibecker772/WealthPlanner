// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AppShell from "../layouts/AppShell.jsx";
import RequireAuth from "./RequireAuth.jsx";
import PublicOnly from "./PublicOnly.jsx";

import LoginPage from "../pages/LoginPage.jsx";

// Suas páginas (agora usadas dentro do /dashboard via Outlet)
import DashboardPage from "../pages/DashboardPage.jsx";
import AssetsPage from "../pages/AssetsPage.jsx";
import ScenariosPage from "../pages/ScenariosPage.jsx";
import GoalsPage from "../pages/GoalsPage.jsx";
import SuccessionPage from "../pages/SuccessionPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";

// Opcional: 404 simples (redireciona pro fluxo correto)
function NotFoundRedirect() {
  return <Navigate to="/" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* ✅ Raiz: decide automaticamente */}
      <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />
      {/* OBS: se estiver deslogado, RequireAuth redireciona pra /login */}

      {/* ✅ Pública: Login (mas se já logado, vai pro dashboard) */}
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />

      {/* ✅ Privadas: tudo que começa com /dashboard */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        {/* default dentro de /dashboard */}
        <Route index element={<Navigate to="overview" replace />} />

        {/* rotas das abas */}
        <Route path="overview" element={<DashboardPageRoute />} />
        <Route path="assets" element={<AssetsPageRoute />} />
        <Route path="scenarios" element={<ScenariosPageRoute />} />
        <Route path="goals" element={<GoalsPageRoute />} />
        <Route path="succession" element={<SuccessionPageRoute />} />
        <Route path="settings" element={<SettingsPageRoute />} />
      </Route>

      {/* ✅ fallback */}
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}

/**
 * Wrappers para manter compatível com suas páginas atuais:
 * Elas vão puxar dados do AppShell via useOutletContext().
 */
import { useOutletContext } from "react-router-dom";

function DashboardPageRoute() {
  const ctx = useOutletContext();
  return (
    <DashboardPage
      clientData={ctx.clientData}
      analysis={ctx.analysis}
      isStressTest={ctx.isStressTest}
      viewMode={ctx.viewMode}
      aiEnabled={ctx.aiEnabled}
      scenarioId={ctx.scenarioId}
      trackingByScenario={ctx.trackingByScenario}
      setTrackingByScenario={ctx.setTrackingByScenario}
    />
  );
}

function AssetsPageRoute() {
  const ctx = useOutletContext();
  return <AssetsPage clientData={ctx.clientData} updateField={ctx.updateField} readOnly={ctx.readOnly} />;
}

function ScenariosPageRoute() {
  const ctx = useOutletContext();
  return (
    <ScenariosPage
      clientData={ctx.clientData}
      updateField={ctx.updateField}
      readOnly={ctx.readOnly}
      scenarioId={ctx.scenarioId}
      trackingByScenario={ctx.trackingByScenario}
      setTrackingByScenario={ctx.setTrackingByScenario}
    />
  );
}

function GoalsPageRoute() {
  const ctx = useOutletContext();
  return <GoalsPage clientData={ctx.clientData} updateField={ctx.updateField} readOnly={ctx.readOnly} />;
}

function SuccessionPageRoute() {
  const ctx = useOutletContext();
  return <SuccessionPage clientData={ctx.clientData} kpis={ctx.analysis?.kpis} />;
}

function SettingsPageRoute() {
  const ctx = useOutletContext();
  return (
    <SettingsPage
      clientData={ctx.clientData}
      kpis={ctx.analysis?.kpis}
      handleUpdate={ctx.updateField}
      readOnly={ctx.readOnly}
      aiEnabled={ctx.aiEnabled}
      toggleAi={() => ctx.setAiEnabled((v) => !v)}
    />
  );
}
