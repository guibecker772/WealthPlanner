# WealthPlanner Pro - Implementação v7.1.0
## Patrimônio Internacional (FX) + Previdência (VGBL/PGBL) + Eficiência Fiscal PGBL + Guia de Alocação Avançado

---

## NOVAS FUNCIONALIDADES v7.1.0 (Janeiro 2026)

### Detalhes de Carteira (Patrimônio Financeiro)

| Funcionalidade | Descrição |
|----------------|-----------|
| **Accordion Detalhes** | Ativos financeiros agora possuem accordion "Detalhes da Carteira" para quebra por classes |
| **Modo BR** | 8 classes: Caixa, Pós-fixado, Pré-fixado, IPCA+, Ações BR, FIIs, Exterior, Outros |
| **Modo INTL** | 7 classes: Cash, Bonds Nominal, Bonds Inflation, Equities, REITs, Alternatives, Crypto |
| **Mapeamento automático** | INTL → BR: cash→caixa, equities/reits→exterior, bonds_nominal→pos, bonds_inflation→ipca |
| **Normalização** | Botão "Normalizar para 100%" quando soma ≠ 100% |
| **Integração Guia** | `buildCurrentAllocationFromAssets` agora usa breakdown quando `portfolioDetails.enabled` |

### Schema de `portfolioDetails`:
```javascript
{
  enabled: boolean,           // Ativa/desativa detalhamento
  detailMode: 'BR' | 'INTL' | 'CUSTOM',
  breakdown: {                // Para modo BR
    caixa: 0, pos: 0, pre: 0, ipca: 0,
    acoes: 0, fiis: 0, exterior: 0, outros: 0,
  },
  intlBreakdown: {            // Para modo INTL
    cash: 0, bonds_nominal: 0, bonds_inflation: 0,
    equities: 0, reits: 0, alternatives: 0, crypto_other: 0,
  },
  notes: '',
}
```

### Templates de Carteira (Guia de Alocação)

| Template | RV Max | Exterior Max | Retorno Esperado | Vol Esperada |
|----------|--------|--------------|------------------|--------------|
| **Conservador** 🛡️ | 15% | 0% | ~11% | ~4% |
| **Moderado** ⚖️ | 35% | 5% | ~12% | ~8% |
| **Arrojado** 🚀 | 65% | 15% | ~13% | ~14% |

### Soft Constraints (Guardrails)

| Perfil | Max RV | Max Exterior | Min RF | Max Classe Única |
|--------|--------|--------------|--------|------------------|
| Conservador | 25% | 15% | 70% | 40% |
| Moderado | 45% | 25% | 50% | 35% |
| Arrojado | 70% | 40% | 25% | 35% |

- **Warnings visuais** aparecem quando carteira viola limites
- **Severity**: `warning` (amarelo) ou `error` (vermelho) para violações > 20%

### Modo Cliente
- Toggle "Modo Cliente" oculta seções técnicas (Premissas, Otimizador avançado)
- Ideal para apresentação a clientes
- Salva preferência em `allocationGuide.clientModeEnabled`

### Bug Fix: 3500% no Objetivo e Sugestões
- **Problema**: Valores de `optimizeAllocation.recommended` já estavam em 0-100, mas eram multiplicados por 100
- **Solução**: Removida multiplicação redundante em AllocationGuidePage linhas 1690-1691

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

---

## H) GUIA DE ALOCAÇÃO - FASE 5: Integração com Patrimônio

### Implementado em Janeiro 2026

### Objetivo
Permitir que o usuário "importe" ou "crie automaticamente" uma carteira no Guia de Alocação com base nos ativos existentes em Patrimônio → Ativos.

### Funções adicionadas em `src/utils/allocationMath.js`:

| Função | Descrição |
|--------|-----------|
| `ASSET_TYPE_TO_ALLOCATION_CLASS` | Mapeamento de tipo de ativo (financial, previdencia, international, etc) para classe do Guia (cash, pos, pre, ipca, acoes, fiis, exterior, outros) |
| `inferClassFromName(name)` | Tenta inferir a classe pelo nome do ativo (ex: "CDB Banco X" → pos, "Tesouro IPCA+" → ipca) |
| `convertAssetToBRL(asset, scenarioFx)` | Converte um ativo para BRL usando fxRate do ativo ou câmbio do cenário |
| `getAssetAllocationClass(asset)` | Determina a classe do Guia para um ativo (retorna null para ilíquidos) |
| `buildCurrentAllocationFromAssets(assets, scenarioFx, options)` | Constrói alocação atual baseada nos ativos do patrimônio. Retorna: `{ totalBRL, byClassPercent, byClassValueBRL, diagnostics }` |
| `createImportedPortfolio(currentAllocation)` | Cria uma carteira importada a partir dos ativos para adicionar a allocationGuide.portfolios |
| `compareAllocations(currentBreakdown, plannedBreakdown)` | Compara duas carteiras e retorna deltas e insights (desvios > 5pp) |

