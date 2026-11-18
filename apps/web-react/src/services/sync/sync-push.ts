import { setDoc, serverTimestamp } from 'firebase/firestore';
import {
  MODULE_TABLES,
  getLastSyncTime,
  setLastSyncTime,
  getTableLastSyncTime,
  setTableLastSyncTime,
  parseDateSafe,
  getDeviceId,
  parseSyncRows,
  type SyncRow,
} from './sync-utils';
import { prepareRowsForPush } from './sync-payload';
import { commitPreparedSyncDocuments } from './sync-push-documents';
import { getSyncConfigDocument, getSyncScopeKey } from './sync-cloud-paths';
import { logFirebaseOp, isEmergencyStopped, logSyncEvent, logFirebaseTraffic } from './sync-monitor';
import { getErrorMessage } from '../../utils/error';
import {
  selectInitialSyncPushRows,
  type InitialSyncPushPlan,
} from './sync-push-plan';

/** Max Firestore batch size is 500; 400 is used as safety threshold */
const BATCH_SIZE = 400;

export async function pushAllToCloud(
  moduleKeys: Record<string, CryptoKey>,
  targetTables?: string[],
  workspaceId?: string,
  userId?: string,
  initialPushPlan?: InitialSyncPushPlan,
): Promise<void> {
  if (!window.api?.sync) {
    throw new Error('Local sync API is unavailable.');
  }
  if (isEmergencyStopped()) {
    throw new Error('Cloud push is disabled by the emergency sync stop.');
  }
  
  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet para sincronizar.');
  }

  const scope = { workspaceId, userId };
  const scopeKey = getSyncScopeKey(scope);
  const lastPush = getLastSyncTime('push', scopeKey);
  const deletionFixKey = `caderno_sync_fix_deletions_v1_${encodeURIComponent(scopeKey)}`;
  const hasRepushedDeletions = typeof localStorage !== 'undefined' && localStorage.getItem(deletionFixKey) === 'true';
  let highestSuccessTime = lastPush; // Only advances timestamp for successful documents
  let pushedCount = 0;
  const errors: string[] = [];
  let pushHadErrors = false;
  // The manifest tracks the newest timestamp for each table pushed successfully.
  const manifestUpdate: Record<string, string> = {};

  const targetSet = targetTables && targetTables.length > 0 ? new Set(targetTables) : null;
  const isFullPush = targetSet === null;

  for (const module of Object.keys(MODULE_TABLES)) {
    const allTables = MODULE_TABLES[module] || [];
    const tables = targetSet
      ? allTables.filter((t) => targetSet.has(t))
      : allTables;

    if (tables.length === 0) continue;

    const key = moduleKeys[module] || moduleKeys['core'];
    if (!key) {
      const message = `[Sync PUSH] Nenhuma chave encontrada para o módulo ${module}.`;
      console.warn(`${message} Pulando...`);
      errors.push(message);
      pushHadErrors = true;
      continue;
    }

    for (const table of tables) {
      let tableHadErrors = false;
      try {
        const lastPushTable = getTableLastSyncTime('push', table, scopeKey);
        let tableHighestSuccessTime = lastPushTable;
        const initialTablePlan = initialPushPlan?.get(table);
        if (initialPushPlan && !initialTablePlan) {
          throw new Error(`Initial push plan is missing table ${table}.`);
        }
        // 1-second leeway window to accommodate SQLite's second-level timestamp truncations
        const pushThreshold = Math.max(0, lastPushTable - 1000);

        let rowsToPush: SyncRow[];
        if (initialTablePlan) {
          const localRows = window.api.sync.getRowsByIds
            ? parseSyncRows(
                await window.api.sync.getRowsByIds<unknown>(table, [...initialTablePlan.rowIds]),
                table,
              )
            : parseSyncRows(await window.api.sync.getTable<unknown>(table), table);
          rowsToPush = selectInitialSyncPushRows(localRows, initialTablePlan);
          tableHighestSuccessTime = initialTablePlan.checkpoint;
        } else if (lastPushTable > 0 && window.api.sync.getModifiedRows && hasRepushedDeletions) {
          const modified = parseSyncRows(
            await window.api.sync.getModifiedRows<unknown>(table, pushThreshold),
            table
          );
          rowsToPush = modified.filter((r: SyncRow) => {
            const rTime = Math.max(parseDateSafe(r.updated_at || r.created_at || 0), parseDateSafe(r.deleted_at || 0));
            return rTime > pushThreshold;
          });
        } else {
          const localRows = parseSyncRows(await window.api.sync.getTable<unknown>(table), table);
          if (localRows.length === 0) continue;

          rowsToPush = lastPushTable > 0 
            ? localRows.filter((r: SyncRow) => {
                const rTime = Math.max(parseDateSafe(r.updated_at || r.created_at || 0), parseDateSafe(r.deleted_at || 0));
                const isUnsyncedDeletion = !hasRepushedDeletions && Boolean(r.deleted_at);
                return rTime > pushThreshold || isUnsyncedDeletion;
              })
            : localRows;
        }

        if (rowsToPush.length === 0) {
          if (initialTablePlan) {
            setTableLastSyncTime('push', table, initialTablePlan.checkpoint, scopeKey);
            highestSuccessTime = Math.max(highestSuccessTime, initialTablePlan.checkpoint);
          }
          console.log(`[Push SKIP] Tabela ${table} ignorada (0 registros > lastPush).`);
          continue;
        }

        console.log(`[Push INICIANDO] Tabela ${table}: ${rowsToPush.length} registros serão enviados.`);

        // #2: Encrypt ALL table documents in parallel (Promise.all)
        const { prepared, skippedLarge } = await prepareRowsForPush(rowsToPush, key, table);

        // Notification for documents skipped due to payload size limits
        for (const msg of skippedLarge) {
          console.warn(msg);
          errors.push(msg);
          tableHadErrors = true;
          pushHadErrors = true;
          if (typeof window !== 'undefined' && window.api?.log) {
            window.api.log(msg);
          }
          // Dispatch event for UI toast notification
          window.dispatchEvent(new CustomEvent('caderno-sync-warning', { 
            detail: { message: msg } 
          }));
        }

        if (prepared.length === 0) continue;

        // Keep logical row batches bounded while the document writer handles large payload parts.
        for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
          const chunk = prepared.slice(i, i + BATCH_SIZE);

          for (const item of chunk) {
            if (typeof window !== 'undefined' && window.api?.log) {
              window.api.log(`[PUSH DOING] Doc ${item.id} (${item.table}). Batching to Firebase...`);
            }
          }

          try {
            const writeResult = await commitPreparedSyncDocuments(chunk, table, scope);
            logFirebaseOp('write', writeResult.writeCount);
            logFirebaseTraffic(0, writeResult.trafficBytes);
            // #6: Advance highestSuccessTime ONLY after successful commit
            for (const item of chunk) {
              pushedCount++;
              if (item.localTime > highestSuccessTime) {
                highestSuccessTime = item.localTime;
              }
              if (item.localTime > tableHighestSuccessTime) {
                tableHighestSuccessTime = item.localTime;
              }
            }
            // Manifest: record highest timestamp for this table
            const chunkHighest = Math.max(...chunk.map(c => c.localTime));
            const currentManifest = manifestUpdate[table];
            const currentManifestTime = currentManifest ? parseDateSafe(currentManifest) : 0;
            if (chunkHighest > currentManifestTime) {
              manifestUpdate[table] = new Date(chunkHighest).toISOString();
            }
          } catch (err: unknown) {
            tableHadErrors = true;
            pushHadErrors = true;
            // If batch fails, record error for each document in chunk
            const errMsg = getErrorMessage(err);
            for (const item of chunk) {
              const msg = `PUSH erro doc ${item.id} (${table}): ${errMsg}`;
              console.warn(msg);
              errors.push(msg);
            }
          }
        }

        if (!tableHadErrors && tableHighestSuccessTime > lastPushTable) {
          setTableLastSyncTime('push', table, tableHighestSuccessTime, scopeKey);
        } else if (tableHadErrors) {
          // Keep the old checkpoint so skipped rows and failed chunks are retried.
          delete manifestUpdate[table];
        }
      } catch (err: unknown) {
        tableHadErrors = true;
        pushHadErrors = true;
        const errMsg = getErrorMessage(err);
        const msg = `PUSH erro tabela ${table}: ${errMsg}`;
        console.error(msg);
        errors.push(msg);
        logSyncEvent('error', `Falha ao enviar para nuvem (${table}): ${errMsg}`);
      }
    }
  }

  if (initialPushPlan && !pushHadErrors) {
    const checkpoint = [...initialPushPlan.values()].reduce(
      (highest, plan) => Math.max(highest, plan.checkpoint),
      highestSuccessTime,
    );
    highestSuccessTime = checkpoint;
    if (checkpoint > getLastSyncTime('push', scopeKey)) {
      setLastSyncTime('push', checkpoint, scopeKey);
    }
  }

  if (errors.length > 0) {
    console.warn(`[Sync] PUSH concluído com ${errors.length} avisos. Primeiro: ${errors[0]}`);
  }

  if (pushedCount > 0) {
    logSyncEvent('push', `Sincronização (Upload) concluída: ${pushedCount} enviados.`);
  }

  if (pushedCount > 0 || errors.length > 0) {
    if (typeof window !== 'undefined' && window.api?.log) {
      window.api.log(`[PUSH] ${pushedCount} enviados, ${errors.length} pulados.`);
    }
    // #6: Update lastPush timestamp strictly from successfully committed docs
    if (highestSuccessTime > getLastSyncTime('push', scopeKey)) {
      setLastSyncTime('push', highestSuccessTime, scopeKey);
    }
    if (pushedCount > 0) {
      try {
        // #7: Include deviceId in signal so listener can ignore self-device signals
        const signalDocRef = getSyncConfigDocument('sync_signal', scope);
        await setDoc(signalDocRef, {
          updatedAt: serverTimestamp(),
          source: navigator.userAgent,
          deviceId: getDeviceId()
        }, { merge: true });
        logFirebaseOp('write', 1);
      } catch (e: unknown) {
        console.warn("Falha ao enviar sinal de sync", getErrorMessage(e));
      }

      // Manifest: update config/sync_manifest with timestamps of changed tables.
      // Pull uses this manifest to skip unchanged tables, saving ~34 reads per cycle.
      // merge: true preserves timestamps of tables pushed by other devices.
      if (Object.keys(manifestUpdate).length > 0) {
        try {
          const manifestDocRef = getSyncConfigDocument('sync_manifest', scope);
          await setDoc(manifestDocRef, manifestUpdate, { merge: true });
          logFirebaseOp('write', 1);
        } catch (e: unknown) {
          console.warn("Falha ao atualizar sync manifest", getErrorMessage(e));
        }
      }
    }
  }

  if (!hasRepushedDeletions && isFullPush && !pushHadErrors && typeof localStorage !== 'undefined') {
    localStorage.setItem(deletionFixKey, 'true');
  }

  if (pushHadErrors) {
    throw new Error(`Cloud push incomplete: ${errors.length} item(s) failed or were skipped.`);
  }
}
