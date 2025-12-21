import React, { useState, useEffect, useMemo, useCallback, useReducer, useRef, createContext, useContext } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar
} from 'recharts';
import { 
  LayoutDashboard, User, TrendingUp, ShieldCheck, Settings, Menu, 
  DollarSign, Target, AlertTriangle, CheckCircle2, Briefcase, 
  Plus, Trash2, Save, Plane, Home, GraduationCap, Car, Building2, Wallet,
  Activity, ArrowRight, AlertCircle, Zap, BrainCircuit,
  Printer, Lock, Unlock, Scale, Flag, Umbrella, ScrollText, 
  Lightbulb, Sparkles, History, ChevronRight, ToggleRight, ToggleLeft, Eye, EyeOff, Key,
  LogOut, Loader2, RefreshCw, Globe 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, onSnapshot 
} from 'firebase/firestore';

// ============================================================================
// 0. FIREBASE SETUP
// ============================================================================

// ⚠️ COLE SUAS CHAVES DO FIREBASE AQUI ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyCnwY1plM50GYghPwc41koxXPH6WsFYH1o",
  authDomain: "wealthplanner-511b0.firebaseapp.com",
  projectId: "wealthplanner-511b0",
  storageBucket: "wealthplanner-511b0.firebasestorage.app",
  messagingSenderId: "745861111094",
  appId: "1:745861111094:web:13575987e2ae81d2966797"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  
  const loginGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const register = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
    }
    return userCredential;
  };
  
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, login, loginGoogle, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

// ============================================================================
// 1. CONFIGURAÇÕES GERAIS
// ============================================================================

const APP_VERSION = '6.2.2 (Fix)';
const AI_KEY_STORAGE = 'WEALTH_PRO_AI_KEY'; 

const getStoredKey = () => localStorage.getItem(AI_KEY_STORAGE);
const setStoredKey = (key) => localStorage.setItem(AI_KEY_STORAGE, key);
const removeStoredKey = () => localStorage.removeItem(AI_KEY_STORAGE);

const CONFIG = {
  SUCCESSION_SAVINGS_PCT: 0.20,
  SAFE_WITHDRAWAL_RATE: 0.04,
  MIN_LIQUIDITY_RATIO: 0.10,
  STRESS_INFLATION_ADD: 1.5,
  STRESS_RETURN_SUB: 2.0,
};

const STATE_TAX_RULES = {
  'SP': { name: 'São Paulo', itcmd: 0.04, lawyer: 0.06, fees: 0.01 },
  'RJ': { name: 'Rio de Janeiro', itcmd: 0.08, lawyer: 0.06, fees: 0.015 },
  'MG': { name: 'Minas Gerais', itcmd: 0.05, lawyer: 0.06, fees: 0.01 },
  'RS': { name: 'Rio Grande do Sul', itcmd: 0.06, lawyer: 0.06, fees: 0.01 },
  'PR': { name: 'Paraná', itcmd: 0.04, lawyer: 0.05, fees: 0.01 },
  'SC': { name: 'Santa Catarina', itcmd: 0.08, lawyer: 0.05, fees: 0.01 },
  'DF': { name: 'Distrito Federal', itcmd: 0.06, lawyer: 0.06, fees: 0.01 },
  'BA': { name: 'Bahia', itcmd: 0.08, lawyer: 0.06, fees: 0.01 },
  'DEFAULT': { name: 'Outros Estados', itcmd: 0.08, lawyer: 0.06, fees: 0.01 }
};

