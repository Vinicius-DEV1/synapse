import hljs from 'highlight.js/lib/core';
import type { LanguageFn } from 'highlight.js';

type LanguageLoader = () => Promise<{ default: LanguageFn }>;

const LANGUAGE_LOADERS: Record<string, LanguageLoader> = {
  bash: () => import('highlight.js/lib/languages/bash'),
  c: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  css: () => import('highlight.js/lib/languages/css'),
  diff: () => import('highlight.js/lib/languages/diff'),
  dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
  go: () => import('highlight.js/lib/languages/go'),
  graphql: () => import('highlight.js/lib/languages/graphql'),
  ini: () => import('highlight.js/lib/languages/ini'),
  java: () => import('highlight.js/lib/languages/java'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  json: () => import('highlight.js/lib/languages/json'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  less: () => import('highlight.js/lib/languages/less'),
  lua: () => import('highlight.js/lib/languages/lua'),
  makefile: () => import('highlight.js/lib/languages/makefile'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  objectivec: () => import('highlight.js/lib/languages/objectivec'),
  perl: () => import('highlight.js/lib/languages/perl'),
  php: () => import('highlight.js/lib/languages/php'),
  plaintext: () => import('highlight.js/lib/languages/plaintext'),
  python: () => import('highlight.js/lib/languages/python'),
  r: () => import('highlight.js/lib/languages/r'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  rust: () => import('highlight.js/lib/languages/rust'),
  scss: () => import('highlight.js/lib/languages/scss'),
  shell: () => import('highlight.js/lib/languages/shell'),
  sql: () => import('highlight.js/lib/languages/sql'),
  swift: () => import('highlight.js/lib/languages/swift'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  wasm: () => import('highlight.js/lib/languages/wasm'),
  xml: () => import('highlight.js/lib/languages/xml'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
};

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  py: 'python',
  rs: 'rust',
  sh: 'bash',
  zsh: 'bash',
  console: 'shell',
  yml: 'yaml',
  toml: 'ini',
  md: 'markdown',
  html: 'xml',
  htm: 'xml',
  svg: 'xml',
  xhtml: 'xml',
  cs: 'csharp',
  'c#': 'csharp',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  h: 'c',
  rb: 'ruby',
  kt: 'kotlin',
  kts: 'kotlin',
  docker: 'dockerfile',
  mk: 'makefile',
  txt: 'plaintext',
  text: 'plaintext',
  plain: 'plaintext',
};

export const SUPPORTED_CODE_LANGUAGES: readonly string[] = Object.keys(LANGUAGE_LOADERS).sort();

const loadedGrammars = new Map<string, LanguageFn>();
const inflightLoads = new Map<string, Promise<{ name: string; grammar: LanguageFn } | null>>();

export function normalizeCodeLanguage(rawLang?: string | null): string | null {
  if (!rawLang) return null;
  const cleaned = rawLang.trim().toLowerCase();
  if (!cleaned || cleaned === 'auto') return null;
  if (cleaned in LANGUAGE_LOADERS) return cleaned;
  return LANGUAGE_ALIASES[cleaned] ?? null;
}

export async function loadLanguageGrammar(
  rawLang?: string | null
): Promise<{ name: string; grammar: LanguageFn } | null> {
  const canonical = normalizeCodeLanguage(rawLang);
  if (!canonical) return null;

  const existing = loadedGrammars.get(canonical);
  if (existing) {
    return { name: canonical, grammar: existing };
  }

  const inflight = inflightLoads.get(canonical);
  if (inflight) return inflight;

  const loader = LANGUAGE_LOADERS[canonical];
  if (!loader) return null;

  const promise = loader()
    .then((mod) => {
      const grammar = mod.default;
      loadedGrammars.set(canonical, grammar);
      if (!hljs.getLanguage(canonical)) {
        hljs.registerLanguage(canonical, grammar);
      }
      return { name: canonical, grammar };
    })
    .catch((err) => {
      console.debug(`[syntax-highlighter] Failed loading language "${canonical}":`, err);
      return null;
    })
    .finally(() => {
      inflightLoads.delete(canonical);
    });

  inflightLoads.set(canonical, promise);
  return promise;
}

/**
 * Synchronous highlight fast-path when the language grammar is already registered.
 * Returns null if the grammar has not been loaded yet or the language is unsupported.
 */
export function highlightCodeSyncIfLoaded(code: string, rawLang?: string | null): string | null {
  const canonical = normalizeCodeLanguage(rawLang);
  if (!canonical || !hljs.getLanguage(canonical)) return null;
  try {
    return hljs.highlight(code, { language: canonical }).value;
  } catch {
    return null;
  }
}

/**
 * Dynamically loads the single requested language grammar (no highlightAuto)
 * and highlights the code snippet. Returns null for unknown/plaintext blocks.
 */
export async function highlightCodeAsync(
  code: string,
  rawLang?: string | null
): Promise<string | null> {
  const loaded = await loadLanguageGrammar(rawLang);
  if (!loaded) return null;
  try {
    return hljs.highlight(code, { language: loaded.name }).value;
  } catch {
    return null;
  }
}
