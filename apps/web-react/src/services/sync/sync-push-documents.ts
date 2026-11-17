import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { PreparedDoc } from './sync-payload';
import { getSyncDocument, type SyncCloudScope } from './sync-cloud-paths';

const MAX_SYNC_WRITE_BATCH_SIZE = 400;
const MAX_CHUNK_WRITE_BATCH_SIZE = 20;

export interface PreparedWriteResult {
  writeCount: number;
  trafficBytes: number;
}

function getMetadata(item: PreparedDoc): Record<string, unknown> {
  return {
    isCompressed: item.isCompressed || false,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
    ...(item.deletedAt ? { deletedAt: item.deletedAt } : {}),
    ...(item.idEncodingVersion ? { idEncodingVersion: item.idEncodingVersion } : {}),
  };
}

async function commitRegularDocuments(
  items: PreparedDoc[],
  table: string,
  scope: SyncCloudScope
): Promise<PreparedWriteResult> {
  let writeCount = 0;
  let trafficBytes = 0;

  for (let offset = 0; offset < items.length; offset += MAX_SYNC_WRITE_BATCH_SIZE) {
    const batchItems = items.slice(offset, offset + MAX_SYNC_WRITE_BATCH_SIZE);
    const batch = writeBatch(db);
    for (const item of batchItems) {
      if (!item.encryptedData) throw new Error(`Missing encrypted payload for ${table}/${item.id}.`);
      const documentRef = getSyncDocument(table, item.id, scope);
      batch.set(documentRef, {
        encryptedData: item.encryptedData,
        ...getMetadata(item),
        isChunked: false,
        chunkSetId: deleteField(),
        chunkCount: deleteField(),
      }, { merge: true });
      trafficBytes += item.id.length + item.encryptedData.length + 150;
    }
    await batch.commit();
    writeCount += batchItems.length;
  }

  return { writeCount, trafficBytes };
}

async function commitChunkedDocument(
  item: PreparedDoc,
  table: string,
  scope: SyncCloudScope
): Promise<PreparedWriteResult> {
  if (!item.chunkSetId || !item.chunkCount || !item.chunks || item.chunks.length !== item.chunkCount) {
    throw new Error(`Chunk metadata is incomplete for ${table}/${item.id}.`);
  }

  const documentRef = getSyncDocument(table, item.id, scope);
  const chunksCollection = collection(documentRef, 'chunks');
  const existingParent = await getDoc(documentRef);
  const previousChunkSetId = existingParent.exists() && existingParent.data().isChunked === true
    ? existingParent.data().chunkSetId
    : undefined;
  const existingChunks = await getDocs(chunksCollection);
  if (existingChunks.docs.some((snapshot) => snapshot.data().chunkSetId === item.chunkSetId)) {
    throw new Error(`Chunk set ID collision for ${table}/${item.id}.`);
  }
  let writeCount = 0;
  let trafficBytes = 0;

  for (let offset = 0; offset < item.chunks.length; offset += MAX_CHUNK_WRITE_BATCH_SIZE) {
    const chunkItems = item.chunks.slice(offset, offset + MAX_CHUNK_WRITE_BATCH_SIZE);
    const batch = writeBatch(db);
    for (const chunk of chunkItems) {
      const chunkRef = doc(chunksCollection, chunk.id);
      batch.set(chunkRef, {
        chunkSetId: chunk.chunkSetId,
        index: chunk.index,
        version: 1,
        encryptedChunk: chunk.encryptedChunk,
      });
      trafficBytes += chunk.id.length + chunk.encryptedChunk.length + 100;
    }
    await batch.commit();
    writeCount += chunkItems.length;
  }

  const parentBatch = writeBatch(db);
  parentBatch.set(documentRef, {
    encryptedData: '',
    isChunked: true,
    chunkSetId: item.chunkSetId,
    chunkCount: item.chunkCount,
    ...getMetadata(item),
  }, { merge: true });
  await parentBatch.commit();
  writeCount++;
  trafficBytes += item.id.length + item.chunkSetId.length + 150;

  const staleChunks = typeof previousChunkSetId === 'string' && previousChunkSetId !== item.chunkSetId
    ? existingChunks.docs.filter((snapshot) => snapshot.data().chunkSetId === previousChunkSetId)
    : [];
  for (let offset = 0; offset < staleChunks.length; offset += MAX_SYNC_WRITE_BATCH_SIZE) {
    const batch = writeBatch(db);
    const staleBatch = staleChunks.slice(offset, offset + MAX_SYNC_WRITE_BATCH_SIZE);
    for (const snapshot of staleBatch) batch.delete(snapshot.ref);
    await batch.commit();
    writeCount += staleBatch.length;
  }

  return { writeCount, trafficBytes };
}

export async function commitPreparedSyncDocuments(
  items: PreparedDoc[],
  table: string,
  scope: SyncCloudScope
): Promise<PreparedWriteResult> {
  const regularItems = items.filter((item) => !item.isChunked);
  const chunkedItems = items.filter((item) => item.isChunked);
  const regularResult = await commitRegularDocuments(regularItems, table, scope);
  let writeCount = regularResult.writeCount;
  let trafficBytes = regularResult.trafficBytes;

  for (const item of chunkedItems) {
    const result = await commitChunkedDocument(item, table, scope);
    writeCount += result.writeCount;
    trafficBytes += result.trafficBytes;
  }

  return { writeCount, trafficBytes };
}
