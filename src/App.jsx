// src/App.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Wallet,
  Flag,
  Scale,
  Settings,
  Users,
  LogOut,
  GitBranch,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import FinancialEngine from "./engine/FinancialEngine";

// Páginas
import DashboardPage from "./pages/DashboardPage";
import AssetsPage from "./pages/AssetsPage";
import GoalsPage from "./pages/GoalsPage";
import SuccessionPage from "./pages/SuccessionPage";
import SettingsPage from "./pages/SettingsPage";
import ScenariosPage from "./pages/ScenariosPage";

// Auth + Login
import { useAuth } from "./context/AuthContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";

const STORAGE_VIEW = "planner_view_mode_v1";
const STORAGE_AI = "planner_ai_enabled_v1";
const STORAGE_STRESS = "planner_stress_enabled_v1";

// ✅ As chaves de simulação agora serão POR USUÁRIO (user.uid)
const STORAGE_SIMS_BASE = "planner_simulations_v1";
const STORAGE_ACTIVE_SIM_BASE = "planner_active_sim_id_v1";

function keyForUser(baseKey, uid) {
  return uid ? `${baseKey}__${uid}` : `${baseKey}__anon`;
}

function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ✅ Garanta que arrays existam desde o início
const DEFAULT_CLIENT = {
  name: "",
  scenarioName: "Cenário Base",

  state: "SP",
  profile: "Conservador",

  currentAge: "",
  contributionEndAge: "",
  retirementAge: "",
  lifeExpectancy: "",

  inflation: "",
  returnRateConservative: "",
  returnRateModerate: "",
  returnRateBold: "",

  monthlyCostRetirement: "",
  monthlyContribution: "",

  assets: [],
  financialGoals: [],

  contributionRanges: [],
  contributionTimeline: [],
  cashInEvents: [],
};

function ensureClientShape(data) {
  const d = { ...DEFAULT_CLIENT, ...(data || {}) };
  d.assets = Array.isArray(d.assets) ? d.assets : [];
  d.financialGoals = Array.isArray(d.financialGoals) ? d.financialGoals : [];
  d.contributionRanges = Array.isArray(d.contributionRanges) ? d.contributionRanges : [];
  d.contributionTimeline = Array.isArray(d.contributionTimeline) ? d.contributionTimeline : [];
  d.cashInEvents = Array.isArray(d.cashInEvents) ? d.cashInEvents : [];
  return d;
}

function buildBaseSimulation() {
  const baseId = genId();
  return [
    {
      id: baseId,
      name: "Cenário Base",
      data: ensureClientShape({ ...DEFAULT_CLIENT, scenarioName: "Cenário Base" }),
      updatedAt: Date.now(),
    },
  ];
}

function loadSimulations(uid) {
  const simsKey = keyForUser(STORAGE_SIMS_BASE, uid);
  try {
    const raw = localStorage.getItem(simsKey);
    if (!raw) return buildBaseSimulation();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return buildBaseSimulation();
    return parsed.map((s) => ({ ...s, data: ensureClientShape(s.data) }));
  } catch {
    return buildBaseSimulation();
  }
}

function loadActiveSimId(uid) {
  const activeKey = keyForUser(STORAGE_ACTIVE_SIM_BASE, uid);
  return localStorage.getItem(activeKey) || null;
}

