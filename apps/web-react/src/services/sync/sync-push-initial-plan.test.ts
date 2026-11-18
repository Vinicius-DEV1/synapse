import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pushAllToCloud } from './sync-push';
import { commitPreparedSyncDocuments } from './sync-push-documents';
import { importHexKey } from '../crypto';
import { getLastSyncTime, getTableLastSyncTime } from './sync-utils';
import type { SyncRow } from './sync-utils';
import type { InitialSyncPushPlan } from './sync-push-plan';

const firestoreMocks = vi.hoisted(() => ({
  setDoc: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn(async (items: Array<{ id: string }>) => ({ writeCount: items.length, trafficBytes: 0 })),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_parent: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
  doc: vi.fn((_parent: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
  setDoc: firestoreMocks.setDoc,
  serverTimestamp: vi.fn(() => 'server-timestamp'),
}));
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('./sync-push-documents', () => ({
  commitPreparedSyncDocuments: firestoreMocks.commit,
}));

describe('initial sync push execution', () => {
  const scopeKey = 'user_sync-user';
  const rowSet = (ids: string[], checkpoint: number): InitialSyncPushPlan => new Map([
    ['pages', { rowIds: new Set(ids), checkpoint }],
  ]);

  let rows: SyncRow[];
  let getRowsByIds: ReturnType<typeof createMockGetRowsByIds>;

  function createMockGetRowsByIds(): (table: string, ids: string[]) => Promise<SyncRow[]> {
    return vi.fn(async (_table: string, ids: string[]) => rows.filter((row) => ids.includes(row.id)));
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    rows = [
      { id: 'remote-baseline', title: 'Already pulled', updated_at: '2026-10-01T10:00:00Z' },
      { id: 'local-delta', title: 'Local edit', updated_at: '2026-10-02T10:00:00Z' },
    ];
    getRowsByIds = createMockGetRowsByIds();
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { sync: {
        getTable: vi.fn(async () => rows),
        getRowsByIds,
      }, log: vi.fn() },
    });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('uploads only planned delta rows and advances the table checkpoint', async () => {
    const key = await importHexKey('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    const checkpoint = new Date('2026-10-03T10:00:00Z').getTime();

    await pushAllToCloud({ notes: key }, ['pages'], undefined, 'sync-user', rowSet(['local-delta'], checkpoint));

    expect(getRowsByIds).toHaveBeenCalledWith('pages', ['local-delta']);
    expect(vi.mocked(commitPreparedSyncDocuments)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(commitPreparedSyncDocuments).mock.calls[0]?.[0].map((row) => row.id)).toEqual(['local-delta']);
    expect(getTableLastSyncTime('push', 'pages', scopeKey)).toBe(checkpoint);
    expect(getLastSyncTime('push', scopeKey)).toBe(checkpoint);
  });

  it('records baseline checkpoints for tables with no local delta', async () => {
    const key = await importHexKey('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    const checkpoint = new Date('2026-10-03T10:00:00Z').getTime();

    await pushAllToCloud({ notes: key }, ['pages'], undefined, 'sync-user', rowSet([], checkpoint));

    expect(getRowsByIds).toHaveBeenCalledWith('pages', []);
    expect(vi.mocked(commitPreparedSyncDocuments)).not.toHaveBeenCalled();
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
    expect(getTableLastSyncTime('push', 'pages', scopeKey)).toBe(checkpoint);
    expect(getLastSyncTime('push', scopeKey)).toBe(checkpoint);
  });
});
