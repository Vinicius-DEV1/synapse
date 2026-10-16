import en from './locales/en.json';
import pt from './locales/pt.json';
import type { SupportedLanguage, TranslationVariables } from './types';

export type TranslationSchema = typeof en;

const dictionaries: Record<SupportedLanguage, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  'pt-BR': pt as Record<string, unknown>,
};

/**
 * Resolves a nested key (e.g. 'settings.general.tabSystem') from a dictionary.
 */
function resolvePath(obj: Record<string, unknown>, path: string): string | null {
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }

  return typeof current === 'string' ? current : null;
}

/**
 * Replaces {{placeholder}} tokens with provided variable values.
 */
function interpolate(template: string, vars?: TranslationVariables): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return key in vars ? String(vars[key]) : `{{${key}}}`;
  });
}

/**
 * Translate a key into the target language with fallback to English.
 */
export function translate(
  lang: SupportedLanguage,
  key: string,
  vars?: TranslationVariables
): string {
  const dict = dictionaries[lang] || dictionaries.en;
  let text = resolvePath(dict, key);

  // Fallback to English dictionary if key is missing in target language
  if (text === null && lang !== 'en') {
    text = resolvePath(dictionaries.en, key);
  }

  // If still not found, return the key itself
  if (text === null) {
    return key;
  }

  return interpolate(text, vars);
}
