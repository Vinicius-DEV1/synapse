import type { DBSchema } from 'idb';
import type { VaultGroup, VaultItem, VaultPasswordHistoryEntry } from '../types/vault';
import type {
  DislikedCultureItem,
  IgnoredCultureItem,
  CachedRecommendations,
  RecentRecommendedTitlesEntry,
  AiCulturalDnaProfile,
} from '../types/culture-recommendations';
import type { CultureItem, CultureEpisode } from '../types/culture';


import type { SharedPageConfig } from '../types/sharing';
import type {
  AnkiDeckRecord,
  AnkiNoteRecord,
  AnkiCardRecord,
  AnkiSrsState,
  AnkiReviewRecord,
  AnkiDeckSettings,
} from '../types/anki';
import type {
  LibraryBook,
  LibraryHighlight,
  LibraryBookmark,
  LibraryCollection,
  LibraryBookCollectionRecord,
  ReadingSession,
  OcrCacheEntry,
} from '../types/library';
import type { Session, Alarm } from '../components/focus/types';
import type { FileItem, FileFolder, FilePageLink } from '../types/files';
import type { QuizBattery, QuizQuestion, QuizAttempt, QuizPageLink } from '../types/quiz';

export interface SharedPageKeyRecord {
  shareId: string;
  pageId: string;
  shareKeyBase64: string;
  config: SharedPageConfig;
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
  library_books: { key: string; value: LibraryBook; indexes: { reading_status: string } };
  library_highlights: { key: string; value: LibraryHighlight; indexes: { book_id: string } };
  library_bookmarks: { key: string; value: LibraryBookmark; indexes: { book_id: string } };
  library_collections: { key: string; value: LibraryCollection };
  library_book_collections: { key: string; value: LibraryBookCollectionRecord; indexes: { book_id: string } };
  library_reading_sessions: { key: string; value: ReadingSession; indexes: { book_id: string } };
  library_ocr_cache: { key: string; value: OcrCacheEntry; indexes: { book_id: string } };
  library_book_files: { key: string; value: { id: string; data: ArrayBuffer | Blob } };
  config: { key: string; value: any };
  image_cache: { key: string; value: { id: string; data: ArrayBuffer; mimeType: string } };
  videos: { key: string; value: any };
  video_words: { key: string; value: any; indexes: { video_id: string } };
  youtube_watched: { key: string; value: any; indexes: { video_id: string } };
  youtube_summaries: { key: string; value: any; indexes: { video_id: string } };
  lofis: { key: string; value: any };
  culture_items: { key: string; value: CultureItem };
  culture_episodes: { key: string; value: CultureEpisode; indexes: { item_id: string } };
  focus_sessions: { key: string; value: Session };
  alarms: { key: number; value: Alarm };
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
  anki_decks: { key: string; value: AnkiDeckRecord };
  anki_notes: { key: string; value: AnkiNoteRecord; indexes: { deck_id: string } };
  anki_cards: { key: string; value: AnkiCardRecord; indexes: { deck_id: string; note_id: string } };
  anki_srs_state: { key: string; value: AnkiSrsState };
  anki_reviews: { key: string; value: AnkiReviewRecord; indexes: { card_id: string } };
  anki_deck_settings: { key: string; value: AnkiDeckSettings; indexes: { deck_id: string } };
  files: { key: string; value: FileItem };
  file_folders: { key: string; value: FileFolder };
  file_page_links: { key: string; value: FilePageLink; indexes: { file_id: string; page_id: string } };
  ai_logs: { key: string; value: any; indexes: { module: string } };
  ai_prompts: {
    key: string;
    value: { id: string; module: string; content: string; updated_at?: string };
    indexes: { module: string };
  };
  diagrams: { key: string; value: any };
  quiz_batteries: { key: string; value: QuizBattery; indexes: { page_id: string; parent_id?: string } };
  quiz_questions: { key: string; value: QuizQuestion; indexes: { battery_id: string } };
  quiz_attempts: {
    key: string;
    value: QuizAttempt;
    indexes: { question_id: string; battery_id: string };
  };
  quiz_page_links: {
    key: string;
    value: QuizPageLink;
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
  habits: {
    key: string;
    value: any;
  };
  habit_logs: {
    key: string;
    value: any;
    indexes: { habit_id: string; date: string };
  };
  culture_disliked_items: {
    key: string;
    value: DislikedCultureItem;
  };
  culture_ignored_items: {
    key: string;
    value: IgnoredCultureItem;
  };
  culture_recommendations_cache: {
    key: string;
    value: CachedRecommendations | RecentRecommendedTitlesEntry | (AiCulturalDnaProfile & { id: string });
  };
}

