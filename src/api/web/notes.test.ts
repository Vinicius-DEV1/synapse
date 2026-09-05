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
});
