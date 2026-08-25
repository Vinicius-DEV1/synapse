import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { MODULE_TABLES } from './sync-utils';
import { decryptCloudDoc, type CloudData } from './sync-decrypt';
import { upsertPage, upsertBook, upsertHighlight, upsertBookmark, getPageById } from '../db';
import type { Page } from '../../types/notes';
import type { LibraryBook } from '../../types/library';

// ⛔ MOBILE IS READ-ONLY FROM FIREBASE'S PERSPECTIVE.
// All writes go only to local SQLite. Pull never mutates Firebase.

let isPulling = false;

export async function pullAllFromCloud(
  moduleKeys: Record<string, string>,
  onProgress?: (msg: string) => void
): Promise<{ pagesCount: number; booksCount: number }> {
  if (isPulling) {
    console.log('[SYNC] ⚠️ Pull já está em andamento, ignorando chamada duplicada.');
    return { pagesCount: 0, booksCount: 0 };
  }

  isPulling = true;
  let pagesCount = 0;
  let booksCount = 0;

  console.log('[SYNC] 📥 Iniciando Pull otimizado do Firebase...');

  try {
    for (const module of Object.keys(MODULE_TABLES)) {
      const key = moduleKeys[module] || moduleKeys['core'];
      if (!key) continue;

      const tables = MODULE_TABLES[module] || [];
      for (const table of tables) {
        try {
          onProgress?.(`Baixando ${table}...`);
          const querySnapshot = await getDocs(collection(db, table));
          
          if (querySnapshot.empty) continue;

          const docsToProcess = querySnapshot.docs.filter((docSnap) => {
            const data = docSnap.data() as CloudData;
            return !!data.encryptedData;
          });

          console.log(`[SYNC] 📄 Tabela '${table}': ${docsToProcess.length} documento(s) recebido(s).`);

          // Process in smooth chunks of 15 to maintain 60 FPS UI responsiveness
          const CHUNK_SIZE = 15;
          for (let i = 0; i < docsToProcess.length; i += CHUNK_SIZE) {
            const chunk = docsToProcess.slice(i, i + CHUNK_SIZE);
            const results = await Promise.all(
              chunk.map((docSnap) => decryptCloudDoc(docSnap, key, moduleKeys))
            );

            for (const result of results) {
              if (result.error || !result.parsed) continue;

              const rowData = {
                id: result.docSnap.id,
                ...result.parsed,
              };

              if (table === 'pages') {
                // Never overwrite a locally-edited page with an older cloud version
                const localPage = await getPageById(rowData.id);
                if (localPage?.updated_at && rowData.updated_at) {
                  const localTime = new Date(localPage.updated_at).getTime();
                  const cloudTime = new Date(rowData.updated_at).getTime();
                  if (localTime > cloudTime) {
                    // Local is newer — skip cloud overwrite
                    pagesCount++;
                    continue;
                  }
                }
                await upsertPage(rowData as Page);
                pagesCount++;
              } else if (table === 'library_books') {
                await upsertBook(rowData as LibraryBook);
                booksCount++;
              } else if (table === 'library_highlights') {
                await upsertHighlight(rowData);
              } else if (table === 'library_bookmarks') {
                await upsertBookmark(rowData);
              }
            }

            // Yield to UI thread between chunks
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          console.log(`[SYNC] ✅ Tabela '${table}': processada com sucesso!`);
        } catch (err: any) {
          console.error(`[SYNC] ❌ Falha na tabela '${table}':`, err?.message || err);
        }
      }
    }

    console.log(`[SYNC] 🎉 Sincronização concluída! Total: ${pagesCount} páginas e ${booksCount} livros salvos.`);
  } finally {
    isPulling = false;
  }

  return { pagesCount, booksCount };
}

export function listenForCloudSyncSignal(onSignal: (deviceId?: string) => void) {
  let isInitial = true;
  const signalRef = doc(db, 'config', 'sync_signal');
  return onSnapshot(signalRef, (docSnap) => {
    // Ignore the initial snapshot fire to prevent duplicate sync on startup
    if (isInitial) {
      isInitial = false;
      return;
    }
    if (docSnap.exists()) {
      const data = docSnap.data() as { deviceId?: string };
      console.log('[SYNC] ⚡ Sinal de sincronização remota recebido de:', data?.deviceId);
      onSignal(data?.deviceId);
    }
  });
}
