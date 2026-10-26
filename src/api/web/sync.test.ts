import { describe, it, expect, vi } from 'vitest';
import { webSyncApi } from './sync';

describe('webSyncApi', () => {
  const mockDb = {
    objectStoreNames: {
      contains: vi.fn((name: string) => name === 'pages'),
    },
    getAll: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  };

  const originalDelete = vi.fn();
  const originalPut = vi.fn();

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

    const api = webSyncApi(mockDb as any, originalDelete, originalPut);
    const results = await api.getModifiedRows!('pages', thresholdMs);

    // Row 2 is from 2026 (> thresholdMs which is ~Nov 2023), row 3, 4, 5 are > thresholdMs
    expect(results.map((r: any) => r.id)).toEqual(['2', '3', '4', '5']);
  });

  it('returns empty array when table store is not found', async () => {
    const api = webSyncApi(mockDb as any, originalDelete, originalPut);
    const results = await api.getModifiedRows!('unknown_table', 1000);
    expect(results).toEqual([]);
  });
});
