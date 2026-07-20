import { db } from '../firebase';
import { decryptText } from '../crypto';
import { onSnapshot, query, where, collection, doc, getDocs, limit, startAfter, orderBy } from 'firebase/firestore';
import { MODULE_TABLES, getLastSyncTime, setLastSyncTime, parseDateSafe } from './sync-utils';

export async function pullAllFromCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.sync) {
    console.error("Sync API não exposta no preload.");
    return;
  }

  const lastPull = getLastSyncTime('pull');
  // console.log(`[Sync] PULL Iniciado. (lastPull: \${new Date(lastPull).toISOString()})`);
  let highestCloudTime = lastPull;
  let pulledDocsCount = 0;
  let skippedDocsCount = 0;

  for (const module of Object.keys(MODULE_TABLES)) {
    const key = moduleKeys[module] || moduleKeys['core'];
    if (!key) {
      console.warn(`[Sync PULL] Nenhuma chave encontrada para o módulo ${module}. Pulando...`);
      continue;
    }
    const tables = MODULE_TABLES[module] || [];
    
    for (const table of tables) {
      try {
        let qBase = collection(db, table) as any;
        if (lastPull > 0) {
          const lastPullIso = new Date(lastPull).toISOString();
          qBase = query(collection(db, table), where('updatedAt', '>', lastPullIso), orderBy('updatedAt'));
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

                if (typeof window !== 'undefined' && window.api?.log) {
                  window.api.log(`[PULL] Doc \${docSnap.id}. localTime=\${localTime}, cloudTime=\${cloudTime}`);
                }

                // We no longer hard-delete locally. We just upsert the document 
                // so that the local DB stores the deleted_at flag (for the Trash feature).
                /*
                if (parsed.deleted_at) {
                  if (typeof window !== 'undefined' && window.api?.log) {
                    window.api.log(`[PULL DELETED] Doc ${docSnap.id} deleted from cloud. Soft deleting locally.`);
                  }
                  // We let the upsertRow below handle it, which will update the local row with deleted_at
                }
                */

                if (table === 'pages' && localRow?.crdt_state && parsed.crdt_state) {
                  try {
                    const Y = await import('yjs');
                    const { base64ToUint8Array, getYDocStateAsBase64 } = await import('../../utils/yjs-utils');
                    const ydoc = new Y.Doc();
                    Y.applyUpdate(ydoc, base64ToUint8Array(localRow.crdt_state));
                    Y.applyUpdate(ydoc, base64ToUint8Array(parsed.crdt_state));
                    const mergedCrdtState = getYDocStateAsBase64(ydoc);
                    rowToUpsert.crdt_state = mergedCrdtState;
                    
                    if (typeof window !== 'undefined') {
                      if (window.api?.log) {
                         window.api.log(`[PULL MERGE] Doc ${docSnap.id} merged CRDT.`);
                      }
                      window.dispatchEvent(new CustomEvent('caderno-sync-update', {
                        detail: { pageId: rowToUpsert.id, crdtState: rowToUpsert.crdt_state }
                      }));
                    }
                    
                    if (localTime > cloudTime) {
                      Object.assign(rowToUpsert, localRow);
                      rowToUpsert.crdt_state = mergedCrdtState;
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
                    if (typeof window !== 'undefined' && window.api?.log) {
                      window.api.log(`[PULL SKIP] Doc ${docSnap.id} skipped (localTime > cloudTime).`);
                    }
                    continue;
                  }
                }

                try {
                  // Proteção contra race condition: usar mapa local atualizado
                  // para verificar se o usuario editou enquanto o sync rodava.
                  // Relemos a tabela inteira UMA VEZ por chunk (fora do loop de docs)
                  // em vez de N vezes (uma por doc) que era o comportamento anterior.
                  const freshRow = localMap.get(docSnap.id);
                  if (freshRow) {
                    const freshTime = parseDateSafe(freshRow.updated_at || freshRow.created_at || 0);
                    if (freshTime > cloudTime) {
                      skippedDocsCount++;
                      continue;
                    }
                  }

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
                  if (typeof window !== 'undefined' && window.api?.log) {
                    window.api.log(`[PULL UPSERT] Doc ${docSnap.id} upserted.`);
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
  // console.log(`[Sync] PULL Concluído. Documentos processados: ${pulledDocsCount}, Ignorados (conflito): ${skippedDocsCount}.`);
}

export function listenForCloudSyncSignal(onSignal: () => void) {
  const signalRef = doc(db, 'config', 'sync_signal');
  return onSnapshot(signalRef, (docSnap) => {
    if (docSnap.exists()) {
      onSignal();
    }
  });
}
