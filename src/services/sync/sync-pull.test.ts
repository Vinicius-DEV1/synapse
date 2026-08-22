import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pullAllFromCloud, listenForCloudSyncSignal } from './sync-pull';
import { importHexKey, encryptText } from '../crypto';
import * as syncMonitor from './sync-monitor';
import * as syncUtils from './sync-utils';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, table, id) => ({ path: `${table}/${id}`, table, id })),
    collection: vi.fn((_db, table) => ({ path: table, table })),
    query: vi.fn((...args) => ({ type: 'query', args })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    orderBy: vi.fn((field) => ({ field })),
    limit: vi.fn((n) => ({ limit: n })),
    startAfter: vi.fn((doc) => ({ startAfter: doc })),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    }),
    getDocs: vi.fn().mockResolvedValue({
      empty: true,
      docs: [],
    }),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    onSnapshot: vi.fn((docRef, cb) => {
      cb({
        exists: () => true,
        data: () => ({ deviceId: 'remote-device-123' }),
      });
      return () => {}; // Unsubscribe function
    }),
  };
});

vi.mock('../firebase', () => ({
  db: { type: 'mock-firestore-db' },
}));

describe('sync-pull service', () => {
  const testHexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  let cryptoKey: CryptoKey;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    cryptoKey = await importHexKey(testHexKey);

    (window as any).api = {
      sync: {
        getTable: vi.fn().mockResolvedValue([]),
        getRowsByIds: vi.fn().mockResolvedValue([]),
        upsertRow: vi.fn().mockResolvedValue(undefined),
      },
      log: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aborts when window.api.sync is not present', async () => {
    delete (window as any).api.sync;
    await pullAllFromCloud({ core: cryptoKey });
    expect(firestore.getDocs).not.toHaveBeenCalled();
  });

  it('aborts when emergency stop is active', async () => {
    vi.spyOn(syncMonitor, 'isEmergencyStopped').mockReturnValue(true);
    await pullAllFromCloud({ core: cryptoKey });
    expect(firestore.getDocs).not.toHaveBeenCalled();
  });

  it('pulls encrypted records from Firestore, decrypts and upserts into local db', async () => {
    const remotePageData = {
      title: 'Página Vinda da Nuvem',
      content: '<p>Sincronizado</p>',
    };
    const encrypted = await encryptText(JSON.stringify(remotePageData), cryptoKey);

    const mockDocSnap = {
      id: 'cloud-page-1',
      data: () => ({
        encryptedData: encrypted,
        updatedAt: '2026-08-21T18:00:00.000Z',
        createdAt: '2026-08-20T10:00:00.000Z',
      }),
    };

    (firestore.getDocs as any).mockImplementation((q: any) => {
      const collectionPath = q.args?.[0]?.path || q.path;
      if (collectionPath === 'pages') {
        return Promise.resolve({
          empty: false,
          docs: [mockDocSnap],
        });
      }
      return Promise.resolve({ empty: true, docs: [] });
    });

    await pullAllFromCloud({ core: cryptoKey, notes: cryptoKey });

    expect(window.api.sync.upsertRow).toHaveBeenCalledWith(
      'pages',
      expect.objectContaining({
        id: 'cloud-page-1',
        title: 'Página Vinda da Nuvem',
        content: '<p>Sincronizado</p>',
      })
    );

    expect(syncUtils.getLastSyncTime('pull')).toBeGreaterThan(0);
  });

  it('skips remote doc when local timestamp is newer than cloud timestamp', async () => {
    const remotePageData = { title: 'Página Antiga na Nuvem' };
    const encrypted = await encryptText(JSON.stringify(remotePageData), cryptoKey);

    const mockDocSnap = {
      id: 'page-local-newer',
      data: () => ({
        encryptedData: encrypted,
        updatedAt: '2026-08-20T10:00:00.000Z',
      }),
    };

    (firestore.getDocs as any).mockImplementation((q: any) => {
      const collectionPath = q.args?.[0]?.path || q.path;
      if (collectionPath === 'pages') {
        return Promise.resolve({
          empty: false,
          docs: [mockDocSnap],
        });
      }
      return Promise.resolve({ empty: true, docs: [] });
    });

    (window as any).api.sync.getRowsByIds.mockResolvedValue([
      {
        id: 'page-local-newer',
        title: 'Página Recém Editada Local',
        updated_at: '2026-08-22T08:00:00.000Z', // Newer than cloud!
      },
    ]);

    await pullAllFromCloud({ core: cryptoKey, notes: cryptoKey });

    expect(window.api.sync.upsertRow).not.toHaveBeenCalled();
  });

  it('subscribes to cloud sync signals using listenForCloudSyncSignal', () => {
    const callback = vi.fn();
    const unsubscribe = listenForCloudSyncSignal(callback);

    expect(firestore.onSnapshot).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith('remote-device-123');
    expect(typeof unsubscribe).toBe('function');
  });
});
