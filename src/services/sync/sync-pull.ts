import { db } from '../firebase';
import { decryptText } from '../crypto';
import { onSnapshot, query, where, collection, doc, getDoc, getDocs, limit, startAfter, orderBy } from 'firebase/firestore';
import { MODULE_TABLES, getLastSyncTime, setLastSyncTime, parseDateSafe } from './sync-utils';
import { logFirebaseOp, isEmergencyStopped, logSyncEvent, logFirebaseTraffic } from './sync-monitor';

/** Tamanho do batch de decriptação paralela */
const DECRYPT_BATCH_SIZE = 20;

export async function pullAllFromCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.sync) {
    console.error("Sync API não exposta no preload.");
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

  // #4: Lazy import do Yjs UMA VEZ fora de todos os loops
  let Y: typeof import('yjs') | null = null;
  let yjsUtils: { base64ToUint8Array: (b64: string) => Uint8Array; getYDocStateAsBase64: (doc: any) => string } | null = null;

  // Manifest: ler UMA VEZ para saber quais tabelas têm mudanças desde lastPull.
  // Se não existir ou falhar, queryamos todas as tabelas (fallback seguro).
  let manifest: Record<string, string> | null = null;
  if (lastPull > 0) {
    try {
      const manifestSnap = await getDoc(doc(db, 'config', 'sync_manifest'));
      logFirebaseOp('read', 1);
      if (manifestSnap.exists()) {
        manifest = manifestSnap.data() as Record<string, string>;
      }
    } catch {
      // Manifest read falhou — fallback: query todas as tabelas (sem risco de perda)
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
        // Manifest optimization: pular tabelas sem mudanças desde lastPull.
        // Se a tabela ESTÁ no manifest e seu timestamp <= lastPull, skip.
        // Se a tabela NÃO está no manifest, query normalmente (segurança: pode ter sido
        // pushada por código antigo sem manifest, ou por outro device).
        if (manifest) {
          const tableTimestamp = manifest[table];
          if (tableTimestamp) {
            const tableLastUpdate = parseDateSafe(tableTimestamp);
            if (tableLastUpdate <= lastPull) {
              console.log(`[Pull SKIP] Tabela ${table} ignorada (Sem mudanças no Manifest: ${tableLastUpdate} <= ${lastPull}).`);
              continue; // Nenhuma mudança nesta tabela desde o último pull
            }
          } else if (lastPull > 0) {
            // Se a tabela NÃO está no manifest e não é o primeiro pull, ela não tem dados novos.
            continue;
          }
        }

        let qBase = collection(db, table) as any;
        if (lastPull > 0) {
          const lastPullIso = new Date(lastPull).toISOString();
          qBase = query(collection(db, table), where('updatedAt', '>', lastPullIso), orderBy('updatedAt'));
        }

        let hasMore = true;
        let lastDocSnap: any = null;
        const CHUNK_SIZE = 100;
        
        // #3: Lazy-load do mapa local — será preenchido sob demanda
        let localMap: Map<string, any> | null = null;

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
          querySnapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            chunkBytes += docSnap.id.length + (data.encryptedData?.length || 0) + 150;
          });
          logFirebaseTraffic(chunkBytes, 0);
          
          if (querySnapshot.empty) {
            hasMore = false;
            break;
          }
          
          lastDocSnap = querySnapshot.docs[querySnapshot.docs.length - 1];

          // #3: Buscar apenas os IDs que vieram da nuvem (se o método existir)
          if (!localMap) {
            if (window.api.sync.getRowsByIds) {
              const cloudIds = querySnapshot.docs
                .filter(d => d.data().encryptedData && d.id !== 'auth_validator' && d.id !== 'module_keys')
                .map(d => d.id);
              if (cloudIds.length > 0) {
                const localRows = await window.api.sync.getRowsByIds(table, cloudIds);
                localMap = new Map(localRows.map((r: any) => [r.id, r]));
              } else {
                localMap = new Map();
              }
            } else {
              // Fallback: se getRowsByIds não existe, carrega tabela inteira (compatibilidade)
              const localRows = await window.api.sync.getTable(table);
              localMap = new Map(localRows.map((r: any) => [r.id, r]));
            }
          } else if (window.api.sync.getRowsByIds) {
            // Para chunks subsequentes, buscar apenas novos IDs
            const newIds = querySnapshot.docs
              .filter(d => d.data().encryptedData && d.id !== 'auth_validator' && d.id !== 'module_keys' && !localMap!.has(d.id))
              .map(d => d.id);
            if (newIds.length > 0) {
              const newRows = await window.api.sync.getRowsByIds(table, newIds);
              for (const r of newRows) {
                localMap.set(r.id, r);
              }
            }
          }

          // Filtrar docs válidos para processar
          const docsToProcess = querySnapshot.docs.filter(docSnap => {
            const cloudData = docSnap.data();
            if (!cloudData.encryptedData) return false;
            if (['auth_validator', 'module_keys', 'sync_manifest', 'sync_signal', 'security_lock'].includes(docSnap.id)) return false;
            
            const cloudTime = parseDateSafe(cloudData.updatedAt || cloudData.createdAt || 0);
            if (cloudTime > highestCloudTime) {
              highestCloudTime = cloudTime;
            }
            if (lastPull > 0 && cloudTime <= lastPull) return false;
            
            const localRow = localMap!.get(docSnap.id);
            const localTime = localRow ? parseDateSafe(localRow.updated_at || localRow.created_at || 0) : -1;
            return cloudTime !== localTime;
          });

          // #2: Decriptar em batches paralelos para não bloquear a thread
          for (let i = 0; i < docsToProcess.length; i += DECRYPT_BATCH_SIZE) {
            const batch = docsToProcess.slice(i, i + DECRYPT_BATCH_SIZE);
            
            const decryptedResults = await Promise.all(
              batch.map(async (docSnap) => {
                const cloudData = docSnap.data();
                try {
                  const decryptedJson = await decryptText(cloudData.encryptedData, key);
                  const parsed = JSON.parse(decryptedJson);
                  return { docSnap, cloudData, parsed, error: null };
                } catch (err: any) {
                  return { docSnap, cloudData, parsed: null, error: err };
                }
              })
            );

            // Processar os resultados decriptados
            for (const result of decryptedResults) {
              if (result.error || !result.parsed) {
                const msg = `PULL erro doc ${result.docSnap.id} (${table}): ${result.error?.message}`;
                console.error(msg);
                (window.api as any).log?.(msg);
                continue;
              }

              const { docSnap, cloudData, parsed } = result;
              const cloudTime = parseDateSafe(cloudData.updatedAt || cloudData.createdAt || 0);
              const localRow = localMap!.get(docSnap.id);
              const localTime = localRow ? parseDateSafe(localRow.updated_at || localRow.created_at || 0) : -1;

              const rowToUpsert: any = {
                id: docSnap.id,
                ...parsed
              };
              
              // Normalize Firestore Timestamps to ISO strings for IndexedDB
              const normalizeTime = (t: any) => {
                if (!t) return undefined;
                if (typeof t.toDate === 'function') return t.toDate().toISOString();
                if (t.seconds) return new Date(t.seconds * 1000).toISOString();
                return typeof t === 'string' || typeof t === 'number' ? new Date(t).toISOString() : undefined;
              };
              
              if (cloudData.updatedAt !== undefined) rowToUpsert.updated_at = normalizeTime(cloudData.updatedAt) || cloudData.updatedAt;
              if (cloudData.createdAt !== undefined) rowToUpsert.created_at = normalizeTime(cloudData.createdAt) || cloudData.createdAt;

              if (typeof window !== 'undefined' && window.api?.log) {
                window.api.log(`[PULL] Doc ${docSnap.id}. localTime=${localTime}, cloudTime=${cloudTime}`);
              }

              // CRDT merge para pages (Yjs)
              if (table === 'pages' && localRow?.crdt_state && parsed.crdt_state) {
                try {
                  // #4: Import Yjs uma única vez (lazy, fora do loop)
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
                // Proteção contra race condition: verificar se houve edição local durante o sync
                const freshRow = localMap!.get(docSnap.id);
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
                  // Generic handler: strip any unknown column and retry (up to 5 times)
                  let retryRow = { ...rowToUpsert };
                  let lastErr = upsertErr;
                  for (let attempt = 0; attempt < 5; attempt++) {
                    const colMatch = lastErr?.message?.match(/has no column named (\S+)/);
                    if (colMatch) {
                      delete retryRow[colMatch[1]];
                      try {
                        await window.api.sync.upsertRow(table, retryRow);
                        // Update rowToUpsert to reflect what was actually saved
                        Object.keys(rowToUpsert).forEach(k => { if (!(k in retryRow)) delete rowToUpsert[k]; });
                        lastErr = null;
                        break;
                      } catch (retryErr: any) {
                        lastErr = retryErr;
                      }
                    } else {
                      break;
                    }
                  }
                  if (lastErr) throw lastErr;
                }
                // Atualizar o mapa local com o valor que acabamos de salvar
                localMap!.set(docSnap.id, rowToUpsert);
                
                if (typeof window !== 'undefined' && window.api?.log) {
                  window.api.log(`[PULL UPSERT] Doc ${docSnap.id} upserted.`);
                }
              } catch (upsertErr) {
                console.warn(`PULL erro doc ${docSnap.id} (${table}):`, upsertErr);
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
        logSyncEvent('error', `Falha ao sincronizar ${table}: ${err?.message}`);
      }
    }
  }
  
  // If lastPush is 0 (first sync ever), initialize it to highestCloudTime
  // to avoid immediately pushing back everything we just pulled
  if (getLastSyncTime('push') === 0 && highestCloudTime > 0) {
    console.log(`[PULL] Inicializando lastPush para ${highestCloudTime} após pull inicial para evitar re-push em massa.`);
    setLastSyncTime('push', highestCloudTime);
  }

  if (highestCloudTime > lastPull) {
    console.log(`[PULL] Atualizando lastPull para ${highestCloudTime}`);
    setLastSyncTime('pull', highestCloudTime);
  }

  if (pulledDocsCount > 0 || skippedDocsCount > 0) {
    logSyncEvent('pull', `Sincronização (Download) concluída: ${pulledDocsCount} novos, ${skippedDocsCount} ignorados.`);
  }
}

/**
 * #7: Listener atualizado para passar o deviceId do sinal ao callback.
 * Permite que o chamador ignore sinais do próprio dispositivo.
 */
export function listenForCloudSyncSignal(onSignal: (deviceId?: string) => void) {
  const signalRef = doc(db, 'config', 'sync_signal');
  return onSnapshot(signalRef, (docSnap) => {
    logFirebaseOp('read', 1);
    if (docSnap.exists()) {
      const data = docSnap.data();
      onSignal(data?.deviceId);
    }
  });
}
