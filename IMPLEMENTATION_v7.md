# WealthPlanner Pro - Implementação v7.0.1
## Patrimônio Internacional (FX) + Previdência (VGBL/PGBL) + Eficiência Fiscal PGBL

---

## CORREÇÕES v7.0.1 (Janeiro 2026)

### Problemas resolvidos:

| # | Problema | Solução |
|---|----------|---------|
| 1 | Inputs de câmbio USD/BRL e EUR/BRL não editavam | `Input type="number"` passa valor direto (não evento). Corrigidos handlers para usar valor diretamente. Alterado para `type="text"` com `inputMode="decimal"` |
| 2 | Input de valor mostrava R$ em vez de US$/€ | Criada `formatCurrencyWithCode()` e `getCurrencySymbol()` em format.js. Input customizado mostra símbolo correto |
| 3 | Campo de câmbio por ativo removido | Removido input de câmbio individual. Conversão usa apenas câmbio do cenário |
| 4 | Falta de renda mensal no PGBL | Adicionado input "Renda Bruta Mensal" que auto-calcula anual e contribuição (12%) |
| 5 | Rentabilidade/Taxa Admin não editavam | Corrigidos onChange handlers para usar valor direto com `normalizeInputValue()` |
| 6 | Ponto inicial do gráfico PGBL | Primeiro ponto agora inclui 1º ano de aportes e rentabilidade. Tooltip explica "final do 1º ano" |

### Arquivos alterados nesta correção:

| Arquivo | Alterações |
|---------|------------|
| `src/pages/AssetsPage.jsx` | Corrigidos handlers FX, input customizado para valor com símbolo dinâmico, removido campo câmbio por ativo |
| `src/utils/format.js` | Novas funções: `formatCurrencyWithCode()`, `getCurrencySymbol()` |
| `src/utils/fx.js` | `getEffectiveFxRate()` agora ignora `asset.fxRate` (somente câmbio do cenário) |
| `src/components/succession/PGBLEfficiencyCard.jsx` | Adicionado input renda mensal, corrigidos handlers de rentabilidade/admin, tooltip melhorado |
| `src/engine/pgblEngine.js` | Primeiro ponto da projeção agora inclui 1º ano de evolução |

---

## A) LISTA DE ARQUIVOS ALTERADOS/CRIADOS

### Novos arquivos criados:
| Arquivo | Descrição |
|---------|-----------|
| `src/utils/fx.js` | Funções de conversão de câmbio (FX) |
| `src/engine/pgblEngine.js` | Motor de cálculo para eficiência fiscal PGBL |
| `src/components/succession/PGBLEfficiencyCard.jsx` | Componente da aba Eficiência Fiscal PGBL |
| `src/components/succession/PrevidenciaSuccessionCard.jsx` | Componente de Previdência na Sucessão |
| `firestore.rules` | Regras de segurança sugeridas para produção |

### Arquivos modificados:
| Arquivo | Alterações |
|---------|------------|
| `src/constants/assetTypes.js` | Adicionados tipos `previdencia` e `international`, constantes CURRENCIES, PREVIDENCIA_PLAN_TYPES, PREVIDENCIA_TAX_REGIMES |
| `src/constants/config.js` | Adicionados STRESS_FX_SHOCK e DEFAULT_FX_RATES, versão atualizada |
| `src/engine/FinancialEngine.js` | Integração com FX, splitAssets agora considera previdência, calculateSuccession inclui previdenciaTotal/VGBL/PGBL, exposição cambial |
| `src/pages/AssetsPage.jsx` | UI completa para moeda, câmbio do cenário, previdência (VGBL/PGBL) com detalhes, KPIs de exposição cambial |
| `src/pages/SuccessionPage.jsx` | Novas abas "Previdência Privada" e "Eficiência Fiscal PGBL", bloco de previdência na visão geral |
| `src/utils/format.js` | Novas funções `formatCurrencyWithCode()` e `getCurrencySymbol()` para suporte multi-moeda |

---

## B) MÓDULOS CRIADOS

