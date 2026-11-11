import en from './locales/en.json';
import pt from './locales/pt.json';
import type { SupportedLanguage, TranslationVariables } from './types';

export type TranslationSchema = typeof en;

const dictionaries: Record<string, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  'pt-BR': pt as Record<string, unknown>,
  pt: pt as Record<string, unknown>,
};

export function normalizeLanguage(lang?: string): SupportedLanguage {
  if (!lang) return 'en';
  if (lang.toLowerCase().startsWith('pt')) return 'pt-BR';
  return 'en';
}

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
  if (!vars || typeof vars !== 'object') return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return key in vars ? String(vars[key]) : `{{${key}}}`;
  });
}

/**
 * Translate a key into the target language with fallback to English or fallback string.
 */
export function translate(
  lang: SupportedLanguage,
  key: string,
  defaultTextOrVars?: string | TranslationVariables,
  maybeVars?: TranslationVariables
): string {
  let defaultText: string | undefined;
  let vars: TranslationVariables | undefined;

  if (typeof defaultTextOrVars === 'string') {
    defaultText = defaultTextOrVars;
    vars = maybeVars;
  } else {
    vars = defaultTextOrVars;
  }

  const dict = dictionaries[lang] || dictionaries.en;
  let text = resolvePath(dict, key);

  // Fallback to English dictionary if key is missing in target language
  if (text === null && lang !== 'en') {
    text = resolvePath(dictionaries.en, key);
  }

  // If still not found, return defaultText or the key itself
  if (text === null) {
    return interpolate(defaultText ?? key, vars);
  }

  return interpolate(text, vars);
}
