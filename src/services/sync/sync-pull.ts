import { db } from '../firebase';
import { decryptText } from '../crypto';
import { onSnapshot, query, where, collection, doc, getDocs, limit, startAfter } from 'firebase/firestore';
import { MODULE_TABLES, getLastSyncTime, setLastSyncTime, parseDateSafe } from './sync-utils';

export async function pullAllFromCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.sync) {
    console.error("Sync API não exposta no preload.");
    return;
  }

  const lastPull = getLastSyncTime('pull');
  console.log(`[Sync] PULL Iniciado. (lastPull: \${new Date(lastPull).toISOString()})`);
  let highestCloudTime = lastPull;
  let pulledDocsCount = 0;
  let skippedDocsCount = 0;

  const effectiveModuleKeys = { ...moduleKeys };
  if (effectiveModuleKeys['notes']) {
    effectiveModuleKeys['culture'] = effectiveModuleKeys['notes'];
  }
  if (effectiveModuleKeys['core']) {
    effectiveModuleKeys['video'] = effectiveModuleKeys['core'];
  }

  for (const module of Object.keys(effectiveModuleKeys)) {
    const key = effectiveModuleKeys[module];
    const tables = MODULE_TABLES[module] || [];
    
    for (const table of tables) {
      try {
        let qBase = collection(db, table) as any;
        if (lastPull > 0) {
          const lastPullIso = new Date(lastPull).toISOString();
          qBase = query(collection(db, table), where('updatedAt', '>', lastPullIso));
        }

        let hasMore = true;
        let lastDocSnap: any = null;
        const CHUNK_SIZE = 100;
        
        const localRows = await window.api.sync.getTable(table);
        const localMap = new Map(localRows.map((r: any) => [r.id, r]));

        while (hasMore) {
          let q = qBase;
          if (lastDocSnap) {
            q = query(qBase, startAfter(lastDocSnap), limit(CHUNK_SIZE));
          } else {
            q = query(qBase, limit(CHUNK_SIZE));
          }
          
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            hasMore = false;
            break;
          }
          
          lastDocSnap = querySnapshot.docs[querySnapshot.docs.length - 1];

          for (const docSnap of querySnapshot.docs) {
            const cloudData = docSnap.data();
            if (!cloudData.encryptedData) continue;
            if (docSnap.id === 'auth_validator' || docSnap.id === 'module_keys') continue;
            
            const cloudTime = parseDateSafe(cloudData.updatedAt || cloudData.createdAt || 0);
            if (cloudTime > highestCloudTime) {
              highestCloudTime = cloudTime;
            }

            if (lastPull > 0 && cloudTime <= lastPull) {
              continue;
            }
            
            const localRow = localMap.get(docSnap.id);
            const localTime = localRow ? parseDateSafe(localRow.updated_at || localRow.created_at || 0) : -1;
            
            if (cloudTime !== localTime) {
              try {
                const decryptedJson = await decryptText(cloudData.encryptedData, key);
                const parsed = JSON.parse(decryptedJson);
                const rowToUpsert: any = {
                  id: docSnap.id,
                  ...parsed
                };
                if (cloudData.updatedAt !== undefined) rowToUpsert.updated_at = cloudData.updatedAt;
                if (cloudData.createdAt !== undefined) rowToUpsert.created_at = cloudData.createdAt;

                if (typeof window !== 'undefined' && (window as any).api?.log) {
                  (window as any).api.log(`[PULL] Doc \${docSnap.id}. localTime=\${localTime}, cloudTime=\${cloudTime}`);
                }

                if (parsed.deleted_at) {
                  if (typeof window !== 'undefined' && (window as any).api?.log) {
                    (window as any).api.log(`[PULL DELETED] Doc ${docSnap.id} deleted from cloud. Hard deleting locally.`);
                  }
                  if (window.api?.sync?.deleteRow) {
                    await window.api.sync.deleteRow(table, docSnap.id);
                  }
                  continue;
                }

                if (table === 'pages' && localRow?.crdt_state && parsed.crdt_state) {
                  try {
                    const Y = await import('yjs');
                    const { base64ToUint8Array, getYDocStateAsBase64 } = await import('../../utils/yjs-utils');
                    const ydoc = new Y.Doc();
                    Y.applyUpdate(ydoc, base64ToUint8Array(localRow.crdt_state));
                    Y.applyUpdate(ydoc, base64ToUint8Array(parsed.crdt_state));
                    rowToUpsert.crdt_state = getYDocStateAsBase64(ydoc);
                    
                    if (typeof window !== 'undefined' && (window as any).api?.log) {
                      (window as any).api.log(`[PULL MERGE] Doc ${docSnap.id} merged CRDT.`);
                    }
                    
                    if (localTime > cloudTime) {
                      rowToUpsert.updated_at = localRow.updated_at;
                      if (localRow.content !== undefined) rowToUpsert.content = localRow.content;
                      if (rowToUpsert.title !== undefined) rowToUpsert.title = localRow.title;
                      if (rowToUpsert.icon !== undefined) rowToUpsert.icon = localRow.icon;
                      if (rowToUpsert.parent_id !== undefined) rowToUpsert.parent_id = localRow.parent_id;
                      if (rowToUpsert.sort_order !== undefined) rowToUpsert.sort_order = localRow.sort_order;
                    }
                  } catch (crdtErr) {
                    console.error("Erro no merge CRDT Yjs:", crdtErr);
                  }
                } else if (localTime > cloudTime) {
                  if (parsed.deleted_at && !localRow?.deleted_at) {
                    Object.assign(rowToUpsert, localRow);
                    rowToUpsert.deleted_at = parsed.deleted_at;
                  } else {
                    skippedDocsCount++;
                    if (typeof window !== 'undefined' && (window as any).api?.log) {
                      (window as any).api.log(`[PULL SKIP] Doc ${docSnap.id} skipped (localTime > cloudTime).`);
                      (window as any).api.log(`[PULL SKIP] Doc ${docSnap.id} skipped (localTime > cloudTime).`);
                    }
                    continue;
                  }
                }

                try {
                  pulledDocsCount++;
                  try {
                    await window.api.sync.upsertRow(table, rowToUpsert);
                  } catch (upsertErr: any) {
                    if (upsertErr.message && upsertErr.message.includes('has no column named created_at')) {
                      delete rowToUpsert.created_at;
                      await window.api.sync.upsertRow(table, rowToUpsert);
                    } else {
                      throw upsertErr;
                    }
                  }
                  if (typeof window !== 'undefined' && (window as any).api?.log) {
                    (window as any).api.log(`[PULL UPSERT] Doc ${docSnap.id} upserted.`);
                  }
                } catch (upsertErr) {
                  console.warn(`PULL erro doc ${docSnap.id} (${table}):`, upsertErr);
                }
              } catch (err: any) {
                const msg = `PULL erro doc ${docSnap.id} (${table}): ${err?.message}`;
                console.error(msg);
                (window.api as any).log?.(msg);
              }
            }
          }
          
          if (querySnapshot.docs.length < CHUNK_SIZE) {
            hasMore = false;
          }
        }
      } catch (err: any) {
        const msg = `PULL erro tabela ${table}: ${err?.message}\nStack: ${err?.stack}`;
        console.error(msg);
        (window.api as any).log?.(msg);
      }
    }
  }

  if (highestCloudTime > lastPull) {
    setLastSyncTime('pull', highestCloudTime);
  }
  console.log(`[Sync] PULL Concluído. Documentos processados: ${pulledDocsCount}, Ignorados (conflito): ${skippedDocsCount}.`);
}

export function listenForCloudSyncSignal(onSignal: () => void) {
  const signalRef = doc(db, 'config', 'sync_signal');
  return onSnapshot(signalRef, (docSnap) => {
    if (docSnap.exists()) {
      onSignal();
    }
  });
}