const ASSET_TYPES = {
  'financial': { label: 'Financeiro', icon: Wallet, color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'real_estate': { label: 'Imóvel', icon: Building2, color: '#6366f1', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'vehicle': { label: 'Veículo', icon: Car, color: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-700' },
  'other': { label: 'Outros', icon: Briefcase, color: '#64748b', bg: 'bg-slate-100', text: 'text-slate-700' }
};

// ============================================================================
// 2. UTILITÁRIOS & CALCULADORA (ENGINE)
// ============================================================================

const safeNumber = (value, defaultVal = 0) => {
  const num = parseFloat(value);
  return isNaN(num) || !isFinite(num) ? defaultVal : num;
};

const generateUUID = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(safeNumber(value));
const formatPercent = (value) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(safeNumber(value) / 100);
const hashData = (d) => JSON.stringify(d).length;

const FinancialEngine = {
  calculateRealRate: (nominalRate, inflation) => {
    const inf = Math.max(-0.99, safeNumber(inflation) / 100); 
    const nom = safeNumber(nominalRate) / 100;
    return ((1 + nom) / (1 + inf)) - 1;
  },

  calculateTimeline: (clientData, isStressTest) => {
    const currentAge = safeNumber(clientData.currentAge);
    const lifeExpectancy = safeNumber(clientData.lifeExpectancy);
    const retirementAge = safeNumber(clientData.retirementAge);
    const contributionEndAge = safeNumber(clientData.contributionEndAge);
    
    if (currentAge >= lifeExpectancy) return [];

    const stressInflation = isStressTest ? CONFIG.STRESS_INFLATION_ADD : 0;
    const stressReturn = isStressTest ? -CONFIG.STRESS_RETURN_SUB : 0;
    const inflation = safeNumber(clientData.inflation) + stressInflation;

    let nominalRateInfo = 10; 
    if (clientData.profile === 'Conservador') nominalRateInfo = safeNumber(clientData.returnRateConservative, 8);
    if (clientData.profile === 'Moderado') nominalRateInfo = safeNumber(clientData.returnRateModerate, 10);
    if (clientData.profile === 'Agressivo') nominalRateInfo = safeNumber(clientData.returnRateBold, 12);
    nominalRateInfo += stressReturn;

    const realRateFinancial = FinancialEngine.calculateRealRate(nominalRateInfo, inflation);
    let realRateProperty = safeNumber(clientData.propertyRealAppreciation);
    if (isStressTest && realRateProperty > 0) realRateProperty = Math.max(0, realRateProperty - 1.0);
    realRateProperty = realRateProperty / 100;

    const monthlyRealRateFin = Math.pow(1 + realRateFinancial, 1 / 12) - 1;
    const monthlyRealRateProp = Math.pow(1 + realRateProperty, 1 / 12) - 1;

    const assets = clientData.assets || [];
    const { initialFinancialWealth, initialIlliquidWealth } = assets.reduce((acc, a) => {
        const val = safeNumber(a.value);
        if (a.type === 'financial' || a.liquidity === 'high') {
            acc.initialFinancialWealth += val;
        } else {
            acc.initialIlliquidWealth += val;
        }
        return acc;
    }, { initialFinancialWealth: 0, initialIlliquidWealth: 0 });

    const goalsMap = new Map();
    (clientData.financialGoals || []).forEach(g => {
      if(g.type === 'impact') {
        const ageKey = Math.floor(safeNumber(g.age));
        const current = goalsMap.get(ageKey) || 0;
        goalsMap.set(ageKey, current + safeNumber(g.value));
      }
    });

    const timeline = [];
    const totalMonths = (lifeExpectancy - currentAge) * 12;
    const currentYear = new Date().getFullYear();
    
    let currentFinancialBalance = initialFinancialWealth;
    let currentIlliquidBalance = initialIlliquidWealth;
    let isBroke = false;
    let brokeAge = null;

    for (let m = 0; m <= totalMonths; m++) {
      const actualAge = currentAge + (m / 12);
      const integerAge = Math.floor(actualAge);
      const isStartOfYear = m % 12 === 0;
      const isAccumulation = actualAge < retirementAge;
      const isContributing = actualAge < contributionEndAge;

      currentFinancialBalance *= (1 + monthlyRealRateFin);
      currentIlliquidBalance *= (1 + monthlyRealRateProp);

      if (isAccumulation) {
        if (isContributing) currentFinancialBalance += safeNumber(clientData.monthlyContribution);
      } else {
        currentFinancialBalance -= safeNumber(clientData.monthlyCostRetirement);
      }

      if (isStartOfYear) {
          const goalVal = goalsMap.get(integerAge);
          if (goalVal) currentFinancialBalance -= goalVal;
      }

      if (currentFinancialBalance < 0 && !isBroke) {
        isBroke = true;
        brokeAge = actualAge;
      }

      if (isStartOfYear || m === Math.floor(totalMonths)) {
        timeline.push({
          age: actualAge,
          year: currentYear + Math.floor(m/12),
          financial: Math.max(0, currentFinancialBalance), 
          illiquid: currentIlliquidBalance,
          total: Math.max(0, currentFinancialBalance) + currentIlliquidBalance,
          goalImpact: goalsMap.get(integerAge) || 0,
          isBroke
        });
      }
    }

    return { timeline, brokeAge, initialFinancialWealth, initialIlliquidWealth, realRateFinancial };
  },

  calculateKPIs: (timeline, clientData, financialContext) => {
    if (!timeline.length) return {};

    const { brokeAge, initialFinancialWealth, initialIlliquidWealth, realRateFinancial } = financialContext;
    const retirementAge = safeNumber(clientData.retirementAge);
    const lifeExpectancy = safeNumber(clientData.lifeExpectancy);
    const monthlyCostRetirement = safeNumber(clientData.monthlyCostRetirement);

    const retirementPoint = timeline.find(t => t.age >= retirementAge) || timeline[timeline.length - 1];
    const projectedWealthAtRetirement = retirementPoint.financial;
    const yearsInRetirement = lifeExpectancy - retirementAge;

    const monthlyRate = Math.pow(1 + realRateFinancial, 1 / 12) - 1;
    const nMonths = yearsInRetirement * 12;
    
    let requiredCapital = 0;
    if (Math.abs(monthlyRate) < 0.000001) {
        requiredCapital = monthlyCostRetirement * nMonths;
    } else {
        requiredCapital = monthlyCostRetirement * ((1 - Math.pow(1 + monthlyRate, -nMonths)) / monthlyRate);
    }

    let sustainableIncome = 0;
    if (projectedWealthAtRetirement > 0 && nMonths > 0) {
        if (Math.abs(monthlyRate) < 0.000001) {
            sustainableIncome = projectedWealthAtRetirement / nMonths;
        } else {
            sustainableIncome = projectedWealthAtRetirement * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -nMonths)));
        }
    }

    const goalPercentage = requiredCapital > 0 ? (projectedWealthAtRetirement / requiredCapital) * 100 : 0;
    const totalWealthNow = initialFinancialWealth + initialIlliquidWealth;
    const illiquidityRatioCurrent = totalWealthNow > 0 ? (initialIlliquidWealth / totalWealthNow) * 100 : 0;

    return {
      projectedWealthAtRetirement,
      requiredCapital,
      goalPercentage,
      sustainableIncome,
      brokeAge: brokeAge ? brokeAge.toFixed(1) : null,
      totalWealthNow,
      illiquidityRatioCurrent,
      initialFinancialWealth,
      initialIlliquidWealth
    };
  },

  classifyPlanStatus: (kpis, clientData) => {
    let status = 'safe';
    let label = 'Plano Sustentável';
    let score = 0;

    if (kpis.brokeAge) {
      if (parseFloat(kpis.brokeAge) < safeNumber(clientData.lifeExpectancy)) {
        status = 'danger';
        label = 'Risco de Ruptura';
        score += 0;
      } else {
        status = 'warning';
        label = 'Atenção (Margem Baixa)';
        score += 20;
      }
    } else {
      score += 40;
    }

    const coverage = kpis.goalPercentage;
    if (coverage >= 100) score += 30;
    else if (coverage >= 80) score += 20;
    else if (coverage >= 50) score += 10;

    if (kpis.illiquidityRatioCurrent < 50) score += 15;
    else if (kpis.illiquidityRatioCurrent < 70) score += 10;
    else score += 5;

    const estimatedSuccessionCost = kpis.totalWealthNow * 0.10;
    if (kpis.initialFinancialWealth >= estimatedSuccessionCost) score += 15;
    else score += 5;

    return {
      sustainabilityStatus: status,
      sustainabilityLabel: label,
      wealthScore: Math.min(100, Math.round(score))
    };
  },

  calculateSuccession: (assets, stateCode) => {
    const rules = STATE_TAX_RULES[stateCode] || STATE_TAX_RULES['DEFAULT'];
    const { initialFinancialWealth, initialIlliquidWealth } = assets.reduce((acc, a) => {
        const val = safeNumber(a.value);
        if (a.type === 'financial' || a.liquidity === 'high') {
            acc.initialFinancialWealth += val;
        } else {
            acc.initialIlliquidWealth += val;
        }
        return acc;
    }, { initialFinancialWealth: 0, initialIlliquidWealth: 0 });

    const totalWealth = initialFinancialWealth + initialIlliquidWealth;
    const itcmdCost = totalWealth * rules.itcmd;
    const legalCost = totalWealth * rules.lawyer; 
    const feesCost = totalWealth * rules.fees; 
    const totalCost = itcmdCost + legalCost + feesCost;
    const liquidityGap = Math.max(0, totalCost - initialFinancialWealth);

    return {
      totalWealth,
      financialTotal: initialFinancialWealth,
      illiquidTotal: initialIlliquidWealth,
      costs: { itcmd: itcmdCost, legal: legalCost, fees: feesCost, total: totalCost },
      liquidityGap,
      rules
    };
  },

  run: (clientData, isStressTest) => {
    const financialContext = FinancialEngine.calculateTimeline(clientData, isStressTest);
    const kpis = FinancialEngine.calculateKPIs(financialContext.timeline, clientData, financialContext);
    const classification = FinancialEngine.classifyPlanStatus(kpis, clientData);
    
    return {
      timeline: financialContext.timeline,
      kpis: { ...kpis, ...classification }
    };
  }
};

// ============================================================================
// 3. SMART COPILOT SERVICE (IA CORRIGIDA)
// ============================================================================

function getFallbackMockData(data, viewMode) {
  const { kpis, successionInfo: succession, clientData } = data;
  const isAdvisor = viewMode === 'advisor';

  const insights = {
    executiveSummary: "",
    keyRisks: [],
    optimizationSuggestions: [],
    nextBestActions: [],
    clientFriendlyExplanation: ""
  };

  if (kpis.sustainabilityStatus === 'safe') {
    insights.executiveSummary = `O plano demonstra solidez. O patrimônio projetado cobre a renda desejada de ${formatCurrency(clientData.monthlyCostRetirement)} vitaliciamente.`;
    insights.clientFriendlyExplanation = "Parabéns! Seu planejamento está muito saudável. Você está no caminho certo para uma aposentadoria tranquila.";
  } else if (kpis.sustainabilityStatus === 'warning') {
    insights.executiveSummary = `O plano é viável mas com margem reduzida. A longevidade acima do esperado pode pressionar o fluxo de caixa.`;
    insights.clientFriendlyExplanation = "Seu plano funciona, mas não temos muita margem para imprevistos. Vale a pena revisar alguns números.";
  } else {
    insights.executiveSummary = `Alerta de sustentabilidade: Esgotamento das reservas projetado aos ${kpis.brokeAge} anos.`;
    insights.clientFriendlyExplanation = "Atenção: Do jeito que está hoje, suas reservas podem acabar antes do previsto. Precisamos ajustar o plano.";
  }

  if (kpis.sustainabilityStatus === 'danger') {
    insights.keyRisks.push({ severity: 'high', text: isAdvisor ? `Drawdown excessivo. Renda sustentável: ${formatCurrency(kpis.sustainableIncome)}.` : `Renda desejada acima da capacidade do patrimônio.` });
  }
  
  if (succession && succession.liquidityGap > 0) {
    insights.keyRisks.push({ severity: 'medium', text: `Gap de liquidez sucessória identificado de ${formatCurrency(succession.liquidityGap)}.` });
    insights.optimizationSuggestions.push(`Simular seguro de vida para cobrir custos de inventário.`);
  }

  insights.nextBestActions = ["Revisar alocação de ativos.", "Validar beneficiários das apólices."];
  return insights;
}

