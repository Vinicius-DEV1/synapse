import { db } from '../firebase';
import { encryptText } from '../crypto';
import { doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { MODULE_TABLES, getLastSyncTime, setLastSyncTime, parseDateSafe, getDeviceId, type SyncRow } from './sync-utils';
import { logFirebaseOp, isEmergencyStopped, logSyncEvent, logFirebaseTraffic } from './sync-monitor';
import { getErrorMessage } from '../../utils/error';

/** Max Firestore batch size is 500; 400 is used as safety threshold */
const BATCH_SIZE = 400;

/** Individual document payload limit (Firestore doc limit ~1MB) */
const MAX_PAYLOAD_BYTES = 900_000;

interface PreparedDoc {
  id: string;
  encryptedData: string;
  isCompressed?: boolean;
  updatedAt: string | null;
  createdAt: string | null;
  localTime: number;
  table: string;
}

/**
 * Serializes and encrypts a list of database rows in parallel for Cloud Push.
 * Returns ready documents and logs warnings for skipped rows exceeding payload thresholds.
 */
async function prepareRowsForPush(
  rows: SyncRow[],
  key: CryptoKey,
  table: string
): Promise<{ prepared: PreparedDoc[]; skippedLarge: string[] }> {
  const skippedLarge: string[] = [];

  const promises = rows.map(async (row): Promise<PreparedDoc | null> => {
    const { id, updated_at, created_at, deleted_at, ...sensitiveData } = row;
    const docId = String(id);
    const jsonString = JSON.stringify(sensitiveData);

    let payloadString = jsonString;
    let isCompressed = false;

    if (jsonString.length > MAX_PAYLOAD_BYTES) {
      try {
        const stream = new Blob([jsonString]).stream().pipeThrough(new CompressionStream('gzip'));
        const buffer = await new Response(stream).arrayBuffer();
        
        const bytes = new Uint8Array(buffer);
        const CHUNK_SIZE = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = bytes.subarray(i, i + CHUNK_SIZE);
          binary += String.fromCodePoint.apply(null, Array.from(chunk));
        }
        const b64 = btoa(binary);
        
        if (b64.length < MAX_PAYLOAD_BYTES) {
          payloadString = b64;
          isCompressed = true;
          console.log(`[Sync Compress] Doc ${docId} comprimido de ${jsonString.length} para ${b64.length} bytes.`);
        } else {
          const msg = `[PUSH SKIP] Doc ${docId} (${table}) pulado: conteúdo muito grande mesmo após compressão (${(b64.length / 1024).toFixed(0)}KB).`;
          skippedLarge.push(msg);
          return null;
        }
      } catch (err) {
        console.warn(`Erro ao comprimir doc ${docId}`, err);
        const msg = `[PUSH SKIP] Doc ${docId} (${table}) pulado: conteúdo muito grande e falha na compressão.`;
        skippedLarge.push(msg);
        return null;
      }
    }

    const encryptedData = await encryptText(payloadString, key);
    const safeUpdatedAt = updated_at ? new Date(parseDateSafe(updated_at)).toISOString() : null;
    const safeCreatedAt = created_at ? new Date(parseDateSafe(created_at)).toISOString() : null;
    const localTime = Math.max(parseDateSafe(updated_at || created_at || 0), parseDateSafe(deleted_at || 0));

    return { id: docId, encryptedData, isCompressed, updatedAt: safeUpdatedAt, createdAt: safeCreatedAt, localTime, table };
  });

  const results = await Promise.all(promises);
  const prepared = results.filter((r): r is PreparedDoc => r !== null);
  return { prepared, skippedLarge };
}