### Alteração em `src/layouts/AppShell.jsx`:

- Adicionado `importedPortfolioId: null` ao `allocationGuide` default em `ensureClientShape()`
- Garantia retroativa: se `allocationGuide` existe mas não tem `importedPortfolioId`, adiciona

### Novos componentes em `src/pages/AllocationGuidePage.jsx`:

#### Card "Carteira Atual do Cliente (Patrimônio)"
- KPIs: Total Investível, Ativos Mapeados, Classes c/ Alocação, Maior Concentração
- Breakdown por classe com barra de progresso e valor
- Diagnósticos (concentração, warnings)
- Botões:
  - "Criar carteira a partir do Patrimônio" (se não há importada)
  - "Atualizar carteira importada" (se já existe)

#### Card "Comparação: Atual vs Planejada"
- Grid com: Classe | Atual | Planejada | Δ Delta
- Deltas coloridos: >2pp (âmbar), <-2pp (azul), alinhado (neutro)
- Insights para desvios significativos (> 5pp)
- Badge de sucesso se alocação está alinhada

### Mapeamento de tipos de ativo:

| Tipo em AssetsPage | Classe no Guia | Observação |
|--------------------|----------------|------------|
| financial | Inferido pelo nome ou "outros" | Usa heurística (CDB→pos, IPCA→ipca, etc) |
| previdencia | ipca | Assume mix conservador |
| international | exterior | Moeda estrangeira |
| real_estate | *(excluído)* | Ilíquido - não investível |
| vehicle | *(excluído)* | Ilíquido - não investível |
| business | *(excluído)* | Ilíquido - não investível |
| other | outros | Fallback |

### Fluxo de uso:

1. Usuário cadastra ativos em Patrimônio → Ativos
2. Vai para Guia de Alocação → Card "Carteira Atual" mostra distribuição estimada
3. Clica "Criar carteira a partir do Patrimônio" → Carteira é criada automaticamente
4. Pode comparar carteira atual com carteira planejada para ver deltas
5. Se ativos mudam, clica "Atualizar carteira importada" para re-sincronizar

### Regras de negócio:

- Ativos ilíquidos (imóveis, veículos, negócios) são **excluídos** do patrimônio investível
- Conversão FX usa câmbio do cenário (USD_BRL, EUR_BRL) ou fxRate do ativo
- Previdência pode ser incluída/excluída via option `includePrevidencia`
- A carteira importada recebe flag `isImported: true` para identificação
- Todas alterações seguem fluxo draft vs official (só persiste no "Salvar")

---

## I) GUIA DE ALOCAÇÃO - FASE 6: Persistência, Export/Share e Polimento

### Implementado em Janeiro 2026

### Objetivo
Finalizar o módulo Guia de Alocação para uso real em atendimento (advisor) e cliente final.

### Arquivos criados:

| Arquivo | Descrição |
|---------|-----------|
| `src/utils/exportAllocationGuide.js` | Funções de exportação (CSV e Print HTML) |

### Funções em exportAllocationGuide.js:

| Função | Descrição |
|--------|-----------|
| `generateAllocationGuideCSV()` | Gera CSV em pt-BR (separador `;`, decimal `,`) com todas as carteiras |
| `downloadCSV()` | Baixa o CSV como arquivo (com BOM para Excel) |
| `generatePrintHTML()` | Gera HTML print-friendly para impressão/PDF |
| `printAllocationGuide()` | Abre janela de impressão com o HTML gerado |

### Alterações em AllocationGuidePage.jsx:

#### Novos estados:
- `comparisonPortfolioId` - ID da carteira para comparação (toggle)
- `showExportConfirm` - Controla modal de confirmação de export
- `pendingExportAction` - Ação pendente ('csv' | 'print')

#### Novos useMemos:
- `hasInvalidBreakdowns` - Verifica se alguma carteira tem breakdown ≠ 100%
- `fxWarnings` - Warnings quando câmbio não definido para moedas estrangeiras
- `comparisonPortfolio` - Carteira selecionada para comparação
- `comparisonResult` - Resultado da comparação com Top 3 desvios, maior excesso/falta

#### Novos handlers:
- `doExportCSV()` / `doPrint()` - Funções internas de export
- `handleExportCSV()` / `handlePrint()` - Handlers com verificação de breakdown
- `handleConfirmExport()` / `handleCancelExport()` - Modal de confirmação

#### Novos componentes UI:
- **Modal de confirmação** - Quando breakdown inválido, pergunta antes de exportar
- **Warning de FX** - Alerta quando USD/EUR sem câmbio definido
- **Botões CSV e Imprimir** - No header da página
- **Toggle de carteira** - No card de comparação, permite escolher qual carteira comparar
- **Top 3 desvios** - Mostra os 3 maiores desvios entre atual e planejada
- **Maior excesso / Maior falta** - Badges resumindo onde está sobrando/faltando

