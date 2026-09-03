export type AnkiCardType = 'reading' | 'listening' | 'typing' | 'cloze' | 'speaking';
export type AnkiValidationMode = 'exact' | 'ai';
export type AnkiStateNumeric = 0 | 1 | 2 | 3; // 0: new, 1: learning, 2: review, 3: relearning
export type AnkiStateString = 'new' | 'learning' | 'review' | 'relearning';

export interface AnkiDeckSettings {
  id: string;
  deck_id: string;
  new_limit: number;
  review_limit: number;
  learning_steps: string; // comma separated, e.g. "1m,10m"
  relearning_steps: string; // comma separated, e.g. "10m"
  fsrs_weights?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnkiSrsState {
  id: string;
  due_date: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: AnkiStateString | string;
  last_review: string | null;
}

export interface AnkiNoteRecord {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  extra_note?: string;
  tags?: string[];
  card_type?: AnkiCardType | string;
  validation_mode?: AnkiValidationMode | string;
  media_url?: string;
  source_module?: string;
  source_id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface AnkiCardRecord {
  id: string;
  note_id: string;
  deck_id: string;
  ord: number;
  state: AnkiStateNumeric | number;
  due_date?: string | null;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps?: number;
  lapses?: number;
  last_review?: string | null;
  srs_state?: AnkiSrsState | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface AnkiCard {
  id: string;
  deck_id: string;
  note_id?: string;
  ord?: number;
  front: string;
  back: string;
  extra_note?: string;
  tags?: string[];
  card_type?: AnkiCardType | string;
  validation_mode?: AnkiValidationMode | string;
  media_url?: string;
  source_module?: string;
  source_id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // fields joined from anki_srs_state or card table
  srs_state?: AnkiSrsState;
  due_date?: string | null;
  state?: AnkiStateNumeric | AnkiStateString | string | number;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps?: number;
  lapses?: number;
  last_review?: string | null;
}

export interface FSRSCardInput {
  due_date?: string | null;
  stability?: number | string | null;
  difficulty?: number | string | null;
  elapsed_days?: number | string | null;
  scheduled_days?: number | string | null;
  learning_steps?: number | string | null;
  reps?: number | string | null;
  lapses?: number | string | null;
  state?: AnkiStateNumeric | AnkiStateString | string | number | null;
  last_review?: string | null;
}
