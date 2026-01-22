// src/layouts/AppShell.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  Flag,
  Scale,
  Users,
  LogOut,
  GitBranch,
  Plus,
  Save,
  Trash2,
  UserCircle2,
  ChevronDown,
  Settings as SettingsIcon,
  Shield,
} from "lucide-react";

import FinancialEngine from "../engine/FinancialEngine";
import { useAuth } from "../auth/AuthContext.jsx";
import deepEqual from "../utils/deepEqual";
import { db } from "../services/firebase";
import {
  listSimulations,
  saveSimulation,
  deleteSimulation,
  upsertSimulationsBatch,
} from "../services/simulationsRepo";

const STORAGE_VIEW = "planner_view_mode_v1";
const STORAGE_AI = "planner_ai_enabled_v1";
const STORAGE_STRESS = "planner_stress_enabled_v1";

const STORAGE_SIMS_BASE = "planner_simulations_v1";
const STORAGE_ACTIVE_SIM_BASE = "planner_active_sim_id_v1";
const STORAGE_MIGRATION_FLAG_BASE = "planner_simulations_firestore_migrated_v1";

// B1
const STORAGE_TRACKING_BASE = "planner_tracking_by_scenario_v1";

function keyForUser(baseKey, uid) {
  return uid ? `${baseKey}__${uid}` : `${baseKey}__anon`;
}

function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const DEFAULT_CLIENT = {
  name: "",
  scenarioName: "Cenário Base",

  state: "SP",
  profile: "Conservador",

  currentAge: "",
  birthMonth: 1,
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
  
  // ✅ FX: Câmbio do cenário (USD/EUR para BRL)
  fx: {
    USD_BRL: 5.0,
    EUR_BRL: 5.5,
  },
  
  // ✅ PGBL: Configuração da simulação de eficiência fiscal
  pgblConfig: {
    profession: "",
    monthlyIncome: 25000,
    annualIncome: 300000,
    annualContribution: 36000,
    marginalRate: 0.275,
    isCompleteDeclaration: true,
    contributesToINSS: true,
    reinvestTaxSavings: true,
    annualReturnRate: 0.08,
    adminFeeRate: 0.01,
  },
  
  // ✅ Previdência na sucessão
  previdenciaSuccession: {
    excludeFromInventory: true,
    applyITCMD: false,
  },
};

function ensureClientShape(data) {
  const d = { ...DEFAULT_CLIENT, ...(data || {}) };

  d.assets = Array.isArray(d.assets) ? d.assets : [];
  d.financialGoals = Array.isArray(d.financialGoals) ? d.financialGoals : [];
  d.contributionRanges = Array.isArray(d.contributionRanges) ? d.contributionRanges : [];
  d.contributionTimeline = Array.isArray(d.contributionTimeline) ? d.contributionTimeline : [];
  d.cashInEvents = Array.isArray(d.cashInEvents) ? d.cashInEvents : [];

  const bm = Number(d.birthMonth);
  d.birthMonth = Number.isFinite(bm) && bm >= 1 && bm <= 12 ? bm : 1;

  // ✅ FX: garantir defaults seguros
  d.fx = {
    USD_BRL: Number.isFinite(Number(d.fx?.USD_BRL)) && Number(d.fx?.USD_BRL) > 0 ? Number(d.fx.USD_BRL) : 5.0,
    EUR_BRL: Number.isFinite(Number(d.fx?.EUR_BRL)) && Number(d.fx?.EUR_BRL) > 0 ? Number(d.fx.EUR_BRL) : 5.5,
  };
  
  // ✅ PGBL Config: mesclar com defaults
  d.pgblConfig = {
    ...DEFAULT_CLIENT.pgblConfig,
    ...(d.pgblConfig || {}),
  };
  
  // ✅ Previdência Sucessão: mesclar com defaults
  d.previdenciaSuccession = {
    ...DEFAULT_CLIENT.previdenciaSuccession,
    ...(d.previdenciaSuccession || {}),
  };
  
  // ✅ Normalizar ativos de previdência (compatibilidade retroativa)
  d.assets = d.assets.map(asset => {
    if (asset.type === "previdencia" && !asset.previdencia) {
      return {
        ...asset,
        previdencia: {
          planType: "VGBL",
          taxRegime: "regressivo",
          provider: "",
          adminFee: null,
          notes: "",
          beneficiaries: [],
        },
      };
    }
    return asset;
  });

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
      localOnly: true,
    },
  ];
}

