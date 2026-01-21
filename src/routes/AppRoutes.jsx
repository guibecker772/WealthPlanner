// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate, useOutletContext } from "react-router-dom";

import AppShell from "../layouts/AppShell.jsx";
import RequireAuth from "./RequireAuth.jsx";
import PublicOnly from "./PublicOnly.jsx";
import HomeRedirect from "./HomeRedirect.jsx";

import LoginPage from "../pages/LoginPage.jsx";

import DashboardPage from "../pages/DashboardPage.jsx";
import AssetsPage from "../pages/AssetsPage.jsx";
import ScenariosPage from "../pages/ScenariosPage.jsx";
import GoalsPage from "../pages/GoalsPage.jsx";
import SuccessionPage from "../pages/SuccessionPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";

import AccountPage from "../pages/AccountPage.jsx";
import SecurityPage from "../pages/SecurityPage.jsx";

/** ✅ Wrappers: pegam o Outlet context do AppShell e repassam como props */
function OverviewRoute() {
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

function AssetsRoute() {
  const ctx = useOutletContext();
  return <AssetsPage clientData={ctx.clientData} updateField={ctx.updateField} readOnly={ctx.readOnly} />;
}

function ScenariosRoute() {
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

function GoalsRoute() {
  const ctx = useOutletContext();
  return <GoalsPage clientData={ctx.clientData} updateField={ctx.updateField} readOnly={ctx.readOnly} />;
}

function SuccessionRoute() {
  const ctx = useOutletContext();
  return <SuccessionPage clientData={ctx.clientData} kpis={ctx.analysis?.kpis} />;
}

function SettingsRoute() {
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

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      {/* públicas */}
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />

      {/* privadas */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="overview" element={<OverviewRoute />} />
          <Route path="assets" element={<AssetsRoute />} />
          <Route path="scenarios" element={<ScenariosRoute />} />
          <Route path="goals" element={<GoalsRoute />} />
          <Route path="succession" element={<SuccessionRoute />} />
          <Route path="settings" element={<SettingsRoute />} />

          {/* novas rotas */}
          <Route path="account" element={<AccountPage />} />
          <Route path="security" element={<SecurityPage />} />

          <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
        </Route>
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
