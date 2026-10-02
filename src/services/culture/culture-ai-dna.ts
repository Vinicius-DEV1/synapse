import type { CultureItem } from '../../types';
import type { AiCulturalDnaProfile } from '../../types/culture-recommendations';
import { CultureFeedbackStorage } from './culture-feedback-storage';
import { promptGemini } from '../gemini';
import { extractCulturalDNA } from './culture-dna-extractor';

function parseJsonFromAiResponse<T>(text: string): T | null {
  if (!text || typeof text !== 'string') return null;

  const sanitize = (str: string) =>
    str.replace(/,\s*([\]}])/g, '$1').replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  try {
    return JSON.parse(text) as T;
  } catch {}

  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (blockMatch) {
    try {
      return JSON.parse(blockMatch[1]) as T;
    } catch {
      try {
        return JSON.parse(sanitize(blockMatch[1])) as T;
      } catch {}
    }
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const raw = text.slice(start, end + 1);
    try {
      return JSON.parse(raw) as T;
    } catch {
      try {
        return JSON.parse(sanitize(raw)) as T;
      } catch {}
    }
  }

  return null;
}

export const CULTURE_DNA_EXTRACTOR_SYSTEM_PROMPT = `You are Caderno's elite Cultural Anthropologist and Semantic Media Profiler.
Your purpose is to conduct a deep semantic analysis of the user's personal media library and extract their cultural DNA.
Do NOT simply repeat title keywords. Uncover subgenres, underlying themes, narrative tropes, stylistic affinities, and creator lineages.

Guidelines:
1. THEMATIC AXES: Identify 4 to 8 specific, descriptive thematic pillars in Brazilian Portuguese (e.g., "Romance LGBTQIA+ Juvenil", "Autodescoberta & Coming-of-Age", "Ficção Científica Conceitual & IA", "Alta Fantasia & Worldbuilding", "Thrillers Psicológicos Labirínticos", "Adaptações Literárias YA").
2. MULTI-FACETED TASTES & ZERO LOSS OF NICHE PASSIONS: Large libraries (50 to 200+ works) often encompass multiple co-existing passions. Never allow a numerically dominant genre (e.g., action, sci-fi) to drown out or erase smaller, distinct thematic clusters (e.g., LGBTQIA+ romance, coming-of-age, indie cinema, psychological horror). Preserve both the major themes and distinct secondary passions as independent thematic axes.
3. CORE INFLUENCES: Identify key creators, authors, directors, showrunners, or studios directly linked to these titles or whose artistic vision mirrors them (e.g., "Becky Albertalli", "Denis Villeneuve", "Alice Oseman", "Studio Ghibli").
4. EMOTIONAL ATMOSPHERE: Synthesize in 1-2 vivid Portuguese sentences the emotional resonance and aesthetic tone of their taste (e.g., "Acolhedor, sensível e inspirador, com foco em empatia e vulnerabilidade juvenil").
5. KEY ANCHOR WORKS: Extract the 3 to 6 defining works from their library that serve as primary anchors for future recommendations.

Respond ONLY with raw JSON matching this schema:
{
  "thematic_axes": ["string", "string"],
  "core_influences": ["string", "string"],
  "emotional_atmosphere": "string",
  "key_anchor_works": ["string", "string"]
}`;

interface RawDnaResponse {
  thematic_axes?: string[];
  core_influences?: string[];
  emotional_atmosphere?: string;
  key_anchor_works?: string[];
}

/**
 * Builds a comprehensive, multi-tiered prompt representing the user's entire library
 * (scaling gracefully from 2 to 200+ works without loss of niche genres).
 */