const useSmartCopilot = (data, viewMode, isEnabled) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const lastDataHash = useRef("");

  const generateAnalysis = useCallback(async () => {
    // 1. Se estiver desligado, usa o mock local
    if (!isEnabled) {
        setInsights(getFallbackMockData(data, viewMode));
        return;
    }

    // 2. Evita recarregar se os dados não mudaram
    const currentHash = hashData(data);
    if (currentHash === lastDataHash.current && insights) return;

    setLoading(true);
    setError(null);
    
    try {
      const storedKey = getStoredKey();

      if (storedKey) {
        // 3. Preparação dos dados para a IA
        const contextData = JSON.stringify({
          perfil: data.clientData.profile,
          idadeAtual: data.clientData.currentAge,
          cenario: data.isStressTest ? "CENÁRIO DE STRESS (CRISE)" : "CENÁRIO BASE (NORMAL)",
          detalhesStress: data.isStressTest ? "Inflação +1.5%, Rentabilidade -2.0%" : "Premissas padrão",
          patrimonioTotal: formatCurrency(data.kpis.totalWealthNow),
          coberturaMeta: formatPercent(data.kpis.goalPercentage),
          anosAteQuebrar: data.kpis.brokeAge || "Nunca (Sustentável)",
          status: data.kpis.sustainabilityStatus
        });
        
        const fullPrompt = `
        ATUAÇÃO: Wealth Planner Sênior (Consultor Financeiro de Elite).
        CONTEXTO: ${contextData}

        TAREFA: Gere uma análise técnica e comportamental.
        
        FORMATO JSON OBRIGATÓRIO (SEM MARKDOWN):
        {
          "executiveSummary": "Resumo técnico de 2 linhas focado na viabilidade.",
          "clientFriendlyExplanation": "Explicação empática para o cliente. Se for Stress, explique o impacto.",
          "keyRisks": [{"severity": "high", "text": "Risco principal detectado"}],
          "optimizationSuggestions": ["Sugestão tática 1", "Sugestão tática 2"]
        }`;
        
        // 4. CHAMADA DE API (MODELO LITE + MÉTODO POST CORRIGIDO)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${storedKey}`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }]
          })
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error("Erro API:", errData);
            throw new Error(`Erro API: ${response.status}`);
        }
        
        const result = await response.json();
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Limpeza de segurança do JSON
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        if (cleanJson) {
           setInsights(JSON.parse(cleanJson));
           lastDataHash.current = currentHash;
        } else {
           throw new Error("Resposta vazia da IA");
        }
      } else {
        // Sem chave, usa fallback
        await new Promise(resolve => setTimeout(resolve, 1500));
        setInsights(getFallbackMockData(data, viewMode));
      }

    } catch (err) {
      console.warn("Copilot Error:", err);
      // Fallback silencioso para não travar a tela
      setInsights(getFallbackMockData(data, viewMode)); 
    } finally {
      setLoading(false);
    }
  }, [data, viewMode, isEnabled, insights]);

  // Reseta se mudar de cliente
  useEffect(() => {
    setInsights(null); 
  }, [data.clientData.id]);

  return { generateAnalysis, insights, loading, error };
};

// ============================================================================
// 4. STATE MANAGEMENT
// ============================================================================

const INITIAL_CLIENT_DATA = {
  id: 'default',
  scenarioName: 'Cenário Base',
  name: "Cliente Exemplo",
  state: 'SP',
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
    { id: '1', name: 'Carteira Global', value: 500000, type: 'financial', liquidity: 'high' },
    { id: '2', name: 'Imóvel Residencial', value: 1000000, type: 'real_estate', liquidity: 'low' }
  ],
  financialGoals: [
    { id: '1', name: 'Troca de Carro', value: 150000, age: 45, type: 'impact' }
  ]
};

const initialState = {
  simulations: [INITIAL_CLIENT_DATA],
  snapshots: [], 
  activeSimIndex: 0,
  viewMode: 'advisor',
  isStressTest: false,
  aiEnabled: false 
};

function wealthReducer(state, action) {
  switch (action.type) {
    case 'RESET_DATA': return initialState; // <--- ESSA É A LINHA MÁGICA QUE ZERA TUDO
    case 'INIT_DATA': return { ...state, simulations: action.payload.length ? action.payload : [INITIAL_CLIENT_DATA] };
    case 'SET_ACTIVE_INDEX': return { ...state, activeSimIndex: action.payload };
    // ... mantenha o resto igual
    case 'SET_ACTIVE_INDEX': return { ...state, activeSimIndex: action.payload };
    case 'UPDATE_FIELD': {
      const newSims = [...state.simulations];
      newSims[state.activeSimIndex] = { ...newSims[state.activeSimIndex], [action.field]: action.value };
      return { ...state, simulations: newSims };
    }
    case 'ADD_SIMULATION': {
        const newSim = { ...INITIAL_CLIENT_DATA, id: generateUUID(), scenarioName: `Cenário ${state.simulations.length + 1}` };
        return { ...state, simulations: [...state.simulations, newSim], activeSimIndex: state.simulations.length };
    }
    case 'DUPLICATE_SIMULATION': {
        const current = state.simulations[state.activeSimIndex];
        const copy = { ...current, id: generateUUID(), scenarioName: `${current.scenarioName} (Cópia)` };
        return { ...state, simulations: [...state.simulations, copy], activeSimIndex: state.simulations.length };
    }
    case 'DELETE_SIMULATION': {
        if (state.simulations.length <= 1) return state;
        const newSims = state.simulations.filter((_, i) => i !== state.activeSimIndex);
        return { ...state, simulations: newSims, activeSimIndex: 0 };
    }
    case 'TOGGLE_MODE': return { ...state, viewMode: state.viewMode === 'advisor' ? 'client' : 'advisor' };
    case 'TOGGLE_STRESS': return { ...state, isStressTest: !state.isStressTest };
    case 'TOGGLE_AI': return { ...state, aiEnabled: !state.aiEnabled };
    case 'SAVE_SNAPSHOT': {
        const snap = { id: generateUUID(), date: new Date().toISOString(), data: state.simulations[state.activeSimIndex] };
        return { ...state, snapshots: [...state.snapshots, snap] };
    }
    default: return state;
  }
}

// ============================================================================
// 5. COMPONENTS UI
// ============================================================================

