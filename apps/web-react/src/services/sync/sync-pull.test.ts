import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockApi,
  installMockApi,
  resetSyncPullMocks,
  setFirestoreDocuments,
} from './sync-pull-test-setup';
import { pullAllFromCloud } from './sync-pull';
import { importHexKey, encryptText } from '../crypto';
import * as syncMonitor from './sync-monitor';
import * as syncUtils from './sync-utils';
import * as firestore from 'firebase/firestore';
import * as Y from 'yjs';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../../utils/binary';

function createPageState(text: string): string {
  const document = new Y.Doc();
  document.getText('content').insert(0, text);
  const state = uint8ArrayToBase64(Y.encodeStateAsUpdate(document));
  document.destroy();
  return state;
}

describe('sync-pull service', () => {
  const testHexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  let cryptoKey: CryptoKey;
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    resetSyncPullMocks();
    mockApi = createMockApi();
    cryptoKey = await importHexKey(testHexKey);
    installMockApi(mockApi);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fails when window.api.sync is not present', async () => {
    Object.defineProperty(window, 'api', { configurable: true, value: undefined });
    await expect(pullAllFromCloud({ core: cryptoKey })).rejects.toThrow(
      'Local sync API is unavailable.'
    );
    expect(firestore.getDocs).not.toHaveBeenCalled();
  });

  it('fails visibly when emergency stop is active', async () => {
    vi.spyOn(syncMonitor, 'isEmergencyStopped').mockReturnValue(true);
    await expect(
      pullAllFromCloud({ core: cryptoKey }, undefined, 'test-user')
    ).rejects.toThrow('Cloud pull is disabled by the emergency sync stop.');
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

    setFirestoreDocuments('pages', [mockDocSnap]);

    await pullAllFromCloud({ core: cryptoKey, notes: cryptoKey }, undefined, 'test-user');

    expect(mockApi.sync.upsertRow).toHaveBeenCalledWith(
      'pages',
      expect.objectContaining({
        id: 'cloud-page-1',
        title: 'Página Vinda da Nuvem',
        content: '<p>Sincronizado</p>',
      })
    );

    expect(syncUtils.getLastSyncTime('pull', 'user_test-user')).toBeGreaterThan(0);
  });

  it('builds an initial push plan for local-only, newer, and late-edited rows', async () => {
    const cloudNewer = await encryptText(JSON.stringify({ title: 'Cloud wins' }), cryptoKey);
    const localNewer = await encryptText(JSON.stringify({ title: 'Local wins' }), cryptoKey);
    const initialRows = [
      { id: 'cloud-newer', title: 'Old local copy', updated_at: '2026-10-22T10:00:00.000Z' },
      { id: 'local-newer', title: 'Local edit', updated_at: '2026-10-24T10:00:00.000Z' },
      { id: 'late-edit', title: 'Before edit', updated_at: '2026-10-23T10:00:00.000Z' },
      { id: 'local-only', title: 'Offline note', updated_at: '2026-10-25T10:00:00.000Z' },
    ];
    const finalRows = initialRows.map((row) => row.id === 'late-edit'
      ? { ...row, title: 'Edited during pull', updated_at: '2026-10-26T10:00:00.000Z' }
      : row);
    let pagesRead = 0;
    mockApi.sync.getTable.mockImplementation(async (table: string) => {
      if (table !== 'pages') return [];
      pagesRead += 1;
      return pagesRead === 1 ? initialRows : finalRows;
    });
    mockApi.sync.getRowsByIds.mockImplementation(async (_table: string, ids: string[]) =>
      initialRows.filter((row) => ids.includes(row.id))
    );
    setFirestoreDocuments('pages', [
      {
        id: 'cloud-newer',
        data: () => ({ encryptedData: cloudNewer, updatedAt: '2026-10-23T10:00:00.000Z' }),
      },
      {
        id: 'local-newer',
        data: () => ({ encryptedData: localNewer, updatedAt: '2026-10-22T10:00:00.000Z' }),
      },
      {
        id: 'late-edit',
        data: () => ({ encryptedData: localNewer, updatedAt: '2026-10-23T10:00:00.000Z' }),
      },
    ]);

    const plan = await pullAllFromCloud({ core: cryptoKey, notes: cryptoKey }, undefined, 'test-user');

    expect([...plan?.get('pages')?.rowIds || []].sort()).toEqual([
      'late-edit',
      'local-newer',
      'local-only',
    ]);
    expect(plan?.get('pages')?.checkpoint).toBe(new Date('2026-10-26T10:00:00.000Z').getTime());
    expect(plan?.get('pages')?.rowIds.has('cloud-newer')).toBe(false);
  });

  it('merges concurrent page states when local and cloud timestamps are equal', async () => {
    const updatedAt = '2026-10-28T10:00:00.000Z';
    const initialLocalState = createPageState('initial local edit');
    const latestLocalState = createPageState('latest local edit');
    const cloudState = createPageState('cloud edit');
    const encrypted = await encryptText(JSON.stringify({
      title: 'Cloud title',
      content: 'cloud edit',
      crdt_state: cloudState,
    }), cryptoKey);
    const initialLocalRow = {
      id: 'concurrent-page',
      title: 'Local title',
      content: 'initial local edit',
      crdt_state: initialLocalState,
      updated_at: updatedAt,
    };
    const latestLocalRow = {
      ...initialLocalRow,
      content: 'latest local edit',
      crdt_state: latestLocalState,
      updated_at: updatedAt,
    };
    let pagesRead = 0;
    mockApi.sync.getTable.mockImplementation(async (table: string) => {
      if (table !== 'pages') return [];
      pagesRead += 1;
      return pagesRead === 1 ? [initialLocalRow] : [latestLocalRow];
    });
    mockApi.sync.getRowsByIds.mockImplementation(async (table: string, ids: string[]) =>
      table === 'pages' && ids.includes(latestLocalRow.id) ? [latestLocalRow] : []
    );
    setFirestoreDocuments('pages', [{
      id: latestLocalRow.id,
      data: () => ({ encryptedData: encrypted, updatedAt }),
    }]);

    const plan = await pullAllFromCloud({ core: cryptoKey, notes: cryptoKey }, undefined, 'test-user');

    expect(mockApi.sync.upsertRow).toHaveBeenCalledWith('pages', expect.objectContaining({
      id: latestLocalRow.id,
      crdt_state: expect.any(String),
    }));
    const mergedState = mockApi.sync.upsertRow.mock.calls[0]?.[1].crdt_state;
    expect(typeof mergedState).toBe('string');
    if (typeof mergedState !== 'string') throw new Error('Expected a merged page CRDT state.');
    const mergedDocument = new Y.Doc();
    Y.applyUpdate(mergedDocument, base64ToUint8Array(mergedState));
    expect(mergedDocument.getText('content').toString()).toContain('latest local edit');
    expect(mergedDocument.getText('content').toString()).toContain('cloud edit');
    mergedDocument.destroy();
    expect(Date.parse(String(mockApi.sync.upsertRow.mock.calls[0]?.[1].updated_at)))
      .toBeGreaterThan(Date.parse(updatedAt));
    expect(plan?.get('pages')?.rowIds.has(latestLocalRow.id)).toBe(true);
  });

  it('keeps the pull checkpoint unchanged when a local upsert fails', async () => {
    const priorPull = new Date('2026-08-20T10:00:00.000Z').getTime();
    syncUtils.setLastSyncTime('pull', priorPull, 'user_test-user');
    const encrypted = await encryptText(JSON.stringify({ title: 'Retry me' }), cryptoKey);
    const mockDocSnap = {
      id: 'cloud-page-upsert-failure',
      data: () => ({ encryptedData: encrypted, updatedAt: '2026-08-22T10:00:00.000Z' }),
    };

    setFirestoreDocuments('pages', [mockDocSnap]);
    mockApi.sync.upsertRow.mockRejectedValue(new Error('disk is full'));

    await expect(pullAllFromCloud({ core: cryptoKey }, undefined, 'test-user')).rejects.toThrow('Cloud pull incomplete');

    expect(syncUtils.getLastSyncTime('pull', 'user_test-user')).toBe(priorPull);
    expect(syncUtils.getTableLastSyncTime('pull', 'pages', 'user_test-user')).toBe(0);
  });

});
