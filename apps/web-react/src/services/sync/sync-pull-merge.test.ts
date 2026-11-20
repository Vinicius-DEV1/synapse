import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';
import {
  normalizeTime,
  prepareRowForUpsert,
  upsertRowWithoutDroppingFields,
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
      if (!result) throw new Error('Expected a normalized timestamp.');
      expect(new Date(result).getTime()).toBe(1761402600 * 1000);
    });

    it('normalizes ISO string and SQLite space-separated date strings', () => {
      expect(normalizeTime('2026-10-25T10:00:00.000Z')).toBe('2026-10-25T10:00:00.000Z');
      const spaceDate = normalizeTime('2026-10-25 10:00:00');
      expect(spaceDate).toBeDefined();
      if (!spaceDate) throw new Error('Expected a normalized timestamp.');
      expect(new Date(spaceDate).getUTCFullYear()).toBe(2026);
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
      docSnap: { id: docId, data: () => undefined },
      cloudData,
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
      expect(prepared.rowToUpsert.deleted_at).toBeUndefined();
    });

    it('does not add timestamp columns that are absent from local sync table schemas', async () => {
      const attempt = await prepareRowForUpsert(
        createMockResult(
          'attempt-1',
          {
            updatedAt: '2026-10-25T12:00:00.000Z',
            createdAt: '2026-10-25T10:00:00.000Z',
            deletedAt: null,
          },
          { question_id: 'question-1', battery_id: 'battery-1' }
        ),
        'quiz_attempts',
        undefined,
        undefined
      );
      const pageLink = await prepareRowForUpsert(
        createMockResult(
          'page-link-1',
          { updatedAt: '2026-10-25T12:00:00.000Z', createdAt: '2026-10-25T10:00:00.000Z' },
          { battery_id: 'battery-1', page_id: 'page-1' }
        ),
        'quiz_page_links',
        undefined,
        undefined
      );

      expect(attempt.rowToUpsert).not.toHaveProperty('updated_at');
      expect(attempt.rowToUpsert).not.toHaveProperty('deleted_at');
      expect(attempt.rowToUpsert.created_at).toBe('2026-10-25T10:00:00.000Z');
      expect(pageLink.rowToUpsert).not.toHaveProperty('updated_at');
      expect(pageLink.rowToUpsert.created_at).toBe('2026-10-25T10:00:00.000Z');
    });

    it('omits config tombstone metadata when the local schema has no deleted_at column', async () => {
      const prepared = await prepareRowForUpsert(
        createMockResult(
          'preference-1',
          {
            updatedAt: '2026-10-25T12:00:00.000Z',
            createdAt: '2026-10-25T10:00:00.000Z',
            deletedAt: '2026-10-25T11:00:00.000Z',
          },
          { data: 'preference-data', value: 'enabled', deleted_at: '2026-10-25T11:00:00.000Z' }
        ),
        'config',
        undefined,
        undefined
      );

      expect(prepared.rowToUpsert.updated_at).toBe('2026-10-25T12:00:00.000Z');
      expect(prepared.rowToUpsert).not.toHaveProperty('deleted_at');
    });

    it('merges Yjs CRDT states when table is pages and both have crdt_state', async () => {
      const initialLocalDoc = new Y.Doc();
      initialLocalDoc.getText('content').insert(0, 'Initial local edit ');
      const initialLocalCrdtBase64 = getYDocStateAsBase64(initialLocalDoc);

      const freshLocalDoc = new Y.Doc();
      freshLocalDoc.getText('content').insert(0, 'Fresh local edit ');
      const freshLocalCrdtBase64 = getYDocStateAsBase64(freshLocalDoc);

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
        title: 'Initial local title',
        crdt_state: initialLocalCrdtBase64,
        updated_at: '2026-10-25T11:00:00.000Z',
      };
      const freshRow = {
        id: 'page-crdt-1',
        title: 'Fresh local title',
        crdt_state: freshLocalCrdtBase64,
        updated_at: '2026-10-25T13:00:00.000Z',
      };

      const prepared = await prepareRowForUpsert(mockResult, 'pages', localRow, freshRow);

      expect(prepared.isSkipped).toBe(false);
      const mergedCrdtState = prepared.rowToUpsert.crdt_state;
      expect(mergedCrdtState).toBeDefined();
      expect(typeof mergedCrdtState).toBe('string');
      if (typeof mergedCrdtState !== 'string') throw new Error('Expected a merged CRDT state.');
      // Verify merged state combines both CRDT operations
      const mergedDoc = new Y.Doc();
      const updateBytes = Uint8Array.from(atob(mergedCrdtState), c => c.charCodeAt(0));
      Y.applyUpdate(mergedDoc, updateBytes);
      expect(mergedDoc.getText('content').toString()).toContain('Fresh local edit');
      expect(mergedDoc.getText('content').toString()).toContain('Cloud edit');
      expect(Date.parse(String(prepared.rowToUpsert.updated_at)))
        .toBeGreaterThan(Date.parse('2026-10-25T13:00:00.000Z'));
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
      Object.defineProperty(window, 'api', { configurable: true, value: {
        savePageHistory: mockSavePageHistory,
      } });

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
      Object.defineProperty(window, 'api', { configurable: true, value: {
        savePageHistory: mockSavePageHistory,
      } });

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

  describe('upsertRowWithoutDroppingFields', () => {
    it('succeeds immediately when upsertRow does not throw', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ success: true });
      Object.defineProperty(window, 'api', { configurable: true, value: {
        sync: { upsertRow: mockUpsert },
      } });

      await upsertRowWithoutDroppingFields('pages', { id: 'p1', title: 'Test' });
      expect(mockUpsert).toHaveBeenCalledWith('pages', { id: 'p1', title: 'Test' });
    });

    it('preserves all cloud fields and propagates a schema mismatch', async () => {
      const mockUpsert = vi.fn().mockRejectedValue(
        new Error('SQLite schema mismatch: pages is missing new_v2_feature_field')
      );

      Object.defineProperty(window, 'api', { configurable: true, value: {
        sync: { upsertRow: mockUpsert },
      } });

      const rowToUpsert = {
        id: 'p1',
        title: 'Test',
        new_v2_feature_field: 'experimental data',
      };

      await expect(upsertRowWithoutDroppingFields('pages', rowToUpsert)).rejects.toThrow(
        'SQLite schema mismatch'
      );

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(rowToUpsert).toHaveProperty('new_v2_feature_field', 'experimental data');
    });

    it('rethrows error when failure is unrelated to missing columns', async () => {
      const mockUpsert = vi.fn().mockRejectedValue(new Error('disk I/O error or constraint failure'));
      Object.defineProperty(window, 'api', { configurable: true, value: {
        sync: { upsertRow: mockUpsert },
      } });

      await expect(
        upsertRowWithoutDroppingFields('pages', { id: 'p1', title: 'Test' })
      ).rejects.toThrow('disk I/O error or constraint failure');
    });

    it('fails instead of silently succeeding when the sync adapter is unavailable', async () => {
      Object.defineProperty(window, 'api', { configurable: true, value: { sync: undefined } });

      await expect(
        upsertRowWithoutDroppingFields('pages', { id: 'p1', title: 'Test' })
      ).rejects.toThrow('Sync API is unavailable');
    });
  });
});
