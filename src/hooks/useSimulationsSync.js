import { useEffect, useMemo, useState, useCallback } from "react";

const STORAGE_SIMULATIONS = "planner_simulations_v1";
const STORAGE_ACTIVE = "planner_active_simulation_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Clone seguro pra evitar referência compartilhada entre cenários.
 * structuredClone é o ideal; fallback JSON funciona pra dados simples.
 */
function deepClone(obj) {
  if (obj == null) return obj;
  try {
    return structuredClone(obj);
  } catch {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      // último fallback: retorna o próprio (não ideal)
      return obj;
    }
  }
}

function loadSimulations() {
  try {
    const raw = localStorage.getItem(STORAGE_SIMULATIONS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSimulations(list) {
  localStorage.setItem(STORAGE_SIMULATIONS, JSON.stringify(list));
}

export function useSimulationsSync(defaultClientData) {
  const [simulations, setSimulations] = useState(() => loadSimulations());
  const [activeId, setActiveId] = useState(
    () => localStorage.getItem(STORAGE_ACTIVE) || ""
  );
  const [isDirty, setIsDirty] = useState(false);

  // bootstrap (uma vez)
  useEffect(() => {
    let list = simulations;

    if (!Array.isArray(list) || list.length === 0) {
      const first = {
        id: uid(),
        name: "Cenário Base",
        data: deepClone(defaultClientData),
        updatedAt: Date.now(),
      };

      const next = [first];
      setSimulations(next);
      saveSimulations(next);

      setActiveId(first.id);
      localStorage.setItem(STORAGE_ACTIVE, first.id);

      setIsDirty(false);
      return;
    }

    // garante active válido
    const exists = list.some((s) => s.id === activeId);
    if (!activeId || !exists) {
      const fallbackId = list[0].id;
      setActiveId(fallbackId);
      localStorage.setItem(STORAGE_ACTIVE, fallbackId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSimulation = useMemo(() => {
    return simulations.find((s) => s.id === activeId) || simulations[0] || null;
  }, [simulations, activeId]);

  const persist = useCallback((nextList) => {
    setSimulations(nextList);
    saveSimulations(nextList);
  }, []);

  const selectSimulation = useCallback((id) => {
    setActiveId(id);
    localStorage.setItem(STORAGE_ACTIVE, id);
    setIsDirty(false);
  }, []);

  const createSimulation = useCallback(
    (name = "Nova simulação") => {
      const newSim = {
        id: uid(),
        name,
        data: deepClone(defaultClientData),
        updatedAt: Date.now(),
      };
      const next = [newSim, ...simulations];
      persist(next);
      selectSimulation(newSim.id);
      return newSim.id;
    },
    [defaultClientData, simulations, persist, selectSimulation]
  );

  const renameSimulation = useCallback(
    (id, name) => {
      const next = simulations.map((s) =>
        s.id === id ? { ...s, name, updatedAt: Date.now() } : s
      );
      persist(next);
    },
    [simulations, persist]
  );

  /**
   * ✅ Salva sempre CLONADO pra garantir:
   * - Sem referência compartilhada com o estado
   * - Sem mutação “por fora”
   */
  const saveActiveSimulation = useCallback(
    (data) => {
      if (!activeId) return;

      const safeData = deepClone(data);

      const next = simulations.map((s) =>
        s.id === activeId ? { ...s, data: safeData, updatedAt: Date.now() } : s
      );

      persist(next);
      setIsDirty(false);
    },
    [activeId, simulations, persist]
  );

  /**
   * ✅ Helper opcional (facilita SettingsPage):
   * updateActiveSimulation({ profile: "arrojado" })
   */
  const updateActiveSimulation = useCallback(
    (patchOrFn) => {
      if (!activeSimulation) return;

      const current = activeSimulation.data || {};
      const nextData =
        typeof patchOrFn === "function"
          ? patchOrFn(deepClone(current))
          : { ...deepClone(current), ...(patchOrFn || {}) };

      saveActiveSimulation(nextData);
    },
    [activeSimulation, saveActiveSimulation]
  );

  const deleteSimulation = useCallback(
    (id) => {
      const next = simulations.filter((s) => s.id !== id);

      if (next.length === 0) {
        const first = {
          id: uid(),
          name: "Cenário Base",
          data: deepClone(defaultClientData),
          updatedAt: Date.now(),
        };
        persist([first]);
        selectSimulation(first.id);
        return;
      }

      persist(next);

      if (id === activeId) {
        selectSimulation(next[0].id);
      }
    },
    [simulations, activeId, defaultClientData, persist, selectSimulation]
  );

  const markDirty = useCallback(() => setIsDirty(true), []);

  return {
    simulations,
    activeId,
    activeSimulation,
    isDirty,
    selectSimulation,
    createSimulation,
    renameSimulation,
    saveActiveSimulation,
    updateActiveSimulation, // ✅ novo helper (opcional)
    deleteSimulation,
    markDirty,
  };
}