export async function pushAllToCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.sync) return;
  if (isEmergencyStopped()) {
    console.warn('[Sync PUSH] Bloqueado por medida de segurança (Emergency Stop).');
    return;
  }
  
  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet para sincronizar.');
  }

  const lastPush = getLastSyncTime('push');
  let highestSuccessTime = lastPush; // Only advances timestamp for successful documents
  let pushedCount = 0;
  const errors: string[] = [];
  // Manifest: rastreia o timestamp mais alto de cada tabela que teve push bem-sucedido
  const manifestUpdate: Record<string, string> = {};

  for (const module of Object.keys(MODULE_TABLES)) {
    const key = moduleKeys[module] || moduleKeys['core'];
    if (!key) {
      console.warn(`[Sync PUSH] Nenhuma chave encontrada para o módulo ${module}. Pulando...`);
      continue;
    }
    const tables = MODULE_TABLES[module] || [];
    
    for (const table of tables) {
      try {
        const localRows = (await window.api.sync.getTable(table)) as SyncRow[];
        if (localRows.length === 0) continue;

        const rowsToPush: SyncRow[] = lastPush > 0 
          ? localRows.filter((r: SyncRow) => {
              const rTime = Math.max(parseDateSafe(r.updated_at || r.created_at || 0), parseDateSafe(r.deleted_at || 0));
              const pushIt = rTime > lastPush;
              return pushIt;
            })
          : localRows;

        if (rowsToPush.length === 0) {
          console.log(`[Push SKIP] Tabela ${table} ignorada (0 registros > lastPush).`);
          continue;
        }

        console.log(`[Push INICIANDO] Tabela ${table}: ${rowsToPush.length} registros serão enviados.`);

        // #2: Encrypt ALL table documents in parallel (Promise.all)
        const { prepared, skippedLarge } = await prepareRowsForPush(rowsToPush, key, table);

        // Notification for documents skipped due to payload size limits
        for (const msg of skippedLarge) {
          console.warn(msg);
          if (typeof window !== 'undefined' && window.api?.log) {
            window.api.log(msg);
          }
          // Dispatch event for UI toast notification
          window.dispatchEvent(new CustomEvent('caderno-sync-warning', { 
            detail: { message: msg } 
          }));
        }

        if (prepared.length === 0) continue;

        // #1: WriteBatch - send in chunks of BATCH_SIZE with atomic write
        for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
          const chunk = prepared.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          let chunkBytes = 0;

          for (const item of chunk) {
            if (typeof window !== 'undefined' && window.api?.log) {
              window.api.log(`[PUSH DOING] Doc ${item.id} (${item.table}). Batching to Firebase...`);
            }
            const docRef = doc(db, table, item.id);
            batch.set(docRef, {
              encryptedData: item.encryptedData,
              isCompressed: item.isCompressed || false,
              updatedAt: item.updatedAt,
              createdAt: item.createdAt
            }, { merge: true });
            
            chunkBytes += item.id.length + item.encryptedData.length + 150;
          }

          try {
            await batch.commit();
            logFirebaseOp('write', chunk.length);
            logFirebaseTraffic(0, chunkBytes);
            // #6: Advance highestSuccessTime ONLY after successful commit
            for (const item of chunk) {
              pushedCount++;
              if (item.localTime > highestSuccessTime) {
                highestSuccessTime = item.localTime;
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
            // If batch fails, record error for each document in chunk
            const errMsg = getErrorMessage(err);
            for (const item of chunk) {
              const msg = `PUSH erro doc ${item.id} (${table}): ${errMsg}`;
              console.warn(msg);
              errors.push(msg);
            }
          }
        }
      } catch (err: unknown) {
        const errMsg = getErrorMessage(err);
        const msg = `PUSH erro tabela ${table}: ${errMsg}`;
        console.error(msg);
        errors.push(msg);
        logSyncEvent('error', `Falha ao enviar para nuvem (${table}): ${errMsg}`);
      }
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
    if (highestSuccessTime > getLastSyncTime('push')) {
      setLastSyncTime('push', highestSuccessTime);
    }
    if (pushedCount > 0) {
      try {
        // #7: Include deviceId in signal so listener can ignore self-device signals
        await setDoc(doc(db, 'config', 'sync_signal'), {
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
          await setDoc(doc(db, 'config', 'sync_manifest'), manifestUpdate, { merge: true });
          logFirebaseOp('write', 1);
        } catch (e: unknown) {
          console.warn("Falha ao atualizar sync manifest", getErrorMessage(e));
        }
      }
    }
  }
}
