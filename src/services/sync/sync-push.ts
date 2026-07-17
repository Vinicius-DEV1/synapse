import { db } from '../firebase';
import { encryptText } from '../crypto';
import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { MODULE_TABLES, getLastSyncTime, setLastSyncTime, parseDateSafe } from './sync-utils';

export async function pushAllToCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.sync) return;
  
  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet para sincronizar.');
  }

  const lastPush = getLastSyncTime('push');
  // console.log(`[Sync] PUSH Iniciado. (lastPush: \${new Date(lastPush).toISOString()})`);
  let highestLocalTime = lastPush;
  let pushedCount = 0;
  let pushSkippedCount = 0;
  const errors: string[] = [];

  for (const module of Object.keys(MODULE_TABLES)) {
    const key = moduleKeys[module] || moduleKeys['core'];
    if (!key) {
      console.warn(`[Sync PUSH] Nenhuma chave encontrada para o módulo ${module}. Pulando...`);
      continue;
    }
    const tables = MODULE_TABLES[module] || [];
    
    for (const table of tables) {
      try {
        const localRows = await window.api.sync.getTable(table);
        if (localRows.length === 0) continue;

        const rowsToPush = lastPush > 0 
          ? localRows.filter((r: any) => Math.max(parseDateSafe(r.updated_at || r.created_at || 0), parseDateSafe(r.deleted_at || 0)) >= lastPush)
          : localRows;

        if (rowsToPush.length === 0) continue;

        const cloudSnap = await getDocs(collection(db, table));
        const cloudMap = new Map(cloudSnap.docs.map(d => [d.id, d.data()]));
        
        for (const row of rowsToPush) {
          const localTime = Math.max(parseDateSafe(row.updated_at || row.created_at || 0), parseDateSafe(row.deleted_at || 0));
          if (localTime > highestLocalTime) highestLocalTime = localTime;
          
          const isDeleted = !!row.deleted_at;
          const cloudData = cloudMap.get(row.id);

          if (cloudData) {
            const cloudTime = parseDateSafe(cloudData.updatedAt || cloudData.createdAt || 0);
            
            if (!isDeleted && localTime <= cloudTime) {
              pushSkippedCount++;
              if (typeof window !== 'undefined' && (window as any).api?.log) {
                (window as any).api.log(`[PUSH SKIP] Doc \${row.id}. localTime=\${localTime} <= cloudTime=\${cloudTime}`);
              }
              continue;
            }
          }

          try {
            if (typeof window !== 'undefined' && (window as any).api?.log) {
              (window as any).api.log(`[PUSH DOING] Doc \${row.id} (\${table}). Pushing to Firebase...`);
            }
            const { id, updated_at, created_at, ...sensitiveData } = row;
            const jsonString = JSON.stringify(sensitiveData);

            if (jsonString.length > 900_000) {
              const msg = `[PUSH SKIP] Doc \${row.id} (\${table}) pulado: conteúdo muito grande (\${(jsonString.length / 1024).toFixed(0)}KB). Remova imagens Base64 grandes desta página.`;
              console.warn(msg);
              if (typeof window !== 'undefined' && (window as any).api?.log) {
                (window as any).api.log(msg);
              }
              continue;
            }

            const encryptedData = await encryptText(jsonString, key);
            const docRef = doc(db, table, id);
            
            const safeUpdatedAt = row.updated_at ? new Date(parseDateSafe(row.updated_at)).toISOString() : null;
            const safeCreatedAt = row.created_at ? new Date(parseDateSafe(row.created_at)).toISOString() : null;
            
            await setDoc(docRef, {
              encryptedData,
              updatedAt: safeUpdatedAt,
              createdAt: safeCreatedAt
            }, { merge: true });
            pushedCount++;
          } catch (err: any) {
            const msg = `PUSH erro doc \${row.id} (\${table}): \${err?.message}`;
            console.warn(msg);
            errors.push(msg);
          }
        }
      } catch (err: any) {
        const msg = `PUSH erro tabela \${table}: \${err?.message}`;
        console.error(msg);
        errors.push(msg);
      }
    }
  }

  if (errors.length > 0) {
    console.warn(`[Sync] PUSH concluído com \${errors.length} avisos. Primeiro: \${errors[0]}`);
  }

  if (pushedCount > 0 || errors.length > 0) {
    // console.log(`[Sync] PUSH finalizou: \${pushedCount} docs enviados, \${errors.length} pulados/errados, \${pushSkippedCount} inalterados.`);
    if (typeof window !== 'undefined' && (window as any).api?.log) {
      (window as any).api.log(`[PUSH] \${pushedCount} enviados, \${errors.length} pulados.`);
    }
    if (highestLocalTime > getLastSyncTime('push')) {
      setLastSyncTime('push', highestLocalTime);
    }
    if (pushedCount > 0) {
      try {
        await setDoc(doc(db, 'config', 'sync_signal'), {
          updatedAt: serverTimestamp(),
          source: navigator.userAgent
        }, { merge: true });
      } catch (e) {
        console.warn("Falha ao enviar sinal de sync", e);
      }
    }
  } else {
    // console.log(`[Sync] PUSH concluído: Nada novo para enviar. (Ignorados: \${pushSkippedCount})`);
  }
}
