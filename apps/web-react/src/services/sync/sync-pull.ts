import {
  query,
  where,
  getDoc,
  getDocs,
  limit,
  startAfter,
  orderBy,
  type Query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  MODULE_TABLES,
  getLastSyncTime,
  setLastSyncTime,
  getTableLastSyncTime,
  setTableLastSyncTime,
  parseDateSafe,
  getCloudSyncTime,
  decodeSyncDocumentId,
  isStringRecord,
  parseSyncRows,
  type SyncRow,
} from './sync-utils';
import {
  logFirebaseOp,
  isEmergencyStopped,
  logSyncEvent,
  logFirebaseTraffic,
} from './sync-monitor';
import { parseCloudData } from './sync-decrypt-batch';
import { processCloudDocuments } from './sync-pull-documents';
import { InitialSyncPushPlanBuilder, type InitialSyncPushPlan } from './sync-push-plan';
import { getSyncCollection, getSyncConfigDocument, getSyncScopeKey } from './sync-cloud-paths';
import { getErrorMessage } from '../../utils/error';

export async function pullAllFromCloud(
  moduleKeys: Record<string, CryptoKey>,
  workspaceId?: string,
  userId?: string
): Promise<InitialSyncPushPlan | undefined> {
  if (!window.api?.sync) {
    throw new Error('Local sync API is unavailable.');
  }
  if (isEmergencyStopped()) {
    throw new Error('Cloud pull is disabled by the emergency sync stop.');
  }

  const scope = { workspaceId, userId };
  const scopeKey = getSyncScopeKey(scope);
  const lastPull = getLastSyncTime('pull', scopeKey);
  let highestCloudTime = lastPull;
  let pulledDocsCount = 0;
  let skippedDocsCount = 0;
  let pullHadErrors = false;
  const pullErrors: string[] = [];
  const initialPushPlanBuilder = lastPull === 0 && getLastSyncTime('push', scopeKey) === 0
    ? new InitialSyncPushPlanBuilder()
    : undefined;

  // Manifest: read once to determine which tables changed since lastPull.
  let manifest: Record<string, string> | null = null;
  if (lastPull > 0) {
    try {
      const manifestRef = getSyncConfigDocument('sync_manifest', scope);
      const manifestSnap = await getDoc(manifestRef);
      logFirebaseOp('read', 1);
      if (manifestSnap.exists()) {
        const manifestData: unknown = manifestSnap.data();
        manifest = isStringRecord(manifestData) ? manifestData : null;
      }
    } catch (manifestErr: unknown) {
      console.debug(
        '[Sync PULL] Could not read sync_manifest, querying tables normally:',
        getErrorMessage(manifestErr)
      );
    }
  }

  for (const module of Object.keys(MODULE_TABLES)) {
    const key = moduleKeys[module] || moduleKeys['core'];
    if (!key) {
      const message = `[Sync PULL] Nenhuma chave encontrada para o módulo ${module}.`;
      console.warn(`${message} Pulando...`);
      pullErrors.push(message);
      pullHadErrors = true;
      continue;
    }
    const tables = MODULE_TABLES[module] || [];

    for (const table of tables) {
      let tableHadErrors = false;
      try {
        const lastPullTable = getTableLastSyncTime('pull', table, scopeKey);
        let highestTableTime = lastPullTable;

        if (manifest) {
          const tableTimestamp = manifest[table];
          if (tableTimestamp) {
            const tableLastUpdate = parseDateSafe(tableTimestamp);
            // 10s leeway window prevents skipping when devices have slight clock skew
            if (lastPullTable > 0 && tableLastUpdate <= Math.max(0, lastPullTable - 10_000)) {
              console.log(
                `[Pull SKIP] Tabela ${table} ignorada (Sem mudanças no Manifest: ${tableLastUpdate} <= ${lastPullTable}).`
              );
              continue;
            }
          }
        }

        const targetCollection = getSyncCollection(table, scope);

        let qBase: Query<DocumentData> = targetCollection;
        if (lastPullTable > 0) {
          const pullThreshold = Math.max(0, lastPullTable - 10_000);
          const pullThresholdIso = new Date(pullThreshold).toISOString();
          qBase = query(
            targetCollection,
            where('updatedAt', '>', pullThresholdIso),
            orderBy('updatedAt')
          );
        }

        let hasMore = true;
        let lastDocSnap: QueryDocumentSnapshot<DocumentData> | null = null;
        const CHUNK_SIZE = 100;

        const initialLocalRows = initialPushPlanBuilder
          ? parseSyncRows(await window.api.sync.getTable<unknown>(table), table)
          : null;
        let localMap: Map<string, SyncRow> | null = initialLocalRows
          ? new Map(initialLocalRows.map((row) => [row.id, row]))
          : null;

        while (hasMore) {
          let q = qBase;
          if (lastDocSnap) {
            q = query(qBase, startAfter(lastDocSnap), limit(CHUNK_SIZE));
          } else {
            q = query(qBase, limit(CHUNK_SIZE));
          }

          const querySnapshot = await getDocs(q);
          logFirebaseOp('read', querySnapshot.docs.length || 1);

          let chunkBytes = 0;
          querySnapshot.docs.forEach((docSnap) => {
            const data = parseCloudData(docSnap.data());
            chunkBytes += docSnap.id.length + (data.encryptedData?.length || 0) + 150;
          });
          logFirebaseTraffic(chunkBytes, 0);

          if (querySnapshot.empty) {
            hasMore = false;
            break;
          }

          lastDocSnap = querySnapshot.docs[querySnapshot.docs.length - 1];
          const cloudRows = querySnapshot.docs.map((docSnap) => {
            const cloudData = parseCloudData(docSnap.data());
            return {
              id: decodeSyncDocumentId(docSnap.id, cloudData.idEncodingVersion),
              syncTime: getCloudSyncTime(cloudData),
            };
          });
          const cloudRowIds = cloudRows.map((row) => row.id);
          initialPushPlanBuilder?.addCloudRows(table, cloudRows);

          if (!localMap) {
            if (window.api.sync.getRowsByIds) {
              if (cloudRowIds.length > 0) {
                const localRows = parseSyncRows(
                  await window.api.sync.getRowsByIds<unknown>(table, cloudRowIds),
                  table
                );
                localMap = new Map(localRows.map((r) => [r.id, r]));
              } else {
                localMap = new Map();
              }
            } else {
              const localRows = parseSyncRows(await window.api.sync.getTable<unknown>(table), table);
              localMap = new Map(localRows.map((r) => [r.id, r]));
            }
          } else if (!initialPushPlanBuilder && window.api.sync.getRowsByIds) {
            const knownRowsById = localMap;
            if (!knownRowsById) throw new Error(`Could not load local rows for ${table}.`);
            const newIds = cloudRowIds.filter((rowId) => !knownRowsById.has(rowId));
            if (newIds.length > 0) {
              const newRows = parseSyncRows(
                await window.api.sync.getRowsByIds<unknown>(table, newIds),
                table
              );
              for (const r of newRows) {
                knownRowsById.set(r.id, r);
              }
            }
          }

          const localRowsById = localMap;
          if (!localRowsById) throw new Error(`Could not load local rows for ${table}.`);

          const docsToProcess = querySnapshot.docs.filter((docSnap) => {
            const cloudData = parseCloudData(docSnap.data());

            const cloudTime = getCloudSyncTime(cloudData);
            if (cloudTime > highestCloudTime) {
              highestCloudTime = cloudTime;
            }
            if (cloudTime > highestTableTime) {
              highestTableTime = cloudTime;
            }
            if (lastPullTable > 0 && cloudTime <= Math.max(0, lastPullTable - 10_000)) return false;

            const rowId = decodeSyncDocumentId(docSnap.id, cloudData.idEncodingVersion);
            const localRow = localRowsById.get(rowId);
            const localTime = localRow
              ? Math.max(
                  parseDateSafe(localRow.updated_at || localRow.created_at || 0),
                  parseDateSafe(localRow.deleted_at || 0)
                )
              : -1;

            const isCloudDeleted = Boolean(cloudData.deletedAt);
            const isLocalDeleted = Boolean(localRow?.deleted_at);
            if (isCloudDeleted !== isLocalDeleted) return true;

            return cloudTime !== localTime;
          });

          const processedDocuments = await processCloudDocuments(
            docsToProcess,
            table,
            key,
            moduleKeys,
            workspaceId,
            userId,
            localRowsById
          );
          pulledDocsCount += processedDocuments.pulledDocsCount;
          skippedDocsCount += processedDocuments.skippedDocsCount;
          initialPushPlanBuilder?.addPushCandidates(table, processedDocuments.pushCandidateIds);
          if (processedDocuments.errors.length > 0) {
            pullErrors.push(...processedDocuments.errors);
            tableHadErrors = true;
            pullHadErrors = true;
          }

          if (querySnapshot.docs.length < CHUNK_SIZE) {
            hasMore = false;
          }
        }

        const tableCheckpoint = Math.max(highestTableTime, lastPullTable, lastPull);
        if (!tableHadErrors && tableCheckpoint > lastPullTable) {
          setTableLastSyncTime('pull', table, tableCheckpoint, scopeKey);
        }
        if (initialPushPlanBuilder && !tableHadErrors && localMap) {
          const localRows = parseSyncRows(await window.api.sync.getTable<unknown>(table), table);
          initialPushPlanBuilder.completeTable(table, localRows, tableCheckpoint);
        }
      } catch (err: unknown) {
        const msg = `PULL erro tabela ${table}: ${getErrorMessage(err)}`;
        console.error(msg);
        window.api?.log?.(msg);
        logSyncEvent('error', `Falha ao sincronizar ${table}: ${getErrorMessage(err)}`);
        pullErrors.push(msg);
        pullHadErrors = true;
      }
    }
  }

  if (!pullHadErrors && getLastSyncTime('push', scopeKey) === 0 && highestCloudTime > 0) {
    setLastSyncTime('push', highestCloudTime, scopeKey);
  }

  if (!pullHadErrors && highestCloudTime > lastPull) {
    setLastSyncTime('pull', highestCloudTime, scopeKey);
  }

  if (pulledDocsCount > 0 || skippedDocsCount > 0) {
    logSyncEvent(
      'pull',
      `Sincronização (Download) concluída: ${pulledDocsCount} novos, ${skippedDocsCount} ignorados.`
    );
  }

  if (pullHadErrors) {
    throw new Error(
      `Cloud pull incomplete: ${pullErrors.length} item(s) failed. ${pullErrors[0] || ''}`
    );
  }

  return initialPushPlanBuilder?.build();
}

export { listenForCloudSyncSignal } from './sync-signal';

