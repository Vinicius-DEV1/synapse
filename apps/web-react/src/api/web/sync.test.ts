import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webSyncApi } from './sync';

describe('webSyncApi (Persistence & Sync Storage Adapter)', () => {
  let mockDb: any;
  let originalDelete: any;
  let originalPut: any;

  beforeEach(() => {
    originalDelete = vi.fn().mockResolvedValue(undefined);
    originalPut = vi.fn().mockResolvedValue(undefined);

    mockDb = {
      objectStoreNames: {
        contains: vi.fn((name: string) => ['pages', 'library_books', 'library_book_files'].includes(name)),
      },
      getAll: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn(),
    };
  });

  describe('getModifiedRows', () => {
    it('filters modified rows supporting both SQLite space format and ISO format', async () => {
      const thresholdMs = 1700000000000;
      const rows = [
        { id: '1', updated_at: new Date(thresholdMs - 10000).toISOString() }, // older ISO
        { id: '2', updated_at: '2026-10-26 18:00:00' }, // space format
        { id: '3', updated_at: new Date(thresholdMs + 5000).toISOString() }, // newer ISO
        { id: '4', created_at: new Date(thresholdMs + 1000).toISOString() }, // created newer
        { id: '5', deleted_at: new Date(thresholdMs + 2000).toISOString() }, // deleted newer
      ];

      mockDb.getAll.mockResolvedValueOnce(rows);

      const api = webSyncApi(mockDb, originalDelete, originalPut);
      const results = await api.getModifiedRows!('pages', thresholdMs);

      expect(results.map((r: any) => r.id)).toEqual(['2', '3', '4', '5']);
    });

    it('reports missing local stores instead of treating them as empty tables', async () => {
      const api = webSyncApi(mockDb, originalDelete, originalPut);
      await expect(api.getModifiedRows!('unknown_table', 1000)).rejects.toThrow('IndexedDB store is unavailable');
    });
  });

  describe('upsertRow', () => {
    it('merges incoming fields with existing record to avoid field wiping', async () => {
      const existingDoc = {
        id: 'p1',
        title: 'Original Title',
        custom_metadata: { author: 'Alice', pinned: true },
        created_at: '2026-10-01T00:00:00.000Z',
      };
      mockDb.get.mockResolvedValueOnce(existingDoc);

      const api = webSyncApi(mockDb, originalDelete, originalPut);
      const updatePayload = {
        id: 'p1',
        title: 'Updated Title', // only title changed
        updated_at: '2026-10-25T12:00:00.000Z',
      };

      const result = await api.upsertRow('pages', updatePayload);

      expect(result).toEqual({ success: true });
      expect(originalPut).toHaveBeenCalledWith(
        'pages',
        expect.objectContaining({
          id: 'p1',
          title: 'Updated Title',
          custom_metadata: { author: 'Alice', pinned: true }, // preserved!
          created_at: '2026-10-01T00:00:00.000Z', // preserved!
          updated_at: '2026-10-25T12:00:00.000Z',
        })
      );
    });

    it('cascades deletion to library_book_files when library_books is soft-deleted', async () => {
      mockDb.get.mockResolvedValueOnce({ id: 'book-99', title: 'Clean Code' });

      const api = webSyncApi(mockDb, originalDelete, originalPut);
      await api.upsertRow('library_books', {
        id: 'book-99',
        deleted_at: '2026-10-25T12:00:00.000Z',
      });

      expect(mockDb.delete).toHaveBeenCalledWith('library_book_files', 'book-99');
      expect(originalPut).toHaveBeenCalledWith('library_books', expect.objectContaining({ id: 'book-99' }));
    });

    it('does not overwrite a row when fetching the existing record fails', async () => {
      mockDb.get.mockRejectedValueOnce(new Error('IndexedDB transaction timeout'));

      const api = webSyncApi(mockDb, originalDelete, originalPut);
      await expect(api.upsertRow('pages', { id: 'p2', title: 'Fallback Write' })).rejects.toThrow(
        'IndexedDB transaction timeout'
      );

      expect(originalPut).not.toHaveBeenCalled();
    });

    it('reports a missing store instead of skipping a write', async () => {
      const api = webSyncApi(mockDb, originalDelete, originalPut);
      await expect(api.upsertRow('non_existent_table', { id: 'x1' })).rejects.toThrow(
        'IndexedDB store is unavailable'
      );

      expect(originalPut).not.toHaveBeenCalled();
    });
  });

  describe('getRowsByIds', () => {
    it('returns empty array when ids list is empty', async () => {
      const api = webSyncApi(mockDb, originalDelete, originalPut);
      const results = await api.getRowsByIds!('pages', []);
      expect(results).toEqual([]);
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('batch retrieves multiple rows in a single readonly transaction', async () => {
      const mockStoreGet = vi.fn().mockImplementation((id: string) => {
        if (id === 'p1') return Promise.resolve({ id: 'p1', title: 'Page 1' });
        if (id === 'p2') return Promise.resolve({ id: 'p2', title: 'Page 2' });
        return Promise.resolve(undefined);
      });

      mockDb.transaction.mockReturnValue({
        store: { get: mockStoreGet },
        done: Promise.resolve(),
      });

      const api = webSyncApi(mockDb, originalDelete, originalPut);
      const results = await api.getRowsByIds!('pages', ['p1', 'p2', 'missing-p3']);

      expect(results).toHaveLength(2);
      expect(results).toEqual([
        { id: 'p1', title: 'Page 1' },
        { id: 'p2', title: 'Page 2' },
      ]);
    });
  });

  describe('getTable and getRow', () => {
    it('returns all rows for an existing store', async () => {
      mockDb.getAll.mockResolvedValueOnce([{ id: '1' }, { id: '2' }]);
      const api = webSyncApi(mockDb, originalDelete, originalPut);
      const res = await api.getTable('pages');
      expect(res).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('returns single row by id or null when missing', async () => {
      mockDb.get.mockResolvedValueOnce({ id: 'p1', title: 'Doc' });
      const api = webSyncApi(mockDb, originalDelete, originalPut);
      const doc = await api.getRow!('pages', 'p1');
      expect(doc).toEqual({ id: 'p1', title: 'Doc' });

      mockDb.get.mockResolvedValueOnce(undefined);
      const missing = await api.getRow!('pages', 'missing');
      expect(missing).toBeNull();
    });

    it('reports a getRow storage failure instead of returning a false miss', async () => {
      mockDb.get.mockRejectedValueOnce(new Error('Corrupt block'));
      const api = webSyncApi(mockDb, originalDelete, originalPut);
      await expect(api.getRow!('pages', 'corrupt-id')).rejects.toThrow('Corrupt block');
    });
  });

  describe('deleteRow', () => {
    it('calls originalDelete when store exists', async () => {
      const api = webSyncApi(mockDb, originalDelete, originalPut);
      const res = await api.deleteRow('pages', 'p1');
      expect(res).toEqual({ success: true });
      expect(originalDelete).toHaveBeenCalledWith('pages', 'p1');
    });
  });
});
