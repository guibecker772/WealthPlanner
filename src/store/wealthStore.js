import { generateUUID } from "../utils/format";

export const INITIAL_CLIENT_DATA = {
  id: "default",
  scenarioName: "Cenário Base",
  name: "Cliente Exemplo",
  state: "SP",
  currentAge: 40,
  retirementAge: 65,
  contributionEndAge: 65,
  lifeExpectancy: 90,
  profile: "Moderado",
  inflation: 4.5,
  returnRateConservative: 8.0,
  returnRateModerate: 10.0,
  returnRateBold: 12.0,
  propertyRealAppreciation: 0.0,
  monthlyContribution: 5000,
  monthlyCostNow: 15000,
  monthlyCostRetirement: 15000,
  insuranceCoverage: 0,
  assets: [
    { id: "1", name: "Carteira Global", value: 500000, type: "financial", liquidity: "high" },
    { id: "2", name: "Imóvel Residencial", value: 1000000, type: "real_estate", liquidity: "low" },
  ],
  financialGoals: [{ id: "1", name: "Troca de Carro", value: 150000, age: 45, type: "impact" }],
};

export const initialState = {
  simulations: [INITIAL_CLIENT_DATA],
  snapshots: [],
  activeSimIndex: 0,
  viewMode: "advisor",
  isStressTest: false,
  aiEnabled: false,
};

export function wealthReducer(state, action) {
  switch (action.type) {
    case "RESET_DATA":
      return initialState;

case "INIT_DATA": {
  const sims = action.payload?.length ? action.payload : [INITIAL_CLIENT_DATA];
  const safeIndex = Math.min(state.activeSimIndex, sims.length - 1);
  return { ...state, simulations: sims, activeSimIndex: safeIndex };
}

    case "SET_ACTIVE_INDEX":
      return { ...state, activeSimIndex: action.payload };

    case "UPDATE_FIELD": {
      const newSims = [...state.simulations];
      newSims[state.activeSimIndex] = { ...newSims[state.activeSimIndex], [action.field]: action.value };
      return { ...state, simulations: newSims };
    }

    case "ADD_SIMULATION": {
      const newSim = {
        ...INITIAL_CLIENT_DATA,
        id: generateUUID(),
        scenarioName: `Cenário ${state.simulations.length + 1}`,
      };
      return { ...state, simulations: [...state.simulations, newSim], activeSimIndex: state.simulations.length };
    }

    case "DUPLICATE_SIMULATION": {
      const current = state.simulations[state.activeSimIndex];
      const copy = { ...current, id: generateUUID(), scenarioName: `${current.scenarioName} (Cópia)` };
      return { ...state, simulations: [...state.simulations, copy], activeSimIndex: state.simulations.length };
    }

    case "DELETE_SIMULATION": {
      if (state.simulations.length <= 1) return state;
      const newSims = state.simulations.filter((_, i) => i !== state.activeSimIndex);
      return { ...state, simulations: newSims, activeSimIndex: 0 };
    }

    case "TOGGLE_MODE":
      return { ...state, viewMode: state.viewMode === "advisor" ? "client" : "advisor" };

    case "TOGGLE_STRESS":
      return { ...state, isStressTest: !state.isStressTest };

    case "TOGGLE_AI":
      return { ...state, aiEnabled: !state.aiEnabled };

    case "SAVE_SNAPSHOT": {
      const snap = { id: generateUUID(), date: new Date().toISOString(), data: state.simulations[state.activeSimIndex] };
      return { ...state, snapshots: [...state.snapshots, snap] };
    }

    default:
      return state;
  }
}