### 1. `src/utils/fx.js` - Conversão de Câmbio
```javascript
- SUPPORTED_CURRENCIES: ["BRL", "USD", "EUR"]
- DEFAULT_FX_RATES: { USD_BRL: 5.0, EUR_BRL: 5.5 }
- getEffectiveFxRate(asset, scenarioFx): Usa APENAS câmbio do cenário (não mais asset.fxRate)
- convertToBRL(asset, scenarioFx): Converte valor para BRL
- normalizeAssetCurrency(asset): Compatibilidade com ativos antigos
- calculateFxExposure(assets, scenarioFx): Calcula exposição cambial
- applyFxShock(scenarioFx, shocks): Aplica choque de câmbio (stress test)
- validateAssetFx(asset, scenarioFx): Valida se FX está definido
```

### 2. `src/engine/pgblEngine.js` - Eficiência Fiscal PGBL
```javascript
- IR_MARGINAL_RATES: Alíquotas marginais do IR
- REGRESSIVE_TABLE: Tabela regressiva PGBL/VGBL
- calculateDeductionLimit(): Limite de 12% da renda tributável
- calculateAnnualTaxSavings(): Economia fiscal anual
- projectPGBLAccumulation(): Projeção de acumulação (ponto inicial inclui 1º ano)
- calculateNetComparison(): Comparativo PGBL vs tradicional (Fase 2)
- formatChartData(): Dados para gráfico Recharts
- calculateProjectionSummary(): Métricas resumidas
```

### 3. `src/utils/format.js` - Formatação Multi-moeda (NOVO)
```javascript
- formatCurrencyWithCode(value, currency): Formata valor na moeda especificada (BRL/USD/EUR)
- getCurrencySymbol(currency): Retorna símbolo (R$, US$, €)
- formatCurrencyBR(value): Formata em BRL (mantido para compatibilidade)
```

---

## C) ALTERAÇÕES NAS PÁGINAS/COMPONENTES

### AssetsPage.jsx
- Seção "Câmbio do Cenário" (colapsável) com USD/BRL e EUR/BRL
- **Inputs FX usam `type="text"` com `inputMode="decimal"`** para permitir digitação livre
- Cada ativo tem seletor de moeda (BRL/USD/EUR)
- **Input de valor customizado** com símbolo dinâmico (R$, US$, €)
- **Removido campo de câmbio por ativo** - usa apenas câmbio do cenário
- Conversão em tempo real: "≈ R$ X.XXX,XX (câmbio: X.XX)"
- Botão separado para adicionar Previdência
- Detalhes de previdência (expandível): planType, taxRegime, provider, adminFee, notes
- Warnings de FX quando câmbio não definido
- KPIs de exposição cambial: BRL%, USD%, EUR%

### PGBLEfficiencyCard.jsx
- **Novo input "Renda Bruta Mensal"** que auto-calcula renda anual e contribuição
- Flag `userEditedContribution` para detectar edição manual
- **Handlers corrigidos** para usar `normalizeInputValue()` 
- **Tooltip melhorado** explicando "final do 1º ano"
- Inputs de rentabilidade/admin agora editáveis sem erros

### SuccessionPage.jsx
- Nova aba "Previdência Privada" com:
  - Lista de planos cadastrados
  - Toggles: "Fora do inventário?" e "Incide ITCMD?"
  - Vantagens da previdência na sucessão
  - Disclaimer legal
- Nova aba "Eficiência Fiscal PGBL" com:
  - Formulário de inputs (idade, renda mensal/anual, contribuição, alíquota, etc.)
  - Gráfico de barras empilhadas (PGBL + Benefício Fiscal)
  - KPIs: Dedução anual, economia fiscal, saldo final
  - Warnings de elegibilidade

### pgblEngine.js
- **Primeiro ponto da projeção** agora inclui 1º ano de aportes + rentabilidade
- Campo `label` adicionado ao primeiro ponto: "Aos X (final do 1º ano)"

---

## D) CHECKLIST DE VALIDAÇÃO

### Teste local (localhost)

#### Cenário A: Ativo BRL básico
- [ ] Rodar `npm install` e `npm run dev`
- [ ] Adicionar ativo BRL (ex: "Tesouro Direto", R$ 100.000)
- [ ] Clicar "Salvar"
- [ ] F5 → Verificar que o ativo persiste
- [ ] Verificar no Firebase Console: `users/{uid}/simulations/{id}` contém o ativo

