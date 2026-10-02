import type { CultureItem } from '../../types';

/**
 * Maps written number words and roman numerals to digits for consistent comparison.
 */
const NUMBER_WORD_MAP: Record<string, string> = {
  // Portuguese
  um: '1',
  uma: '1',
  primeiro: '1',
  primeira: '1',
  dois: '2',
  duas: '2',
  segundo: '2',
  segunda: '2',
  tres: '3',
  terceiro: '3',
  terceira: '3',
  quatro: '4',
  quarto: '4',
  quarta: '4',
  cinco: '5',
  quinto: '5',
  quinta: '5',
  seis: '6',
  sexto: '6',
  sexta: '6',
  sete: '7',
  setimo: '7',
  setima: '7',
  oito: '8',
  oitavo: '8',
  oitava: '8',
  nove: '9',
  nono: '9',
  nona: '9',
  dez: '10',
  decimo: '10',
  decima: '10',

  // English
  one: '1',
  first: '1',
  two: '2',
  second: '2',
  three: '3',
  third: '3',
  four: '4',
  fourth: '4',
  five: '5',
  fifth: '5',
  six: '6',
  sixth: '6',
  seven: '7',
  seventh: '7',
  eight: '8',
  eighth: '8',
  nine: '9',
  ninth: '9',
  ten: '10',
  tenth: '10',

  // Roman Numerals (standalone)
  i: '1',
  ii: '2',
  iii: '3',
  iv: '4',
  v: '5',
  vi: '6',
  vii: '7',
  viii: '8',
  ix: '9',
  x: '10',
};

/**
 * Normalizes title strings by converting accents, canonicalizing numbers,
 * common Portuguese/English synonyms (e.g., "duna" -> "dune", "parte" -> "pt"),
 * and stripping leading articles and special characters.
 */
export function normalizeTitle(text: string): string {
  if (!text) return '';

  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
    .replace(/&(?:amp;)?/g, ' and ')
    .replace(/[–—]/g, '-');

  // Strip leading articles
  normalized = normalized.replace(/^(?:the|o|a|os|as|um|uma)\s+/i, '');

  // Split into tokens
  const rawTokens = normalized.split(/[^a-z0-9]+/);
  const canonicalTokens: string[] = [];

  for (const token of rawTokens) {
    if (!token) continue;

    // Check number mappings
    if (NUMBER_WORD_MAP[token]) {
      canonicalTokens.push(NUMBER_WORD_MAP[token]);
    } else if (token === 'duna') {
      canonicalTokens.push('dune');
    } else if (['parte', 'part', 'pt', 'temporada', 'season', 'volume', 'vol'].includes(token)) {
      canonicalTokens.push('pt');
    } else {
      canonicalTokens.push(token);
    }
  }

  return canonicalTokens.join(' ').trim();
}

/**
 * Strips known media edition and cut descriptors to isolate canonical work identity
 * without destroying narrative subtitles or sequels (e.g. "Dune: Part Two" is kept,
 * but "Ex-Machina: Versão Longa" collapses to "Ex-Machina").
 */
