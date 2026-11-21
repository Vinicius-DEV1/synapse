import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory, IDBKeyRange as FakeIDBKeyRange } from 'fake-indexeddb';
import { openDB, type IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import { webSyncApi } from './sync';

describe('webSyncApi real IndexedDB v28 -> v29 migration & indexed sync integration', () => {
  let idbFactory: IDBFactory;

  beforeEach(() => {
    idbFactory = new IDBFactory();
    Object.defineProperty(globalThis, 'indexedDB', {
      value: idbFactory,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'IDBKeyRange', {
      value: FakeIDBKeyRange,
      configurable: true,
      writable: true,
    });
  });

  async function seedV28AndUpgradeToV29(dbName: string): Promise<IDBPDatabase<CadernoDBSchema>> {
    // 1. Create legacy v28 database without updated_at / created_at / deleted_at indexes
    const v28 = await openDB(dbName, 28, {
      upgrade(db) {
        db.createObjectStore('pages', { keyPath: 'id' });
        db.createObjectStore('page_history', { keyPath: 'id' });
        db.createObjectStore('library_books', { keyPath: 'id' });
        db.createObjectStore('library_book_files', { keyPath: 'id' });
      },
    });

    await v28.put('pages', {
      id: 'p-old',
      title: 'Old ISO',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      deleted_at: null,
    });
    await v28.put('pages', {
      id: 'p-iso-new',
      title: 'New ISO',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2026-05-10T15:30:00.000Z',
      deleted_at: null,
    });
    await v28.put('pages', {
      id: 'p-space-new',
      title: 'New SQLite Space Timestamp',
      created_at: '2023-01-01 00:00:00',
      updated_at: '2026-05-10 15:30:00',
      deleted_at: null,
    });
    await v28.put('pages', {
      id: 'p-numeric-new',
      title: 'Numeric Epoch Ms',
      created_at: 1_672_531_200_000,
      updated_at: 1_780_000_000_000,
      deleted_at: null,
    });
    await v28.put('pages', {
      id: 'p-soft-deleted',
      title: 'Soft Deleted With Old updated_at',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      deleted_at: '2026-05-11T09:00:00.000Z',
    });
    await v28.put('pages', {
      id: 'p-empty-updated-created-new',
      title: 'Empty updated_at but new created_at',
      created_at: '2026-05-12T10:00:00.000Z',
      updated_at: '',
      deleted_at: null,
    });

    // Append-only store rows without updated_at
    await v28.put('page_history', {
      id: 'h-old',
      page_id: 'p-old',
      created_at: '2023-02-01T00:00:00.000Z',
    });
    await v28.put('page_history', {
      id: 'h-new',
      page_id: 'p-iso-new',
      created_at: '2026-05-12T00:00:00.000Z',
    });

    await v28.put('library_books', {
      id: 'book-1',
      title: 'Clean Architecture',
      author: 'Robert Martin',
      updated_at: '2025-01-01T00:00:00.000Z',
    });
    await v28.put('library_book_files', {
      id: 'book-1',
      blob: new Uint8Array([1, 2, 3]),
    });

    v28.close();

    // 2. Upgrade v28 -> v29 with the exact index creation logic from db-web.ts
    const localOnly = new Set(['library_book_files']);
    const v29 = await openDB<CadernoDBSchema>(dbName, 29, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        for (const storeName of Array.from(db.objectStoreNames)) {
          if (localOnly.has(storeName)) continue;
          const store = transaction.objectStore(storeName) as unknown as IDBObjectStore;
          if (!store.indexNames.contains('updated_at')) {
            store.createIndex('updated_at', 'updated_at');
          }
          if (!store.indexNames.contains('created_at')) {
            store.createIndex('created_at', 'created_at');
          }
          if (!store.indexNames.contains('deleted_at')) {
            store.createIndex('deleted_at', 'deleted_at');
          }
        }
      },
    });

    return v29;
  }

  it('upgrades v28 -> v29 and returns exact modified rows across ISO, space, numeric, soft-deleted, empty updated_at, and append-only stores', async () => {
    const db = await seedV28AndUpgradeToV29('caderno-v29-modified-test');
    try {
      const api = webSyncApi(db, db.delete.bind(db), db.put.bind(db));
      const sinceMs = Date.parse('2026-05-01T00:00:00.000Z');

      const modifiedPages = await api.getModifiedRows<{ id: string }>('pages', sinceMs);
      const pageIds = modifiedPages.map((r) => r.id).sort();
      expect(pageIds).toEqual([
        'p-empty-updated-created-new',
        'p-iso-new',
        'p-numeric-new',
        'p-soft-deleted',
        'p-space-new',
      ]);

      const modifiedHistory = await api.getModifiedRows<{ id: string }>('page_history', sinceMs);
      expect(modifiedHistory.map((r) => r.id)).toEqual(['h-new']);
    } finally {
      db.close();
    }
  });

  it('upsertRowsBatch merges duplicate IDs sequentially in one tx and cleans up library_book_files on soft delete', async () => {
    const db = await seedV28AndUpgradeToV29('caderno-v29-batch-test');
    try {
      const api = webSyncApi(db, db.delete.bind(db), db.put.bind(db));

      await api.upsertRowsBatch!('library_books', [
        { id: 'book-1', progress: 42 },
        { id: 'book-1', deleted_at: '2026-06-01T00:00:00.000Z' },
        { id: 'book-2', title: 'DDIA', updated_at: '2026-06-01T00:00:00.000Z' },
      ]);

      const book1 = (await db.get('library_books', 'book-1')) as Record<string, unknown>;
      expect(book1.title).toBe('Clean Architecture');
      expect(book1.author).toBe('Robert Martin');
      expect(book1.progress).toBe(42);
      expect(book1.deleted_at).toBe('2026-06-01T00:00:00.000Z');

      const book1File = await db.get('library_book_files', 'book-1');
      expect(book1File).toBeUndefined();

      const book2 = (await db.get('library_books', 'book-2')) as Record<string, unknown>;
      expect(book2.title).toBe('DDIA');
    } finally {
      db.close();
    }
  });
});
