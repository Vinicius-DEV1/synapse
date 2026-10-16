import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { SupportedLanguage, TranslationVariables, I18nContextValue } from './types';
import { translate, type TranslationSchema } from './engine';
import { getSettings, saveSettings } from '../utils/settings';

const I18nContext = createContext<I18nContextValue<TranslationSchema> | null>(null);

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLanguage?: SupportedLanguage;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialLanguage }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    const settings = getSettings();
    return settings.language || 'en';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  useEffect(() => {
    const handleSettingsChange = () => {
      const current = getSettings().language || 'en';
      setLanguageState(current);
    };

    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    const currentSettings = getSettings();
    if (currentSettings.language !== newLang) {
      saveSettings({ ...currentSettings, language: newLang });
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: TranslationVariables): string => {
      return translate(language, key, vars);
    },
    [language]
  );

  const contextValue = useMemo<I18nContextValue<TranslationSchema>>(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue<TranslationSchema> {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback for isolated components or unit test environments without Provider
    const fallbackLang = getSettings().language || 'en';
    return {
      language: fallbackLang,
      setLanguage: () => {},
      t: (key: string, vars?: TranslationVariables) => translate(fallbackLang, key, vars),
    };
  }
  return context;
}
