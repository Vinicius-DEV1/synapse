import { describe, expect, it } from 'vitest';
import { importHexKey } from '../crypto';
import {
  decryptEncryptedSyncChunks,
  MAX_SYNC_CHUNK_CHARACTERS,
  MAX_SYNC_CHUNKS_PER_DOCUMENT,
  prepareEncryptedSyncChunks,
  type EncryptedSyncChunkDocument,
} from './sync-chunked-payload';

const TEST_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function toChunkDocuments(
  chunks: Awaited<ReturnType<typeof prepareEncryptedSyncChunks>>['chunks']
): EncryptedSyncChunkDocument[] {
  return chunks.map((chunk) => ({
    id: chunk.id,
    data: () => ({
      chunkSetId: chunk.chunkSetId,
      index: chunk.index,
      version: 1,
      encryptedChunk: chunk.encryptedChunk,
    }),
  }));
}

describe('sync chunked payloads', () => {
  it('encrypts, reorders, and restores large payload pieces under their parent identity', async () => {
    const key = await importHexKey(TEST_KEY_HEX);
    const payload = 'A'.repeat(MAX_SYNC_CHUNK_CHARACTERS + 37);
    const prepared = await prepareEncryptedSyncChunks(payload, key, 'tutor_messages', 'message-1');
    const stale = {
      id: 'stale-chunk',
      data: () => ({ chunkSetId: 'stale-set', index: 0, encryptedChunk: 'ignored' }),
    };
    const chunks = [stale, ...toChunkDocuments(prepared.chunks).reverse()];

    const result = await decryptEncryptedSyncChunks(
      chunks,
      {
        table: 'tutor_messages',
        documentId: 'message-1',
        chunkSetId: prepared.chunkSetId,
        chunkCount: prepared.chunks.length,
      },
      key,
      { core: key }
    );

    expect(prepared.chunks).toHaveLength(2);
    expect(result).toEqual({ payload, isLegacy: false });
  });

  it('rejects incomplete and cross-parent chunk sets', async () => {
    const key = await importHexKey(TEST_KEY_HEX);
    const prepared = await prepareEncryptedSyncChunks('compressed-payload', key, 'tutor_messages', 'message-2');
    const chunkDocuments = toChunkDocuments(prepared.chunks);
    const context = {
      table: 'tutor_messages',
      documentId: 'message-2',
      chunkSetId: prepared.chunkSetId,
      chunkCount: prepared.chunks.length,
    };

    await expect(decryptEncryptedSyncChunks([], context, key, { core: key })).rejects.toThrow(
      'Sync payload is missing one or more encrypted chunks.'
    );
    await expect(decryptEncryptedSyncChunks(chunkDocuments, { ...context, table: 'pages' }, key, { core: key }))
      .rejects.toThrow('Encrypted sync chunk does not match its parent document.');
  });

  it('rejects payloads requiring more chunks than the protocol limit', async () => {
    const key = await importHexKey(TEST_KEY_HEX);
    const payload = 'A'.repeat(MAX_SYNC_CHUNK_CHARACTERS * (MAX_SYNC_CHUNKS_PER_DOCUMENT + 1));

    await expect(prepareEncryptedSyncChunks(payload, key, 'tutor_messages', 'message-3'))
      .rejects.toThrow('Sync payload exceeds the supported chunk count.');
  });
});
