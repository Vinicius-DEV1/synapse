import en from './locales/en.json';
import pt from './locales/pt.json';
import type { SupportedLanguage, TranslationVariables } from './types';

export type TranslationSchema = typeof en;

const dictionaries: Record<string, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  'pt-BR': pt as Record<string, unknown>,
  pt: pt as Record<string, unknown>,
};

// Lazily populated O(1) lookup caches per language so repeated t() calls avoid split('.') traversal
const keyCaches: Record<string, Map<string, string | null>> = {
  en: new Map(),
  'pt-BR': new Map(),
  pt: new Map(),
};

export function normalizeLanguage(lang?: string): SupportedLanguage {
  if (!lang) return 'en';
  if (lang.toLowerCase().startsWith('pt')) return 'pt-BR';
  return 'en';
}

/**
 * Resolves a nested key (e.g. 'settings.general.tabSystem') from a dictionary,
 * memoizing each accessed key in an O(1) per-language map.
 */
function resolvePathCached(langKey: string, path: string): string | null {
  const cache = keyCaches[langKey];
  if (cache?.has(path)) {
    return cache.get(path) ?? null;
  }

  const obj = dictionaries[langKey] || dictionaries.en;
  const segments = path.split('.');
  let current: unknown = obj;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      cache?.set(path, null);
      return null;
    }
  }

  const resolved = typeof current === 'string' ? current : null;
  cache?.set(path, resolved);
  return resolved;
}

/**
 * Replaces {{placeholder}} tokens with provided variable values.
 */
function interpolate(template: string, vars?: TranslationVariables): string {
  if (!vars || typeof vars !== 'object' || !template.includes('{{')) return template;
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

  const targetLang = lang in dictionaries ? lang : 'en';
  let text = resolvePathCached(targetLang, key);

  // Fallback to English dictionary if key is missing in target language
  if (text === null && targetLang !== 'en') {
    text = resolvePathCached('en', key);
  }

  // If still not found, return defaultText or the key itself
  if (text === null) {
    return interpolate(defaultText ?? key, vars);
  }

  return interpolate(text, vars);
}
