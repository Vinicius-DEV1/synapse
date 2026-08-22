import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb, getAiPrompt, saveAiPrompt } from './db-web';
import 'fake-indexeddb/auto';

describe('db-web service (IndexedDB Engine)', () => {
  beforeEach(async () => {
    // Reset/get clean database
    const db = await getWebDb();
    const tx = db.transaction('ai_prompts', 'readwrite');
    await tx.objectStore('ai_prompts').clear();
    await tx.done;
  });

  it('initializes object stores and indices correctly', async () => {
    const db = await getWebDb();
    expect(db.objectStoreNames.contains('pages')).toBe(true);
    expect(db.objectStoreNames.contains('anki_decks')).toBe(true);
    expect(db.objectStoreNames.contains('anki_cards')).toBe(true);
    expect(db.objectStoreNames.contains('library_books')).toBe(true);
    expect(db.objectStoreNames.contains('vault_items')).toBe(true);
    expect(db.objectStoreNames.contains('ai_prompts')).toBe(true);
    expect(db.objectStoreNames.contains('image_cache')).toBe(true);
  });

  it('saves and retrieves AI prompts by id', async () => {
    await saveAiPrompt('prompt-summary', 'notes', 'Resuma este texto em tópicos');

    const prompt = await getAiPrompt('prompt-summary');
    expect(prompt).toBe('Resuma este texto em tópicos');

    const nonExistent = await getAiPrompt('prompt-unknown');
    expect(nonExistent).toBeNull();
  });

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