function MainSidebar({ activeTab, setActiveTab, logout }) {
  const tabs = [
    { id: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
    { id: "assets", label: "Patrimônio", icon: Wallet },
    { id: "scenarios", label: "Cenários", icon: GitBranch },
    { id: "goals", label: "Metas", icon: Flag },
    { id: "succession", label: "Sucessão", icon: Scale },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];

  return (
    <aside className="w-20 lg:w-64 bg-background-secondary border-r border-border flex flex-col transition-all duration-300 font-sans">
      <div className="h-24 flex items-center justify-center lg:justify-start px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-dark rounded-xl shadow-glow-accent flex items-center justify-center shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0A0C14"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
          </div>
          <span className="hidden lg:block font-display font-bold text-xl text-text-primary tracking-tight">
            Private Wealth
          </span>
        </div>
      </div>

      <nav className="flex-1 py-8 space-y-2 overflow-y-auto no-scrollbar px-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative ${
                active
                  ? "text-accent bg-accent-subtle/50"
                  : "text-text-secondary hover:bg-surface-highlight hover:text-text-primary"
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3/5 w-1 bg-accent rounded-r-full"></div>
              )}
              <Icon
                size={22}
                className={`shrink-0 transition-colors ${
                  active ? "text-accent filter drop-shadow-sm" : "group-hover:text-text-primary"
                }`}
              />
              <span className={`hidden lg:block font-medium text-[15px] ${active ? "font-semibold" : ""}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 mx-2 mb-4">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center lg:justify-start gap-4 px-4 py-3.5 rounded-xl text-text-secondary hover:bg-danger-subtle hover:text-danger transition-all group"
          title="Sair"
        >
          <LogOut size={22} className="shrink-0 group-hover:text-danger transition-colors" />
          <span className="hidden lg:block font-medium text-[15px]">Sair</span>
        </button>
      </div>
    </aside>
  );
}

function SimulationsSidebar({
  simulations,
  activeSimId,
  onSelect,
  onCreate,
  onDelete,
  onSave,
  onRename,
  readOnly,
}) {
  return (
    <div className="w-80 shrink-0 bg-background-secondary/80 border-l border-border backdrop-blur-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-text-primary">Simulações</h3>

        <button
          onClick={onCreate}
          disabled={readOnly}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
            readOnly
              ? "opacity-50 cursor-not-allowed border-border text-text-secondary"
              : "border-border text-text-secondary hover:text-text-primary hover:bg-surface-highlight"
          }`}
          title="Criar nova simulação"
        >
          <Plus size={16} />
          Nova
        </button>
      </div>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto no-scrollbar pr-1">
        {simulations.map((s) => {
          const active = s.id === activeSimId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                active
                  ? "border-accent/40 bg-accent-subtle/20"
                  : "border-border bg-surface/30 hover:bg-surface-highlight"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className={`text-sm font-semibold truncate ${active ? "text-accent" : "text-text-primary"}`}>
                    {s.name || "Sem nome"}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    {s.updatedAt ? `Atualizado: ${new Date(s.updatedAt).toLocaleString()}` : "—"}
                  </div>
                </div>
                {active && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-accent/15 text-accent font-bold">
                    ATIVO
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 pt-5 border-t border-border space-y-3">
        <div>
          <label className="text-xs text-text-secondary font-semibold">Nome do cenário</label>
          <input
            value={simulations.find((s) => s.id === activeSimId)?.name || ""}
            onChange={(e) => onRename(activeSimId, e.target.value)}
            disabled={readOnly}
            className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm bg-surface-muted border-border text-text-primary outline-none focus:ring-1 focus:ring-accent/40 ${
              readOnly ? "opacity-50 cursor-not-allowed" : ""
            }`}
            placeholder="Ex: Cenário Base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSave}
            disabled={readOnly}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border transition-all ${
              readOnly
                ? "opacity-50 cursor-not-allowed border-border text-text-secondary"
                : "border-accent/40 text-accent hover:bg-accent-subtle/20"
            }`}
            title="Salvar alterações no cenário ativo"
          >
            <Save size={16} />
            Salvar
          </button>

          <button
            onClick={onDelete}
            disabled={readOnly || simulations.length <= 1}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border transition-all ${
              readOnly || simulations.length <= 1
                ? "opacity-50 cursor-not-allowed border-border text-text-secondary"
                : "border-danger/40 text-danger hover:bg-danger-subtle/20"
            }`}
            title={simulations.length <= 1 ? "Mantenha pelo menos 1 simulação" : "Excluir simulação ativa"}
          >
            <Trash2 size={16} />
            Excluir
          </button>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Dica: ao editar Patrimônio/Cenários/Metas, use <b>Salvar</b> para fixar no cenário ativo.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, logout } = useAuth();

  const uid = user?.uid || null;

  const simsKey = keyForUser(STORAGE_SIMS_BASE, uid);
  const activeKey = keyForUser(STORAGE_ACTIVE_SIM_BASE, uid);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(STORAGE_VIEW) || "advisor");
  const [aiEnabled, setAiEnabled] = useState(() => (localStorage.getItem(STORAGE_AI) || "true") === "true");
  const [isStressTest, setIsStressTest] = useState(() => (localStorage.getItem(STORAGE_STRESS) || "false") === "true");

  const readOnly = viewMode === "client";

  // ✅ Simulações (inicializa vazio e carrega quando o user existir)
  const [simulations, setSimulations] = useState([]);
  const [activeSimId, setActiveSimId] = useState(null);

  // ✅ Estado REAL do cliente = simulação ativa
  const [clientData, setClientData] = useState(ensureClientShape(DEFAULT_CLIENT));

  // Persist view settings (global mesmo)
  useEffect(() => localStorage.setItem(STORAGE_VIEW, viewMode), [viewMode]);
  useEffect(() => localStorage.setItem(STORAGE_AI, String(aiEnabled)), [aiEnabled]);
  useEffect(() => localStorage.setItem(STORAGE_STRESS, String(isStressTest)), [isStressTest]);

  // ✅ Carrega sims quando o usuário troca (SEPARADO POR UID)
  useEffect(() => {
    if (!uid) return;

    const loadedSims = loadSimulations(uid);
    const storedActive = loadActiveSimId(uid);

    const exists = storedActive && loadedSims.some((s) => s.id === storedActive);
    const nextActiveId = exists ? storedActive : loadedSims[0]?.id;

    setSimulations(loadedSims);
    setActiveSimId(nextActiveId);

    const chosen = loadedSims.find((s) => s.id === nextActiveId) || loadedSims[0];
    setClientData(ensureClientShape(chosen?.data || DEFAULT_CLIENT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // ✅ Persiste sims por usuário
  useEffect(() => {
    if (!uid) return;
    localStorage.setItem(simsKey, JSON.stringify(simulations));
  }, [simulations, simsKey, uid]);

  // ✅ Persiste activeSimId por usuário
  useEffect(() => {
    if (!uid) return;
    if (activeSimId) localStorage.setItem(activeKey, activeSimId);
  }, [activeSimId, activeKey, uid]);

  // Garantir activeSimId válido
  useEffect(() => {
    if (!simulations.length) return;

    const exists = activeSimId && simulations.some((s) => s.id === activeSimId);
    const nextId = exists ? activeSimId : simulations[0].id;

    if (nextId !== activeSimId) setActiveSimId(nextId);

    const sim = simulations.find((s) => s.id === nextId);
    if (sim) setClientData(ensureClientShape(sim.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulations]);

  const activeSimulation = useMemo(
    () => simulations.find((s) => s.id === activeSimId) || simulations[0],
    [simulations, activeSimId]
  );

  // ✅ updateField REAL (imutável) + sincroniza simulação ativa
  const updateField = useCallback(
    (field, value) => {
      setClientData((prev) => {
        const next = ensureClientShape({ ...prev, [field]: value });

        setSimulations((sims) =>
          sims.map((s) => {
            if (s.id !== activeSimId) return s;
            const nextName =
              field === "scenarioName"
                ? String(value || "Cenário")
                : s.name || next.scenarioName || "Cenário";

            return { ...s, name: nextName, data: next, updatedAt: Date.now() };
          })
        );

        return next;
      });
    },
    [activeSimId]
  );

  const analysis = useMemo(() => FinancialEngine.run(clientData, isStressTest), [clientData, isStressTest]);

  const showSidebarSimulations = viewMode === "advisor" && activeTab !== "settings";

  const handleSelectSim = useCallback(
    (id) => {
      const sim = simulations.find((s) => s.id === id);
      if (!sim) return;
      setActiveSimId(id);
      setClientData(ensureClientShape(sim.data));
    },
    [simulations]
  );

  const handleCreateSim = useCallback(() => {
    const id = genId();
    const baseName = `Cenário ${simulations.length + 1}`;
    const clone = ensureClientShape({ ...clientData, scenarioName: baseName });

    const next = { id, name: baseName, data: clone, updatedAt: Date.now() };
    setSimulations((s) => [next, ...s]);
    setActiveSimId(id);
    setClientData(clone);
  }, [clientData, simulations.length]);

  const handleDeleteSim = useCallback(() => {
    if (simulations.length <= 1) return;

    const idx = simulations.findIndex((s) => s.id === activeSimId);
    const nextList = simulations.filter((s) => s.id !== activeSimId);
    const nextActive = nextList[Math.max(0, idx - 1)]?.id || nextList[0]?.id;

    setSimulations(nextList);
    setActiveSimId(nextActive);

    const sim = nextList.find((s) => s.id === nextActive);
    if (sim) setClientData(ensureClientShape(sim.data));
  }, [activeSimId, simulations]);

  const handleSaveSim = useCallback(() => {
    setSimulations((sims) =>
      sims.map((s) => {
        if (s.id !== activeSimId) return s;
        const name = s.name || clientData.scenarioName || "Cenário";
        return { ...s, name, data: ensureClientShape(clientData), updatedAt: Date.now() };
      })
    );
  }, [activeSimId, clientData]);

  const handleRenameSim = useCallback(
    (id, name) => {
      setSimulations((sims) =>
        sims.map((s) =>
          s.id === id ? { ...s, name, updatedAt: Date.now(), data: { ...s.data, scenarioName: name } } : s
        )
      );

      if (id === activeSimId) {
        setClientData((prev) => ensureClientShape({ ...prev, scenarioName: name }));
      }
    },
    [activeSimId]
  );

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-background text-accent font-display text-xl animate-pulse">
        Carregando...
      </div>
    );

  if (!user) return <LoginPage />;

  // Se por algum motivo ainda não carregou sims do usuário, segura 1 frame
  if (!simulations.length) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-accent font-display text-xl animate-pulse">
        Carregando simulações...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-text-primary">
      <MainSidebar activeTab={activeTab} setActiveTab={setActiveTab} logout={logout} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 shrink-0 flex items-center justify-between px-8 lg:px-10 border-b border-border z-20 relative bg-background/80 backdrop-blur-xl transition-all">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight leading-tight">
              {activeTab === "dashboard" && "Visão Executiva"}
              {activeTab === "assets" && "Estrutura Patrimonial"}
              {activeTab === "scenarios" && "Simulação de Cenários"}
              {activeTab === "goals" && "Metas & Objetivos"}
              {activeTab === "succession" && "Planejamento Sucessório"}
              {activeTab === "settings" && "Ajustes & Premissas"}
            </h1>
            <p className="text-sm text-text-secondary mt-1 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent inline-block"></span>
              {clientData?.name || "Cliente"} • {activeSimulation?.name || "Cenário Base"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode(viewMode === "advisor" ? "client" : "advisor")}
              className={`px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-2 ${
                viewMode === "advisor"
                  ? "border-accent text-accent hover:bg-accent-subtle"
                  : "bg-surface border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              <Users size={18} />
              {viewMode === "advisor" ? "Modo Advisor" : "Apresentação"}
            </button>

            <button
              onClick={() => setIsStressTest((s) => !s)}
              disabled={readOnly}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
                isStressTest
                  ? "bg-danger-subtle border-danger text-danger shadow-glow-accent/20"
                  : "border-border text-text-secondary hover:border-danger/50 hover:text-danger hover:bg-danger-subtle/20"
              } ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              title={readOnly ? "Disponível apenas no modo Advisor" : "Ativar Stress Test"}
            >
              <Flag size={18} className={isStressTest ? "fill-current" : ""} />
              {isStressTest ? "Stress Ativo" : "Simular Stress"}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative p-1">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/5 blur-[150px] rounded-full pointer-events-none z-0"></div>

          <main className="relative flex min-h-full z-10">
            <div className={`flex-1 p-8 lg:p-10 transition-all ${showSidebarSimulations ? "pr-0" : ""}`}>
              {activeTab === "dashboard" && (
                <DashboardPage
                  clientData={clientData}
                  analysis={analysis}
                  isStressTest={isStressTest}
                  viewMode={viewMode}
                  aiEnabled={aiEnabled}
                />
              )}

              {activeTab === "assets" && <AssetsPage clientData={clientData} updateField={updateField} readOnly={readOnly} />}

              {activeTab === "scenarios" && <ScenariosPage clientData={clientData} updateField={updateField} readOnly={readOnly} />}

              {activeTab === "goals" && <GoalsPage clientData={clientData} updateField={updateField} readOnly={readOnly} />}

              {activeTab === "succession" && <SuccessionPage clientData={clientData} kpis={analysis?.kpis} />}

              {activeTab === "settings" && (
                <SettingsPage
                  clientData={clientData}
                  handleUpdate={updateField}
                  readOnly={readOnly}
                  aiEnabled={aiEnabled}
                  toggleAi={() => setAiEnabled((v) => !v)}
                />
              )}
            </div>

            {showSidebarSimulations && (
              <SimulationsSidebar
                simulations={simulations}
                activeSimId={activeSimId || activeSimulation?.id}
                onSelect={handleSelectSim}
                onCreate={handleCreateSim}
                onDelete={handleDeleteSim}
                onSave={handleSaveSim}
                onRename={handleRenameSim}
                readOnly={readOnly}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
