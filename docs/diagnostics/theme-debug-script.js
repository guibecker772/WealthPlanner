/**
 * Theme Debug Helper
 * Use no Console do DevTools para diagnosticar tokens CSS
 * 
 * Uso: Cole este script no Console e execute themeDebug.run()
 */

const themeDebug = {
  // Lista de tokens esperados
  tokens: [
    '--bg', '--surface-1', '--surface-2', '--surface-3',
    '--border', '--border-highlight', '--divider',
    '--text', '--text-muted', '--text-faint',
    '--accent', '--accent-2', '--accent-fg',
    '--success', '--warning', '--danger', '--info',
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'
  ],

  // Verifica se tokens estão carregados
  checkTokens() {
    console.group('🎨 CSS Tokens Check');
    const style = getComputedStyle(document.documentElement);
    const results = {};
    
    this.tokens.forEach(token => {
      const value = style.getPropertyValue(token).trim();
      results[token] = value || '❌ EMPTY';
      console.log(`${token}: ${value || '❌ EMPTY'}`);
    });
    
    const empty = Object.values(results).filter(v => v === '❌ EMPTY').length;
    console.log(`\n📊 Result: ${this.tokens.length - empty}/${this.tokens.length} tokens loaded`);
    console.groupEnd();
    
    return results;
  },

  // Teste agressivo - muda cores para valores extremos
  aggressiveTest() {
    console.group('🔥 Aggressive Token Test');
    console.log('BEFORE: Tire um screenshot agora!');
    
    // Cores extremas para teste visual
    const testValues = {
      '--bg': '0 100% 50%',           // Vermelho puro
      '--surface-1': '120 100% 50%',  // Verde puro
      '--surface-2': '240 100% 50%',  // Azul puro
      '--surface-3': '60 100% 50%',   // Amarelo puro
      '--border': '300 100% 50%',     // Magenta
      '--text': '0 0% 0%',            // Preto
      '--text-muted': '180 100% 50%', // Ciano
      '--accent': '0 0% 100%',        // Branco
    };

    Object.entries(testValues).forEach(([token, value]) => {
      document.documentElement.style.setProperty(token, value);
      console.log(`Set ${token} = ${value}`);
    });

    console.log('\nAFTER: Tire um screenshot agora!');
    console.log('Se o app MUDOU drasticamente → Tokens funcionam ✅');
    console.log('Se o app NÃO mudou → Pipeline quebrado ❌');
    console.log('\nPara reverter, execute: themeDebug.reset()');
    console.groupEnd();
  },

  // Reverte as mudanças do teste agressivo
  reset() {
    console.log('🔄 Revertendo tokens... Recarregue a página para valores originais.');
    const testTokens = ['--bg', '--surface-1', '--surface-2', '--surface-3', '--border', '--text', '--text-muted', '--accent'];
    testTokens.forEach(token => {
      document.documentElement.style.removeProperty(token);
    });
    console.log('✅ Tokens removidos. Recarregue a página.');
  },

  // Inspeciona um elemento específico
  inspectElement(selector) {
    const el = document.querySelector(selector);
    if (!el) {
      console.error(`Element not found: ${selector}`);
      return;
    }
    
    console.group(`🔍 Inspecting: ${selector}`);
    const computed = getComputedStyle(el);
    
    console.log('Background:', computed.backgroundColor);
    console.log('Color:', computed.color);
    console.log('Border:', computed.borderColor);
    console.log('Classes:', el.className);
    console.groupEnd();
  },

  // Executa diagnóstico completo
  run() {
    console.clear();
    console.log('═══════════════════════════════════════');
    console.log('   🎨 THEME DEBUG DIAGNOSTIC v1.0');
    console.log('═══════════════════════════════════════\n');
    
    this.checkTokens();
    
    console.log('\n📋 Next Steps:');
    console.log('1. Se tokens estão vazios → Problema no import do CSS');
    console.log('2. Execute themeDebug.aggressiveTest() para teste visual');
    console.log('3. Execute themeDebug.inspectElement(".bg-bg") para debug específico');
  }
};

// Auto-run ao colar
themeDebug.run();
