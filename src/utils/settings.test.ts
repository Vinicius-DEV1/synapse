import { describe, it, expect, beforeEach } from 'vitest';
import { getSettings, saveSettings, type AppSettings } from './settings';

describe('settings utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default settings when localStorage is empty', () => {
    const s = getSettings();
    expect(s.autoLockOnSuspend).toBe(true);
    expect(s.fontSize).toBe('text-base');
    expect(s.spellcheck).toBe(true);
    expect(s.geminiModel).toBe('gemini-2.5-pro');
    expect(s.quizDualAiValidation).toBe(true);
    expect(s.restoreTabsOnStartup).toBe(true);
  });

  it('persists and retrieves updated settings', () => {
    const s = getSettings();
    const updated: AppSettings = {
      ...s,
      fontSize: 'text-lg',
      spellcheck: false,
      geminiModel: 'gemini-1.5-flash',
      quizDualAiValidation: false,
      geminiModelQuizGenerator: 'gemini-2.5-pro',
      geminiModelQuizValidator: 'gemini-2.5-flash',
    };

    saveSettings(updated);
    const retrieved = getSettings();

    expect(retrieved.fontSize).toBe('text-lg');
    expect(retrieved.spellcheck).toBe(false);
    expect(retrieved.geminiModel).toBe('gemini-1.5-flash');
    expect(retrieved.quizDualAiValidation).toBe(false);
    expect(retrieved.geminiModelQuizGenerator).toBe('gemini-2.5-pro');
    expect(retrieved.geminiModelQuizValidator).toBe('gemini-2.5-flash');
  });

  it('handles corrupted JSON in localStorage gracefully with fallback to defaults', () => {
    localStorage.setItem('appSettings', '{invalid_json_corrupted');
    const s = getSettings();
    expect(s.fontSize).toBe('text-base');
  });
});
