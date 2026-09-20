import type { DecryptedResult } from './sync-decrypt-batch';
import { parseDateSafe, type SyncRow } from './sync-utils';

export function normalizeTime(t: unknown): string | undefined {
  if (!t) return undefined;
  if (typeof t === 'object' && t !== null && 'toDate' in t && typeof (t as { toDate: () => Date }).toDate === 'function') {
    return (t as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof t === 'object' && t !== null && 'seconds' in t && typeof (t as { seconds: number }).seconds === 'number') {
    return new Date((t as { seconds: number }).seconds * 1000).toISOString();
  }
  if (typeof t === 'string' || typeof t === 'number') {
    return new Date(t).toISOString();
  }
  return undefined;
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

export async function prepareRowForUpsert(
  result: DecryptedResult,
  table: string,
  localRow: SyncRow | undefined,
  freshRow: SyncRow | undefined
): Promise<PreparedUpsert> {
  const { docSnap, cloudData, parsed } = result;
  const cloudTime = parseDateSafe(
    (cloudData.updatedAt || cloudData.createdAt || 0) as string | number
  );
  const localTime = localRow
    ? parseDateSafe(localRow.updated_at || localRow.created_at || 0)
    : -1;

  const rowToUpsert: SyncRow = {
    id: docSnap.id,
    ...(parsed || {}),
  };

  if (cloudData.updatedAt !== undefined) {
    rowToUpsert.updated_at = normalizeTime(cloudData.updatedAt) || (cloudData.updatedAt as string);
  }
  if (cloudData.createdAt !== undefined) {
    rowToUpsert.created_at = normalizeTime(cloudData.createdAt) || (cloudData.createdAt as string);
  }

  // CRDT merge for pages (Yjs)
  if (
    table === 'pages' &&
    typeof localRow?.crdt_state === 'string' &&
    parsed &&
    typeof parsed.crdt_state === 'string'
  ) {
    try {
      if (!Y) {
        Y = await import('yjs');
        yjsUtils = await import('../../utils/yjs-utils');
      }
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, yjsUtils!.base64ToUint8Array(localRow.crdt_state));
      Y.applyUpdate(ydoc, yjsUtils!.base64ToUint8Array(parsed.crdt_state));
      const mergedCrdtState = yjsUtils!.getYDocStateAsBase64(ydoc);
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
    } catch (crdtErr) {
      console.error('Erro no merge CRDT Yjs:', crdtErr);
    }
  } else if (localTime > cloudTime) {
    if (parsed && parsed.deleted_at && !localRow?.deleted_at) {
      Object.assign(rowToUpsert, localRow);
      rowToUpsert.deleted_at = parsed.deleted_at as string;
    } else {
      return { rowToUpsert, isSkipped: true };
    }
  }

  // Race condition protection: check for local edits during sync
  if (freshRow) {
    const freshTime = parseDateSafe(freshRow.updated_at || freshRow.created_at || 0);
    if (freshTime > cloudTime) {
      return { rowToUpsert, isSkipped: true };
    }
  }

  return { rowToUpsert, isSkipped: false };
}

export async function upsertRowWithColumnFallback(
  table: string,
  rowToUpsert: SyncRow
): Promise<void> {
  if (!window.api?.sync) return;
  try {
    await window.api.sync.upsertRow(table, rowToUpsert);
  } catch (upsertErr: unknown) {
    const errMessage = upsertErr instanceof Error ? upsertErr.message : String(upsertErr);
    let retryRow: Record<string, unknown> = { ...rowToUpsert };
    let lastErr: Error | null = upsertErr instanceof Error ? upsertErr : new Error(String(upsertErr));

    for (let attempt = 0; attempt < 5; attempt++) {
      const colMatch = errMessage.match(/has no column named (\S+)/);
      if (colMatch && colMatch[1]) {
        delete retryRow[colMatch[1]];
        try {
          await window.api.sync.upsertRow(table, retryRow as SyncRow);
          Object.keys(rowToUpsert).forEach((k) => {
            if (!(k in retryRow)) delete rowToUpsert[k];
          });
          lastErr = null;
          break;
        } catch (retryErr: unknown) {
          lastErr = retryErr instanceof Error ? retryErr : new Error(String(retryErr));
        }
      } else {
        break;
      }
    }
    if (lastErr) throw lastErr;
  }
}
