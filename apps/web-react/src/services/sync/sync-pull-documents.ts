import { type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { decodeSyncDocumentId, getCloudSyncTime, parseDateSafe, parseSyncRows, type SyncRow } from './sync-utils';
import { logFirebaseOp } from './sync-monitor';
import { decryptCloudBatch } from './sync-decrypt-batch';
import { prepareRowForUpsert, upsertRowWithoutDroppingFields } from './sync-pull-merge';
import { prepareRowsForPush } from './sync-payload';
import { getErrorMessage } from '../../utils/error';
import { commitPreparedSyncDocuments } from './sync-push-documents';
import { yieldToMain } from '../../utils/yieldToMain';

const DECRYPT_BATCH_SIZE = 20;

export interface PullDocumentBatchResult {
  pulledDocsCount: number;
  skippedDocsCount: number;
  errors: string[];
  pushCandidateIds: string[];
}

export async function processCloudDocuments(
  docs: QueryDocumentSnapshot<DocumentData>[],
  table: string,
  key: CryptoKey,
  moduleKeys: Record<string, CryptoKey>,
  workspaceId: string | undefined,
  userId: string | undefined,
  localRowsById: Map<string, SyncRow>
): Promise<PullDocumentBatchResult> {
  const result: PullDocumentBatchResult = {
    pulledDocsCount: 0,
    skippedDocsCount: 0,
    errors: [],
    pushCandidateIds: [],
  };

  for (let i = 0; i < docs.length; i += DECRYPT_BATCH_SIZE) {
    const batch = docs.slice(i, i + DECRYPT_BATCH_SIZE);
    const batchIds = batch.map((document) =>
      decodeSyncDocumentId(document.id, document.data().idEncodingVersion)
    );
    const freshRows = parseSyncRows(
      await window.api.sync.getRowsByIds<unknown>(table, batchIds),
      table
    );
    const freshRowsById = new Map(freshRows.map((row) => [row.id, row]));
    const decryptedResults = await decryptCloudBatch(batch, key, moduleKeys, table);

    const pendingBatchUpserts: Array<{ rowId: string; rowToUpsert: SyncRow }> = [];

    for (const decrypted of decryptedResults) {
      const cloudDocument = decrypted.docSnap;
      const rowId = decodeSyncDocumentId(cloudDocument.id, decrypted.cloudData.idEncodingVersion);
      const resultWithLocalId = {
        ...decrypted,
        docSnap: { ...cloudDocument, id: rowId },
      };

      if (decrypted.error || !decrypted.parsed) {
        const message = `PULL erro doc ${rowId} (${table}): ${getErrorMessage(decrypted.error)}`;
        console.error(message);
        window.api?.log?.(message);
        result.errors.push(message);
        continue;
      }

      const localRow = localRowsById.get(rowId);
      const freshRow = freshRowsById.get(rowId);
      const { rowToUpsert, isSkipped } = await prepareRowForUpsert(
        resultWithLocalId,
        table,
        localRow,
        freshRow
      );

      const cloudTime = getCloudSyncTime(decrypted.cloudData);
      const localTime = Math.max(
        parseDateSafe(localRow?.updated_at || localRow?.created_at || 0),
        parseDateSafe(localRow?.deleted_at || 0),
      );
      const freshTime = Math.max(
        parseDateSafe(freshRow?.updated_at || freshRow?.created_at || 0),
        parseDateSafe(freshRow?.deleted_at || 0),
      );
      const mergedPageState = table === 'pages'
        && typeof decrypted.parsed?.crdt_state === 'string'
        && rowToUpsert.crdt_state !== decrypted.parsed.crdt_state;
      if (!decrypted.isLegacy && (localTime > cloudTime || freshTime > cloudTime || mergedPageState)) {
        result.pushCandidateIds.push(rowId);
      }

      if (decrypted.isLegacy) {
        try {
          const rowToRekey = isSkipped ? (freshRow || localRow) : rowToUpsert;
          if (!rowToRekey) {
            throw new Error('Cannot rekey a cloud row without a local or decrypted row.');
          }

          if (!isSkipped) {
            await upsertRowWithoutDroppingFields(table, rowToUpsert);
            localRowsById.set(rowId, rowToUpsert);
          }

          const { prepared, skippedLarge } = await prepareRowsForPush([rowToRekey], key, table);
          if (prepared.length !== 1) {
            throw new Error(skippedLarge[0] || 'Could not prepare the legacy cloud row for re-encryption.');
          }

          const preparedDocument = prepared[0];
          const writeResult = await commitPreparedSyncDocuments(
            [preparedDocument],
            table,
            { workspaceId, userId }
          );
          logFirebaseOp('write', writeResult.writeCount);
          result.pulledDocsCount++;
        } catch (rekeyError: unknown) {
          const message = `PULL erro ao migrar criptografia do doc ${rowId} (${table}): ${getErrorMessage(rekeyError)}`;
          console.error(message);
          window.api?.log?.(message);
          result.errors.push(message);
        }
        continue;
      }

      if (isSkipped) {
        result.skippedDocsCount++;
        continue;
      }

      pendingBatchUpserts.push({ rowId, rowToUpsert });
    }

    if (pendingBatchUpserts.length > 0) {
      const batchFn = window.api?.sync?.upsertRowsBatch;
      let batchCommitted = false;

      if (typeof batchFn === 'function') {
        try {
          await batchFn(
            table,
            pendingBatchUpserts.map((item) => item.rowToUpsert)
          );
          for (const item of pendingBatchUpserts) {
            localRowsById.set(item.rowId, item.rowToUpsert);
            result.pulledDocsCount++;
          }
          batchCommitted = true;
        } catch (batchErr: unknown) {
          console.warn(
            `[Sync] Batch upsert failed for ${table}, falling back to per-row isolation:`,
            batchErr
          );
        }
      }

      if (!batchCommitted) {
        for (const item of pendingBatchUpserts) {
          try {
            await upsertRowWithoutDroppingFields(table, item.rowToUpsert);
            localRowsById.set(item.rowId, item.rowToUpsert);
            result.pulledDocsCount++;
          } catch (upsertError: unknown) {
            const message = `PULL erro doc ${item.rowId} (${table}): ${getErrorMessage(upsertError)}`;
            console.warn(message, upsertError);
            result.errors.push(message);
          }
        }
      }
    }

    if (i + DECRYPT_BATCH_SIZE < docs.length) {
      await yieldToMain();
    }
  }

  return result;
}
