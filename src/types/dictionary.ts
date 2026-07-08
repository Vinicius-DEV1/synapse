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

export interface AnkiCard {
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
  anki_card?: AnkiCard;
}

export interface DictionaryData {
  analyzed_word?: string;
  detected_language: 'en' | 'pt';
  english?: LanguageData;
  portuguese: LanguageData & { translation: string };
}