function loadLocalSimulationsForMigration(uid) {
  const simsKey = keyForUser(STORAGE_SIMS_BASE, uid);
  try {
    const raw = localStorage.getItem(simsKey) || localStorage.getItem(STORAGE_SIMS_BASE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.map((s, idx) => {
      const safe = s && typeof s === "object" ? s : {};
      const name = typeof safe.name === "string" && safe.name.trim() ? safe.name : `Cenário ${idx + 1}`;
      const id = safe.id || genId();
      const updatedAt = Number.isFinite(Number(safe.updatedAt)) ? Number(safe.updatedAt) : Date.now();
      const rawData = safe.data && typeof safe.data === "object" ? safe.data : {};
      const data = ensureClientShape({ ...rawData, scenarioName: rawData.scenarioName ?? name });
      return { id, name, data, updatedAt };
    });
  } catch {
    return [];
  }
}

function loadActiveSimId(uid) {
  const activeKey = keyForUser(STORAGE_ACTIVE_SIM_BASE, uid);
  return localStorage.getItem(activeKey) || null;
}

function loadTrackingByScenario(uid) {
  const key = keyForUser(STORAGE_TRACKING_BASE, uid);
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      handler?.();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler]);
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useClickOutside(menuRef, () => setOpen(false));

  const displayName =
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    "Usuário";

  const email = user?.email || "";

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const initials = useMemo(() => {
    const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [displayName]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-surface/30 hover:bg-surface-highlight transition-all"
        title="Conta"
      >
        <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent font-black grid place-items-center">
          {initials}
        </div>

        <div className="hidden md:block text-left">
          <div className="text-sm font-semibold text-text-primary leading-tight">
            {displayName}
          </div>
          <div className="text-xs text-text-secondary leading-tight">
            {email}
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[280px] rounded-2xl border border-border bg-background-secondary/95 backdrop-blur-xl shadow-xl overflow-hidden z-50">
          <div className="p-4 border-b border-border">
            <div className="text-sm font-bold text-text-primary">{displayName}</div>
            <div className="text-xs text-text-secondary mt-0.5">{email}</div>
          </div>

          <div className="p-2">
            <button
              onClick={() => go("/dashboard/account")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
            >
              <SettingsIcon size={16} />
              Minha Conta
            </button>

            <button
              onClick={() => go("/dashboard/security")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
            >
              <Shield size={16} />
              Segurança
            </button>

            <div className="my-2 border-t border-border" />

            <button
              onClick={() => {
                setOpen(false);
                onLogout?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-danger-subtle/20 transition-all"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MainSidebar({ viewMode, logout }) {
  const tabs = [
    { to: "/dashboard/overview", label: "Visão Geral", icon: LayoutDashboard },
    { to: "/dashboard/assets", label: "Patrimônio", icon: Wallet },
    { to: "/dashboard/scenarios", label: "Cenários", icon: GitBranch },
    { to: "/dashboard/goals", label: "Metas", icon: Flag },
    { to: "/dashboard/succession", label: "Sucessão", icon: Scale },
    { to: "/dashboard/settings", label: "Dados do Cliente", icon: UserCircle2 },
  ];

  return (
    <aside className="w-20 lg:w-64 bg-background-secondary border-r border-border flex flex-col transition-all duration-300 font-sans">
      <div className="h-24 flex items-center justify-center lg:justify-start px-4 lg:px-6">
        <Link to="/dashboard/overview" className="flex items-center gap-3">
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
        </Link>
      </div>

      <nav className="flex-1 py-8 space-y-2 overflow-y-auto no-scrollbar px-3">
        {tabs.map((t) => {
          const Icon = t.icon;

          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative ${
                  isActive
                    ? "text-accent bg-accent-subtle/50"
                    : "text-text-secondary hover:bg-surface-highlight hover:text-text-primary"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3/5 w-1 bg-accent rounded-r-full"></div>
                  )}
                  <Icon
                    size={22}
                    className={`shrink-0 transition-colors ${
                      isActive ? "text-accent filter drop-shadow-sm" : "group-hover:text-text-primary"
                    }`}
                  />
                  <span className={`hidden lg:block font-medium text-[15px] ${isActive ? "font-semibold" : ""}`}>
                    {t.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mx-2 mb-4 space-y-2">
        <div className="hidden lg:block text-xs text-text-muted px-2">
          Modo: <b className="text-text-secondary">{viewMode === "advisor" ? "Advisor" : "Apresentação"}</b>
        </div>

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

function SimulationsSidebar({ simulations, activeSimId, onSelect, onCreate, onDelete, onSave, onRename, readOnly }) {
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
                active ? "border-accent/40 bg-accent-subtle/20" : "border-border bg-surface/30 hover:bg-surface-highlight"
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
                  <span className="text-[11px] px-2 py-1 rounded-full bg-accent/15 text-accent font-bold">ATIVO</span>
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

function Header({
  title,
  clientName,
  activeScenarioName,
  hasUnsavedChanges,
  viewMode,
  setViewMode,
  readOnly,
  isStressTest,
  setIsStressTest,
  user,
  logout,
}) {
  return (
    <header className="h-24 shrink-0 flex items-center justify-between px-8 lg:px-10 border-b border-border z-20 relative bg-background/80 backdrop-blur-xl transition-all">
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight leading-tight">{title}</h1>
        <p className="text-sm text-text-secondary mt-1 font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block"></span>
          {clientName || "Cliente"} • {activeScenarioName || "Cenário Base"}
          {hasUnsavedChanges && (
            <span className="ml-2 text-[11px] px-2 py-1 rounded-full bg-accent/15 text-accent font-bold">
              Não salvo
            </span>
          )}
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

        {/* ✅ Menu do usuário (nome clicável) */}
        <UserMenu user={user} onLogout={logout} />
      </div>
    </header>
  );
}

export default function AppShell() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  const uid = user?.uid || null;

  const activeKey = keyForUser(STORAGE_ACTIVE_SIM_BASE, uid);
  const trackingKey = keyForUser(STORAGE_TRACKING_BASE, uid);
  const migrationKey = keyForUser(STORAGE_MIGRATION_FLAG_BASE, uid);

  const [viewMode, setViewMode] = useState(() => localStorage.getItem(STORAGE_VIEW) || "advisor");
  const [aiEnabled, setAiEnabled] = useState(() => (localStorage.getItem(STORAGE_AI) || "true") === "true");
  const [isStressTest, setIsStressTest] = useState(() => (localStorage.getItem(STORAGE_STRESS) || "false") === "true");
  const readOnly = viewMode === "client";

  const [simulations, setSimulations] = useState([]);
  const [activeSimId, setActiveSimId] = useState(null);
  const [officialClientData, setOfficialClientData] = useState(ensureClientShape(DEFAULT_CLIENT));
  const [draftClientData, setDraftClientData] = useState(ensureClientShape(DEFAULT_CLIENT));
  const [simsLoading, setSimsLoading] = useState(true);
  const [simsError, setSimsError] = useState(null);

  const [trackingByScenario, setTrackingByScenario] = useState({});

  useEffect(() => localStorage.setItem(STORAGE_VIEW, viewMode), [viewMode]);
  useEffect(() => localStorage.setItem(STORAGE_AI, String(aiEnabled)), [aiEnabled]);
  useEffect(() => localStorage.setItem(STORAGE_STRESS, String(isStressTest)), [isStressTest]);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    const init = async () => {
      setSimsLoading(true);
      setSimsError(null);

      try {
        // migração 1x do localStorage -> Firestore
        if (!localStorage.getItem(migrationKey)) {
          const localSims = loadLocalSimulationsForMigration(uid);
          const remoteSims = await listSimulations(db, uid);

          if (localSims.length > 0 && remoteSims.length === 0) {
            await upsertSimulationsBatch(db, uid, localSims);
          }

          localStorage.setItem(migrationKey, "true");
        }

        const loadedSims = await listSimulations(db, uid);
        if (cancelled) return;

        const normalized = loadedSims.length
          ? loadedSims.map((s, idx) => {
              const name = s.name || `Cenário ${idx + 1}`;
              const data = ensureClientShape({ ...(s.data || {}), scenarioName: s.data?.scenarioName ?? name });
              return { ...s, name, data };
            })
          : buildBaseSimulation();

        const storedActive = loadActiveSimId(uid);
        const exists = storedActive && normalized.some((s) => s.id === storedActive);
        const nextActiveId = exists ? storedActive : normalized[0]?.id;

        setSimulations(normalized);
        setActiveSimId(nextActiveId);

        const chosen = normalized.find((s) => s.id === nextActiveId) || normalized[0];
        const nextData = ensureClientShape(chosen?.data || DEFAULT_CLIENT);
        setOfficialClientData(nextData);
        setDraftClientData(nextData);

        const loadedTracking = loadTrackingByScenario(uid);
        setTrackingByScenario(loadedTracking);
      } catch {
        if (!cancelled) {
          setSimsError("Falha ao carregar simulações. Tente novamente.");
        }
      } finally {
        if (!cancelled) setSimsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [uid, migrationKey]);

  useEffect(() => {
    if (activeSimId) localStorage.setItem(activeKey, activeSimId);
  }, [activeSimId, activeKey]);

  useEffect(() => {
    localStorage.setItem(trackingKey, JSON.stringify(trackingByScenario || {}));
  }, [trackingByScenario, trackingKey]);

  const hasUnsavedChanges = useMemo(
    () => !deepEqual(draftClientData, officialClientData),
    [draftClientData, officialClientData]
  );

  useEffect(() => {
    if (!simulations.length) return;

    const exists = activeSimId && simulations.some((s) => s.id === activeSimId);
    const nextId = exists ? activeSimId : simulations[0].id;

    if (nextId !== activeSimId) {
      setActiveSimId(nextId);
    }

    const sim = simulations.find((s) => s.id === nextId);
    if (sim && !hasUnsavedChanges) {
      const nextData = ensureClientShape(sim.data);
      setOfficialClientData(nextData);
      setDraftClientData(nextData);
    }
  }, [simulations, activeSimId, hasUnsavedChanges]);

  const activeSimulation = useMemo(
    () => simulations.find((s) => s.id === activeSimId) || simulations[0],
    [simulations, activeSimId]
  );

  const resolvedScenarioId = activeSimId || activeSimulation?.id || null;

  const updateField = useCallback((field, value) => {
    setDraftClientData((prev) => ensureClientShape({ ...prev, [field]: value }));
  }, []);

  const analysis = useMemo(
    () => FinancialEngine.run(draftClientData, isStressTest),
    [draftClientData, isStressTest]
  );

  // mantém a sidebar de simulações escondida nas telas que não precisam dela
  const showSidebarSimulations = viewMode === "advisor" && !location.pathname.includes("/dashboard/settings")
    && !location.pathname.includes("/dashboard/account")
    && !location.pathname.includes("/dashboard/security");

  const confirmDiscardDraft = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    return window.confirm("Você tem alterações não salvas. Deseja descartá-las?");
  }, [hasUnsavedChanges]);

  const handleSelectSim = useCallback(
    (id) => {
      const sim = simulations.find((s) => s.id === id);
      if (!sim) return;
      if (id === activeSimId) return;
      if (!confirmDiscardDraft()) return;
      setActiveSimId(id);
      const nextData = ensureClientShape(sim.data);
      setOfficialClientData(nextData);
      setDraftClientData(nextData);
    },
    [simulations, activeSimId, confirmDiscardDraft]
  );

  const handleCreateSim = useCallback(() => {
    if (!confirmDiscardDraft()) return;
    const id = genId();
    const baseName = `Cenário ${simulations.length + 1}`;
    const clone = ensureClientShape({ ...officialClientData, scenarioName: baseName });

    const next = { id, name: baseName, data: clone, updatedAt: Date.now(), localOnly: true };
    setSimulations((s) => [next, ...s]);
    setActiveSimId(id);
    setOfficialClientData(clone);
    setDraftClientData(clone);
  }, [officialClientData, simulations.length, confirmDiscardDraft]);

  const handleDeleteSim = useCallback(async () => {
    if (simulations.length <= 1) return;
    if (!confirmDiscardDraft()) return;

    const targetId = resolvedScenarioId || activeSimulation?.id || null;
    if (!targetId) return;

    const target = simulations.find((s) => s.id === targetId);

    try {
      setSimsError(null);
      if (uid && target && !target.localOnly) {
        await deleteSimulation(db, uid, targetId);
      }

      const idx = simulations.findIndex((s) => s.id === targetId);
      const nextList = simulations.filter((s) => s.id !== targetId);
      const nextActive = nextList[Math.max(0, idx - 1)]?.id || nextList[0]?.id;

      setSimulations(nextList);
      setActiveSimId(nextActive);

      const sim = nextList.find((s) => s.id === nextActive);
      if (sim) {
        const nextData = ensureClientShape(sim.data);
        setOfficialClientData(nextData);
        setDraftClientData(nextData);
      }
    } catch {
      setSimsError("Falha ao excluir o cenário. Tente novamente.");
    }
  }, [resolvedScenarioId, activeSimulation?.id, simulations, confirmDiscardDraft, uid]);

  const handleSaveSim = useCallback(async () => {
    const nextData = ensureClientShape(draftClientData);
    const targetId = resolvedScenarioId || activeSimulation?.id || null;
    if (!targetId || !uid) return;

    const target = simulations.find((s) => s.id === targetId);
    const name = nextData.scenarioName || target?.name || "Cenário";

    try {
      setSimsError(null);
      await saveSimulation(
        db,
        uid,
        { id: targetId, name, data: nextData },
        { isNew: Boolean(target?.localOnly) }
      );

      setSimulations((sims) =>
        sims.map((s) => {
          if (s.id !== targetId) return s;
          return { ...s, name, data: nextData, updatedAt: Date.now(), localOnly: false };
        })
      );
      setOfficialClientData(nextData);
      setDraftClientData(nextData);
    } catch {
      setSimsError("Falha ao salvar o cenário. Verifique sua conexão.");
    }
  }, [resolvedScenarioId, activeSimulation?.id, draftClientData, uid, simulations]);

  const handleRenameSim = useCallback(
    (id, name) => {
      setSimulations((sims) =>
        sims.map((s) => {
          if (s.id !== id) return s;
          const nextData = ensureClientShape({ ...(s.data || {}), scenarioName: name });
          return { ...s, name, data: nextData };
        })
      );

      if (id === resolvedScenarioId) {
        setDraftClientData((prev) => ensureClientShape({ ...prev, scenarioName: name }));
      }
    },
    [resolvedScenarioId]
  );

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p.includes("/dashboard/overview")) return "Visão Executiva";
    if (p.includes("/dashboard/assets")) return "Estrutura Patrimonial";
    if (p.includes("/dashboard/scenarios")) return "Simulação de Cenários";
    if (p.includes("/dashboard/goals")) return "Metas & Objetivos";
    if (p.includes("/dashboard/succession")) return "Planejamento Sucessório";
    if (p.includes("/dashboard/settings")) return "Dados do Cliente";
    if (p.includes("/dashboard/account")) return "Minha Conta";
    if (p.includes("/dashboard/security")) return "Segurança";
    return "Dashboard";
  }, [location.pathname]);

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-background text-accent font-display text-xl animate-pulse">
        Carregando...
      </div>
    );

  // fallback defensivo
  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-text-secondary font-sans">
        Acesso restrito. Faça login.
      </div>
    );
  }

  if (simsLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-accent font-display text-xl animate-pulse">
        Carregando simulações...
      </div>
    );
  }

  if (!simulations.length) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-accent font-display text-xl animate-pulse">
        Carregando simulações...
      </div>
    );
  }

  const outletCtx = {
    clientData: draftClientData,
    updateField,
    readOnly,
    analysis,
    isStressTest,
    viewMode,
    aiEnabled,
    setAiEnabled,
    scenarioId: resolvedScenarioId,
    trackingByScenario,
    setTrackingByScenario,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-text-primary">
      <MainSidebar viewMode={viewMode} logout={logout} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header
          title={pageTitle}
          clientName={draftClientData?.name}
          activeScenarioName={activeSimulation?.name}
          hasUnsavedChanges={hasUnsavedChanges}
          viewMode={viewMode}
          setViewMode={setViewMode}
          readOnly={readOnly}
          isStressTest={isStressTest}
          setIsStressTest={setIsStressTest}
          user={user}
          logout={logout}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative p-1">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/5 blur-[150px] rounded-full pointer-events-none z-0"></div>

          <main className="relative flex min-h-full z-10">
            <div className={`flex-1 p-8 lg:p-10 transition-all ${showSidebarSimulations ? "pr-0" : ""}`}>
              {simsError && (
                <div className="mb-6 p-4 rounded-2xl border border-danger/40 bg-danger-subtle/20 text-danger text-sm">
                  {simsError}
                </div>
              )}
              <Outlet context={outletCtx} />
            </div>

            {showSidebarSimulations && (
              <SimulationsSidebar
                simulations={simulations}
                activeSimId={resolvedScenarioId}
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
