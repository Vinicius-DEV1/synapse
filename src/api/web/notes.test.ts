import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { createWebNotesApi } from './notes';

describe('createWebNotesApi (IndexedDB)', () => {
  let api: ReturnType<typeof createWebNotesApi>;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('pages');
    api = createWebNotesApi(db, () => 'page-' + Math.random().toString(36).substring(2, 9));
  });

  it('creates, retrieves, updates, and soft-deletes pages', async () => {
    const page = await api.createPage({ parentId: null, title: 'Calculus Notes', icon: '📐' });
    expect(page.id).toBeDefined();
    expect(page.title).toBe('Calculus Notes');
    expect(page.icon).toBe('📐');

    // getAllPages should return page without content/encrypted_content
    const all = await api.getAllPages();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(page.id);
    expect(all[0].content).toBeUndefined();

    // updatePage
    const updatedRows = await api.updatePage({ id: page.id, title: 'Advanced Calculus' });
    expect(updatedRows).toBe(1);

    const contentRes = await api.getPageContent(page.id);
    expect(contentRes.content).toBe('');

    // deletePage (soft delete)
    const deleted = await api.deletePage(page.id);
    expect(deleted).toBe(true);

    // getAllPages should exclude soft-deleted
    const afterDelete = await api.getAllPages();
    expect(afterDelete).toHaveLength(0);

    // getDeletedPages should include it
    const trash = await api.getDeletedPages();
    expect(trash).toHaveLength(1);
    expect(trash[0].id).toBe(page.id);

    // restorePage
    const restored = await api.restorePage(page.id);
    expect(restored).toBe(true);

    const afterRestore = await api.getAllPages();
    expect(afterRestore).toHaveLength(1);
  });

  it('reorders pages transactionally', async () => {
    const p1 = await api.createPage({ parentId: null, title: 'Page 1' });
    const p2 = await api.createPage({ parentId: null, title: 'Page 2' });

    const reordered = await api.reorderPages([
      { id: p1.id, sort_order: 10 },
      { id: p2.id, sort_order: 5 },
    ]);
    expect(reordered).toBe(true);

    const all = await api.getAllPages();
    const map = new Map(all.map((p) => [p.id, p.sort_order]));
    expect(map.get(p1.id)).toBe(10);
    expect(map.get(p2.id)).toBe(5);
  });

  it('decrypts encrypted_content on-the-fly with getMasterKey if page is not locked', async () => {
    const { importHexKey, encryptText } = await import('../../services/crypto');
    const db = await getWebDb();
    const hex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const key = await importHexKey(hex);
    let currentKey: CryptoKey | null = key;

    const securedApi = createWebNotesApi(db, () => 'secured-page-1', () => currentKey);
    const secretContent = 'Secret Markdown Content from Desktop Sync';
    const encryptedContent = await encryptText(secretContent, key);

    // Simulate page saved with encrypted_content
    await db.put('pages', {
      id: 'secured-page-1',
      title: 'Encrypted Page',
      icon: '🔒',
      sort_order: 0,
      content: '',
      encrypted_content: encryptedContent,
      is_locked: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await securedApi.getPageContent('secured-page-1');
    expect(res.content).toBe(secretContent);
    expect(res.encrypted_content).toBe(encryptedContent);

    // If page is locked with password (is_locked = 1), content should remain empty
    await db.put('pages', {
      id: 'locked-page-2',
      title: 'Locked Page',
      icon: '🔐',
      sort_order: 0,
      content: '',
      encrypted_content: encryptedContent,
      is_locked: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const lockedRes = await securedApi.getPageContent('locked-page-2');
    expect(lockedRes.content).toBe('');
    expect(lockedRes.encrypted_content).toBe(encryptedContent);
  });

  it('skips redundant database updates and throttles history records to 60s', async () => {
    const db = await getWebDb();
    const p = await api.createPage({ parentId: null, title: 'Throttling Page' });

    // 1. First content update should record history
    const update1 = await api.updatePage({ id: p.id, content: 'Version 1' });
    expect(update1).toBe(1);

    const history1 = (await db.getAllFromIndex('page_history', 'page_id', p.id)) as unknown[];
    expect(history1).toHaveLength(1);

    // 2. Second rapid update (within 60s) should NOT record another history snapshot
    const update2 = await api.updatePage({ id: p.id, content: 'Version 2' });
    expect(update2).toBe(1);

    const history2 = (await db.getAllFromIndex('page_history', 'page_id', p.id)) as unknown[];
    expect(history2).toHaveLength(1);

    // 3. Update with no actual changes should return 0 (no-op)
    const updateNoop = await api.updatePage({ id: p.id, content: 'Version 2' });
    expect(updateNoop).toBe(0);
  });
});


