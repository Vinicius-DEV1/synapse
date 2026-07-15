import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface CadernoDBSchema extends DBSchema {
  pages: { key: string; value: any; indexes: { 'parent_id': string } };
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
  lofis: { key: string; value: any };
  items: { key: string; value: any };
  episodes: { key: string; value: any; indexes: { 'item_id': string } };
  focus_sessions: { key: string; value: any };
  focus_alarms: { key: number; value: any };
  calendar_events: { key: string; value: any };
  vault_groups: { key: string; value: any };
  vault_items: { key: string; value: any; indexes: { 'group_id': string } };
  vault_password_history: { key: string; value: any; indexes: { 'item_id': string } };
}

let dbPromise: Promise<IDBPDatabase<CadernoDBSchema>> | null = null;

export async function getWebDb() {
  if (!dbPromise) {
    dbPromise = openDB<CadernoDBSchema>('caderno-web-db', 7, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pages')) {
          const store = db.createObjectStore('pages', { keyPath: 'id' });
          store.createIndex('parent_id', 'parent_id');
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
        if (!db.objectStoreNames.contains('lofis')) {
          db.createObjectStore('lofis', { keyPath: 'id' });
        }
        // Culture stores
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('episodes')) {
          const store = db.createObjectStore('episodes', { keyPath: 'id' });
          store.createIndex('item_id', 'item_id');
        }
        // Focus stores
        if (!db.objectStoreNames.contains('focus_sessions')) {
          db.createObjectStore('focus_sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('focus_alarms')) {
          db.createObjectStore('focus_alarms', { keyPath: 'id' });
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
      },
    });
  }
  return dbPromise;
}
