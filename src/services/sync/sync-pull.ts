import { db } from '../firebase';
import {
  query,
  where,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  startAfter,
  orderBy,
  deleteDoc,
  type Query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  MODULE_TABLES,
  getLastSyncTime,
  setLastSyncTime,
  parseDateSafe,
  type SyncRow,
} from './sync-utils';
import {
  logFirebaseOp,
  isEmergencyStopped,
  logSyncEvent,
  logFirebaseTraffic,
} from './sync-monitor';
import { decryptCloudBatch, type CloudData } from './sync-decrypt-batch';
import { prepareRowForUpsert, upsertRowWithColumnFallback } from './sync-pull-merge';
import { getErrorMessage } from '../../utils/error';

/** Parallel decryption batch size */
const DECRYPT_BATCH_SIZE = 20;

export async function pullAllFromCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.sync) {
    console.error('Sync API não exposta no preload.');
    return;
  }
  if (isEmergencyStopped()) {
    console.warn('[Sync PULL] Bloqueado por medida de segurança (Emergency Stop).');
    return;
  }

  const lastPull = getLastSyncTime('pull');
  let highestCloudTime = lastPull;
  let pulledDocsCount = 0;
  let skippedDocsCount = 0;

  // Manifest: read once to determine which tables changed since lastPull.
  let manifest: Record<string, string> | null = null;
  if (lastPull > 0) {
    try {
      const manifestSnap = await getDoc(doc(db, 'config', 'sync_manifest'));
      logFirebaseOp('read', 1);
      if (manifestSnap.exists()) {
        manifest = manifestSnap.data() as Record<string, string>;
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
      console.warn(`[Sync PULL] Nenhuma chave encontrada para o módulo ${module}. Pulando...`);
      continue;
    }
    const tables = MODULE_TABLES[module] || [];

    for (const table of tables) {
      try {
        if (manifest) {
          const tableTimestamp = manifest[table];
          if (tableTimestamp) {
            const tableLastUpdate = parseDateSafe(tableTimestamp);
            if (tableLastUpdate <= lastPull) {
              console.log(
                `[Pull SKIP] Tabela ${table} ignorada (Sem mudanças no Manifest: ${tableLastUpdate} <= ${lastPull}).`
              );
              continue;
            }
          }
        }

        let qBase: Query<DocumentData> = collection(db, table);
        if (lastPull > 0) {
          const lastPullIso = new Date(lastPull).toISOString();
          qBase = query(
            collection(db, table),
            where('updatedAt', '>', lastPullIso),
            orderBy('updatedAt')
          );
        }

        let hasMore = true;
        let lastDocSnap: QueryDocumentSnapshot<DocumentData> | null = null;
        const CHUNK_SIZE = 100;

        let localMap: Map<string, SyncRow> | null = null;

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
            const data = docSnap.data() as CloudData;
            chunkBytes += docSnap.id.length + (data.encryptedData?.length || 0) + 150;
          });
          logFirebaseTraffic(chunkBytes, 0);

          if (querySnapshot.empty) {
            hasMore = false;
            break;
          }

          lastDocSnap = querySnapshot.docs[querySnapshot.docs.length - 1];

          if (!localMap) {
            if (window.api.sync.getRowsByIds) {
              const cloudIds = querySnapshot.docs
                .filter(
                  (d) =>
                    (d.data() as CloudData).encryptedData &&
                    d.id !== 'auth_validator' &&
                    d.id !== 'module_keys'
                )
                .map((d) => d.id);
              if (cloudIds.length > 0) {
                const localRows = (await window.api.sync.getRowsByIds(
                  table,
                  cloudIds
                )) as SyncRow[];
                localMap = new Map(localRows.map((r) => [r.id, r]));
              } else {
                localMap = new Map();
              }
            } else {
              const localRows = (await window.api.sync.getTable(table)) as SyncRow[];
              localMap = new Map(localRows.map((r) => [r.id, r]));
            }
          } else if (window.api.sync.getRowsByIds) {
            const newIds = querySnapshot.docs
              .filter(
                (d) =>
                  (d.data() as CloudData).encryptedData &&
                  d.id !== 'auth_validator' &&
                  d.id !== 'module_keys' &&
                  !localMap!.has(d.id)
              )
              .map((d) => d.id);
            if (newIds.length > 0) {
              const newRows = (await window.api.sync.getRowsByIds(table, newIds)) as SyncRow[];
              for (const r of newRows) {
                localMap.set(r.id, r);
              }
            }
          }

          const docsToProcess = querySnapshot.docs.filter((docSnap) => {
            const cloudData = docSnap.data() as CloudData;
            if (!cloudData.encryptedData) return false;
            if (
              [
                'auth_validator',
                'module_keys',
                'sync_manifest',
                'sync_signal',
                'security_lock',
              ].includes(docSnap.id)
            )
              return false;

            const cloudTime = parseDateSafe(
              (cloudData.updatedAt || cloudData.createdAt || 0) as string | number
            );
            if (cloudTime > highestCloudTime) {
              highestCloudTime = cloudTime;
            }
            if (lastPull > 0 && cloudTime <= lastPull) return false;

            const localRow = localMap!.get(docSnap.id);
            const localTime = localRow
              ? parseDateSafe(localRow.updated_at || localRow.created_at || 0)
              : -1;
            return cloudTime !== localTime;
          });

          for (let i = 0; i < docsToProcess.length; i += DECRYPT_BATCH_SIZE) {
            const batch = docsToProcess.slice(i, i + DECRYPT_BATCH_SIZE);
            const batchIds = batch.map((d) => d.id);
            const freshRowsList = (await window.api.sync.getRowsByIds(
              table,
              batchIds
            )) as SyncRow[];
            const freshMap = new Map(freshRowsList.map((r) => [r.id, r]));

            const decryptedResults = await decryptCloudBatch(batch, key, moduleKeys);

            for (const result of decryptedResults) {
              if (result.error || !result.parsed) {
                const msg = `PULL erro doc ${result.docSnap.id} (${table}): ${getErrorMessage(result.error)}`;
                console.error(msg);
                window.api?.log?.(msg);
                continue;
              }

              if (result.isLegacy) {
                try {
                  console.log(
                    `[PULL CLEANUP] Deletando documento legado do Firebase: ${result.docSnap.id} (${table})`
                  );
                  await deleteDoc(doc(db, table, result.docSnap.id));
                } catch (delErr) {
                  console.error(
                    `Erro ao deletar documento antigo do Firebase: ${result.docSnap.id}`,
                    delErr
                  );
                }
                skippedDocsCount++;
                continue;
              }

              const localRow = localMap!.get(result.docSnap.id);
              const freshRow = freshMap.get(result.docSnap.id);

              const { rowToUpsert, isSkipped } = await prepareRowForUpsert(
                result,
                table,
                localRow,
                freshRow
              );

              if (isSkipped) {
                skippedDocsCount++;
                continue;
              }

              pulledDocsCount++;
              try {
                await upsertRowWithColumnFallback(table, rowToUpsert);
                localMap!.set(result.docSnap.id, rowToUpsert);
              } catch (upsertErr) {
                console.warn(`PULL erro doc ${result.docSnap.id} (${table}):`, upsertErr);
              }
            }
          }

          if (querySnapshot.docs.length < CHUNK_SIZE) {
            hasMore = false;
          }
        }
      } catch (err: unknown) {
        const msg = `PULL erro tabela ${table}: ${getErrorMessage(err)}`;
        console.error(msg);
        window.api?.log?.(msg);
        logSyncEvent('error', `Falha ao sincronizar ${table}: ${getErrorMessage(err)}`);
      }
    }
  }

  if (getLastSyncTime('push') === 0 && highestCloudTime > 0) {
    setLastSyncTime('push', highestCloudTime);
  }

  if (highestCloudTime > lastPull) {
    setLastSyncTime('pull', highestCloudTime);
  }

  if (pulledDocsCount > 0 || skippedDocsCount > 0) {
    logSyncEvent(
      'pull',
      `Sincronização (Download) concluída: ${pulledDocsCount} novos, ${skippedDocsCount} ignorados.`
    );
  }
}

export { listenForCloudSyncSignal } from './sync-signal';

