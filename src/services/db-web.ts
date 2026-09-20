import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema, SharedPageKeyRecord } from './db-web-schema';

export type { CadernoDBSchema, SharedPageKeyRecord } from './db-web-schema';


let dbPromise: Promise<IDBPDatabase<CadernoDBSchema>> | null = null;

export function getWebDb(): Promise<IDBPDatabase<CadernoDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<CadernoDBSchema>('caderno-web-db', 25, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('shared_page_keys')) {
          const store = db.createObjectStore('shared_page_keys', { keyPath: 'shareId' });
          store.createIndex('pageId', 'pageId');
        }
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
        if (!db.objectStoreNames.contains('finance_accounts')) {
          db.createObjectStore('finance_accounts', { keyPath: 'id' });
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
        if (!db.objectStoreNames.contains('library_ocr_cache')) {
          const store = db.createObjectStore('library_ocr_cache', { keyPath: 'id' });
          store.createIndex('book_id', 'book_id');
        }
        if (!db.objectStoreNames.contains('library_book_files')) {
          db.createObjectStore('library_book_files', { keyPath: 'id' });
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
        if (!db.objectStoreNames.contains('youtube_summaries')) {
          const store = db.createObjectStore('youtube_summaries', { keyPath: 'id' });
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
        if (!db.objectStoreNames.contains('activity_logs')) {
          db.createObjectStore('activity_logs', { keyPath: 'id' });
        }
        // Calendar
        if (!db.objectStoreNames.contains('calendar_events')) {
          db.createObjectStore('calendar_events', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' });
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
          const store = transaction.objectStore('anki_cards');
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
        // AI Logs & Prompts
        if (!db.objectStoreNames.contains('ai_logs')) {
          const store = db.createObjectStore('ai_logs', { keyPath: 'id' });
          store.createIndex('module', 'module');
        }
        if (!db.objectStoreNames.contains('ai_prompts')) {
          const store = db.createObjectStore('ai_prompts', { keyPath: 'id' });
          store.createIndex('module', 'module');
        }
        
        // Diagrams
        if (!db.objectStoreNames.contains('diagrams')) {
          db.createObjectStore('diagrams', { keyPath: 'id' });
        }

        // Quiz
        if (!db.objectStoreNames.contains('quiz_batteries')) {
          const store = db.createObjectStore('quiz_batteries', { keyPath: 'id' });
          store.createIndex('page_id', 'page_id');
        }
        if (!db.objectStoreNames.contains('quiz_questions')) {
          const store = db.createObjectStore('quiz_questions', { keyPath: 'id' });
          store.createIndex('battery_id', 'battery_id');
        }
        if (!db.objectStoreNames.contains('quiz_attempts')) {
          const store = db.createObjectStore('quiz_attempts', { keyPath: 'id' });
          store.createIndex('question_id', 'question_id');
          store.createIndex('battery_id', 'battery_id');
        }
        if (!db.objectStoreNames.contains('quiz_page_links')) {
          const store = db.createObjectStore('quiz_page_links', { keyPath: 'id' });
          store.createIndex('battery_id', 'battery_id');
          store.createIndex('page_id', 'page_id');
        }
        if (!db.objectStoreNames.contains('link_metadata_cache')) {
          db.createObjectStore('link_metadata_cache', { keyPath: 'url' });
        }
        if (!db.objectStoreNames.contains('scraps')) {
          db.createObjectStore('scraps', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getWebScrap(id: string): Promise<ArrayBuffer | null> {
  const db = await getWebDb();
  const scrap = await db.get('scraps', id);
  return scrap?.encrypted_data || null;
}

export async function saveWebScrap(id: string, encryptedData: ArrayBuffer): Promise<void> {
  const db = await getWebDb();
  await db.put('scraps', {
    id,
    encrypted_data: encryptedData,
    updated_at: new Date().toISOString()
  });
}

export async function deleteWebScrap(id: string): Promise<void> {
  const db = await getWebDb();
  await db.delete('scraps', id);
}

export async function getAiPrompt(id: string): Promise<string | null> {
  const db = await getWebDb();
  const doc = await db.get('ai_prompts', id);
  return doc?.content || null;
}

export async function saveAiPrompt(id: string, module: string, content: string): Promise<void> {
  const db = await getWebDb();
  await db.put('ai_prompts', {
    id,
    module,
    content,
    updated_at: new Date().toISOString()
  });
}

// ─── Shared Page Keys Storage ───────────────────────────────────────────────

export async function getWebShareKey(shareId: string): Promise<SharedPageKeyRecord | null> {
  const db = await getWebDb();
  return (await db.get('shared_page_keys', shareId)) || null;
}

export async function getWebShareKeyByPage(pageId: string): Promise<SharedPageKeyRecord | null> {
  const db = await getWebDb();
  return (await db.getFromIndex('shared_page_keys', 'pageId', pageId)) || null;
}

export async function saveWebShareKey(record: SharedPageKeyRecord): Promise<void> {
  const db = await getWebDb();
  await db.put('shared_page_keys', record);
}

export async function deleteWebShareKey(shareId: string): Promise<void> {
  const db = await getWebDb();
  await db.delete('shared_page_keys', shareId);
}

export async function listWebShareKeys(): Promise<SharedPageKeyRecord[]> {
  const db = await getWebDb();
  return await db.getAll('shared_page_keys');
}

