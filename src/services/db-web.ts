import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface CadernoDBSchema extends DBSchema {
  pages: { key: string; value: any; indexes: { 'parent_id': string } };
  page_history: { key: string; value: any; indexes: { 'page_id': string } };
  transactions: { key: string; value: any; indexes: { 'date': string } };
  wishlist: { key: string; value: any };
  library_books: { key: string; value: any; indexes: { 'reading_status': string } };
  library_highlights: { key: string; value: any; indexes: { 'book_id': string } };
  library_bookmarks: { key: string; value: any; indexes: { 'book_id': string } };
  library_collections: { key: string; value: any };
  library_book_collections: { key: string; value: any; indexes: { 'book_id': string } };
  library_reading_sessions: { key: string; value: any; indexes: { 'book_id': string } };
  config: { key: string; value: any };
  image_cache: { key: string; value: { id: string; data: ArrayBuffer; mimeType: string } };
  videos: { key: string; value: any };
  video_words: { key: string; value: any; indexes: { 'video_id': string } };
  youtube_watched: { key: string; value: any; indexes: { 'video_id': string } };
  lofis: { key: string; value: any };
  culture_items: { key: string; value: any };
  culture_episodes: { key: string; value: any; indexes: { 'item_id': string } };
  focus_sessions: { key: string; value: any };
  alarms: { key: number; value: any };
  calendar_events: { key: string; value: any };
  vault_groups: { key: string; value: any };
  vault_items: { key: string; value: any; indexes: { 'group_id': string } };
  vault_password_history: { key: string; value: any; indexes: { 'item_id': string } };
  tutor_sessions: { key: string; value: any };
  tutor_messages: { key: string; value: any; indexes: { 'session_id': string } };
  tutor_memories: { key: string; value: any };
  anki_decks: { key: string; value: any };
  anki_notes: { key: string; value: any; indexes: { 'deck_id': string } };
  anki_cards: { key: string; value: any; indexes: { 'deck_id': string, 'note_id': string } };
  anki_srs_state: { key: string; value: any };
  anki_reviews: { key: string; value: any; indexes: { 'card_id': string } };
  anki_deck_settings: { key: string; value: any; indexes: { 'deck_id': string } };
  files: { key: string; value: any };
  file_folders: { key: string; value: any };
  file_page_links: { key: string; value: any; indexes: { 'file_id': string, 'page_id': string } };
  ai_logs: { key: string; value: any; indexes: { 'module': string } };
  
  // Legacy tables for migration safety
  items: { key: string; value: any };
  episodes: { key: string; value: any; indexes: { 'item_id': string } };
  focus_alarms: { key: number; value: any };
}

let dbPromise: Promise<IDBPDatabase<CadernoDBSchema>> | null = null;

