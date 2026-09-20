import type { DBSchema } from 'idb';
import type { VaultGroup, VaultItem, VaultPasswordHistoryEntry } from '../types/vault';

export interface SharedPageKeyRecord {
  shareId: string;
  pageId: string;
  shareKeyBase64: string;
  config: any;
  createdAt: string;
}

// NOTE: IDB schema uses 'value: any' for CRDT flexibility and dynamic document entities
// across unstructured stores, avoiding serialization/unmarshalling friction with external models.
export interface CadernoDBSchema extends DBSchema {
  pages: { key: string; value: any; indexes: { parent_id: string } };
  page_history: { key: string; value: any; indexes: { page_id: string } };
  transactions: { key: string; value: any; indexes: { date: string } };
  wishlist: { key: string; value: any };
  finance_accounts: { key: string; value: any };
  library_books: { key: string; value: any; indexes: { reading_status: string } };
  library_highlights: { key: string; value: any; indexes: { book_id: string } };
  library_bookmarks: { key: string; value: any; indexes: { book_id: string } };
  library_collections: { key: string; value: any };
  library_book_collections: { key: string; value: any; indexes: { book_id: string } };
  library_reading_sessions: { key: string; value: any; indexes: { book_id: string } };
  library_ocr_cache: { key: string; value: any; indexes: { book_id: string } };
  library_book_files: { key: string; value: { id: string; data: ArrayBuffer } };
  config: { key: string; value: any };
  image_cache: { key: string; value: { id: string; data: ArrayBuffer; mimeType: string } };
  videos: { key: string; value: any };
  video_words: { key: string; value: any; indexes: { video_id: string } };
  youtube_watched: { key: string; value: any; indexes: { video_id: string } };
  youtube_summaries: { key: string; value: any; indexes: { video_id: string } };
  lofis: { key: string; value: any };
  culture_items: { key: string; value: any };
  culture_episodes: { key: string; value: any; indexes: { item_id: string } };
  focus_sessions: { key: string; value: any };
  alarms: { key: number; value: any };
  activity_logs: { key: string; value: any };
  calendar_events: { key: string; value: any };
  notifications: { key: string; value: any };
  vault_groups: { key: string; value: VaultGroup };
  vault_items: { key: string; value: VaultItem; indexes: { group_id: string } };
  vault_password_history: {
    key: string;
    value: VaultPasswordHistoryEntry;
    indexes: { item_id: string };
  };
  tutor_sessions: { key: string; value: any };
  tutor_messages: { key: string; value: any; indexes: { session_id: string } };
  tutor_memories: { key: string; value: any };
  anki_decks: { key: string; value: any };
  anki_notes: { key: string; value: any; indexes: { deck_id: string } };
  anki_cards: { key: string; value: any; indexes: { deck_id: string; note_id: string } };
  anki_srs_state: { key: string; value: any };
  anki_reviews: { key: string; value: any; indexes: { card_id: string } };
  anki_deck_settings: { key: string; value: any; indexes: { deck_id: string } };
  files: { key: string; value: any };
  file_folders: { key: string; value: any };
  file_page_links: { key: string; value: any; indexes: { file_id: string; page_id: string } };
  ai_logs: { key: string; value: any; indexes: { module: string } };
  ai_prompts: {
    key: string;
    value: { id: string; module: string; content: string; updated_at?: string };
    indexes: { module: string };
  };
  diagrams: { key: string; value: any };
  quiz_batteries: { key: string; value: any; indexes: { page_id: string } };
  quiz_questions: { key: string; value: any; indexes: { battery_id: string } };
  quiz_attempts: {
    key: string;
    value: any;
    indexes: { question_id: string; battery_id: string };
  };
  quiz_page_links: {
    key: string;
    value: any;
    indexes: { battery_id: string; page_id: string };
  };
  link_metadata_cache: { key: string; value: any };
  scraps: {
    key: string;
    value: { id: string; encrypted_data: ArrayBuffer; updated_at?: string };
  };
  shared_page_keys: {
    key: string;
    value: SharedPageKeyRecord;
    indexes: { pageId: string };
  };
}
