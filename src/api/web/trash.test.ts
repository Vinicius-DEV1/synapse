import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webTrashApi } from './trash';

describe('webTrashApi (IndexedDB)', () => {
  let api: any;
  let db: any;

  beforeEach(async () => {
    db = await getWebDb();
    await db.clear('pages');
    await db.clear('transactions');
    api = webTrashApi(db);
  });

  it('aggregates soft-deleted items across multiple tables and restores them', async () => {
    // Insert a soft-deleted page
    await db.put('pages', {
      id: 'deleted-page-1',
      title: 'Old Notes',
      deleted_at: '2026-08-19T10:00:00.000Z',
    });

    // Insert an active page
    await db.put('pages', {
      id: 'active-page-2',
      title: 'Current Notes',
      deleted_at: null,
    });

    let trash = await api.getAll();
    expect(trash).toHaveLength(1);
    expect(trash[0].title).toBe('Old Notes');
    expect(trash[0].item_type).toBe('page');

    // Restore page
    await api.restore('deleted-page-1', 'page');
    trash = await api.getAll();
    expect(trash).toHaveLength(0);

    const restoredPage = await db.get('pages', 'deleted-page-1');
    expect(restoredPage.deleted_at).toBeNull();
  });

  it('permanently deletes an item from the database', async () => {
    await db.put('pages', {
      id: 'perm-delete-page',
      title: 'Trash Page',
      deleted_at: '2026-08-19T10:00:00.000Z',
    });

    await api.deletePermanently('perm-delete-page', 'page');

    const check = await db.get('pages', 'perm-delete-page');
    expect(check).toBeUndefined();
  });

  it('aggregates soft-deleted wishlist items and restores them', async () => {
    await db.put('wishlist', {
      id: 'wish-trash-1',
      title: 'iPad Pro',
      price: 6000,
      priority: 'high',
      deleted_at: '2026-08-20T10:00:00.000Z',
    });

    let trash = await api.getAll();
    const wishItem = trash.find((t: any) => t.id === 'wish-trash-1');
    expect(wishItem).toBeDefined();
    expect(wishItem.title).toBe('iPad Pro');
    expect(wishItem.item_type).toBe('wishlist');

    await api.restore('wish-trash-1', 'wishlist');
    trash = await api.getAll();
    expect(trash.find((t: any) => t.id === 'wish-trash-1')).toBeUndefined();

    const restored = await db.get('wishlist', 'wish-trash-1');
    expect(restored.deleted_at).toBeNull();
  });
});

