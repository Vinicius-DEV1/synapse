import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pushAllToCloud } from './sync-push';
import { importHexKey } from '../crypto';
import * as syncMonitor from './sync-monitor';
import * as syncUtils from './sync-utils';
import * as firestore from 'firebase/firestore';
import type { SyncRow } from './sync-utils';
import { uint8ArrayToBase64 } from '../../utils/binary';

interface MockDocumentReference {
  path: string;
  table: string;
  id: string;
}

const firestoreMockState = vi.hoisted(() => {
  const createBatch = () => ({
    set: vi.fn((
      _reference: MockDocumentReference,
      _data: Record<string, unknown>,
      _options?: unknown
    ) => undefined),
    delete: vi.fn((_reference: MockDocumentReference) => undefined),
    commit: vi.fn(async () => undefined),
  });

  return { createBatch, batch: createBatch() };
});

function createMockApi() {
  return {
    sync: {
      getTable: vi.fn(async (_table: string): Promise<SyncRow[]> => []),
      getModifiedRows: vi.fn(async (_table: string, _since: number): Promise<SyncRow[]> => []),
    },
    log: vi.fn(),
  };
}

let mockApi = createMockApi();
const TEST_USER_ID = 'test-user';
const TEST_SCOPE_KEY = 'user_test-user';
const TEST_DELETION_FIX_KEY = 'caderno_sync_fix_deletions_v1_user_test-user';

function installMockApi(): void {
  Object.defineProperty(window, 'api', { configurable: true, value: mockApi });
}

function installMockBatch(): ReturnType<typeof firestoreMockState.createBatch> {
  const batch = firestoreMockState.createBatch();
  firestoreMockState.batch = batch;
  return batch;
}

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db: unknown, ...segments: string[]) => ({
      path: segments.join('/'),
      table: segments.at(-2) || '',
      id: segments.at(-1) || '',
    })),
    collection: vi.fn((first: unknown, ...segments: string[]) => ({
      path: typeof first === 'object' && first !== null && 'path' in first && typeof first.path === 'string'
        ? `${String(first.path)}/${segments.join('/')}`
        : segments.join('/'),
    })),
    getDoc: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
    getDocs: vi.fn(async () => ({ docs: [] })),
    deleteField: vi.fn(() => 'MOCK_DELETE_FIELD'),
    setDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP'),
    writeBatch: vi.fn(() => firestoreMockState.batch),
  };
});

vi.mock('../firebase', () => ({
  db: { type: 'mock-firestore-db' },
}));

