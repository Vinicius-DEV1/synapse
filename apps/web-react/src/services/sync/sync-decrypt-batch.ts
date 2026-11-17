import { decryptText } from '../crypto';
import { base64ToArrayBuffer } from '../../utils/binary';
import { collection, getDocs, type DocumentData, type DocumentReference } from 'firebase/firestore';
import { isRecord } from './sync-utils';
import { decryptEncryptedSyncChunks, MAX_SYNC_CHUNKS_PER_DOCUMENT } from './sync-chunked-payload';

export interface CloudData {
  encryptedData?: string;
  isCompressed?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  idEncodingVersion?: unknown;
  isChunked?: boolean;
  chunkSetId?: string;
  chunkCount?: number;
  [key: string]: unknown;
}

export interface FirestoreDocLike {
  id: string;
  data: () => Record<string, unknown> | undefined;
  ref?: DocumentReference<DocumentData>;
}

export interface DecryptedResult {
  docSnap: FirestoreDocLike;
  cloudData: CloudData;
  parsed: Record<string, unknown> | null;
  isLegacy: boolean;
  error: unknown;
}

export function parseCloudData(value: unknown): CloudData {
  if (!isRecord(value)) throw new Error('Invalid Firestore sync document.');
  if (value.encryptedData !== undefined && typeof value.encryptedData !== 'string') {
    throw new Error('Invalid encryptedData field in Firestore sync document.');
  }
  if (value.isCompressed !== undefined && typeof value.isCompressed !== 'boolean') {
    throw new Error('Invalid isCompressed field in Firestore sync document.');
  }
  if (value.isChunked !== undefined && typeof value.isChunked !== 'boolean') {
    throw new Error('Invalid isChunked field in Firestore sync document.');
  }
  if (value.isChunked === true && (
    typeof value.chunkSetId !== 'string' ||
    value.chunkSetId.length === 0 ||
    typeof value.chunkCount !== 'number' ||
    !Number.isInteger(value.chunkCount) ||
    value.chunkCount < 1 ||
    value.chunkCount > MAX_SYNC_CHUNKS_PER_DOCUMENT ||
    value.isCompressed !== true
  )) {
    throw new Error('Invalid chunked sync metadata in Firestore document.');
  }
  return value;
}

export async function decryptCloudDoc(
  docSnap: FirestoreDocLike,
  key: CryptoKey,
  moduleKeys: Record<string, CryptoKey>,
  table?: string
): Promise<DecryptedResult> {
  const rawData = docSnap.data();
  let cloudData: CloudData = {};
  try {
    cloudData = parseCloudData(rawData ?? {});
    let decryptedJsonOrB64: string;
    let isLegacy = false;
    if (cloudData.isChunked) {
      if (!table || !docSnap.ref) throw new Error('Chunked sync document has no table or Firestore reference.');
      const chunkSnapshot = await getDocs(collection(docSnap.ref, 'chunks'));
      const decryptedChunks = await decryptEncryptedSyncChunks(
        chunkSnapshot.docs.map((document) => ({
          id: document.id,
          data: () => document.data(),
        })),
        {
          table,
          documentId: docSnap.id,
          chunkSetId: cloudData.chunkSetId || '',
          chunkCount: cloudData.chunkCount || 0,
        },
        key,
        moduleKeys
      );
      decryptedJsonOrB64 = decryptedChunks.payload;
      isLegacy = decryptedChunks.isLegacy;
    } else {
      try {
        if (!cloudData.encryptedData) {
          throw new Error('Missing encryptedData');
        }
        decryptedJsonOrB64 = await decryptText(cloudData.encryptedData, key);
      } catch (e) {
        if (key !== moduleKeys['core'] && moduleKeys['core'] && cloudData.encryptedData) {
          try {
            decryptedJsonOrB64 = await decryptText(cloudData.encryptedData, moduleKeys['core']);
            isLegacy = true; // Decrypt success with core key instead of module key
          } catch {
            throw e;
          }
        } else {
          throw e;
        }
      }
    }

    let finalJson = decryptedJsonOrB64;

    if (cloudData.isCompressed) {
      try {
        const buffer = base64ToArrayBuffer(decryptedJsonOrB64);
        const body = new Response(buffer).body;
        if (!body) throw new Error('Decompression stream body is unavailable.');
        const stream = body.pipeThrough(new DecompressionStream('gzip'));
        finalJson = await new Response(stream).text();
      } catch (decErr) {
        console.error('[Sync Decompress] Error decompressing document', decErr);
        throw decErr;
      }
    }

    const parsed: unknown = JSON.parse(finalJson);
    if (!isRecord(parsed)) throw new Error('Decrypted sync payload must be a JSON object.');
    return { docSnap, cloudData, parsed, isLegacy, error: null };
  } catch (err: unknown) {
    return { docSnap, cloudData, parsed: null, isLegacy: false, error: err };
  }
}

export async function decryptCloudBatch(
  batch: FirestoreDocLike[],
  key: CryptoKey,
  moduleKeys: Record<string, CryptoKey>,
  table?: string
): Promise<DecryptedResult[]> {
  return Promise.all(batch.map((docSnap) => decryptCloudDoc(docSnap, key, moduleKeys, table)));
}