const AuthScreen = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login, register, loginGoogle, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Erro na autenticação');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginGoogle();
    } catch (err) {
      setError(err.message || 'Erro no login com Google');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">W</div>
          <h2 className="text-2xl font-bold text-slate-800">{isRegister ? 'Criar Conta' : 'Bem-vindo de volta'}</h2>
          <p className="text-slate-500 text-sm">WealthPlanner Pro • Advisory Edition</p>
        </div>
        {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16}/> {typeof error === 'string' ? error : 'Erro desconhecido'}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
              <input type="text" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input type="email" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input type="password" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button disabled={loading} type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center">
            {loading ? <Loader2 className="animate-spin" /> : (isRegister ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>
        <div className="mt-4">
          <button onClick={handleGoogleLogin} disabled={loading} className="w-full py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors flex justify-center items-center gap-2">
             <span className="text-lg">G</span> Entrar com Google
          </button>
        </div>
        <div className="mt-6 text-center text-sm">
          <button onClick={() => setIsRegister(!isRegister)} className="text-indigo-600 font-semibold hover:underline">
            {isRegister ? 'Já tem uma conta? Entre' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </Card>
    </div>
  );
};

const Card = ({ children, className = '', title, action }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col print:border-none print:shadow-none print:p-0 print:mb-6 ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50 print:border-none print:mb-2">
        {title && <h3 className="font-bold text-slate-800 text-lg print:text-slate-900 print:text-xl">{title}</h3>}
        {action && <div className="print:hidden">{action}</div>}
      </div>
    )}
    <div className="flex-1">{children}</div>
  </div>
);

const KPICard = ({ label, value, subtext, icon: Icon, color = "sky", status, active }) => {
  let statusClasses = `text-${color}-600 bg-${color}-50 border-${color}-100`;
  if (status === 'danger') statusClasses = 'text-rose-600 bg-rose-50 border-rose-100';
  if (status === 'warning') statusClasses = 'text-amber-600 bg-amber-50 border-amber-100';
  if (status === 'safe') statusClasses = 'text-emerald-600 bg-emerald-50 border-emerald-100';
  if (active) statusClasses = 'text-white bg-indigo-600 border-indigo-600 shadow-md ring-2 ring-indigo-300';

  return (
    <div className={`p-5 rounded-xl border transition-all flex items-start justify-between ${statusClasses} print:border-slate-200 print:bg-white print:text-slate-900 print:p-2`}>
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${active ? 'text-indigo-200' : 'text-slate-500'} print:text-slate-500`}>{label}</p>
        <h4 className={`text-2xl font-bold ${active ? 'text-white' : 'text-slate-900'} print:text-slate-900 print:text-xl`}>{value}</h4>
        {subtext && <p className={`text-xs mt-1 ${active ? 'text-indigo-100' : 'text-slate-500'} print:text-slate-500`}>{subtext}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${active ? 'bg-indigo-500 text-white' : 'bg-white/50'} print:hidden`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "number", prefix, suffix, options, helpText, readOnly, error }) => (
  <div className="w-full print:hidden">
    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 tracking-wide">{label}</label>
    <div className="relative">
      {prefix && <div className="absolute left-3 top-2.5 text-slate-400 text-sm font-medium">{prefix}</div>}
      {options ? (
        <select
          value={value}
          onChange={(e) => !readOnly && onChange(e.target.value)}
          disabled={readOnly}
          className={`w-full bg-slate-50 border ${error ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'} text-slate-800 text-sm rounded-lg block p-2.5 appearance-none font-medium ${readOnly ? 'opacity-75 cursor-not-allowed bg-slate-100' : 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`}
        >
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value === undefined || value === null || (type === 'number' && Number.isNaN(value)) ? '' : value}
          onChange={(e) => {
             if (readOnly) return;
             if (type === 'number') {
                const val = e.target.value;
                onChange(val === '' ? '' : parseFloat(val));
             } else {
                onChange(e.target.value);
             }
          }}
          readOnly={readOnly}
          className={`w-full bg-slate-50 border ${error ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50' : 'border-slate-200'} text-slate-800 text-sm rounded-lg block p-2.5 font-medium
            ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-9' : ''}
            ${readOnly ? 'opacity-75 cursor-not-allowed bg-slate-100 focus:ring-0' : 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`}
        />
      )}
      {suffix && <div className="absolute right-3 top-2.5 text-slate-400 text-sm font-medium">{suffix}</div>}
    </div>
    {error && <p className="mt-1 text-[10px] text-rose-500 font-bold">{error}</p>}
    {helpText && !error && !readOnly && <p className="mt-1 text-[10px] text-slate-400">{helpText}</p>}
  </div>
);

