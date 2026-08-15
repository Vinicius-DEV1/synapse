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
  state: string; // 'new', 'learning', 'review', 'relearning'
  last_review: string | null;
}

export interface AnkiCard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  extra_note?: string;
  tags?: string[];
  card_type?: string;
  validation_mode?: string;
  media_url?: string;
  source_module?: string;
  source_id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // fields joined from anki_srs_state
  srs_state?: AnkiSrsState;
  // flatten for backward compat
  due_date?: string;
  state?: string;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps?: number;
  lapses?: number;
  last_review?: string | null;
}
