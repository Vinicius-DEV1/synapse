import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { translate } from './engine';
import { I18nProvider, useI18n } from './I18nContext';
import { getSettings, saveSettings } from '../utils/settings';

describe('i18n Engine', () => {
  it('translates nested keys in English', () => {
    expect(translate('en', 'common.save')).toBe('Save');
    expect(translate('en', 'sidebar.home')).toBe('Home');
    expect(translate('en', 'settings.tabs.general')).toBe('General');
  });

  it('translates nested keys in Portuguese', () => {
    expect(translate('pt-BR', 'common.save')).toBe('Salvar');
    expect(translate('pt-BR', 'sidebar.home')).toBe('Início');
    expect(translate('pt-BR', 'settings.tabs.general')).toBe('Geral');
  });

  it('interpolates variables accurately', () => {
    const result = translate('en', 'settings.subtitle', { category: 'editor' });
    expect(result).toBe('Manage your editor preferences.');

    const resultPt = translate('pt-BR', 'settings.subtitle', { category: 'editor' });
    expect(resultPt).toBe('Gerencie suas preferências de editor.');
  });

  it('maintains 100% dictionary key parity between English and Portuguese', async () => {
    const en = (await import('./locales/en.json')).default;
    const pt = (await import('./locales/pt.json')).default;

    function getLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      const keys: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          keys.push(...getLeafKeys(v as Record<string, unknown>, full));
        } else {
          keys.push(full);
        }
      }
      return keys;
    }

    const enKeys = new Set(getLeafKeys(en as Record<string, unknown>));
    const ptKeys = new Set(getLeafKeys(pt as Record<string, unknown>));

    const missingInPt = [...enKeys].filter((k) => !ptKeys.has(k));
    const missingInEn = [...ptKeys].filter((k) => !enKeys.has(k));

    expect(missingInPt).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(enKeys.size).toBeGreaterThan(200);
  });
});

describe('useI18n Hook & Provider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default language as English', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <I18nProvider initialLanguage="en">{children}</I18nProvider>
    );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.language).toBe('en');
    expect(result.current.t('common.save')).toBe('Save');
  });

  it('allows switching language dynamically', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <I18nProvider initialLanguage="en">{children}</I18nProvider>
    );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.t('common.save')).toBe('Save');

    act(() => {
      result.current.setLanguage('pt-BR');
    });

    expect(result.current.language).toBe('pt-BR');
    expect(result.current.t('common.save')).toBe('Salvar');
    expect(getSettings().language).toBe('pt-BR');
  });

  it('gracefully falls back when used outside I18nProvider', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.language).toBe('en');
    expect(result.current.t('common.cancel')).toBe('Cancel');
  });
});