#### Cenário B: Ativo USD/EUR
- [ ] Adicionar ativo USD (ex: "ETF VOO", $10,000)
- [ ] Sem fxRate → Deve usar câmbio do cenário (5.00)
- [ ] Verificar valor convertido: "≈ R$ 50.000,00"
- [ ] Adicionar ativo EUR com fxRate próprio (6.00)
- [ ] Verificar somatório no patrimônio total
- [ ] Salvar → F5 → Persistir

#### Cenário C: Câmbio do cenário
- [ ] Expandir "Câmbio do Cenário"
- [ ] Alterar USD/BRL para 5.50
- [ ] Verificar que ativos USD atualizam o valor convertido
- [ ] Salvar → F5 → Câmbio persiste

#### Cenário D: Previdência
- [ ] Adicionar Previdência PGBL (R$ 200.000)
- [ ] Expandir detalhes → Preencher: planType=PGBL, taxRegime=regressivo, provider=XP
- [ ] Adicionar Previdência VGBL (R$ 150.000)
- [ ] Ir em Sucessão → Visão Geral → Verificar bloco "Previdência na Sucessão"
- [ ] Ir em aba "Previdência Privada" → Verificar lista e toggles
- [ ] Toggle "Fora do inventário" → Verificar que custos atualizam
- [ ] Salvar → F5 → Persistir

#### Cenário E: Eficiência Fiscal PGBL
- [ ] Ir em Sucessão → Aba "Eficiência Fiscal PGBL"
- [ ] Preencher: idade=35, alvo=65, renda=300k, contribuição=36k, alíquota=27.5%
- [ ] Verificar: Dedução = R$ 36.000 (limitado a 12% de 300k)
- [ ] Verificar: Economia fiscal = R$ 9.900/ano (36k × 27.5%)
- [ ] Desligar "Declaração Completa" → Dedução zera → Warning aparece
- [ ] Religar "Declaração Completa"
- [ ] Desligar "Investir Economia Fiscal" → Barra azul some do gráfico
- [ ] Verificar gráfico de barras empilhadas

#### Cenário F: Draft vs Official
- [ ] Editar um ativo sem salvar
- [ ] Verificar indicador "Não salvo" no header
- [ ] Tentar trocar de cenário → Modal de descarte deve aparecer
- [ ] Confirmar descarte → Alterações perdidas, volta ao oficial
- [ ] Editar novamente → Clicar "Salvar" → Indicador some
- [ ] F5 → Alterações persistem

#### Cenário G: Stress Test com câmbio
- [ ] Ativar Stress Test no header
- [ ] Verificar que ativos USD/EUR aumentam (+20% câmbio)
- [ ] Verificar impacto no patrimônio total

### Firestore
- [ ] Console Firebase: verificar documento em `users/{uid}/simulations/{id}`
- [ ] Campos presentes: name, data, createdAt, updatedAt
- [ ] data.assets contém os novos campos: currency, amountCurrency, fxRate
- [ ] data.fx contém: USD_BRL, EUR_BRL
- [ ] data.previdenciaSuccession contém: excludeFromInventory, applyITCMD

---

## E) REGRAS FIRESTORE PARA PRODUÇÃO

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/simulations/{simId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /users/{uid}/tracking/{trackingId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## F) COMPATIBILIDADE RETROATIVA

### Migração automática de dados antigos:
- Ativos sem `currency` → assume "BRL"
- Ativos sem `amountCurrency` → usa `value`
- Cenários sem `fx` → usa DEFAULT_FX_RATES
- Cenários sem `previdenciaSuccession` → usa defaults (excludeFromInventory=true, applyITCMD=false)

### Não há breaking changes:
- Campos novos são opcionais com defaults
- Ativos existentes continuam funcionando
- Firestore merge preserva dados antigos

---

## G) PRÓXIMOS PASSOS (Opcional)

1. **Fase 2 PGBL**: Implementar comparativo líquido completo (já tem funções preparadas em pgblEngine.js)
2. **API de câmbio**: Integrar com API para buscar câmbio em tempo real
3. **Beneficiários de previdência**: UI para adicionar/editar beneficiários
4. **Export PDF**: Incluir exposição cambial e previdência nos relatórios
5. **Multi-device**: Ativar subscribeSimulations para sync em tempo real
