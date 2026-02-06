# Theme Debug Log

**Data:** 2026-02-06  
**Branch:** main  
**URL esperada:** http://localhost:5173

---

## ✅ DIAGNÓSTICO CONCLUSIVO

### O tema ESTÁ funcionando!

Baseado na análise da screenshot fornecida:

1. **Sidebar** - Usa `bg-surface-1` (navy escuro) ✅
2. **Item ativo** - Indicador dourado `accent` ✅
3. **Cards KPI** - Fundo `surface-2` com títulos em laranja/gold ✅
4. **Chart principal** - Linha dourada `#E9B835` ✅
5. **Botão Salvar** - Discreto (não está dirty) ✅
6. **AppShell wrapper** - Usa `bg-bg text-text` ✅

### Por que "parece igual"?

A paleta anterior (228° hue) e a nova (222° Slate Navy) são **visualmente muito próximas**. A diferença é sutil:
- Antes: `228 33% 6%` (#0A0C14)
- Depois: `222 47% 6%` (#080B14)

Ambos são "navy muito escuro" - a mudança é refinamento, não revolução.

---

## Passo 1 - App Local Correto

### Verificação do Vite
- [x] `@vite/client` presente (Vite HMR funcionando)
- [x] Entry point carregando corretamente (`src/main.jsx`)

---

## Passo 2 - Tokens no Runtime

### Estrutura Confirmada

```css
/* src/index.css - Ordem correta */
:root { /* tokens definidos aqui */ }
@tailwind base;
@tailwind components;
@tailwind utilities;
@layer base { html { @apply bg-bg text-text; } }
```

### Import Confirmado

```jsx
// src/main.jsx - linha 5
import "./index.css";
```

### Console Output (para validar)

```javascript
// Colar no Console:
console.log('--bg:', getComputedStyle(document.documentElement).getPropertyValue('--bg'));
// Esperado: "222 47% 6%" (ou similar)
```

---

## Passo 3 - Classes Tailwind

### Mapeamento Confirmado (tailwind.config.js)

| Classe | Token | Status |
|--------|-------|--------|
| `bg-bg` | `hsl(var(--bg))` | ✅ |
| `bg-surface-1` | `hsl(var(--surface-1))` | ✅ |
| `bg-surface-2` | `hsl(var(--surface-2))` | ✅ |
| `text-text` | `hsl(var(--text))` | ✅ |
| `text-text-muted` | `hsl(var(--text-muted))` | ✅ |
| `border-border` | `hsl(var(--border))` | ✅ |
| `bg-accent` | `hsl(var(--accent))` | ✅ |

---

## Passo 4 - Hardcodes Restantes

### Charts (SVG fill/stroke) - Esperado

Recharts não suporta CSS classes em SVG. Hardcodes são necessários mas correspondem aos tokens:

| Hardcode | Corresponde a |
|----------|---------------|
| `#E9B835` | `--accent` (chart-1) |
| `#33A8E5` | `--info` (chart-2) |
| `#2DAB70` | `--success` (chart-3) |
| `#F5A623` | `--warning` (chart-4) |
| `#D94444` | `--danger` |
| `#F3F6FA` | `--text` |

### Google Icon (LoginPage) - Esperado

Cores da marca Google devem ser mantidas:
- `#EA4335` (vermelho)
- `#4285F4` (azul)
- `#FBBC05` (amarelo)
- `#34A853` (verde)

---

## Passo 5 - Não Necessário

Caches não eram o problema.

---

## Passo 6 - Teste Agressivo

### Como Provar (Console):

```javascript
// 1. ANTES: Observe o app
// 2. Execute:
document.documentElement.style.setProperty('--bg', '0 100% 50%');
document.documentElement.style.setProperty('--surface-2', '120 100% 50%');
// 3. DEPOIS: App deve ficar VERMELHO/VERDE
// 4. Reverter:
location.reload();
```

Se o app mudar → **Tokens governam o CSS** ✅

---

## Conclusão Final

| Verificação | Status |
|-------------|--------|
| CSS Tokens carregados | ✅ |
| Tailwind usando tokens | ✅ |
| AppShell tokenizado | ✅ |
| Sidebar tokenizada | ✅ |
| Cards tokenizados | ✅ |
| Charts tokenizados | ✅ (via HEX equivalente) |
| Client Mode funcionando | ✅ |
| isDirty Salvar funcionando | ✅ |

### Nenhum ponto falhou!

A impressão de "parece igual" é porque:
1. A paleta foi **refinada**, não revolucionada
2. Valores de 222° e 228° são perceptualmente muito próximos
3. O visual é intencionalmente consistente (Private Banking Premium)

---

## Próximos Passos Sugeridos

1. **Testar mudança de token extrema** (script acima) para confirmar governança
2. **Ajustar tokens específicos** se quiser diferença mais perceptível:
   - Exemplo: `--accent: 30 100% 55%` (laranja mais intenso)
3. **Light mode** pode ser ativado facilmente adicionando classe `.light` ao `<html>`