export async function getWebDb() {
  if (!dbPromise) {
    dbPromise = openDB<CadernoDBSchema>('caderno-web-db', 14, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pages')) {
          const store = db.createObjectStore('pages', { keyPath: 'id' });
          store.createIndex('parent_id', 'parent_id');
        }
        if (!db.objectStoreNames.contains('page_history')) {
          const store = db.createObjectStore('page_history', { keyPath: 'id' });
          store.createIndex('page_id', 'page_id');
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('date', 'date');
        }
        if (!db.objectStoreNames.contains('wishlist')) {
          db.createObjectStore('wishlist', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('library_books')) {
          const store = db.createObjectStore('library_books', { keyPath: 'id' });
          store.createIndex('reading_status', 'reading_status');
        }
        if (!db.objectStoreNames.contains('library_highlights')) {
          const store = db.createObjectStore('library_highlights', { keyPath: 'id' });
          store.createIndex('book_id', 'book_id');
        }
        if (!db.objectStoreNames.contains('library_bookmarks')) {
          const store = db.createObjectStore('library_bookmarks', { keyPath: 'id' });
          store.createIndex('book_id', 'book_id');
        }
        if (!db.objectStoreNames.contains('library_collections')) {
          db.createObjectStore('library_collections', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('library_book_collections')) {
          const store = db.createObjectStore('library_book_collections', { keyPath: 'id' });
          store.createIndex('book_id', 'book_id');
        }
        if (!db.objectStoreNames.contains('library_reading_sessions')) {
          const store = db.createObjectStore('library_reading_sessions', { keyPath: 'id' });
          store.createIndex('book_id', 'book_id');
        }
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('image_cache')) {
          db.createObjectStore('image_cache', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('video_words')) {
          const store = db.createObjectStore('video_words', { keyPath: 'id' });
          store.createIndex('video_id', 'video_id');
        }
        if (!db.objectStoreNames.contains('youtube_watched')) {
          const store = db.createObjectStore('youtube_watched', { keyPath: 'id' });
          store.createIndex('video_id', 'video_id');
        }
        if (!db.objectStoreNames.contains('lofis')) {
          db.createObjectStore('lofis', { keyPath: 'id' });
        }
        // Culture stores
        if (!db.objectStoreNames.contains('culture_items')) {
          db.createObjectStore('culture_items', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('culture_episodes')) {
          const store = db.createObjectStore('culture_episodes', { keyPath: 'id' });
          store.createIndex('item_id', 'item_id');
        }
        // Focus stores
        if (!db.objectStoreNames.contains('focus_sessions')) {
          db.createObjectStore('focus_sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('alarms')) {
          db.createObjectStore('alarms', { keyPath: 'id' });
        }
        // Calendar
        if (!db.objectStoreNames.contains('calendar_events')) {
          db.createObjectStore('calendar_events', { keyPath: 'id' });
        }
        // Vault
        if (!db.objectStoreNames.contains('vault_groups')) {
          db.createObjectStore('vault_groups', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('vault_items')) {
          const store = db.createObjectStore('vault_items', { keyPath: 'id' });
          store.createIndex('group_id', 'group_id');
        }
        if (!db.objectStoreNames.contains('vault_password_history')) {
          const store = db.createObjectStore('vault_password_history', { keyPath: 'id' });
          store.createIndex('item_id', 'item_id');
        }
        // Tutor
        if (!db.objectStoreNames.contains('tutor_sessions')) {
          db.createObjectStore('tutor_sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tutor_messages')) {
          const store = db.createObjectStore('tutor_messages', { keyPath: 'id' });
          store.createIndex('session_id', 'session_id');
        }
        if (!db.objectStoreNames.contains('tutor_memories')) {
          db.createObjectStore('tutor_memories', { keyPath: 'id' });
        }
        // Anki
        if (!db.objectStoreNames.contains('anki_decks')) {
          db.createObjectStore('anki_decks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('anki_notes')) {
          const store = db.createObjectStore('anki_notes', { keyPath: 'id' });
          store.createIndex('deck_id', 'deck_id');
        }
        if (!db.objectStoreNames.contains('anki_cards')) {
          const store = db.createObjectStore('anki_cards', { keyPath: 'id' });
          store.createIndex('deck_id', 'deck_id');
          store.createIndex('note_id', 'note_id');
        } else {
          const store = db.transaction.objectStore('anki_cards');
          if (!store.indexNames.contains('note_id')) {
             store.createIndex('note_id', 'note_id');
          }
        }
        if (!db.objectStoreNames.contains('anki_srs_state')) {
          db.createObjectStore('anki_srs_state', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('anki_reviews')) {
          const store = db.createObjectStore('anki_reviews', { keyPath: 'id' });
          store.createIndex('card_id', 'card_id');
        }
        if (!db.objectStoreNames.contains('anki_deck_settings')) {
          const store = db.createObjectStore('anki_deck_settings', { keyPath: 'id' });
          store.createIndex('deck_id', 'deck_id');
        }
        // Files
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('file_folders')) {
          db.createObjectStore('file_folders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('file_page_links')) {
          const store = db.createObjectStore('file_page_links', { keyPath: 'id' });
          store.createIndex('file_id', 'file_id');
          store.createIndex('page_id', 'page_id');
        }
        // AI Logs
        if (!db.objectStoreNames.contains('ai_logs')) {
          const store = db.createObjectStore('ai_logs', { keyPath: 'id' });
          store.createIndex('module', 'module');
        }

        // Keep legacy tables for now to avoid errors if any code still uses them locally
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('episodes')) {
          const store = db.createObjectStore('episodes', { keyPath: 'id' });
          store.createIndex('item_id', 'item_id');
        }
        if (!db.objectStoreNames.contains('focus_alarms')) {
          db.createObjectStore('focus_alarms', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}
