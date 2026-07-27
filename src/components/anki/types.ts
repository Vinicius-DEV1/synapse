export interface Deck {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  new_limit?: number;
  review_limit?: number;
  fsrs_weights?: string;
  created_at?: string;
  updated_at?: string;
}

export type CardType = 'reading' | 'listening' | 'typing' | 'cloze' | 'speaking';
export type ValidationMode = 'exact' | 'ai';

export interface Card {
  id: string;
  note_id: string;
  deck_id: string;
  front: string;
  back: string;
  media_url?: string;
  card_type: CardType;
  validation_mode?: ValidationMode;
  state: number; // 0: new, 1: learning, 2: review, 3: relearning
  extra_note?: string;
  source_module?: string;
  source_id?: string;
  tags?: string[];
  ord?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CardDraft {
  front: string;
  back: string;
  card_type: CardType;
  media_url?: string;
  extra_note?: string;
  validation_mode?: ValidationMode;
  source_module?: string;
  source_id?: string;
  deck_id?: string;
  tags?: string[];
}