function buildDnaExtractionPrompt(items: CultureItem[]): string {
  const completed = items.filter(i => i.total_progress > 0 && i.progress >= i.total_progress);
  const inProgress = items.filter(i => i.progress > 0 && (i.total_progress === 0 || i.progress < i.total_progress));
  const goals = items.filter(i => i.is_goal);
  const completedIds = new Set(completed.map(c => c.id));
  const inProgressIds = new Set(inProgress.map(p => p.id));
  const goalIds = new Set(goals.map(g => g.id));
  const remaining = items.filter(i => !completedIds.has(i.id) && !inProgressIds.has(i.id) && !goalIds.has(i.id));

  const formatItem = (i: CultureItem) => {
    const synopsisSnippet = i.synopsis ? `: "${i.synopsis.slice(0, 110).trim()}"` : '';
    return `- ${i.title} (${i.type})${synopsisSnippet}`;
  };

  const sections: string[] = [];

  if (completed.length > 0) {
    sections.push(`Completed Works (Definite high affinity - ${completed.length} works):\n${completed.slice(0, 250).map(formatItem).join('\n')}`);
  }

  if (inProgress.length > 0) {
    sections.push(`Currently In-Progress (${inProgress.length} works):\n${inProgress.slice(0, 100).map(formatItem).join('\n')}`);
  }

  if (goals.length > 0) {
    sections.push(`Wishlist & Priority Goals (${goals.length} works):\n${goals.slice(0, 100).map(formatItem).join('\n')}`);
  }

  if (remaining.length > 0) {
    sections.push(`Other Catalog Titles (${remaining.length} works):\n${remaining.slice(0, 200).map(formatItem).join('\n')}`);
  }

  // Fallback if no categorized items
  if (sections.length === 0) {
    sections.push(`Registered Works (${items.length} works):\n${items.slice(0, 300).map(formatItem).join('\n')}`);
  }

  return `User's Personal Library Overview:
Total Works in Collection: ${items.length} titles across cinema, series, literature, anime, and manga.

${sections.join('\n\n')}

TASK FOR CULTURAL ANTHROPOLOGIST:
Conduct a comprehensive semantic synthesis across this entire ${items.length}-work collection.
CRITICAL DIRECTIVES:
1. SYNTHESIS ACROSS SCALE: Identify macro-patterns and recurrent creative signatures across all ${items.length} works.
2. PRESERVE DIVERGENT & NICHE PASSIONS: If the user has a distinct cluster of works belonging to a specific subgenre (e.g. LGBTQIA+ romance, coming-of-age, psychological thrillers, classic sci-fi, auteur animation), YOU MUST ensure it forms a dedicated pillar in 'thematic_axes', even alongside larger commercial genres.
3. EXTRACT 4 TO 8 DIVERSE THEMATIC AXES: Represent the multi-faceted nature of the user's tastes.`;
}

/**
 * Fallback synthesizer that generates an AiCulturalDnaProfile using local heuristics
 * if Gemini is offline or API fails.
 */
function createHeuristicDnaFallback(items: CultureItem[], libraryHash: string): AiCulturalDnaProfile {
  const localDna = extractCulturalDNA(items);
  const anchorTitles = items.slice(0, 4).map(i => i.title);

  return {
    thematic_axes: localDna.thematicKeywords.length > 0
      ? localDna.thematicKeywords
      : ['Cinema & Literatura Narrativa', 'Exploração Cultural'],
    core_influences: localDna.creatorSignatures,
    emotional_atmosphere: 'Narrativas imersivas guiadas pela curiosidade e reflexão pessoal.',
    key_anchor_works: anchorTitles,
    extracted_at: new Date().toISOString(),
    library_hash: libraryHash,
  };
}

/**
 * Extracts the user's deep cultural DNA using Gemini with automatic local caching.
 * If the library has not changed, returns in 0ms from cache.
 */
export async function extractAiCulturalDna(
  items: CultureItem[],
  libraryHash: string,
  forceRefresh = false
): Promise<AiCulturalDnaProfile> {
  if (!items || items.length === 0) {
    return {
      thematic_axes: ['Cultura Geral', 'Obras Seminais'],
      core_influences: [],
      emotional_atmosphere: 'Perfil inicial aberto a novos horizontes artísticos.',
      key_anchor_works: [],
      extracted_at: new Date().toISOString(),
      library_hash: libraryHash,
    };
  }

  // 1. Check local cache (0ms perceived latency)
  if (!forceRefresh) {
    const cached = await CultureFeedbackStorage.getCachedAiDna(libraryHash);
    if (cached) {
      return cached;
    }
  }

  // 2. Call Gemini for lightweight, fast extraction
  try {
    const prompt = buildDnaExtractionPrompt(items);
    const result = await promptGemini(
      prompt,
      undefined,
      [],
      undefined,
      CULTURE_DNA_EXTRACTOR_SYSTEM_PROMPT,
      25000 // Fast 25s timeout for lightweight extraction
    );

    const parsed = parseJsonFromAiResponse<RawDnaResponse>(result.text);
    if (parsed && Array.isArray(parsed.thematic_axes) && parsed.thematic_axes.length > 0) {
      const profile: AiCulturalDnaProfile = {
        thematic_axes: parsed.thematic_axes.map(String).slice(0, 8),
        core_influences: Array.isArray(parsed.core_influences) ? parsed.core_influences.map(String).slice(0, 8) : [],
        emotional_atmosphere: parsed.emotional_atmosphere || 'Atmosfera rica em nuances emocionais e narrativas.',
        key_anchor_works: Array.isArray(parsed.key_anchor_works) && parsed.key_anchor_works.length > 0
          ? parsed.key_anchor_works.map(String).slice(0, 6)
          : items.slice(0, 4).map(i => i.title),
        extracted_at: new Date().toISOString(),
        library_hash: libraryHash,
      };

      // Persist to cache
      await CultureFeedbackStorage.saveCachedAiDna(profile);
      return profile;
    }
  } catch (err) {
    console.warn('[CultureAiDna] Falha ao extrair DNA com IA, aplicando fallback heurístico:', err);
  }

  // 3. Graceful Fallback
  const fallback = createHeuristicDnaFallback(items, libraryHash);
  await CultureFeedbackStorage.saveCachedAiDna(fallback);
  return fallback;
}
