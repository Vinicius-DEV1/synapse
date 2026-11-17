import { decryptText, encryptText } from '../crypto';
import { isRecord } from './sync-utils';

export const SYNC_CHUNK_VERSION = 1;
export const MAX_SYNC_CHUNK_CHARACTERS = 256_000;
export const MAX_SYNC_CHUNKS_PER_DOCUMENT = 128;
const MAX_ENCRYPTED_CHUNK_CHARACTERS = 500_000;

export interface PreparedSyncChunk {
  id: string;
  index: number;
  chunkSetId: string;
  encryptedChunk: string;
}

export interface PreparedSyncChunks {
  chunkSetId: string;
  chunks: PreparedSyncChunk[];
}

export interface EncryptedSyncChunkDocument {
  id: string;
  data: () => Record<string, unknown> | undefined;
}

export interface SyncChunkContext {
  table: string;
  documentId: string;
  chunkSetId: string;
  chunkCount: number;
}

export interface DecryptedSyncChunks {
  payload: string;
  isLegacy: boolean;
}

interface SyncChunkEnvelope {
  version: number;
  table: string;
  documentId: string;
  chunkSetId: string;
  index: number;
  chunkCount: number;
  payload: string;
}

export async function prepareEncryptedSyncChunks(
  payload: string,
  key: CryptoKey,
  table: string,
  documentId: string
): Promise<PreparedSyncChunks> {
  const chunkSetId = crypto.randomUUID();
  const payloadParts = payload.match(new RegExp(`[\\s\\S]{1,${MAX_SYNC_CHUNK_CHARACTERS}}`, 'g')) || [];
  if (payloadParts.length === 0 || payloadParts.length > MAX_SYNC_CHUNKS_PER_DOCUMENT) {
    throw new Error('Sync payload exceeds the supported chunk count.');
  }

  const chunks = await Promise.all(payloadParts.map(async (payloadPart, index) => {
    const envelope: SyncChunkEnvelope = {
      version: SYNC_CHUNK_VERSION,
      table,
      documentId,
      chunkSetId,
      index,
      chunkCount: payloadParts.length,
      payload: payloadPart,
    };
    const encryptedChunk = await encryptText(JSON.stringify(envelope), key);
    if (encryptedChunk.length > MAX_ENCRYPTED_CHUNK_CHARACTERS) {
      throw new Error('Encrypted sync chunk exceeds the Firestore document safety limit.');
    }
    return {
      id: `${chunkSetId}-${index.toString().padStart(6, '0')}`,
      index,
      chunkSetId,
      encryptedChunk,
    };
  }));

  return { chunkSetId, chunks };
}

function parseChunkEnvelope(value: unknown): SyncChunkEnvelope {
  if (!isRecord(value)) throw new Error('Invalid encrypted sync chunk envelope.');
  const { version, table, documentId, chunkSetId, index, chunkCount, payload } = value;
  if (
    version !== SYNC_CHUNK_VERSION ||
    typeof table !== 'string' ||
    typeof documentId !== 'string' ||
    typeof chunkSetId !== 'string' ||
    typeof index !== 'number' ||
    !Number.isInteger(index) ||
    typeof chunkCount !== 'number' ||
    !Number.isInteger(chunkCount) ||
    typeof payload !== 'string'
  ) {
    throw new Error('Invalid encrypted sync chunk metadata.');
  }
  return { version, table, documentId, chunkSetId, index, chunkCount, payload };
}

export async function decryptEncryptedSyncChunks(
  documents: EncryptedSyncChunkDocument[],
  context: SyncChunkContext,
  key: CryptoKey,
  moduleKeys: Record<string, CryptoKey>
): Promise<DecryptedSyncChunks> {
  if (
    !Number.isInteger(context.chunkCount) ||
    context.chunkCount < 1 ||
    context.chunkCount > MAX_SYNC_CHUNKS_PER_DOCUMENT
  ) {
    throw new Error('Invalid sync chunk count.');
  }

  const matchingChunks = documents.filter((document) => {
    const data = document.data();
    return isRecord(data) && data.chunkSetId === context.chunkSetId;
  });
  if (matchingChunks.length !== context.chunkCount) {
    throw new Error('Sync payload is missing one or more encrypted chunks.');
  }

  const orderedChunks = matchingChunks
    .map((document) => ({ document, data: document.data() }))
    .sort((left, right) => {
      const leftIndex = isRecord(left.data) && typeof left.data.index === 'number' ? left.data.index : Number.MAX_SAFE_INTEGER;
      const rightIndex = isRecord(right.data) && typeof right.data.index === 'number' ? right.data.index : Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
  const seenIndexes = new Set<number>();
  const payloadParts: string[] = [];
  let isLegacy = false;

  for (let position = 0; position < orderedChunks.length; position++) {
    const { data } = orderedChunks[position];
    if (!isRecord(data) || typeof data.encryptedChunk !== 'string') {
      throw new Error('Encrypted sync chunk is malformed.');
    }

    let clearText: string;
    try {
      clearText = await decryptText(data.encryptedChunk, key);
    } catch (primaryError: unknown) {
      const fallbackKey = moduleKeys.core;
      if (!fallbackKey || fallbackKey === key) throw primaryError;
      clearText = await decryptText(data.encryptedChunk, fallbackKey);
      isLegacy = true;
    }

    const envelope = parseChunkEnvelope(JSON.parse(clearText));
    if (
      envelope.table !== context.table ||
      envelope.documentId !== context.documentId ||
      envelope.chunkSetId !== context.chunkSetId ||
      envelope.chunkCount !== context.chunkCount ||
      envelope.index !== position ||
      data.index !== position
    ) {
      throw new Error('Encrypted sync chunk does not match its parent document.');
    }
    if (seenIndexes.has(envelope.index)) throw new Error('Duplicate encrypted sync chunk index.');
    seenIndexes.add(envelope.index);
    payloadParts.push(envelope.payload);
  }

  if (seenIndexes.size !== context.chunkCount) throw new Error('Sync payload chunk sequence is incomplete.');
  return { payload: payloadParts.join(''), isLegacy };
}
