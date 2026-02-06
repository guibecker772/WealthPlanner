import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Calendar, 
  DollarSign, 
  PiggyBank, 
  Wallet, 
  Target,
  ArrowRight,
  Sparkles
} from "lucide-react";

/**
 * Converte valor para número, tolerando strings numéricas.
 */
function toNumber(val) {
  if (val == null) return 0;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Verifica se pelo menos 1 ativo tem valor > 0.
 * Tolera aliases: value, amount, valor, currentValue, balance, amountCurrency, valueInBRL
 */
function hasAssetWithValue(assets) {
  if (!Array.isArray(assets) || assets.length === 0) return false;
  return assets.some((a) => {
    const v = toNumber(a.value) || toNumber(a.amount) || toNumber(a.valor) || 
              toNumber(a.currentValue) || toNumber(a.balance) || 
              toNumber(a.amountCurrency) || toNumber(a.valueInBRL);
    return v > 0;
  });
}

/**
 * Verifica se há aporte definido (monthly ou timeline).
 */
function hasContribution(clientData) {
  if (toNumber(clientData.monthlyContribution) > 0) return true;
  if (Array.isArray(clientData.contributionTimeline) && clientData.contributionTimeline.length > 0) return true;
  if (Array.isArray(clientData.contributionRanges) && clientData.contributionRanges.length > 0) return true;
  return false;
}

/**
 * Calcula completude do cadastro.
 * Retorna { percent, items, optionalItems }
 */
export function getCompleteness(clientData, assets, financialGoals) {
  const cd = clientData || {};
  const assetsList = assets || [];
  const goalsList = financialGoals || [];

  // 5 itens obrigatórios (20% cada)
  const items = [
    {
      key: "name",
      label: "Nome do cliente",
      icon: User,
      done: Boolean(cd.name && String(cd.name).trim().length > 0),
      ctaPath: "/dashboard/settings",
      ctaLabel: "Preencher",
    },
    {
      key: "ages",
      label: "Idades (atual, aposentadoria, expectativa)",
      icon: Calendar,
      done: toNumber(cd.currentAge) > 0 && toNumber(cd.retirementAge) > 0 && toNumber(cd.lifeExpectancy) > 0,
      ctaPath: "/dashboard/settings",
      ctaLabel: "Preencher",
    },
    {
      key: "costs",
      label: "Custos mensais (atual e aposentadoria)",
      icon: DollarSign,
      done: (toNumber(cd.monthlyCostCurrent) > 0 || toNumber(cd.monthlyCostNow) > 0) && toNumber(cd.monthlyCostRetirement) > 0,
      ctaPath: "/dashboard/settings",
      ctaLabel: "Preencher",
    },
    {
      key: "contribution",
      label: "Aporte definido",
      icon: PiggyBank,
      done: hasContribution(cd),
      ctaPath: "/dashboard/settings",
      ctaLabel: "Definir",
    },
    {
      key: "assets",
      label: "Patrimônio cadastrado",
      icon: Wallet,
      done: hasAssetWithValue(assetsList),
      ctaPath: "/dashboard/assets",
      ctaLabel: "Adicionar",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const percent = Math.round((doneCount / items.length) * 100);

  // Itens opcionais (fora do %)
  const optionalItems = [
    {
      key: "goals",
      label: "Metas financeiras",
      icon: Target,
      done: goalsList.length > 0,
      ctaPath: "/dashboard/goals",
      ctaLabel: "Adicionar",
      optional: true,
    },
    {
      key: "contributionEndAge",
      label: "Idade fim de aportes",
      icon: Calendar,
      done: toNumber(cd.contributionEndAge) > 0,
      ctaPath: "/dashboard/settings",
      ctaLabel: "Definir",
      optional: true,
      hint: "Recomendado para projeção precisa",
    },
  ];

  return { percent, items, optionalItems, isComplete: percent === 100 };
}

/**
 * Componente de checklist de progresso para onboarding.
 * 
 * Props:
 * - clientData: objeto com dados do cliente
 * - assets: array de ativos
 * - financialGoals: array de metas
 * - readOnly: boolean - oculta CTAs
 */
export default function OnboardingChecklist({ clientData, assets, financialGoals, readOnly }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const { percent, items, optionalItems, isComplete } = useMemo(
    () => getCompleteness(clientData, assets, financialGoals),
    [clientData, assets, financialGoals]
  );

  const handleNavigate = (path) => {
    navigate(path);
  };

  // Cor da barra de progresso
  const progressColor = percent === 100 ? "from-green-400 to-green-500" : "from-accent to-accent-dark";

  // Estado compacto quando 100%
  if (isComplete && collapsed) {
    return (
      <div className="mb-6 p-4 rounded-2xl border border-green-500/30 bg-green-500/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={24} className="text-green-400" />
          <span className="text-sm font-semibold text-green-400">✅ Tudo pronto para gerar o plano!</span>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={() => handleNavigate("/dashboard/settings")}
              className="text-xs px-3 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
            >
              Rever dados
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
            aria-label="Expandir checklist"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-5 rounded-2xl border border-border bg-background-secondary/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? "bg-green-500/20" : "bg-accent/20"}`}>
            {isComplete ? (
              <Sparkles size={20} className="text-green-400" />
            ) : (
              <Target size={20} className="text-accent" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {isComplete ? "✅ Tudo pronto!" : "Progresso do cadastro"}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {isComplete ? "Seu plano está completo para análise" : `${percent}% concluído • ${items.filter(i => !i.done).length} pendência(s)`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
          aria-label={collapsed ? "Expandir" : "Minimizar"}
        >
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 bg-surface-muted rounded-full overflow-hidden mb-4">
        <div
          className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Lista de itens (expansível) */}
      {!collapsed && (
        <div className="space-y-2">
          {/* Itens obrigatórios */}
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  item.done 
                    ? "border-green-500/20 bg-green-500/5" 
                    : "border-border bg-surface/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                  ) : (
                    <Circle size={18} className="text-text-secondary shrink-0" />
                  )}
                  <Icon size={16} className={item.done ? "text-green-400" : "text-text-secondary"} />
                  <span className={`text-sm ${item.done ? "text-green-400" : "text-text-primary"}`}>
                    {item.label}
                  </span>
                </div>
                {!item.done && !readOnly && (
                  <button
                    type="button"
                    onClick={() => handleNavigate(item.ctaPath)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all font-medium"
                  >
                    {item.ctaLabel}
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Separador */}
          {optionalItems.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border">
              <p className="text-xs text-text-secondary mb-2 font-medium">Recomendado (opcional)</p>
              {optionalItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      item.done 
                        ? "border-green-500/20 bg-green-500/5" 
                        : "border-border/50 bg-surface/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.done ? (
                        <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                      ) : (
                        <Circle size={18} className="text-text-secondary/50 shrink-0" />
                      )}
                      <Icon size={16} className={item.done ? "text-green-400" : "text-text-secondary/50"} />
                      <div>
                        <span className={`text-sm ${item.done ? "text-green-400" : "text-text-secondary"}`}>
                          {item.label}
                        </span>
                        {item.hint && !item.done && (
                          <p className="text-xs text-text-secondary/60 mt-0.5">{item.hint}</p>
                        )}
                      </div>
                    </div>
                    {!item.done && !readOnly && (
                      <button
                        type="button"
                        onClick={() => handleNavigate(item.ctaPath)}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all font-medium"
                      >
                        {item.ctaLabel}
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA principal quando 100% */}
          {isComplete && !readOnly && (
            <div className="pt-3 mt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-text-secondary">Seu plano está pronto para análise e exportação.</span>
              <button
                type="button"
                onClick={() => handleNavigate("/dashboard/settings")}
                className="text-xs px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-highlight transition-all"
              >
                Rever dados
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
