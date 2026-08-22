import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pushAllToCloud } from './sync-push';
import { importHexKey } from '../crypto';
import * as syncMonitor from './sync-monitor';
import * as syncUtils from './sync-utils';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
  return {
    doc: vi.fn((_db, table, id) => ({ path: `${table}/${id}`, table, id })),
    setDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP'),
    writeBatch: vi.fn(() => mockBatch),
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
    cryptoKey = await importHexKey(testHexKey);

    // Mock window.api.sync
    (window as any).api = {
      sync: {
        getTable: vi.fn().mockResolvedValue([]),
      },
      log: vi.fn(),
    };

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

  it('does nothing when window.api.sync is missing', async () => {
    delete (window as any).api.sync;
    await pushAllToCloud({ core: cryptoKey });
    expect(firestore.writeBatch).not.toHaveBeenCalled();
  });

  it('aborts push when emergency stop is active', async () => {
    vi.spyOn(syncMonitor, 'isEmergencyStopped').mockReturnValue(true);
    await pushAllToCloud({ core: cryptoKey });
    expect(firestore.writeBatch).not.toHaveBeenCalled();
  });

  it('throws an error when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await expect(pushAllToCloud({ core: cryptoKey })).rejects.toThrow(
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

    (window as any).api.sync.getTable.mockImplementation(async (table: string) => {
      if (table === 'pages') return mockPages;
      return [];
    });

    const mockBatch = {
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    (firestore.writeBatch as any).mockReturnValue(mockBatch);

    await pushAllToCloud({ core: cryptoKey, notes: cryptoKey });

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
    const lastPush = syncUtils.getLastSyncTime('push');
    expect(lastPush).toBeGreaterThan(0);

    // Verifies sync signal and sync manifest were set
    expect(firestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'config/sync_signal' }),
      expect.objectContaining({
        updatedAt: 'MOCK_SERVER_TIMESTAMP',
        deviceId: expect.any(String),
      }),
      { merge: true }
    );
  });

  it('skips rows older than lastPush timestamp', async () => {
    syncUtils.setLastSyncTime('push', new Date('2026-08-22T00:00:00Z').getTime());

    const oldPages = [
      {
        id: 'page-old',
        title: 'Página Antiga',
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T12:00:00Z',
      },
    ];

    (window as any).api.sync.getTable.mockImplementation(async (table: string) => {
      if (table === 'pages') return oldPages;
      return [];
    });

    const mockBatch = {
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    (firestore.writeBatch as any).mockReturnValue(mockBatch);

    await pushAllToCloud({ core: cryptoKey, notes: cryptoKey });

    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});