export function cleanEditionModifiers(title: string): string {
  if (!title) return '';

  let cleaned = title;

  const editionPatterns = [
    // Portuguese
    /\b(?:(?:a|o)\s+)?(?:vers[aã]o|corte)\s+(?:estendid[ao]|long[ao]|do\s+diretor|sem\s+cortes|definitiv[ao]|especial|de\s+cinema)\b/gi,
    /\b(?:(?:a|o)\s+)?edi[cç][aã]o\s+(?:especial|de\s+colecionador|definitiva|remasterizada|comemorativa|expandida|limitada)\b/gi,
    /\b(?:vers[aã]o\s+)?remasterizad[ao]\b/gi,
    /\bvers[aã]o\s+longa\b/gi,
    /\bcorte\s+do\s+diretor\b/gi,
    /\bcorte\s+final\b/gi,

    // English
    /\b(?:the\s+)?(?:extended|director'?s|theatrical|collector'?s|special|definitive|final|unrated|ultimate|criterion|anniversary)\s+(?:cut|edition|version)\b/gi,
    /\b(?:the\s+)?final\s+cut\b/gi,
    /\b(?:the\s+)?director'?s\s+cut\b/gi,
    /\b(?:the\s+)?extended\s+(?:cut|edition|version)\b/gi,
    /\b(?:the\s+)?theatrical\s+cut\b/gi,
    /\bunrated\b/gi,
    /\bremastered\b/gi,
    /\bimax\s+(?:edition|version|ratio)?\b/gi,
  ];

  for (const pattern of editionPatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Clean trailing punctuation, empty parentheses, extra colons, hyphens, and dangling trailing articles
  cleaned = cleaned
    .replace(/\(\s*\)/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/[:\-–—]\s*$/g, ' ')
    .replace(/\b(?:the|o|a|os|as|um|uma)\s*$/gi, ' ')
    .replace(/[:\-–—]\s*$/g, ' ')
    .replace(/^\s*[:\-–—]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Strips season markers from series or anime titles to isolate the overarching show title
 * (e.g. "Succession: Temporada 3" -> "Succession", "Severance Season 2" -> "Severance").
 */
export function cleanSeasonModifiers(title: string): string {
  if (!title) return '';

  let cleaned = title;

  const seasonPatterns = [
    // Portuguese
    /\b(?:(?:[0-9]+[ªºa]?|\bprimeira|\bsegunda|\bterceira|\bquarta|\bquinta)\s+)?temporada(?:\s+[0-9]+)?\b/gi,
    /\btemporada\s+[0-9]+\b/gi,
    /\b[0-9]+ª\s*temporada\b/gi,
    /\b[0-9]+a\s*temporada\b/gi,
    /\bt[0-9]+\b/gi,

    // English
    /\bseason\s+[0-9]+\b/gi,
    /\b[0-9]+(?:st|nd|rd|th)\s+season\b/gi,
    /\bs[0-9]+\b/gi,
    /\bseries\s+[0-9]+\b/gi,

    // Anime specific
    /\b2nd\s+season\b/gi,
    /\b3rd\s+season\b/gi,
    /\b4th\s+season\b/gi,
  ];

  for (const pattern of seasonPatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Clean trailing punctuation, empty parentheses, extra colons or hyphens
  cleaned = cleaned
    .replace(/\(\s*\)/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/[:\-–—]\s*$/g, ' ')
    .replace(/^\s*[:\-–—]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Checks if a string contains season/temporada indicators.
 */
function hasSeasonIndicator(text: string): boolean {
  if (!text) return false;
  return /\b(?:temporada|[0-9]+ª\s*temporada|season|[0-9]+(?:st|nd|rd|th)\s+season|2nd\s+season|3rd\s+season)\b/i.test(text);
}

/**
 * Extracts digit sequences from a title to verify franchise part parity.
 */
function extractNumberSequence(normalized: string): string {
  const matches = normalized.match(/\b\d+\b/g);
  return matches ? matches.join('') : '';
}

/**
 * Checks if candidate title is semantically equivalent to target title.
 */
export function areTitlesEquivalent(
  titleA: string,
  titleB: string,
  options?: { isSeries?: boolean }
): boolean {
  if (!titleA || !titleB) return false;

  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // 1. Check edition-cleaned titles (e.g. "Ex-Machina" vs "Ex-Machina: Versão Longa")
  const cleanEditionA = normalizeTitle(cleanEditionModifiers(titleA));
  const cleanEditionB = normalizeTitle(cleanEditionModifiers(titleB));
  if (cleanEditionA && cleanEditionB && cleanEditionA === cleanEditionB) {
    return true;
  }

  // 2. Check series season equivalence (e.g. "Succession" vs "Succession: Temporada 3")
  const isSeriesComparison = options?.isSeries || hasSeasonIndicator(titleA) || hasSeasonIndicator(titleB);
  if (isSeriesComparison) {
    const cleanSeasonA = normalizeTitle(cleanSeasonModifiers(cleanEditionA || titleA));
    const cleanSeasonB = normalizeTitle(cleanSeasonModifiers(cleanEditionB || titleB));
    if (cleanSeasonA && cleanSeasonB && cleanSeasonA === cleanSeasonB) {
      return true;
    }
  }

  // Verify number sequence parity (e.g. "Dune 1" vs "Dune 2" must not match)
  const numsA = extractNumberSequence(normA);
  const numsB = extractNumberSequence(normB);
  if (numsA !== numsB) {
    // If it's a series and the base series titles without numbers/seasons match, consider equivalent
    if (isSeriesComparison) {
      const baseA = normalizeTitle(cleanSeasonModifiers(titleA));
      const baseB = normalizeTitle(cleanSeasonModifiers(titleB));
      if (baseA && baseB && (baseA === baseB || baseA.startsWith(baseB) || baseB.startsWith(baseA))) {
        return true;
      }
    }
    return false;
  }

  // Check prefix containment if longer than 6 characters
  const minLen = Math.min(normA.length, normB.length);
  const maxLen = Math.max(normA.length, normB.length);

  if (minLen >= 6 && maxLen > 0 && minLen / maxLen > 0.65) {
    if (normA.startsWith(normB) || normB.startsWith(normA)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a candidate recommendation matches any item in the user's culture library.
 */
export function isItemInLibrary(
  candidate: {
    title: string;
    original_title?: string;
    type?: string;
    api_id?: string;
    api_source?: string;
  },
  libraryItems: CultureItem[]
): boolean {
  if (!candidate || !libraryItems || libraryItems.length === 0) return false;

  const normOriginal = candidate.original_title ? normalizeTitle(candidate.original_title) : '';

  for (const libItem of libraryItems) {
    // 1. Direct API ID match (exact identifier on IMDb, TVMaze, Jikan, etc.)
    if (
      candidate.api_id &&
      libItem.api_id &&
      candidate.api_id === libItem.api_id
    ) {
      return true;
    }

    const isSeries =
      candidate.type === 'série' ||
      candidate.type === 'anime' ||
      libItem.type === 'série' ||
      libItem.type === 'anime';

    // 2. Title equivalence check
    if (libItem.title) {
      if (areTitlesEquivalent(candidate.title, libItem.title, { isSeries })) {
        return true;
      }
      if (normOriginal && areTitlesEquivalent(candidate.original_title || '', libItem.title, { isSeries })) {
        return true;
      }
    }
  }

  return false;
}
