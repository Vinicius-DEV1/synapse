import type { DecryptedResult } from './sync-decrypt-batch';
import { isRecord, parseDateSafe, type SyncRow } from './sync-utils';

export function normalizeTime(t: unknown): string | undefined {
  if (!t) return undefined;
  if (t instanceof Date) return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
  if (isRecord(t)) {
    if (typeof t.toDate === 'function') {
      const date: unknown = Reflect.apply(t.toDate, t, []);
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
    }
    if (typeof t.seconds === 'number' && Number.isFinite(t.seconds)) {
      return new Date(t.seconds * 1000).toISOString();
    }
  }
  if (typeof t === 'string' || typeof t === 'number') {
    const epoch = parseDateSafe(t);
    return epoch > 0 ? new Date(epoch).toISOString() : undefined;
  }
  return undefined;
}

function normalizeCloudTimestamp(value: unknown, field: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  const normalized = normalizeTime(value);
  if (!normalized) throw new Error(`Invalid ${field} timestamp in cloud document.`);
  return normalized;
}

export interface PreparedUpsert {
  rowToUpsert: SyncRow;
  isSkipped: boolean;
}

let Y: typeof import('yjs') | null = null;
let yjsUtils: {
  base64ToUint8Array: (b64: string) => Uint8Array;
  getYDocStateAsBase64: (doc: import('yjs').Doc) => string;
} | null = null;

const TABLES_WITHOUT_UPDATED_AT = new Set(['quiz_attempts', 'quiz_page_links']);
const TABLES_WITHOUT_DELETED_AT = new Set(['config', 'quiz_attempts']);

