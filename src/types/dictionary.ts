export interface Collocation {
  expression: string;
  meaning: string;
  examples: string[];
}

export interface DeepDiveSynonym {
  word: string;
  nuance: string;
}

export interface DeepDive {
  etymology: string;
  nuance_explanation: string;
  contextual_synonyms: DeepDiveSynonym[];
  progressive_examples: string[];
}

/**
 * O rascunho de flashcard que a IA sugere a partir de uma busca no dicionário —
 * não é a mesma coisa que `AnkiCard` (types/anki.ts), que é a linha real do
 * baralho, com id, srs_state etc. Os dois tinham o mesmo nome e colidiam no
 * `export *` de types/index.ts.
 */
export interface SuggestedAnkiCard {
  front: string;
  back: string;
  video_clip?: {
    startMs: number;
    endMs: number;
  };
}

export interface LanguageData {
  word_class?: string;
  phonetic?: string;
  definitions: string[];
  synonyms?: string[];
  collocations?: Collocation[];
  context_explanation?: string;
  examples: string[];
  is_rare_or_complex?: boolean;
  nuance_tag?: string;
  deep_dive?: DeepDive;
  anki_card?: SuggestedAnkiCard;
}

export interface DictionaryData {
  analyzed_word?: string;
  detected_language: 'en' | 'pt';
  english?: LanguageData;
  portuguese: LanguageData & { translation: string };
}
