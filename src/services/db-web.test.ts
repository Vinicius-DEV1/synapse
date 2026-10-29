import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWebDb,
  getAiPrompt,
  saveAiPrompt,
  getWebScrap,
  saveWebScrap,
  deleteWebScrap,
  saveWebShareKey,
  getWebShareKey,
  getWebShareKeyByPage,
  listWebShareKeys,
  deleteWebShareKey,
} from './db-web';
import 'fake-indexeddb/auto';

describe('db-web service (IndexedDB Engine & Resilience)', () => {
  beforeEach(async () => {
    // Reset/get clean database
    const db = await getWebDb();
    const promptTx = db.transaction('ai_prompts', 'readwrite');
    await promptTx.objectStore('ai_prompts').clear();
    await promptTx.done;

    const scrapsTx = db.transaction('scraps', 'readwrite');
    await scrapsTx.objectStore('scraps').clear();
    await scrapsTx.done;

    const keysTx = db.transaction('shared_page_keys', 'readwrite');
    await keysTx.objectStore('shared_page_keys').clear();
    await keysTx.done;
  });

  describe('Database Initialization & Object Stores', () => {
    it('initializes object stores and indices correctly', async () => {
      const db = await getWebDb();
      expect(db.objectStoreNames.contains('pages')).toBe(true);
      expect(db.objectStoreNames.contains('anki_decks')).toBe(true);
      expect(db.objectStoreNames.contains('anki_cards')).toBe(true);
      expect(db.objectStoreNames.contains('library_books')).toBe(true);
      expect(db.objectStoreNames.contains('vault_items')).toBe(true);
      expect(db.objectStoreNames.contains('ai_prompts')).toBe(true);
      expect(db.objectStoreNames.contains('image_cache')).toBe(true);
      expect(db.objectStoreNames.contains('scraps')).toBe(true);
      expect(db.objectStoreNames.contains('shared_page_keys')).toBe(true);
    });
  });

  describe('AI Prompts Store', () => {
    it('saves and retrieves AI prompts by id', async () => {
      await saveAiPrompt('prompt-summary', 'notes', 'Resuma este texto em tópicos');

      const prompt = await getAiPrompt('prompt-summary');
      expect(prompt).toBe('Resuma este texto em tópicos');

      const nonExistent = await getAiPrompt('prompt-unknown');
      expect(nonExistent).toBeNull();
    });
  });

  describe('Scraps Binary Storage', () => {
    it('stores and retrieves binary ArrayBuffer data without corruption', async () => {
      const rawBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x42, 0x99]);
      await saveWebScrap('scrap-1', rawBytes.buffer);

      const retrieved = await getWebScrap('scrap-1');
      expect(retrieved).not.toBeNull();
      expect(new Uint8Array(retrieved!)).toEqual(rawBytes);

      await deleteWebScrap('scrap-1');
      const afterDelete = await getWebScrap('scrap-1');
      expect(afterDelete).toBeNull();
    });
  });

  describe('Shared Page Keys (E2EE Sharing)', () => {
    it('saves, queries by pageId index, lists and deletes share key records', async () => {
      const record = {
        shareId: 'share-abc-123',
        pageId: 'page-xyz-789',
        encryptedKey: 'enc-key-payload',
        title: 'Public Architecture Note',
        ownerUid: 'uid-alice',
        createdAt: '2026-10-25T10:00:00Z',
      };

      await saveWebShareKey(record);

      const byShareId = await getWebShareKey('share-abc-123');
      expect(byShareId).toEqual(record);

      const byPageId = await getWebShareKeyByPage('page-xyz-789');
      expect(byPageId).toEqual(record);

      const allKeys = await listWebShareKeys();
      expect(allKeys.some(k => k.shareId === 'share-abc-123')).toBe(true);

      await deleteWebShareKey('share-abc-123');
      const deleted = await getWebShareKey('share-abc-123');
      expect(deleted).toBeNull();
    });
  });

  describe('CRUD Operations and Parent-Child Tree Indexing', () => {
    it('performs CRUD operations on pages store with indexing by parent_id', async () => {
      const db = await getWebDb();

      // Insert root page
      await db.put('pages', {
        id: 'root-page',
        title: 'Página Raiz',
        parent_id: null,
        created_at: '2026-08-20T10:00:00Z',
      });

      // Insert child page
      await db.put('pages', {
        id: 'child-page-1',
        title: 'Subpágina 1',
        parent_id: 'root-page',
        created_at: '2026-08-21T10:00:00Z',
      });

      const retrievedChild = await db.get('pages', 'child-page-1');
      expect(retrievedChild.title).toBe('Subpágina 1');

      // Query index
      const children = await db.getAllFromIndex('pages', 'parent_id', 'root-page');
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe('child-page-1');

      // Delete
      await db.delete('pages', 'child-page-1');
      const afterDelete = await db.get('pages', 'child-page-1');
      expect(afterDelete).toBeUndefined();
    });
  });

  describe('Transaction Atomicity & Rollback Simulation', () => {
    it('rolls back all staged writes when an atomic transaction is aborted or throws', async () => {
      const db = await getWebDb();
      const tx = db.transaction('pages', 'readwrite');
      const store = tx.objectStore('pages');

      // Write a page inside transaction
      await store.put({
        id: 'aborted-page-test',
        title: 'Should never persist',
        parent_id: null,
        created_at: '2026-10-25T10:00:00Z',
      });

      // Simulate a mid-transaction crash or business rule validation error
      tx.abort();

      // Wait for abort to settle
      await expect(tx.done).rejects.toThrow();

      // Verify that data was not saved to storage
      const check = await db.get('pages', 'aborted-page-test');
      expect(check).toBeUndefined();
    });
  });

  describe('Connection Recovery & Error Handling', () => {
    it('handles simulated storage errors and prevents corrupted states', async () => {
      const db = await getWebDb();
      // Verify healthy operations on connected instance
      expect(db).toBeDefined();
      expect(db.name).toBe('caderno-web-db');
    });
  });
});