### Helpers de formatação adicionados:
- `safeDisplayPercent()` - Retorna "—" quando valor não calculável

### Fluxo de Export:

1. Usuário clica "CSV" ou "Imprimir" no header
2. Se alguma carteira tem breakdown ≠ 100%:
   - Modal aparece: "Deseja exportar mesmo assim?"
   - Confirmar → executa export
   - Cancelar → fecha modal
3. Se tudo OK → export direto

### CSV gerado:

```
# Guia de Alocação - Exportado em 23/01/2026 14:30
# Cenário: Nome do Cenário
# Câmbio: USD/BRL 5,00; EUR/BRL 5,50

Carteira;Moeda;Valor Original;Valor BRL;Caixa (%);Pós-fixado (%);...
Carteira 1;BRL;100000,00;100000,00;10,0;30,0;...
```

### Guardrails implementados:

1. **Proteção NaN/undefined** - Todos os cálculos e renders usam helpers seguros
2. **Warning de FX** - Alerta visual quando câmbio não definido
3. **Modal de confirmação** - Impede export acidental de dados incompletos
4. **Fallback FX** - Usa DEFAULT_FX_RATES quando câmbio não definido

### Persistência (draft vs official):

- Todas alterações usam `updateAllocationGuide()` → `updateField()` → draft
- Nenhum auto-save para Firestore
- Persiste APENAS quando usuário clica "Salvar" do cenário
- Recarregar sem salvar → volta ao último official

---

## J) GUIA DE ALOCAÇÃO - Checklist de QA

### Testes obrigatórios:

#### Básico:
- [ ] Abrir "Guia de Alocação" → NÃO dá tela branca
- [ ] Console sem erros vermelhos
- [ ] Build passa (`npm run build`)

#### CRUD Carteiras:
- [ ] Criar carteira → aparece na lista
- [ ] Editar nome → salva corretamente
- [ ] Duplicar carteira → cria cópia
- [ ] Excluir carteira → remove da lista
- [ ] Mudar valor/moeda → atualiza KPIs

#### Breakdown:
- [ ] Editar percentuais → soma atualiza
- [ ] Clicar "Normalizar" → soma = 100%
- [ ] Breakdown < 100% → warning aparece
- [ ] Breakdown > 100% → warning aparece

#### Import do Patrimônio:
- [ ] Com ativos cadastrados → card "Carteira Atual" aparece
- [ ] Clicar "Criar carteira" → carteira importada é criada
- [ ] Mudar ativos → clicar "Atualizar" → carteira atualiza

#### Comparação:
- [ ] Toggle de carteira funciona
- [ ] Top 3 desvios aparece
- [ ] Maior excesso / Maior falta aparece
- [ ] Alocação alinhada → badge verde aparece

#### Export:
- [ ] Clicar CSV → baixa arquivo .csv
- [ ] Clicar Imprimir → abre janela de impressão
- [ ] Com breakdown inválido → modal aparece
- [ ] Confirmar → exporta mesmo assim

#### Persistência:
- [ ] Editar sem salvar → indicador "Não salvo" aparece
- [ ] Recarregar sem salvar → volta ao official
- [ ] Clicar "Salvar" → persiste
- [ ] Recarregar após salvar → mantém dados

#### Guardrails:
- [ ] Carteira USD sem fx → warning amarelo aparece
- [ ] Métricas não calculáveis → mostra "—"
- [ ] Dados antigos sem allocationGuide → não crasha

---

## K) Como usar o Guia de Alocação em atendimento

### 1. Criando a primeira carteira:
1. Acesse "Guia de Alocação" no menu lateral
2. Clique "Criar primeira carteira"
3. Dê um nome descritivo (ex: "Conservador", "Agressivo")
4. Defina o valor total e moeda

### 2. Configurando o breakdown:
1. Preencha os percentuais para cada classe de ativo
2. A soma deve ser 100% (use "Normalizar" se necessário)
3. Observe o painel de diagnósticos à direita

### 3. Interpretando risco e retorno:
- **Retorno Nominal**: Expectativa bruta anual
- **Retorno Real**: Após descontar inflação
- **Volatilidade**: Desvio padrão anual (risco)
- **VaR 95%**: Perda máxima esperada em 95% dos casos
- **Risco em R$**: VaR aplicado ao valor da carteira

### 4. Importando do Patrimônio:
1. Cadastre ativos em "Patrimônio → Ativos"
2. Volte para "Guia de Alocação"
3. O card "Carteira Atual" mostra a distribuição estimada
4. Clique "Criar carteira a partir do Patrimônio"

### 5. Comparando alocações:
1. No card "Comparação", selecione a carteira planejada
2. Veja os deltas por classe
3. Identifique onde está sobrando/faltando
4. Use os insights para ajustar

### 6. Exportando para cliente:
1. Clique "CSV" para planilha ou "Imprimir" para PDF
2. Inclua no material do atendimento
3. O PDF é print-friendly sem elementos de navegação