const CopilotModule = ({ insights, loading, onGenerate, hasData, aiEnabled }) => (
  <div className="bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 rounded-xl p-6 h-full flex flex-col print:break-inside-avoid">
    <div className="flex items-center gap-2 mb-4 text-indigo-700">
      <Sparkles size={20} />
      <h3 className="font-bold text-lg">Smart Copilot {aiEnabled && <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-[10px] rounded-full">AI ON</span>}</h3>
    </div>
    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
      {!hasData && !loading && (
        <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
           <BrainCircuit size={48} className="text-indigo-200" />
           <p className="text-sm text-slate-500 max-w-xs">{aiEnabled ? "Ative a IA para analisar o plano." : "Gere um diagnóstico financeiro instantâneo."}</p>
           <button onClick={onGenerate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2"><Zap size={16}/> Gerar Diagnóstico</button>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center justify-center h-48 space-y-4">
           <Loader2 size={32} className="text-indigo-600 animate-spin" />
           <p className="text-xs text-indigo-600 font-medium animate-pulse">{aiEnabled ? "Consultando API Inteligente..." : "Processando regras financeiras..."}</p>
        </div>
      )}
      {hasData && !loading && (
        <>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50 animate-fade-in"><p className="text-sm text-slate-700 leading-relaxed">{insights.clientFriendlyExplanation || insights.executiveSummary}</p></div>
          {insights.keyRisks?.length > 0 && (
            <div className="space-y-2 animate-fade-in delay-75">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Pontos de Atenção</h4>
              {insights.keyRisks.map((risk, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg text-sm ${risk.severity === 'high' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'}`}><AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{risk.text}</span></div>
              ))}
            </div>
          )}
          {insights.optimizationSuggestions?.length > 0 && (
            <div className="space-y-2 animate-fade-in delay-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Sugestões</h4>
              {insights.optimizationSuggestions.map((sugg, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm"><Lightbulb size={16} className="mt-0.5 shrink-0" /><span>{sugg}</span></div>
              ))}
            </div>
          )}
          <div className="pt-4 text-center"><button onClick={onGenerate} className="text-xs text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto transition-colors"><RefreshCw size={12}/> Atualizar Análise</button></div>
        </>
      )}
    </div>
  </div>
);

const ApiKeyManager = () => {
  const [key, setKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStoredKey();
    if (stored) {
      setKey(stored);
      setSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (key.trim()) {
      setStoredKey(key.trim());
      setSaved(true);
    }
  };

  const handleRemove = () => {
    removeStoredKey();
    setKey('');
    setSaved(false);
  };

  return (
    <Card title="Configuração da IA (API Key)">
      <div className="space-y-4">
         <p className="text-xs text-slate-500 leading-relaxed">Para usar o Smart Copilot com IA real, insira sua chave do Google Gemini. A chave será salva apenas no seu navegador e nunca enviada para nosso servidor.</p>
         <div className="flex items-center gap-2">
            <div className="relative flex-1">
               <div className="absolute left-3 top-2.5 text-slate-400"><Key size={16}/></div>
               <input 
                 type={isVisible ? "text" : "password"} 
                 className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg outline-none transition-all ${saved ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 focus:border-indigo-500'}`}
                 placeholder="Cole sua API Key aqui (ex: AIzaSy...)"
                 value={key}
                 onChange={(e) => { setKey(e.target.value); setSaved(false); }}
                 readOnly={saved}
               />
               <button onClick={() => setIsVisible(!isVisible)} className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-600">{isVisible ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
            </div>
            {saved ? (
               <button onClick={handleRemove} className="px-4 py-2 bg-white border border-rose-200 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-50 flex items-center gap-2"><Trash2 size={16}/> Remover</button>
            ) : (
               <button onClick={handleSave} disabled={!key} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"><Save size={16}/> Salvar</button>
            )}
         </div>
         {saved && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12}/> Chave salva localmente com sucesso.</p>}
      </div>
    </Card>
  );
};

const WealthScore = ({ score }) => {
  const data = [{ name: 'Score', value: score, fill: score > 70 ? '#10b981' : score > 50 ? '#f59e0b' : '#ef4444' }];
  return (
    <div className="relative flex items-center justify-center w-full h-32">
      <ResponsiveContainer>
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={180} endAngle={0} cy="70%">
          <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center mt-4">
        <span className="text-3xl font-bold text-slate-800">{score}</span>
        <span className="block text-[10px] text-slate-400 uppercase tracking-widest">Score</span>
      </div>
    </div>
  );
};

const SUCCESSION_STRATEGIES = [
  {
    id: 'holding',
    title: 'Holding Patrimonial',
    icon: Building2,
    color: 'indigo',
    description: 'Estrutura jurídica para centralizar a gestão e sucessão de bens.',
    whenToConsider: (kpis) => kpis.illiquidityRatioCurrent > 40 || kpis.totalWealthNow > 2000000,
    benefits: ['Organização e centralização do patrimônio', 'Governança familiar', 'Evita condomínio indivisível', 'Eficiência tributária em locação'],
    risks: ['Custos de abertura e manutenção', 'Complexidade contábil', 'Exige disciplina na gestão da PJ'],
    indicator: (kpis) => ({ label: 'Exposição a Imóveis', value: formatPercent(kpis.illiquidityRatioCurrent), context: 'Nível de patrimônio imobilizado que justifica gestão centralizada.' }),
    cta: 'Avaliar estrutura de holding'
  },
  {
    id: 'offshore',
    title: 'Offshore (Internacional)',
    icon: Globe,
    color: 'blue',
    description: 'Veículo de investimento sediado no exterior para diversificação de jurisdição.',
    whenToConsider: (kpis) => kpis.totalWealthNow > 5000000,
    benefits: ['Diversificação de risco jurisdicional', 'Acesso a mercados globais', 'Planejamento sucessório', 'Diferimento fiscal'],
    risks: ['Altos custos de setup', 'Report fiscal complexo', 'Variação cambial', 'Mudanças regulatórias'],
    indicator: (kpis) => ({ label: 'Patrimônio Total', value: formatCurrency(kpis.totalWealthNow), context: 'Estruturas internacionais costumam ser eficientes para patrimônios robustos.' }),
    cta: 'Simular estrutura internacional'
  },
  {
    id: 'previdencia',
    title: 'Previdência Privada',
    icon: ScrollText,
    color: 'emerald',
    description: 'Instrumento contratual de acumulação com características securitárias.',
    whenToConsider: (kpis) => true,
    benefits: ['Não entra em inventário', 'Liquidez rápida (D+30)', 'Possibilidade de tabela regressiva', 'Flexibilidade de beneficiários'],
    risks: ['Custos de administração', 'Escolha inadequada do regime tributário', 'Tributação no resgate curto prazo'],
    indicator: (kpis) => ({ label: 'Liquidez Sucessória', value: formatCurrency(kpis.initialFinancialWealth), context: 'Capital disponível fora de inventário agiliza o acesso.' }),
    cta: 'Avaliar previdência'
  },
  {
    id: 'seguro',
    title: 'Seguro de Vida',
    icon: Umbrella,
    color: 'sky',
    description: 'Proteção financeira e criação de liquidez imediata.',
    whenToConsider: (kpis, succession) => succession.liquidityGap > 0,
    benefits: ['Isento de IR e ITCMD', 'Liquidez imediata para inventário', 'Proteção familiar', 'Inimpenshorável'],
    risks: ['Custo do prêmio', 'Necessidade de adequação do capital segurado', 'Não é investimento'],
    indicator: (kpis, succession) => ({ label: 'Gap de Liquidez', value: formatCurrency(succession.liquidityGap), context: 'Valor que faltaria hoje para cobrir custos sucessórios.' }),
    cta: 'Simular cobertura'
  }
];

const StrategyView = ({ strategy, kpis, succession }) => {
  const Icon = strategy.icon;
  const indicators = strategy.indicator(kpis, succession);
  return (
    <div className="animate-fade-in bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className={`p-3 rounded-xl bg-${strategy.color}-100 text-${strategy.color}-600`}><Icon size={32} /></div>
        <div><h3 className="text-xl font-bold text-slate-800">{strategy.title}</h3><p className="text-slate-500 text-sm mt-1">{strategy.description}</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> Benefícios</h4><ul className="space-y-2">{strategy.benefits.map((b, i) => (<li key={i} className="text-sm text-slate-700 flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"/> {b}</li>))}</ul></div>
          <div><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-500"/> Riscos e Cuidados</h4><ul className="space-y-2">{strategy.risks.map((r, i) => (<li key={i} className="text-sm text-slate-700 flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"/> {r}</li>))}</ul></div>
        </div>
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-between">
          <div><h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Indicador Relevante</h4><div className="mb-4"><span className="text-3xl font-bold text-slate-800">{indicators.value}</span><span className="block text-sm text-slate-600 font-medium mt-1">{indicators.label}</span></div><p className="text-xs text-slate-500 italic leading-relaxed border-l-2 border-slate-300 pl-3">"{indicators.context}"</p></div>
          <button className={`w-full mt-6 py-3 rounded-lg font-bold text-white text-sm bg-${strategy.color}-600 hover:bg-${strategy.color}-700 transition-colors flex items-center justify-center gap-2`}>{strategy.cta} <ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
};

const SuccessionSection = ({ clientData, kpis, isAdvisor }) => {
  const [activeStrategyId, setActiveStrategyId] = useState('overview');
  const successionInfo = useMemo(() => FinancialEngine.calculateSuccession(clientData.assets || [], clientData.state), [clientData]);
  
  const pieData = useMemo(() => [{ name: 'Financeiro', value: successionInfo.financialTotal, color: '#10b981' }, { name: 'Bens', value: successionInfo.illiquidTotal, color: '#6366f1' }], [successionInfo]);
  const estimatedSavings = useMemo(() => successionInfo.costs.total * CONFIG.SUCCESSION_SAVINGS_PCT, [successionInfo.costs.total]);

  const OverviewTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        <Card title="Composição Patrimonial" className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-center gap-8 h-full">
            <div className="w-full sm:w-1/2 h-[200px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value">{pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={(v)=>formatCurrency(v)}/><Legend verticalAlign="bottom"/></PieChart></ResponsiveContainer></div>
            <div className="w-full sm:w-1/2 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100"><p className="text-xs text-emerald-600 font-bold uppercase">Liquidez Imediata</p><p className="text-lg font-bold text-emerald-800">{formatCurrency(successionInfo.financialTotal)}</p></div>
                 <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100"><p className="text-xs text-indigo-600 font-bold uppercase">Patrimônio Imobilizado</p><p className="text-lg font-bold text-indigo-800">{formatCurrency(successionInfo.illiquidTotal)}</p></div>
               </div>
            </div>
          </div>
        </Card>
        <Card title="Custos do Inventário">
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-50 py-2"><span className="text-slate-600">Imposto (ITCMD)</span><span className="font-bold text-slate-800">{formatCurrency(successionInfo.costs.itcmd)}</span></div>
              <div className="flex justify-between border-b border-slate-50 py-2"><span className="text-slate-600">Honorários</span><span className="font-bold text-slate-800">{formatCurrency(successionInfo.costs.legal)}</span></div>
              <div className="flex justify-between border-b border-slate-50 py-2"><span className="text-slate-600">Custas</span><span className="font-bold text-slate-800">{formatCurrency(successionInfo.costs.fees)}</span></div>
            </div>
            <div className="bg-slate-50 -mx-6 -mb-6 p-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2"><span className="text-slate-700 font-bold">Total Estimado</span><span className="text-xl font-bold text-rose-600">{formatCurrency(successionInfo.costs.total)}</span></div>
              {successionInfo.liquidityGap > 0 ? (
                <div className="mt-3 p-3 bg-white border border-rose-200 rounded-lg shadow-sm flex items-center gap-2 text-rose-700 text-xs"><AlertCircle size={16}/> Gap de liquidez: {formatCurrency(successionInfo.liquidityGap)}</div>
              ) : (
                <div className="mt-3 p-3 bg-white border border-emerald-200 rounded-lg shadow-sm flex items-center gap-2 text-emerald-700 text-xs"><CheckCircle2 size={16}/> Liquidez suficiente</div>
              )}
            </div>
          </div>
        </Card>
        <div className="lg:col-span-3"><div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex gap-4"><div className="p-3 bg-white rounded-lg shadow-sm text-indigo-600"><Scale size={24} /></div><div className="flex-1"><h3 className="text-lg font-bold text-slate-800 mb-1">Economia Potencial com Planejamento</h3><p className="text-sm text-slate-600 leading-relaxed mb-4">Com estratégias como holding e previdência, é possível reduzir custos e agilizar o processo.</p><div className="flex flex-col sm:flex-row items-center gap-4 mt-2"><div className="px-4 py-2 bg-white rounded-lg border border-indigo-100 shadow-sm w-full sm:w-auto text-center sm:text-left"><span className="block text-xs font-bold text-slate-400 uppercase">Custo Atual</span><span className="font-bold text-slate-700">{formatCurrency(successionInfo.costs.total)}</span></div><ArrowRight className="text-indigo-300 hidden sm:block" /><div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm w-full sm:w-auto text-center sm:text-left"><span className="block text-xs font-bold text-emerald-600 uppercase">Economia Estimada (~20%)</span><span className="font-bold text-emerald-700">{formatCurrency(estimatedSavings)}</span></div></div></div></div></div>
    </div>
  );

  const activeStrategy = SUCCESSION_STRATEGIES.find(s => s.id === activeStrategyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button onClick={() => setActiveStrategyId('overview')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeStrategyId === 'overview' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Visão Geral</button>
        {SUCCESSION_STRATEGIES.map(st => (
          <button key={st.id} onClick={() => setActiveStrategyId(st.id)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeStrategyId === st.id ? `bg-${st.color}-600 text-white` : `bg-white text-slate-600 hover:bg-${st.color}-50 border border-slate-200`}`}>
            {activeStrategyId === st.id && <CheckCircle2 size={14} />}{st.title}
          </button>
        ))}
      </div>
      {activeStrategyId === 'overview' ? <OverviewTab /> : activeStrategy && <StrategyView strategy={activeStrategy} kpis={kpis} succession={successionInfo} />}
    </div>
  );
};

const OverviewSection = ({ projections, clientData, isStressTest, toggleStressTest, viewMode, aiEnabled }) => {
  const { kpis, timeline } = projections;
  const isAdvisor = viewMode === 'advisor';
  const successionInfo = useMemo(() => FinancialEngine.calculateSuccession(clientData.assets || [], clientData.state), [clientData]);
  
  const { generateAnalysis, insights, loading } = useSmartCopilot(
    { kpis, successionInfo, clientData, isStressTest }, 
    viewMode,
    aiEnabled
  );
  
  const allGoals = (clientData.financialGoals || []).filter(g => g.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">Visão Executiva {isStressTest && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-sm font-bold">(Stress)</span>}</h2>
          <p className="text-sm text-slate-500">Diagnóstico 360º do planejamento financeiro</p>
        </div>
        <div className="flex gap-2">
          {isAdvisor && (
            <button onClick={toggleStressTest} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isStressTest ? 'bg-rose-600 text-white shadow-lg' : 'bg-white border text-slate-600'}`}>
              <Zap size={16} /> {isStressTest ? 'Stress Ativo' : 'Simular Stress'}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard label="Cobertura da Meta" value={formatPercent(kpis.goalPercentage)} subtext={isAdvisor ? `Capital Nec.: ${formatCurrency(kpis.requiredCapital)}` : 'Progresso'} icon={Target} status={kpis.goalPercentage >= 100 ? 'safe' : 'warning'}/>
            <KPICard label="Renda Sustentável" value={formatCurrency(kpis.sustainableIncome)} subtext="Mensal Vitalício" icon={TrendingUp} color="indigo" active/>
            {isAdvisor ? <KPICard label="Iliquidez" value={formatPercent(kpis.illiquidityRatioCurrent)} subtext="Patrimônio Atual" icon={Building2} color="slate" /> : <KPICard label="Status" value={kpis.sustainabilityLabel} subtext="Diagnóstico" icon={Activity} status={kpis.sustainabilityStatus} />}
          </div>
          <Card title="Evolução Patrimonial">
            <div className="h-[350px] w-full">
              <ResponsiveContainer>
                <AreaChart data={timeline} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs><linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={isStressTest ? "#e11d48" : "#0ea5e9"} stopOpacity={0.4}/><stop offset="95%" stopColor={isStressTest ? "#e11d48" : "#0ea5e9"} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="age" tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip formatter={(val) => formatCurrency(val)} labelFormatter={(l) => `${l} anos`} />
                  <Area type="monotone" dataKey="financial" stroke={isStressTest ? "#e11d48" : "#0ea5e9"} strokeWidth={3} fill="url(#colorFin)" />
                  <ReferenceLine x={clientData.retirementAge} stroke="#10b981" strokeDasharray="5 5" label={{ value: "Aposentadoria", position: 'top', fill: '#10b981', fontSize: 10 }} />
                  <ReferenceLine x={clientData.contributionEndAge} stroke="#f97316" strokeDasharray="3 3" strokeWidth={2} label={{ value: "Fim Aportes", position: 'insideTopLeft', fill: '#f97316', fontSize: 11, fontWeight: 'bold', angle: -90, offset: 10 }} />
                  {allGoals.map(g => (<ReferenceLine key={g.id} x={g.age} stroke="#f43f5e" strokeDasharray="3 3"><Label value={`${g.name}`} position="insideTop" angle={-90} fill="#f43f5e" fontSize={10} offset={20} /></ReferenceLine>))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="bg-indigo-900 text-white border-none">
             <div className="text-center p-2"><h4 className="text-indigo-200 text-xs font-bold uppercase mb-2">Wealth Score</h4><WealthScore score={kpis.wealthScore} /><p className="text-xs text-indigo-300 mt-2">Baseado em 4 pilares de análise</p></div>
          </Card>
          <CopilotModule insights={insights} loading={loading} onGenerate={generateAnalysis} hasData={!!insights} aiEnabled={aiEnabled}/>
        </div>
      </div>
    </div>
  );
};

const AssetsSection = ({ clientData, updateField, readOnly }) => {
  const addAsset = () => updateField('assets', [...(clientData.assets || []), { id: generateUUID(), name: 'Novo Ativo', value: 0, type: 'financial', liquidity: 'high' }]);
  const removeAsset = (id) => updateField('assets', clientData.assets.filter(a => a.id !== id));
  const updateAsset = (id, key, val) => updateField('assets', clientData.assets.map(a => a.id === id ? { ...a, [key]: val } : a));
  const totalWealth = (clientData.assets || []).reduce((acc, a) => acc + safeNumber(a.value), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <Card title="Inventário Patrimonial" action={!readOnly && <button onClick={addAsset} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Plus size={20}/></button>}>
        <div className="overflow-y-auto max-h-[500px] pr-2 space-y-3">
          {(clientData.assets || []).map(asset => (
            <div key={asset.id} className="group bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-sky-200 transition-colors">
                <div className="flex items-center gap-2 mb-2"><div className={`p-2 rounded-md ${ASSET_TYPES[asset.type]?.bg} ${ASSET_TYPES[asset.type]?.text} print:hidden`}><Wallet size={16}/></div><input className="flex-1 bg-transparent font-semibold text-slate-700 outline-none" value={asset.name} onChange={(e) => updateAsset(asset.id, 'name', e.target.value)} disabled={readOnly} />{!readOnly && <button onClick={() => removeAsset(asset.id)} className="text-slate-300 hover:text-rose-500 no-print"><Trash2 size={16}/></button>}</div>
                <div className="grid grid-cols-2 gap-2"><InputField label="Valor" value={asset.value} onChange={(v) => updateAsset(asset.id, 'value', v)} prefix="R$" readOnly={readOnly} /><InputField label="Tipo" value={asset.type} onChange={(v) => updateAsset(asset.id, 'type', v)} options={Object.keys(ASSET_TYPES).map(k => ({value: k, label: ASSET_TYPES[k].label}))} type="select" readOnly={readOnly} /></div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between"><span className="font-bold text-slate-500">Total</span><span className="font-bold text-emerald-600">{formatCurrency(totalWealth)}</span></div>
      </Card>
      <Card title="Fluxo"><div className="space-y-4"><InputField label="Aporte Mensal" value={clientData.monthlyContribution} onChange={(v) => updateField('monthlyContribution', v)} prefix="R$" readOnly={readOnly} /><InputField label="Custo Vida Atual" value={clientData.monthlyCostNow} onChange={(v) => updateField('monthlyCostNow', v)} prefix="R$" readOnly={readOnly} /><InputField label="Renda Aposentadoria" value={clientData.monthlyCostRetirement} onChange={(v) => updateField('monthlyCostRetirement', v)} prefix="R$" readOnly={readOnly} /></div></Card>
    </div>
  );
};

const GoalsSection = ({ clientData, updateField, readOnly }) => {
  const addGoal = () => updateField('financialGoals', [...(clientData.financialGoals || []), { id: generateUUID(), name: 'Novo Objetivo', value: 0, age: clientData.currentAge + 5, type: 'impact' }]);
  const removeGoal = (id) => updateField('financialGoals', clientData.financialGoals.filter(g => g.id !== id));
  const updateGoal = (id, key, val) => updateField('financialGoals', clientData.financialGoals.map(g => g.id === id ? { ...g, [key]: val } : g));
  const GOAL_TYPES = [{ value: 'impact', label: 'Impacta Patrimônio (Saque)' }, { value: 'no_impact', label: 'Apenas Marco Visual' }];

  return (
    <div className="animate-fade-in">
      <Card title="Metas & Objetivos" action={!readOnly && <button onClick={addGoal} className="text-sky-600 hover:bg-sky-50 p-1 rounded"><Plus size={20}/></button>}>
         <div className="overflow-y-auto max-h-[600px] pr-2 space-y-3">
           {(clientData.financialGoals || []).map(goal => (
               <div key={goal.id} className="group flex flex-col md:flex-row items-start md:items-center gap-4 bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className={`p-3 rounded-lg ${goal.type === 'impact' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'} print:hidden`}><Flag size={20} /></div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                      <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Objetivo</label><input className="w-full text-sm font-bold text-slate-700 outline-none border-b border-transparent hover:border-slate-300 focus:border-sky-500 bg-transparent" value={goal.name} onChange={(e) => updateGoal(goal.id, 'name', e.target.value)} disabled={readOnly} /></div>
                      <div><InputField label="Valor (R$)" value={goal.value} onChange={(v) => updateGoal(goal.id, 'value', v)} prefix="R$" readOnly={readOnly} /></div>
                      <div><InputField label="Idade Realização" value={goal.age} onChange={(v) => updateGoal(goal.id, 'age', v)} suffix="anos" readOnly={readOnly} /></div>
                      <div><InputField label="Tipo de Impacto" value={goal.type} onChange={(v) => updateGoal(goal.id, 'type', v)} type="select" options={GOAL_TYPES} readOnly={readOnly} /></div>
                  </div>
                  {!readOnly && <button onClick={() => removeGoal(goal.id)} className="text-slate-300 hover:text-rose-500 self-center no-print"><Trash2 size={16}/></button>}
               </div>
           ))}
         </div>
      </Card>
    </div>
  );
};

const SettingsSection = ({ clientData, handleUpdate, readOnly, aiEnabled, toggleAi }) => {
  const getContributionAgeError = () => {
    const age = clientData.contributionEndAge;
    if (age <= clientData.currentAge) return "Deve ser maior que idade atual";
    if (age > clientData.retirementAge) return "Deve ser menor/igual aposentadoria";
    return null;
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
        <Card title="Dados da Simulação" className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nome do Cliente" value={clientData.name} onChange={(v) => handleUpdate('name', v)} type="text" readOnly={readOnly} />
                <InputField label="Nome do Cenário" value={clientData.scenarioName} onChange={(v) => handleUpdate('scenarioName', v)} type="text" readOnly={readOnly} />
            </div>
        </Card>
        <Card title="Premissas">
        <div className="grid grid-cols-2 gap-4">
            <InputField label="Inflação" value={clientData.inflation} onChange={(v) => handleUpdate('inflation', v)} suffix="%" readOnly={readOnly} />
            <InputField label="Perfil" value={clientData.profile} type="select" options={[{value:'Conservador',label:'Conservador'},{value:'Moderado',label:'Moderado'},{value:'Agressivo',label:'Agressivo'}]} onChange={(v) => handleUpdate('profile', v)} readOnly={readOnly} />
            <InputField label="Retorno Conservador" value={clientData.returnRateConservative} suffix="%" onChange={(v) => handleUpdate('returnRateConservative', v)} readOnly={readOnly} />
            <InputField label="Retorno Moderado" value={clientData.returnRateModerate} suffix="%" onChange={(v) => handleUpdate('returnRateModerate', v)} readOnly={readOnly} />
            <InputField label="Retorno Agressivo" value={clientData.returnRateBold} suffix="%" onChange={(v) => handleUpdate('returnRateBold', v)} readOnly={readOnly} />
        </div>
        </Card>
        <Card title="Horizonte">
        <div className="grid grid-cols-2 gap-4">
            <InputField label="Idade Atual" value={clientData.currentAge} onChange={(v) => handleUpdate('currentAge', v)} readOnly={readOnly} />
            <InputField label="Fim Aportes" value={clientData.contributionEndAge} onChange={(v) => handleUpdate('contributionEndAge', parseFloat(v) || 0)} suffix="anos" readOnly={readOnly} error={getContributionAgeError()}/>
            <InputField label="Aposentadoria" value={clientData.retirementAge} onChange={(v) => handleUpdate('retirementAge', v)} readOnly={readOnly} />
            <InputField label="Exp. Vida" value={clientData.lifeExpectancy} onChange={(v) => handleUpdate('lifeExpectancy', v)} readOnly={readOnly} />
        </div>
        </Card>
        {!readOnly && (
          <>
            <Card title="Inteligência Artificial">
               <div className="flex items-center justify-between">
                  <div>
                     <h4 className="text-sm font-bold text-slate-700">Ativar Smart Copilot</h4>
                     <p className="text-xs text-slate-500">A IA gera insights educativos e não executa cálculos financeiros.</p>
                  </div>
                  <button onClick={toggleAi} className={`p-2 rounded-full transition-colors ${aiEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                   {aiEnabled ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                  </button>
               </div>
            </Card>
            <ApiKeyManager />
          </>
        )}
    </div>
  );
};

const AppContent = () => {
  const { user, loading: authLoading, logout } = useAuth(); // <--- FIX: DESTRUCTURE LOGOUT HERE
  const [state, dispatch] = useReducer(wealthReducer, initialState);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Firestore Sync
// --- NOVO: AUTO-SAVE (Salva automaticamente quando muda algo) ---
  useEffect(() => {
    // 1. Só salva se tiver usuário logado
    if (!user) return;

    // 2. Função que grava no banco
    const saveData = async () => {
      try {
        // Grava dentro da pasta do usuário (users -> UID -> data -> simulations)
        await setDoc(doc(db, 'users', user.uid, 'data', 'simulations'), {
          list: state.simulations, // Salva a lista inteira
          lastSaved: new Date()    // (Opcional) Salva a data da última alteração
        });
        console.log("✅ Auto-save: Dados salvos com sucesso!");
      } catch (error) {
        console.error("❌ Erro no Auto-save:", error);
      }
    };

    // 3. Debounce (Espera 1 segundinho após você parar de mexer para salvar)
    // Isso evita que o site salve mil vezes enquanto você digita rápido.
    const timeOutId = setTimeout(saveData, 1000);

    // Limpeza do timer
    return () => clearTimeout(timeOutId);

  }, [state.simulations, user]); // <--- O SEGREDO: Roda sempre que 'state.simulations' muda

  // Auto-Save to Firestore
  useEffect(() => {
    // 1. Se não tiver usuário (fez logout), ZERA a memória imediatamente.
    if (!user) {
      dispatch({ type: 'RESET_DATA' });
      return;
    }

    // 2. Se tiver usuário, monitora o banco de dados DELE (user.uid)
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'data', 'simulations'), (docSnap) => {
       if (docSnap.exists()) {
          // Se existirem dados salvos, carrega eles
          dispatch({ type: 'INIT_DATA', payload: docSnap.data().list });
       } else {
          // Se for usuário novo (sem dados), inicia com o padrão
          dispatch({ type: 'INIT_DATA', payload: [INITIAL_CLIENT_DATA] });
       }
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="animate-spin text-indigo-600" size={48}/></div>;
  if (!user) return <AuthScreen />;

  const clientData = state.simulations[state.activeSimIndex] || INITIAL_CLIENT_DATA;
  const isAdvisor = state.viewMode === 'advisor';
  
  const analysis = FinancialEngine.run(clientData, state.isStressTest);
  const handleUpdate = (field, value) => dispatch({ type: 'UPDATE_FIELD', field, value });
  const handlePrint = () => window.print();

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden print:overflow-visible print:h-auto print:bg-white">
      <style>{`@media print { .no-print { display: none !important; } .print-break { page-break-before: always; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } }`}</style>
      <aside className={`no-print ${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white flex flex-col transition-all duration-300 z-20 shadow-xl`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50">
          {isSidebarOpen && <span className="font-bold tracking-tight text-lg">WealthPro AI</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-white transition-colors"><Menu size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
           {isSidebarOpen && isAdvisor && (
             <div className="space-y-2">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cenário Ativo</label>
               <select className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg p-2 text-white outline-none focus:border-indigo-500 transition-colors" value={state.activeSimIndex} onChange={(e) => dispatch({type:'SET_ACTIVE_INDEX', payload: Number(e.target.value)})}>
                 {state.simulations.map((s, i) => <option key={s.id} value={i}>{s.scenarioName}</option>)}
               </select>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => dispatch({type: 'DUPLICATE_SIMULATION'})} className="w-full text-[10px] bg-slate-800 hover:bg-slate-700 py-2 rounded text-slate-300 flex items-center justify-center gap-1 border border-slate-700"><ScrollText size={12}/> Copiar</button>
                  <button onClick={() => dispatch({type: 'ADD_SIMULATION'})} className="w-full text-[10px] bg-indigo-600 hover:bg-indigo-500 py-2 rounded text-white flex items-center justify-center gap-1"><Plus size={12}/> Novo</button>
               </div>
             </div>
           )}
           {isSidebarOpen && (
             <div className="flex items-center justify-between bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-300 font-medium">{isAdvisor ? 'Modo Advisor' : 'Modo Cliente'}</span>
                <button onClick={() => dispatch({type: 'TOGGLE_MODE'})} className="text-slate-400 hover:text-white transition-colors">{isAdvisor ? <Unlock size={14}/> : <Lock size={14}/>}</button>
             </div>
           )}
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {[
            { id: 'dashboard', label: 'Visão Executiva', icon: LayoutDashboard },
            { id: 'assets', label: 'Patrimônio', icon: DollarSign },
            { id: 'goals', label: 'Metas de Vida', icon: Flag },
            { id: 'succession', label: 'Sucessão', icon: ShieldCheck },
            { id: 'settings', label: 'Configurações', icon: Settings },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <item.icon size={18} strokeWidth={2} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
           <button onClick={logout} className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full px-2">
             <LogOut size={18} />
             {isSidebarOpen && <span className="text-sm font-medium">Sair</span>}
           </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10 print:h-auto print:border-none print:shadow-none print:px-0">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{activeTab === 'dashboard' ? 'Planejamento Integrado' : activeTab === 'succession' ? 'Sucessão Patrimonial' : 'Gestão Patrimonial'}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-2 font-medium"><User size={12}/> {clientData.name} • {clientData.profile} • v{APP_VERSION}</p>
          </div>
          <div className="flex gap-3 no-print">
             <button onClick={() => dispatch({type: 'SAVE_SNAPSHOT'})} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Salvar Snapshot"><History size={20}/></button>
             <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-all"><Printer size={16} /> Exportar PDF</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-50 p-8 print:p-0 print:bg-white">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && <OverviewSection projections={analysis} clientData={clientData} isStressTest={state.isStressTest} toggleStressTest={() => dispatch({type: 'TOGGLE_STRESS'})} viewMode={state.viewMode} aiEnabled={state.aiEnabled} />}
            {activeTab === 'assets' && <AssetsSection clientData={clientData} updateField={handleUpdate} readOnly={!isAdvisor} />}
            {activeTab === 'goals' && <GoalsSection clientData={clientData} updateField={handleUpdate} readOnly={!isAdvisor} />}
            {activeTab === 'succession' && <SuccessionSection clientData={clientData} kpis={analysis.kpis} isAdvisor={isAdvisor} />}
            {activeTab === 'settings' && <SettingsSection clientData={clientData} handleUpdate={handleUpdate} readOnly={!isAdvisor} aiEnabled={state.aiEnabled} toggleAi={() => dispatch({type: 'TOGGLE_AI'})} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default function WealthPlannerApp() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}