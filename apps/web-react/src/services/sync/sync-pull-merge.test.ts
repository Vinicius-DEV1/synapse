import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';
import {
  normalizeTime,
  prepareRowForUpsert,
  upsertRowWithColumnFallback,
} from './sync-pull-merge';
import { getYDocStateAsBase64 } from '../../utils/yjs-utils';
import type { DecryptedResult } from './sync-decrypt-batch';

describe('sync-pull-merge service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeTime', () => {
    it('returns undefined for falsy or empty inputs', () => {
      expect(normalizeTime(null)).toBeUndefined();
      expect(normalizeTime(undefined)).toBeUndefined();
      expect(normalizeTime('')).toBeUndefined();
      expect(normalizeTime(0)).toBeUndefined();
    });

    it('handles Firestore Timestamp objects with toDate() method', () => {
      const mockTimestamp = {
        toDate: () => new Date('2026-10-25T14:30:00.000Z'),
      };
      expect(normalizeTime(mockTimestamp)).toBe('2026-10-25T14:30:00.000Z');
    });

    it('handles Firestore Timestamp raw objects with seconds property', () => {
      const mockRawSeconds = { seconds: 1761402600 };
      const result = normalizeTime(mockRawSeconds);
      expect(result).toBeDefined();
      expect(new Date(result!).getTime()).toBe(1761402600 * 1000);
    });

    it('normalizes ISO string and SQLite space-separated date strings', () => {
      expect(normalizeTime('2026-10-25T10:00:00.000Z')).toBe('2026-10-25T10:00:00.000Z');
      const spaceDate = normalizeTime('2026-10-25 10:00:00');
      expect(spaceDate).toBeDefined();
      expect(new Date(spaceDate!).getUTCFullYear()).toBe(2026);
    });

    it('returns undefined for malformed non-date strings', () => {
      expect(normalizeTime('not-a-valid-date-string')).toBeUndefined();
    });
  });

  describe('prepareRowForUpsert', () => {
    const createMockResult = (
      docId: string,
      cloudData: Record<string, unknown>,
      parsed: Record<string, unknown> | null
    ): DecryptedResult => ({
      docSnap: { id: docId } as any,
      cloudData: cloudData as any,
      parsed,
      isLegacy: false,
      error: null,
    });

    it('prepares new incoming cloud document when local row does not exist', async () => {
      const mockResult = createMockResult(
        'doc-1',
        {
          updatedAt: '2026-10-25T12:00:00.000Z',
          createdAt: '2026-10-25T10:00:00.000Z',
        },
        { title: 'New Note', content: 'Fresh cloud content' }
      );

      const prepared = await prepareRowForUpsert(mockResult, 'pages', undefined, undefined);

      expect(prepared.isSkipped).toBe(false);
      expect(prepared.rowToUpsert.id).toBe('doc-1');
      expect(prepared.rowToUpsert.title).toBe('New Note');
      expect(prepared.rowToUpsert.content).toBe('Fresh cloud content');
      expect(prepared.rowToUpsert.updated_at).toBe('2026-10-25T12:00:00.000Z');
      expect(prepared.rowToUpsert.deleted_at).toBeNull();
    });

    it('merges Yjs CRDT states when table is pages and both have crdt_state', async () => {
      // Create local YDoc with state
      const localDoc = new Y.Doc();
      const localText = localDoc.getText('content');
      localText.insert(0, 'Local edit ');
      const localCrdtBase64 = getYDocStateAsBase64(localDoc);

      // Create cloud YDoc with state
      const cloudDoc = new Y.Doc();
      const cloudText = cloudDoc.getText('content');
      cloudText.insert(0, 'Cloud edit');
      const cloudCrdtBase64 = getYDocStateAsBase64(cloudDoc);

      const mockResult = createMockResult(
        'page-crdt-1',
        { updatedAt: '2026-10-25T12:00:00.000Z' },
        { title: 'Collab Note', crdt_state: cloudCrdtBase64 }
      );

      const localRow = {
        id: 'page-crdt-1',
        title: 'Collab Note Local',
        crdt_state: localCrdtBase64,
        updated_at: '2026-10-25T11:00:00.000Z',
      };

      const prepared = await prepareRowForUpsert(mockResult, 'pages', localRow, undefined);

      expect(prepared.isSkipped).toBe(false);
      expect(prepared.rowToUpsert.crdt_state).toBeDefined();
      expect(typeof prepared.rowToUpsert.crdt_state).toBe('string');
      // Verify merged state combines both CRDT operations
      const mergedDoc = new Y.Doc();
      const updateBytes = Uint8Array.from(atob(prepared.rowToUpsert.crdt_state as string), c => c.charCodeAt(0));
      Y.applyUpdate(mergedDoc, updateBytes);
      expect(mergedDoc.getText('content').toString()).toContain('Local edit');
    });

    it('skips cloud update when local row is newer than cloud data', async () => {
      const mockResult = createMockResult(
        'doc-stale-cloud',
        { updatedAt: '2026-10-25T10:00:00.000Z' }, // older
        { title: 'Stale cloud title' }
      );

      const localRow = {
        id: 'doc-stale-cloud',
        title: 'Newer local title',
        updated_at: '2026-10-25T15:00:00.000Z', // newer
      };

      const prepared = await prepareRowForUpsert(mockResult, 'vault_items', localRow, undefined);

      expect(prepared.isSkipped).toBe(true);
      expect(prepared.rowToUpsert.title).toBe('Stale cloud title');
    });

    it('applies soft delete from cloud even if local row is newer, when local is not yet deleted', async () => {
      const mockResult = createMockResult(
        'doc-remote-delete',
        {
          updatedAt: '2026-10-25T10:00:00.000Z',
          deletedAt: '2026-10-25T10:00:00.000Z',
        },
        { title: 'Deleted remotely', deleted_at: '2026-10-25T10:00:00.000Z' }
      );

      const localRow = {
        id: 'doc-remote-delete',
        title: 'Local edits before deletion synced',
        updated_at: '2026-10-25T12:00:00.000Z',
        deleted_at: null,
      };

      const prepared = await prepareRowForUpsert(mockResult, 'finance_accounts', localRow, undefined);

      expect(prepared.isSkipped).toBe(false);
      expect(prepared.rowToUpsert.deleted_at).toBe('2026-10-25T10:00:00.000Z');
    });

    it('protects against race condition when freshRow was edited during active pull sync', async () => {
      const mockResult = createMockResult(
        'doc-race',
        { updatedAt: '2026-10-25T10:00:00.000Z' },
        { title: 'Cloud Version' }
      );

      const initialLocalRow = {
        id: 'doc-race',
        title: 'Initial Local',
        updated_at: '2026-10-25T09:00:00.000Z',
      };

      // User edited this record while sync pull was decrypting in background
      const freshRow = {
        id: 'doc-race',
        title: 'Freshly edited while pull was running',
        updated_at: '2026-10-25T11:00:00.000Z', // newer than cloud's 10:00:00
      };

      const prepared = await prepareRowForUpsert(mockResult, 'transactions', initialLocalRow, freshRow);

      expect(prepared.isSkipped).toBe(true);
    });

    it('archives local content to page_history when cloud wins LWW on conflicting non-CRDT page edit', async () => {
      const mockSavePageHistory = vi.fn().mockResolvedValue({ success: true, id: 'hist-1' });
      (window as any).api = {
        savePageHistory: mockSavePageHistory,
      };

      const mockResult = createMockResult(
        'page-conflict-1',
        { updatedAt: '2026-10-25T15:00:00.000Z' }, // newer cloud
        { title: 'Cloud Winning Page', content: '<p>Cloud newer content</p>', crdt_state: null }
      );

      const localRow = {
        id: 'page-conflict-1',
        title: 'Local Losing Page',
        content: '<p>Local older edit from Qt</p>',
        crdt_state: null,
        updated_at: '2026-10-25T10:00:00.000Z', // older local
      };

      const prepared = await prepareRowForUpsert(mockResult, 'pages', localRow, undefined);

      expect(prepared.isSkipped).toBe(false);
      expect(mockSavePageHistory).toHaveBeenCalledWith('page-conflict-1', '<p>Local older edit from Qt</p>');
    });

    it('archives cloud content to page_history when local wins LWW on conflicting non-CRDT page edit', async () => {
      const mockSavePageHistory = vi.fn().mockResolvedValue({ success: true, id: 'hist-2' });
      (window as any).api = {
        savePageHistory: mockSavePageHistory,
      };

      const mockResult = createMockResult(
        'page-conflict-2',
        { updatedAt: '2026-10-25T10:00:00.000Z' }, // older cloud
        { title: 'Cloud Older Page', content: '<p>Cloud older edit</p>', crdt_state: null }
      );

      const localRow = {
        id: 'page-conflict-2',
        title: 'Local Winning Page',
        content: '<p>Local newer edit from Qt</p>',
        crdt_state: null,
        updated_at: '2026-10-25T15:00:00.000Z', // newer local
      };

      const prepared = await prepareRowForUpsert(mockResult, 'pages', localRow, undefined);

      expect(prepared.isSkipped).toBe(true);
      expect(mockSavePageHistory).toHaveBeenCalledWith('page-conflict-2', '<p>Cloud older edit</p>');
    });
  });

  describe('upsertRowWithColumnFallback (Schema Evolution & Fault Tolerance)', () => {
    it('succeeds immediately when upsertRow does not throw', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ success: true });
      (window as any).api = {
        sync: { upsertRow: mockUpsert },
      };

      await upsertRowWithColumnFallback('pages', { id: 'p1', title: 'Test' });
      expect(mockUpsert).toHaveBeenCalledWith('pages', { id: 'p1', title: 'Test' });
    });

    it('gracefully recovers by stripping unmapped schema column when SQLite reports missing column', async () => {
      let callCount = 0;
      const mockUpsert = vi.fn().mockImplementation(async (_table: string, row: Record<string, unknown>) => {
        callCount++;
        if (callCount === 1) {
          // First attempt fails because SQLite has not migrated the new column yet
          throw new Error('table pages has no column named new_v2_feature_field');
        }
        return { success: true };
      });

      (window as any).api = {
        sync: { upsertRow: mockUpsert },
      };

      const rowToUpsert = {
        id: 'p1',
        title: 'Test',
        new_v2_feature_field: 'experimental data',
      };

      await upsertRowWithColumnFallback('pages', rowToUpsert);

      expect(callCount).toBe(2);
      expect(rowToUpsert).not.toHaveProperty('new_v2_feature_field');
      expect(rowToUpsert).toHaveProperty('title', 'Test');
    });

    it('rethrows error when failure is unrelated to missing columns', async () => {
      const mockUpsert = vi.fn().mockRejectedValue(new Error('disk I/O error or constraint failure'));
      (window as any).api = {
        sync: { upsertRow: mockUpsert },
      };

      await expect(
        upsertRowWithColumnFallback('pages', { id: 'p1', title: 'Test' })
      ).rejects.toThrow('disk I/O error or constraint failure');
    });

    it('stops and rethrows when column retries exceed maximum threshold (5 attempts)', async () => {
      const mockUpsert = vi.fn().mockRejectedValue(new Error('has no column named always_failing_col'));
      (window as any).api = {
        sync: { upsertRow: mockUpsert },
      };

      await expect(
        upsertRowWithColumnFallback('pages', { id: 'p1', always_failing_col: 'value' })
      ).rejects.toThrow('has no column named always_failing_col');

      expect(mockUpsert).toHaveBeenCalledTimes(6);
    });
  });
});
