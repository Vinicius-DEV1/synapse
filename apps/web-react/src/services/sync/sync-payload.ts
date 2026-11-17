import { encryptText } from '../crypto';
import { uint8ArrayToBase64 } from '../../utils/binary';
import { encodeSyncDocumentId, parseDateSafe, type SyncRow } from './sync-utils';
import { prepareEncryptedSyncChunks, type PreparedSyncChunk } from './sync-chunked-payload';

/** Individual Firestore documents are kept below the platform's 1 MiB limit. */
const MAX_PAYLOAD_BYTES = 600_000;
const MAX_ENCRYPTED_PAYLOAD_CHARACTERS = 900_000;

export interface PreparedDoc {
  id: string;
  encryptedData?: string;
  isCompressed?: boolean;
  isChunked?: boolean;
  chunkSetId?: string;
  chunkCount?: number;
  chunks?: PreparedSyncChunk[];
  updatedAt: string | null;
  createdAt: string | null;
  deletedAt?: string;
  localTime: number;
  table: string;
  idEncodingVersion?: number;
}

export interface PreparedRows {
  prepared: PreparedDoc[];
  skippedLarge: string[];
}

/** Encrypts rows and prepares their Firestore IDs and timestamp metadata. */
export async function prepareRowsForPush(
  rows: SyncRow[],
  key: CryptoKey,
  table: string
): Promise<PreparedRows> {
  const skippedLarge: string[] = [];

  const promises = rows.map(async (row): Promise<PreparedDoc | null> => {
    const { id, updated_at, created_at, ...sensitiveData } = row;
    const idVal = id ?? row.shareId ?? row.url;
    if (idVal === undefined || idVal === null || String(idVal).length === 0) {
      throw new Error(`Cannot sync ${table} row without a document ID.`);
    }

    const encodedId = encodeSyncDocumentId(String(idVal));
    const rawDeletedAt = row.deleted_at;
    const deletedTime = parseDateSafe(rawDeletedAt);
    if (rawDeletedAt && deletedTime === 0) {
      throw new Error(`Cannot sync ${table} row with an invalid deletion timestamp.`);
    }
    const safeDeletedAt = deletedTime > 0 ? new Date(deletedTime).toISOString() : null;
    if (safeDeletedAt) sensitiveData.deleted_at = safeDeletedAt;

    const jsonString = JSON.stringify(sensitiveData);
    let payloadString = jsonString;
    let isCompressed = false;
    let chunkSetId: string | undefined;
    let chunks: PreparedSyncChunk[] | undefined;

    if (jsonString.length > MAX_PAYLOAD_BYTES) {
      try {
        const body = new Response(jsonString).body;
        if (!body) throw new Error('Compression stream body is unavailable.');
        const stream = body.pipeThrough(new CompressionStream('gzip'));
        const buffer = await new Response(stream).arrayBuffer();
        const base64 = uint8ArrayToBase64(new Uint8Array(buffer));

        if (base64.length < MAX_PAYLOAD_BYTES) {
          payloadString = base64;
          isCompressed = true;
        } else {
          const chunkedPayload = await prepareEncryptedSyncChunks(base64, key, table, encodedId.id);
          chunkSetId = chunkedPayload.chunkSetId;
          chunks = chunkedPayload.chunks;
          isCompressed = true;
        }
      } catch (error: unknown) {
        console.warn(`[Sync Compress] Error preparing doc ${encodedId.id}`, error);
        skippedLarge.push(
          `[PUSH SKIP] Doc ${encodedId.id} (${table}) could not be compressed or split into safe encrypted chunks.`
        );
        return null;
      }
    }

    const encryptedData = chunks ? undefined : await encryptText(payloadString, key);
    if (encryptedData && encryptedData.length > MAX_ENCRYPTED_PAYLOAD_CHARACTERS) {
      skippedLarge.push(
        `[PUSH SKIP] Doc ${encodedId.id} (${table}) exceeds the safe encrypted payload size.`
      );
      return null;
    }
    const localTime = Math.max(
      parseDateSafe(updated_at || created_at || 0),
      parseDateSafe(rawDeletedAt || 0)
    );
    const fallbackTime = localTime > 0 ? localTime : Date.now();
    const createdTime = parseDateSafe(created_at);

    return {
      id: encodedId.id,
      ...(encryptedData ? { encryptedData } : {}),
      isCompressed,
      ...(chunks ? { isChunked: true, chunkSetId, chunkCount: chunks.length, chunks } : {}),
      updatedAt: new Date(fallbackTime).toISOString(),
      createdAt: createdTime > 0 ? new Date(createdTime).toISOString() : null,
      ...(safeDeletedAt ? { deletedAt: safeDeletedAt } : {}),
      localTime: fallbackTime,
      table,
      idEncodingVersion: encodedId.encodingVersion,
    };
  });

  const results = await Promise.all(promises);
  return {
    prepared: results.filter((row): row is PreparedDoc => row !== null),
    skippedLarge,
  };
}