describe('sync-push service', () => {
  const testHexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  let cryptoKey: CryptoKey;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    firestoreMockState.batch = firestoreMockState.createBatch();
    mockApi = createMockApi();
    cryptoKey = await importHexKey(testHexKey);
    installMockApi();

    // Ensure navigator.onLine is true by default
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fails when window.api.sync is missing', async () => {
    Object.defineProperty(window, 'api', { configurable: true, value: undefined });
    await expect(
      pushAllToCloud({ core: cryptoKey }, undefined, undefined, TEST_USER_ID)
    ).rejects.toThrow('Local sync API is unavailable.');
    expect(firestore.writeBatch).not.toHaveBeenCalled();
  });

  it('fails visibly when emergency stop is active', async () => {
    vi.spyOn(syncMonitor, 'isEmergencyStopped').mockReturnValue(true);
    await expect(
      pushAllToCloud({ core: cryptoKey }, undefined, undefined, TEST_USER_ID)
    ).rejects.toThrow('Cloud push is disabled by the emergency sync stop.');
    expect(firestore.writeBatch).not.toHaveBeenCalled();
  });

  it('throws an error when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await expect(pushAllToCloud({ core: cryptoKey }, undefined, undefined, TEST_USER_ID)).rejects.toThrow(
      'Sem conexão com a internet para sincronizar.'
    );
  });

  it('pushes local rows modified after lastPush and commits to Firestore', async () => {
    const mockPages = [
      {
        id: 'page-1',
        title: 'Página Teste',
        content: '<p>Olá mundo</p>',
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-21T12:00:00Z',
      },
    ];

    mockApi.sync.getTable.mockImplementation(async (table: string) => {
      if (table === 'pages') return mockPages;
      return [];
    });

    const mockBatch = installMockBatch();

    await pushAllToCloud({ core: cryptoKey, notes: cryptoKey }, undefined, undefined, TEST_USER_ID);

    expect(mockBatch.set).toHaveBeenCalledTimes(1);
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'page-1', table: 'pages' }),
      expect.objectContaining({
        encryptedData: expect.any(String),
        updatedAt: '2026-08-21T12:00:00.000Z',
      }),
      { merge: true }
    );
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);

    // Verifies last push timestamp updated in localStorage
    const lastPush = syncUtils.getLastSyncTime('push', TEST_SCOPE_KEY);
    expect(lastPush).toBeGreaterThan(0);

    // Verifies sync signal and sync manifest were set
    expect(firestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/test-user/config/sync_sync_signal' }),
      expect.objectContaining({
        updatedAt: 'MOCK_SERVER_TIMESTAMP',
        deviceId: expect.any(String),
      }),
      { merge: true }
    );
  });

  it('skips rows older than lastPush timestamp', async () => {
    const lastPush = new Date('2026-08-22T00:00:00Z').getTime();
    syncUtils.setLastSyncTime('push', lastPush, TEST_SCOPE_KEY);
    syncUtils.setTableLastSyncTime('push', 'pages', lastPush, TEST_SCOPE_KEY);

    const oldPages = [
      {
        id: 'page-old',
        title: 'Página Antiga',
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T12:00:00Z',
      },
    ];

    mockApi.sync.getTable.mockImplementation(async (table: string) => {
      if (table === 'pages') return oldPages;
      return [];
    });

    const mockBatch = installMockBatch();

    await pushAllToCloud({ core: cryptoKey, notes: cryptoKey }, ['pages'], undefined, TEST_USER_ID);

    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('pushes soft-deleted rows with deletedAt and preserved deletion timestamp', async () => {
    syncUtils.setLastSyncTime('push', 0, TEST_SCOPE_KEY);

    const deletedBook = [
      {
        id: 'book-deleted-1',
        title: 'Livro Deletado',
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-22T15:00:00Z',
        deleted_at: '2026-08-22T15:00:00Z',
      },
    ];

    mockApi.sync.getTable.mockImplementation(async (table: string) => {
      if (table === 'library_books') return deletedBook;
      return [];
    });

    const mockBatch = installMockBatch();

    await pushAllToCloud({ library: cryptoKey }, ['library_books'], undefined, TEST_USER_ID);

    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'book-deleted-1', table: 'library_books' }),
      expect.objectContaining({
        encryptedData: expect.any(String),
        updatedAt: '2026-08-22T15:00:00.000Z',
        deletedAt: '2026-08-22T15:00:00.000Z',
      }),
      { merge: true }
    );
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it('only queries specified targetTables when provided', async () => {
    syncUtils.setLastSyncTime('push', 0, TEST_SCOPE_KEY);
    const getTableMock = vi.fn().mockResolvedValue([]);
    mockApi.sync.getTable = getTableMock;

    await pushAllToCloud({ notes: cryptoKey, calendar: cryptoKey }, ['pages'], undefined, TEST_USER_ID);

    // Should only have queried 'pages', not calendar or other notes tables
    expect(getTableMock).toHaveBeenCalledTimes(1);
    expect(getTableMock).toHaveBeenCalledWith('pages');
  });

  it('uses getModifiedRows when available instead of full getTable', async () => {
    localStorage.setItem(TEST_DELETION_FIX_KEY, 'true');
    syncUtils.setTableLastSyncTime('push', 'pages', 5000, TEST_SCOPE_KEY);
    const getModifiedRowsMock = vi.fn().mockResolvedValue([
      { id: 'p1', title: 'Modified', updated_at: new Date(6000).toISOString() }
    ]);
    const getTableMock = vi.fn().mockResolvedValue([]);
    mockApi.sync.getModifiedRows = getModifiedRowsMock;
    mockApi.sync.getTable = getTableMock;

    await pushAllToCloud({ notes: cryptoKey }, ['pages'], undefined, TEST_USER_ID);

    expect(getModifiedRowsMock).toHaveBeenCalledWith('pages', 4000);
    expect(getTableMock).not.toHaveBeenCalled();
  });

  it('compresses large payloads exceeding MAX_PAYLOAD_BYTES and sets isCompressed flag', async () => {
    localStorage.setItem(TEST_DELETION_FIX_KEY, 'true');
    syncUtils.setTableLastSyncTime('push', 'pages', 0, TEST_SCOPE_KEY);

    const largeContent = 'a'.repeat(950_000);
    const mockBatch = installMockBatch();

    mockApi.sync.getTable = vi.fn().mockResolvedValue([
      { id: 'p_large', content: largeContent, updated_at: new Date(1000).toISOString() }
    ]);

    await pushAllToCloud({ notes: cryptoKey }, ['pages'], undefined, TEST_USER_ID);

    expect(mockBatch.set).toHaveBeenCalledTimes(1);
    const pushedData = mockBatch.set.mock.calls[0][1];
    expect(pushedData.isCompressed).toBe(true);
    expect(typeof pushedData.encryptedData).toBe('string');
  });

  it('stores incompressible large rows in authenticated encrypted chunks', async () => {
    const randomBytes = new Uint8Array(700_000);
    for (let offset = 0; offset < randomBytes.length; offset += 65_536) {
      crypto.getRandomValues(randomBytes.subarray(offset, Math.min(offset + 65_536, randomBytes.length)));
    }
    const largeContent = uint8ArrayToBase64(randomBytes);
    const mockBatch = installMockBatch();
    mockApi.sync.getTable = vi.fn().mockImplementation(async (table: string) => table === 'tutor_messages'
      ? [{ id: 'large-message-1', session_id: 'session-1', text_content: largeContent }]
      : []);

    await pushAllToCloud({ core: cryptoKey }, ['tutor_messages'], undefined, TEST_USER_ID);

    const parentWrite = mockBatch.set.mock.calls.find(([reference]) => reference.id === 'large-message-1');
    const chunkWrites = mockBatch.set.mock.calls.filter(([, data]) => 'encryptedChunk' in data);
    expect(parentWrite?.[1]).toEqual(expect.objectContaining({ isChunked: true, isCompressed: true, chunkCount: expect.any(Number) }));
    expect(parentWrite?.[1].encryptedData).toBe('');
    expect(chunkWrites.length).toBeGreaterThan(1);
    expect(chunkWrites.every(([, data]) => typeof data.encryptedChunk === 'string')).toBe(true);
  });

  it('encodes document IDs containing slashes before creating Firestore references', async () => {
    const mockBatch = installMockBatch();
    mockApi.sync.getTable = vi.fn().mockResolvedValue([
      { id: 'link_entity:https://example.com/jobs/1', data: 'kept' },
    ]);

    await pushAllToCloud({ core: cryptoKey }, ['config'], undefined, TEST_USER_ID);

    const [documentRef, cloudData] = mockBatch.set.mock.calls[0];
    expect(documentRef.id).not.toContain('/');
    expect(cloudData.idEncodingVersion).toBe(1);
  });

  it('does not advance the table checkpoint or deletion backfill flag after a failed batch', async () => {
    const mockBatch = installMockBatch();
    mockBatch.commit.mockRejectedValue(new Error('network failed'));
    mockApi.sync.getTable = vi.fn().mockResolvedValue([
      { id: 'page-retry', updated_at: '2026-08-22T12:00:00Z' },
    ]);

    await expect(pushAllToCloud({ notes: cryptoKey }, ['pages'], undefined, TEST_USER_ID)).rejects.toThrow(
      'Cloud push incomplete'
    );

    expect(syncUtils.getTableLastSyncTime('push', 'pages', TEST_SCOPE_KEY)).toBe(0);
    expect(localStorage.getItem(TEST_DELETION_FIX_KEY)).toBeNull();
  });

  it('does not mark deletion backfill complete after a targeted push', async () => {
    await pushAllToCloud({ notes: cryptoKey }, ['pages'], undefined, TEST_USER_ID);

    expect(localStorage.getItem(TEST_DELETION_FIX_KEY)).toBeNull();
  });
});
