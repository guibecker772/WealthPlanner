// src/theme/themeManager.js
// Gerenciador central de tema - Dark/Light/System

const STORAGE_KEY = 'theme';
const VALID_PREFS = ['system', 'dark', 'light'];

// ─── Utilidades ───

/**
 * Obtém a preferência de tema do localStorage
 * @returns {'system' | 'dark' | 'light'}
 */
export function getThemePreference() {
  try {
    const pref = localStorage.getItem(STORAGE_KEY);
    if (VALID_PREFS.includes(pref)) return pref;
  } catch (e) {
    // localStorage indisponível
  }
  return 'system';
}

/**
 * Verifica se o sistema prefere tema claro
 * @returns {boolean}
 */
export function systemPrefersLight() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
}

/**
 * Resolve a preferência para o tema efetivo
 * @param {'system' | 'dark' | 'light'} pref
 * @returns {'dark' | 'light'}
 */
export function getEffectiveTheme(pref) {
  if (pref === 'system') {
    return systemPrefersLight() ? 'light' : 'dark';
  }
  return pref;
}

/**
 * Aplica o tema no documento
 * @param {'dark' | 'light'} effective
 */
export function applyTheme(effective) {
  const html = document.documentElement;
  html.dataset.theme = effective;
  
  if (effective === 'light') {
    html.classList.add('light');
  } else {
    html.classList.remove('light');
  }
}

// ─── Gerenciamento de Listener do OS ───

let osListener = null;
let osMediaQuery = null;

/**
 * Remove o listener de mudança de tema do OS
 */
function removeOsListener() {
  if (osMediaQuery && osListener) {
    // Compat: addEventListener vs addListener
    if (osMediaQuery.removeEventListener) {
      osMediaQuery.removeEventListener('change', osListener);
    } else if (osMediaQuery.removeListener) {
      osMediaQuery.removeListener(osListener);
    }
    osListener = null;
  }
}

/**
 * Adiciona listener de mudança de tema do OS
 * @param {Function} callback - Função chamada quando o tema do OS muda
 */
function addOsListener(callback) {
  removeOsListener(); // Limpa qualquer listener anterior
  
  osMediaQuery = window.matchMedia?.('(prefers-color-scheme: light)');
  if (!osMediaQuery) return;
  
  osListener = (e) => {
    const effective = e.matches ? 'light' : 'dark';
    applyTheme(effective);
    callback?.(effective);
  };
  
  // Compat: addEventListener vs addListener (Safari antigo)
  if (osMediaQuery.addEventListener) {
    osMediaQuery.addEventListener('change', osListener);
  } else if (osMediaQuery.addListener) {
    osMediaQuery.addListener(osListener);
  }
}

// ─── API Principal ───

let onThemeChange = null;

/**
 * Define a preferência de tema
 * @param {'system' | 'dark' | 'light'} pref
 */
export function setThemePreference(pref) {
  if (!VALID_PREFS.includes(pref)) pref = 'system';
  
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch (e) {
    // localStorage indisponível
  }
  
  document.documentElement.dataset.themePref = pref;
  
  const effective = getEffectiveTheme(pref);
  applyTheme(effective);
  
  // Gerencia listener do OS
  if (pref === 'system') {
    addOsListener((newEffective) => {
      onThemeChange?.(newEffective);
    });
  } else {
    removeOsListener();
  }
  
  onThemeChange?.(effective);
}

/**
 * Inicializa o gerenciador de tema (chamado no mount do app)
 * @param {Function} callback - Função chamada quando o tema muda
 */
export function initTheme(callback) {
  onThemeChange = callback;
  
  const pref = getThemePreference();
  document.documentElement.dataset.themePref = pref;
  
  const effective = getEffectiveTheme(pref);
  applyTheme(effective);
  
  // Se preferência é system, adiciona listener
  if (pref === 'system') {
    addOsListener((newEffective) => {
      onThemeChange?.(newEffective);
    });
  }
  
  return { preference: pref, effective };
}

/**
 * Cleanup - remove listeners (para unmount)
 */
export function cleanupTheme() {
  removeOsListener();
  onThemeChange = null;
}
