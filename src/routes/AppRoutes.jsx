// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

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
// Usando a nova versao step-by-step do Guia de Alocacao
import AllocationGuidePage from "../pages/AllocationGuidePageV2.jsx";

import AccountPage from "../pages/AccountPage.jsx";
import SecurityPage from "../pages/SecurityPage.jsx";
import PrivateWealthLinkPage from "../pages/integrations/PrivateWealthLinkPage.jsx";
import PrivateWealthOpenPage from "../pages/integrations/PrivateWealthOpenPage.jsx";
import PrivateWealthExportPage from "../pages/integrations/PrivateWealthExportPage.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      {/* publicas */}
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
        <Route path="/integrations/link" element={<PrivateWealthLinkPage />} />
        <Route path="/integrations/open" element={<PrivateWealthOpenPage />} />
        <Route path="/integrations/export" element={<PrivateWealthExportPage />} />

        <Route path="/dashboard" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="overview" element={<DashboardPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="scenarios" element={<ScenariosPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="succession" element={<SuccessionPage />} />
          <Route path="allocation" element={<AllocationGuidePage />} />
          <Route path="settings" element={<SettingsPage />} />

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