export async function prepareRowForUpsert(
  result: DecryptedResult,
  table: string,
  localRow: SyncRow | undefined,
  freshRow: SyncRow | undefined
): Promise<PreparedUpsert> {
  const { docSnap, cloudData, parsed } = result;
  const cloudTime = Math.max(
    parseDateSafe(cloudData.updatedAt || cloudData.createdAt || 0),
    parseDateSafe(cloudData.deletedAt || 0),
  );
  const localTime = localRow
    ? Math.max(
      parseDateSafe(localRow.updated_at || localRow.created_at || 0),
      parseDateSafe(localRow.deleted_at || 0),
    )
    : -1;

  const rowToUpsert: SyncRow = {
    id: docSnap.id,
    ...(parsed || {}),
  };
  if (TABLES_WITHOUT_UPDATED_AT.has(table)) delete rowToUpsert.updated_at;
  if (TABLES_WITHOUT_DELETED_AT.has(table)) delete rowToUpsert.deleted_at;

  if (cloudData.updatedAt !== undefined && !TABLES_WITHOUT_UPDATED_AT.has(table)) {
    rowToUpsert.updated_at = normalizeCloudTimestamp(cloudData.updatedAt, 'updatedAt');
  }
  if (cloudData.createdAt !== undefined && cloudData.createdAt !== null) {
    rowToUpsert.created_at = normalizeCloudTimestamp(cloudData.createdAt, 'createdAt');
  }
  if (!TABLES_WITHOUT_DELETED_AT.has(table) && cloudData.deletedAt !== undefined && cloudData.deletedAt !== null) {
    rowToUpsert.deleted_at = normalizeCloudTimestamp(cloudData.deletedAt, 'deletedAt');
  } else if (!TABLES_WITHOUT_DELETED_AT.has(table) && parsed && parsed.deleted_at !== undefined) {
    rowToUpsert.deleted_at = parsed.deleted_at
      ? normalizeCloudTimestamp(parsed.deleted_at, 'deleted_at')
      : null;
  }

  // CRDT merge for pages (Yjs)
  if (
    table === 'pages' &&
    typeof localRow?.crdt_state === 'string' &&
    parsed &&
    typeof parsed.crdt_state === 'string'
  ) {
    try {
      const [Yjs, utils] = await Promise.all([
        Y ?? import('yjs'),
        yjsUtils ?? import('../../utils/yjs-utils'),
      ]);
      Y = Yjs;
      yjsUtils = utils;
      const localCrdtState = localRow.crdt_state;
      const cloudCrdtState = parsed.crdt_state;
      if (typeof localCrdtState !== 'string' || typeof cloudCrdtState !== 'string') {
        throw new Error('Page CRDT state changed during merge preparation.');
      }
      const ydoc = new Yjs.Doc();
      try {
        Yjs.applyUpdate(ydoc, utils.base64ToUint8Array(localCrdtState));
        Yjs.applyUpdate(ydoc, utils.base64ToUint8Array(cloudCrdtState));
        const mergedCrdtState = utils.getYDocStateAsBase64(ydoc);
        rowToUpsert.crdt_state = mergedCrdtState;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('caderno-sync-update', {
              detail: { pageId: rowToUpsert.id, crdtState: rowToUpsert.crdt_state },
            })
          );
        }

        if (localTime > cloudTime) {
          Object.assign(rowToUpsert, localRow);
          rowToUpsert.crdt_state = mergedCrdtState;
        }
      } finally {
        ydoc.destroy();
      }
    } catch (crdtErr) {
      console.error('Erro no merge CRDT Yjs:', crdtErr);
      throw new Error(`Failed to merge Yjs state for page ${docSnap.id}.`, { cause: crdtErr });
    }
  } else if (localTime > cloudTime) {
    const isCloudDeleted = !TABLES_WITHOUT_DELETED_AT.has(table) && Boolean(
      (cloudData.deletedAt !== undefined && cloudData.deletedAt !== null) ||
      (parsed && parsed.deleted_at)
    );
    if (isCloudDeleted && !localRow?.deleted_at) {
      Object.assign(rowToUpsert, localRow);
      rowToUpsert.deleted_at = normalizeCloudTimestamp(cloudData.deletedAt, 'deletedAt')
        || normalizeCloudTimestamp(parsed?.deleted_at, 'deleted_at')
        || new Date().toISOString();
    } else {
      if (
        table === 'pages' &&
        parsed &&
        parsed.content &&
        localRow &&
        localRow.content &&
        parsed.content !== localRow.content &&
        typeof window !== 'undefined' &&
        window.api?.savePageHistory
      ) {
        try {
          await window.api.savePageHistory(result.docSnap.id, String(parsed.content));
        } catch (histErr) {
          console.warn('[Sync] Failed to archive conflicting cloud revision to history:', histErr);
          throw new Error(`Failed to preserve the local page revision for ${docSnap.id}.`, { cause: histErr });
        }
      }
      return { rowToUpsert, isSkipped: true };
    }
  } else {
    if (
      table === 'pages' &&
      localRow &&
      localRow.content &&
      parsed &&
      parsed.content &&
      localRow.content !== parsed.content &&
      typeof window !== 'undefined' &&
      window.api?.savePageHistory
    ) {
      try {
        await window.api.savePageHistory(result.docSnap.id, String(localRow.content));
      } catch (histErr) {
        console.warn('[Sync] Failed to archive conflicting local revision to history:', histErr);
        throw new Error(`Failed to preserve the cloud page revision for ${docSnap.id}.`, { cause: histErr });
      }
    }
  }

  // Race condition protection: check for local edits during sync
  if (freshRow) {
    const freshTime = Math.max(
      parseDateSafe(freshRow.updated_at || freshRow.created_at || 0),
      parseDateSafe(freshRow.deleted_at || 0),
    );
    const isCloudDeleted = !TABLES_WITHOUT_DELETED_AT.has(table) && Boolean(rowToUpsert.deleted_at);
    if (freshTime > cloudTime && (!isCloudDeleted || freshRow.deleted_at)) {
      return { rowToUpsert, isSkipped: true };
    }
  }

  return { rowToUpsert, isSkipped: false };
}

export async function upsertRowWithoutDroppingFields(
  table: string,
  rowToUpsert: SyncRow
): Promise<void> {
  if (!window.api?.sync) {
    throw new Error('Sync API is unavailable while applying a cloud row.');
  }

  await window.api.sync.upsertRow(table, rowToUpsert);
}
