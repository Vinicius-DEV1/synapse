import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webSyncApi } from './sync';

describe('webSyncApi (IndexedDB)', () => {
  let db: Awaited<ReturnType<typeof getWebDb>>;
  let api: ReturnType<typeof webSyncApi>;

  beforeEach(async () => {
    db = await getWebDb();
    await db.clear('pages');
    await db.clear('library_books');
    await db.clear('library_book_files');

    const originalDelete = db.delete.bind(db);
    const originalPut = db.put.bind(db);
    api = webSyncApi(db, originalDelete, originalPut);
  });

  it('retrieves rows from table using getTable and returns empty for unknown tables', async () => {
    await db.put('pages', {
      id: 'page-s1',
      title: 'Sync Test 1',
      content: 'hello',
      created_at: '2026-10-25T12:00:00Z',
      updated_at: '2026-10-25T12:00:00Z',
    });

    const pages = await api.getTable('pages');
    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe('page-s1');

    const unknown = await api.getTable('non_existent_table');
    expect(unknown).toEqual([]);
  });

  it('retrieves a single row with getRow', async () => {
    await db.put('pages', {
      id: 'page-s2',
      title: 'Sync Test 2',
      content: '',
      created_at: '2026-10-25T12:00:00Z',
      updated_at: '2026-10-25T12:00:00Z',
    });

    const found = await api.getRow!('pages', 'page-s2');
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Sync Test 2');

    const notFound = await api.getRow!('pages', 'missing-id');
    expect(notFound).toBeNull();
  });

  it('fetches only matching rows in getRowsByIds efficiently', async () => {
    await db.put('pages', {
      id: 'p-1',
      title: 'P1',
      content: '',
      created_at: '2026-10-25T12:00:00Z',
      updated_at: '2026-10-25T12:00:00Z',
    });
    await db.put('pages', {
      id: 'p-2',
      title: 'P2',
      content: '',
      created_at: '2026-10-25T12:00:00Z',
      updated_at: '2026-10-25T12:00:00Z',
    });
    await db.put('pages', {
      id: 'p-3',
      title: 'P3',
      content: '',
      created_at: '2026-10-25T12:00:00Z',
      updated_at: '2026-10-25T12:00:00Z',
    });

    const results = await api.getRowsByIds('pages', ['p-1', 'p-3', 'p-999']);
    expect(results).toHaveLength(2);
    const ids = results.map(r => r.id);
    expect(ids).toContain('p-1');
    expect(ids).toContain('p-3');
    expect(ids).not.toContain('p-2');
  });

  it('upserts rows merging with existing records', async () => {
    await db.put('pages', {
      id: 'page-merge',
      title: 'Original Title',
      content: 'Original Content',
      created_at: '2026-10-25T10:00:00Z',
      updated_at: '2026-10-25T10:00:00Z',
    });

    // Update only title
    const res = await api.upsertRow('pages', {
      id: 'page-merge',
      title: 'Updated Title',
      updated_at: '2026-10-25T12:00:00Z',
    });
    expect(res.success).toBe(true);

    const merged = await db.get('pages', 'page-merge');
    expect(merged?.title).toBe('Updated Title');
    expect(merged?.content).toBe('Original Content');
  });

  it('cleans up library_book_files when a library_book is soft-deleted on upsert', async () => {
    await db.put('library_book_files', {
      id: 'book-del-1',
      data: new ArrayBuffer(8),
    });

    await api.upsertRow('library_books', {
      id: 'book-del-1',
      title: 'Book to Delete',
      deleted_at: '2026-10-25T12:00:00Z',
    });

    const file = await db.get('library_book_files', 'book-del-1');
    expect(file).toBeUndefined();
  });

  it('deletes rows via deleteRow', async () => {
    await db.put('pages', {
      id: 'page-to-del',
      title: 'Delete me',
      content: '',
      created_at: '2026-10-25T12:00:00Z',
      updated_at: '2026-10-25T12:00:00Z',
    });

    const res = await api.deleteRow!('pages', 'page-to-del');
    expect(res.success).toBe(true);

    const check = await db.get('pages', 'page-to-del');
    expect(check).toBeUndefined();
  });
});
