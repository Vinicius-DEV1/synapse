import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockApi,
  installMockApi,
  resetSyncPullMocks,
  setFirestoreDocuments,
  getFirestoreMockState,
} from './sync-pull-test-setup';
import { pullAllFromCloud, listenForCloudSyncSignal } from './sync-pull';
import { importHexKey, encryptText, decryptText } from '../crypto';
import { uint8ArrayToBase64 } from '../../utils/binary';
import { prepareEncryptedSyncChunks } from './sync-chunked-payload';
import * as firestore from 'firebase/firestore';

const firestoreMockState = getFirestoreMockState();

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

  it('decodes encoded Firestore document IDs before writing them locally', async () => {
    const originalId = 'link_entity:https://example.com/path';
    const encodedPayload = await encryptText(JSON.stringify({ title: 'URL keyed row' }), cryptoKey);
    const mockDocSnap = {
      id: 'synapse_id_v1_bGluay...',
      data: () => ({ encryptedData: encodedPayload, idEncodingVersion: 1, updatedAt: '2026-08-22T10:00:00.000Z' }),
    };
    const { encodeSyncDocumentId } = await import('./sync-utils');
    const encodedId = encodeSyncDocumentId(originalId);
    mockDocSnap.id = encodedId.id;

    setFirestoreDocuments('config', [mockDocSnap]);

    await pullAllFromCloud({ core: cryptoKey }, undefined, 'test-user');

    expect(mockApi.sync.upsertRow).toHaveBeenCalledWith(
      'config',
      expect.objectContaining({ id: originalId, title: 'URL keyed row' })
    );
  });

  it('re-encrypts legacy core-key documents instead of deleting them', async () => {
    const notesKey = await importHexKey('abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789');
    const legacyData = { title: 'Keep this cloud row', content: '<p>Legacy key</p>' };
    const legacyCiphertext = await encryptText(JSON.stringify(legacyData), cryptoKey);
    const mockDocSnap = {
      id: 'legacy-page-1',
      data: () => ({ encryptedData: legacyCiphertext, updatedAt: '2026-08-22T10:00:00.000Z' }),
    };

    setFirestoreDocuments('pages', [mockDocSnap]);

    await pullAllFromCloud({ core: cryptoKey, notes: notesKey }, undefined, 'test-user');

    expect(firestore.deleteDoc).not.toHaveBeenCalled();
    const rewrittenWrite = firestoreMockState.batchSetCalls.find(
      (call) => call.reference.path === 'users/test-user/sync/data/pages/legacy-page-1'
    );
    expect(rewrittenWrite?.data).toEqual(expect.objectContaining({ isCompressed: false }));
    const rewritten = rewrittenWrite?.data.encryptedData;
    expect(typeof rewritten).toBe('string');
    if (typeof rewritten !== 'string') throw new Error('Expected encrypted legacy payload.');
    expect(JSON.parse(await decryptText(rewritten, notesKey))).toEqual(legacyData);
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

    setFirestoreDocuments('pages', [mockDocSnap]);

    mockApi.sync.getRowsByIds.mockResolvedValue([
      {
        id: 'page-local-newer',
        title: 'Página Recém Editada Local',
        updated_at: '2026-08-22T08:00:00.000Z', // Newer than cloud!
      },
    ]);

    await pullAllFromCloud({ core: cryptoKey, notes: cryptoKey }, undefined, 'test-user');

    expect(mockApi.sync.upsertRow).not.toHaveBeenCalled();
  });

  it('pulls soft-deleted remote doc and persists deleted_at locally', async () => {
    const remoteBookData = {
      title: 'Livro Remoto Deletado',
      deleted_at: '2026-08-22T15:00:00.000Z',
    };
    const encrypted = await encryptText(JSON.stringify(remoteBookData), cryptoKey);

    const mockDocSnap = {
      id: 'book-remote-deleted',
      data: () => ({
        encryptedData: encrypted,
        updatedAt: '2026-08-22T15:00:00.000Z',
        createdAt: '2026-08-20T10:00:00.000Z',
        deletedAt: '2026-08-22T15:00:00.000Z',
      }),
    };

    setFirestoreDocuments('library_books', [mockDocSnap]);

    mockApi.sync.getRowsByIds.mockResolvedValue([
      {
        id: 'book-remote-deleted',
        title: 'Livro Remoto Deletado',
        updated_at: '2026-08-21T10:00:00.000Z',
        deleted_at: null,
      },
    ]);

    await pullAllFromCloud({ core: cryptoKey, library: cryptoKey }, undefined, 'test-user');

    expect(mockApi.sync.upsertRow).toHaveBeenCalledWith(
      'library_books',
      expect.objectContaining({
        id: 'book-remote-deleted',
        deleted_at: '2026-08-22T15:00:00.000Z',
      })
    );
  });

  it('subscribes to cloud sync signals using listenForCloudSyncSignal', () => {
    const callback = vi.fn();
    const unsubscribe = listenForCloudSyncSignal(callback, undefined, 'test-user');

    expect(firestore.onSnapshot).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith('remote-device-123');
    expect(typeof unsubscribe).toBe('function');
  });

  it('correctly decompresses and upserts remote documents flagged with isCompressed', async () => {
    const remotePageData = {
      title: 'Compressed Cloud Note',
      content: '<p>Compressed body content</p>',
    };
    const jsonStr = JSON.stringify(remotePageData);
    const body = new Response(jsonStr).body;
    if (!body) throw new Error('Expected a compression stream body.');
    const stream = body.pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    const b64 = uint8ArrayToBase64(new Uint8Array(buffer));
    const encrypted = await encryptText(b64, cryptoKey);

    const mockDocSnap = {
      id: 'cloud-compressed-1',
      data: () => ({
        encryptedData: encrypted,
        isCompressed: true,
        updatedAt: '2026-08-25T18:00:00.000Z',
        createdAt: '2026-08-25T10:00:00.000Z',
      }),
    };

    setFirestoreDocuments('pages', [mockDocSnap]);

    mockApi.sync.getRow.mockResolvedValue(null);

    await pullAllFromCloud({ core: cryptoKey, notes: cryptoKey }, undefined, 'test-user');

    expect(mockApi.sync.upsertRow).toHaveBeenCalledWith(
      'pages',
      expect.objectContaining({
        id: 'cloud-compressed-1',
        title: 'Compressed Cloud Note',
        content: '<p>Compressed body content</p>',
      })
    );
  });

  it('reassembles encrypted chunk documents before applying a large sync row', async () => {
    const randomBytes = new Uint8Array(200_000);
    for (let offset = 0; offset < randomBytes.length; offset += 65_536) {
      crypto.getRandomValues(randomBytes.subarray(offset, Math.min(offset + 65_536, randomBytes.length)));
    }
    const textContent = uint8ArrayToBase64(randomBytes);
    const json = JSON.stringify({ session_id: 'session-1', role: 'assistant', text_content: textContent });
    const body = new Response(json).body;
    if (!body) throw new Error('Expected a compression stream body.');
    const compressed = await new Response(body.pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const compressedBase64 = uint8ArrayToBase64(new Uint8Array(compressed));
    const documentId = 'large-message-remote';
    const chunked = await prepareEncryptedSyncChunks(compressedBase64, cryptoKey, 'tutor_messages', documentId);
    const documentPath = `users/test-user/sync/data/tutor_messages/${documentId}`;

    setFirestoreDocuments('tutor_messages', [{
      id: documentId,
      ref: { path: documentPath },
      data: () => ({
        isChunked: true,
        isCompressed: true,
        chunkSetId: chunked.chunkSetId,
        chunkCount: chunked.chunks.length,
        updatedAt: '2026-08-25T18:00:00.000Z',
        createdAt: '2026-08-25T10:00:00.000Z',
      }),
    }]);
    firestoreMockState.documentsByCollection.set(
      `${documentPath}/chunks`,
      chunked.chunks.map((chunk) => ({
        id: chunk.id,
        data: () => ({
          chunkSetId: chunk.chunkSetId,
          index: chunk.index,
          version: 1,
          encryptedChunk: chunk.encryptedChunk,
        }),
      }))
    );

    await pullAllFromCloud({ core: cryptoKey }, undefined, 'test-user');

    expect(chunked.chunks.length).toBeGreaterThan(1);
    expect(mockApi.sync.upsertRow).toHaveBeenCalledWith(
      'tutor_messages',
      expect.objectContaining({
        id: documentId,
        session_id: 'session-1',
        role: 'assistant',
        text_content: textContent,
      })
    );
  });
});
