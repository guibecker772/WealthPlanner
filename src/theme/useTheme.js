// src/theme/useTheme.js
// React hook para tema - Dark/Light/System

import { useState, useEffect, useCallback } from 'react';
import {
  getThemePreference,
  getEffectiveTheme,
  setThemePreference as setThemePref,
  initTheme,
  cleanupTheme
} from './themeManager';

/**
 * Hook para gerenciar tema
 * @returns {{ themePreference: 'system' | 'dark' | 'light', effectiveTheme: 'dark' | 'light', setThemePreference: Function }}
 */
export function useTheme() {
  const [themePreference, setThemePreferenceState] = useState(() => getThemePreference());
  const [effectiveTheme, setEffectiveTheme] = useState(() => getEffectiveTheme(getThemePreference()));

  useEffect(() => {
    // Inicializa tema e sincroniza estado
    const { preference, effective } = initTheme((newEffective) => {
      setEffectiveTheme(newEffective);
    });
    
    setThemePreferenceState(preference);
    setEffectiveTheme(effective);

    return () => {
      cleanupTheme();
    };
  }, []);

  const setThemePreference = useCallback((pref) => {
    setThemePref(pref);
    setThemePreferenceState(pref);
    setEffectiveTheme(getEffectiveTheme(pref));
  }, []);

  return {
    themePreference,
    effectiveTheme,
    setThemePreference
  };
}

export default useTheme;
