import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { encryptText, decryptText } from './crypto';
import { encryptFile } from './storage';
import { getValidAccessToken, uploadToDrive } from './drive';

function parseDateSafe(dateStr: string | undefined | null | number): number {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') return dateStr;
  let s = dateStr;
  // Convert SQLite CURRENT_TIMESTAMP "YYYY-MM-DD HH:MM:SS" to UTC "YYYY-MM-DDTHH:MM:SSZ"
  if (s.length === 19 && s.charAt(10) === ' ') {
    s = s.replace(' ', 'T') + 'Z';
  } else if (s.length === 19 && s.charAt(10) === 'T' && !s.endsWith('Z')) {
    s = s + 'Z';
  }
  const parsed = new Date(s).getTime();
  if (typeof window !== 'undefined' && (window as any).api?.log) {
    (window as any).api.log(`[parseDateSafe] input: ${dateStr}, output: ${s} -> ${parsed}`);
  }
  return isNaN(parsed) ? 0 : parsed;
}

// TODAS as tabelas do nosso Super App
const SYNC_TABLES = [
  'pages', 
  'transactions', 
  'wishlist', 
  'library_books', 
  'library_highlights', 
  'library_bookmarks', 
  'library_collections',
  'config'
];

/**
 * Puxa todas as tabelas do Firebase, descriptografa e faz o upsert no SQLite local
 * usando a estratégia "Last Write Wins" (A modificação mais recente vence).
 */
export async function pullAllFromCloud(masterKey: CryptoKey): Promise<void> {
  if (!window.api?.sync) {
    console.error("Sync API não exposta no preload.");
    return;
  }

  for (const table of SYNC_TABLES) {
    try {
      const querySnapshot = await getDocs(collection(db, table));
      const localRows = await window.api.sync.getTable(table);
      
      for (const docSnap of querySnapshot.docs) {
        const cloudData = docSnap.data();
        if (!cloudData.encryptedData) continue;
        
        const localRow = localRows.find((r: any) => r.id === docSnap.id);
        
        const cloudTime = parseDateSafe(cloudData.updatedAt || cloudData.createdAt || 0);
        const localTime = localRow ? parseDateSafe(localRow.updated_at || localRow.created_at || 0) : -1;
        
        if (cloudTime !== localTime) {
          try {
            const decryptedJson = await decryptText(cloudData.encryptedData, masterKey);
            const parsed = JSON.parse(decryptedJson);
            const rowToUpsert = {
              id: docSnap.id,
              updated_at: cloudData.updatedAt,
              created_at: cloudData.createdAt,
              ...parsed
            };

            if (typeof window !== 'undefined' && (window as any).api?.log) {
              (window as any).api.log(`[PULL] Doc ${docSnap.id}. localTime=${localTime}, cloudTime=${cloudTime}`);
            }

            // Merge CRDT Yjs se for uma página e ambos tiverem crdt_state
            if (table === 'pages' && localRow?.crdt_state && parsed.crdt_state) {
              try {
                const Y = await import('yjs');
                const { base64ToUint8Array, getYDocStateAsBase64 } = await import('../utils/yjs-utils');
                const ydoc = new Y.Doc();
                Y.applyUpdate(ydoc, base64ToUint8Array(localRow.crdt_state));
                Y.applyUpdate(ydoc, base64ToUint8Array(parsed.crdt_state));
                rowToUpsert.crdt_state = getYDocStateAsBase64(ydoc);
                
                if (typeof window !== 'undefined' && (window as any).api?.log) {
                  (window as any).api.log(`[PULL MERGE] Doc ${docSnap.id} merged CRDT.`);
                }
                
                // Se o nosso local era mais novo, preservamos a data local 
                // para garantir que o pushAllToCloud envie esse novo merge para a nuvem!
                // Além disso, preservamos os campos LWW (Last Write Wins) que não são CRDT!
                if (localTime > cloudTime) {
                  rowToUpsert.updated_at = localRow.updated_at;
                  if (rowToUpsert.title !== undefined) rowToUpsert.title = localRow.title;
                  if (rowToUpsert.icon !== undefined) rowToUpsert.icon = localRow.icon;
                  if (rowToUpsert.parent_id !== undefined) rowToUpsert.parent_id = localRow.parent_id;
                  if (rowToUpsert.sort_order !== undefined) rowToUpsert.sort_order = localRow.sort_order;
                  if (localRow.deleted_at !== undefined) rowToUpsert.deleted_at = localRow.deleted_at;
                }
              } catch (crdtErr) {
                console.error("Erro no merge CRDT Yjs:", crdtErr);
              }
            } else if (localTime > cloudTime) {
              // Se não tiver CRDT e o local for mais novo, Last Write Wins!
              // Ignoramos o pull para não sobrescrever nossa edição.
              if (typeof window !== 'undefined' && (window as any).api?.log) {
                (window as any).api.log(`[PULL SKIP] Doc ${docSnap.id} skipped (localTime > cloudTime).`);
              }
              continue;
            }

            await window.api.sync.upsertRow(table, rowToUpsert);
            if (typeof window !== 'undefined' && (window as any).api?.log) {
              (window as any).api.log(`[PULL UPSERT] Doc ${docSnap.id} upserted.`);
            }
          } catch (err: any) {
            const msg = `PULL erro doc ${docSnap.id} (${table}): ${err?.message}`;
            console.error(msg);
            (window.api as any).log?.(msg);
          }
        }
      }
    } catch (err: any) {
      const msg = `PULL erro tabela ${table}: ${err?.message}\nStack: ${err?.stack}`;
      console.error(msg);
      (window.api as any).log?.(msg);
      // Não propaga — continua com a próxima tabela
    }
  }
}

/**
 * Lê todas as tabelas locais, criptografa cada registro individualmente e faz o push
 * para o Firebase, também respeitando o "Last Write Wins".
 * 
 * Otimizações:
 * - Usa getDocs (batch) por tabela em vez de getDoc individual por linha
 * - Registros deletados são sempre enviados (deleção tem prioridade)
 * - Cada setDoc tem try/catch isolado — uma falha não aborta o sync inteiro
 */
export async function pushAllToCloud(masterKey: CryptoKey): Promise<void> {
  if (!window.api?.sync) return;

  for (const table of SYNC_TABLES) {
    try {
      const localRows = await window.api.sync.getTable(table);
      if (localRows.length === 0) continue;

      const cloudSnap = await getDocs(collection(db, table));
      const cloudMap = new Map(cloudSnap.docs.map(d => [d.id, d.data()]));
      
      for (const row of localRows) {
        const localTime = parseDateSafe(row.updated_at || row.created_at || 0);
        const isDeleted = !!row.deleted_at;
        const cloudData = cloudMap.get(row.id);

        if (cloudData) {
          const cloudTime = parseDateSafe(cloudData.updatedAt || cloudData.createdAt || 0);
          
          let forcePushCrdt = false;
          if (table === 'pages' && row.crdt_state) {
            try {
              const decryptedJson = await decryptText(cloudData.encryptedData, masterKey);
              const parsed = JSON.parse(decryptedJson);
              if (parsed.crdt_state && parsed.crdt_state !== row.crdt_state) {
                forcePushCrdt = true;
                if (typeof window !== 'undefined' && (window as any).api?.log) {
                  (window as any).api.log(`[PUSH CRDT DIFF] Doc ${row.id}. Forcing push!`);
                }
              }
            } catch (e) {
              // Ignore decryption error here, let it fail normally
            }
          }

          if (!forcePushCrdt && !isDeleted && localTime <= cloudTime) {
            if (typeof window !== 'undefined' && (window as any).api?.log) {
              (window as any).api.log(`[PUSH SKIP] Doc ${row.id}. localTime=${localTime} <= cloudTime=${cloudTime}`);
            }
            continue;
          }
        }

        try {
          if (typeof window !== 'undefined' && (window as any).api?.log) {
            (window as any).api.log(`[PUSH DOING] Doc ${row.id}. Pushing to Firebase.`);
          }
          const { id, updated_at, created_at, ...sensitiveData } = row;
          const encryptedData = await encryptText(JSON.stringify(sensitiveData), masterKey);
          const docRef = doc(db, table, id);
          await setDoc(docRef, {
            encryptedData,
            updatedAt: updated_at || null,
            createdAt: created_at || null
          }, { merge: true });
        } catch (err: any) {
          const msg = `PUSH erro doc ${row.id} (${table}): ${err?.message}`;
          console.error(msg);
          (window.api as any).log?.(msg);
        }
      }
    } catch (err: any) {
      const msg = `PUSH erro tabela ${table}: ${err?.message}\nStack: ${err?.stack}`;
      console.error(msg);
      (window.api as any).log?.(msg);
      // Não propaga — continua com a próxima tabela
    }
  }
}

/**
 * Verifica se existem PDFs locais (no Desktop) que ainda não foram subidos para
 * o Firebase Storage e faz o upload deles em background.
 */
export async function syncPdfsToCloud(masterKey: CryptoKey): Promise<void> {
  if (!window.api?.library) return;
  
  // Impede que esse robô de upload rode na versão Web!
  // A versão Web não tem acesso aos PDFs no HD local para fazer upload,
  // e tentar ler o arquivo na Web aciona o download da nuvem, gerando erros falsos.
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  if (!isElectron) {
    return;
  }
  
  try {
    const books = await window.api.library.getBooks();
    for (const book of books) {
      // Se não tem drive_file_id (novo no SQLite), precisa subir para o Google Drive
      // (mesmo os livros antigos que já tinham tentado subir pro Firebase)
      if (book.file_path && !book.drive_file_id) {
        console.log(`[Sync] Fazendo upload E2EE de PDF para Google Drive: ${book.title}`);
        
        try {
          const token = await getValidAccessToken();
          if (!token) {
            console.warn('[Sync] Sem token do Google Drive, pulando PDF:', book.title);
            continue;
          }

          const fileData = await window.api.library.getBookFile(book.id);
          if (!fileData) continue;
          
          const buffer = fileData instanceof Uint8Array ? fileData.buffer : fileData;
          
          // Criptografa o PDF inteiro
          const encrypted = await encryptFile(buffer, masterKey);
          
          // Faz o upload pro Google Drive
          const driveFileId = await uploadToDrive(token, `Caderno_${book.id}.enc`, encrypted);
          
          // Atualiza apenas a coluna drive_file_id para não quebrar o arquivo local do Desktop
          await window.api.library.updateBook({
            id: book.id,
            drive_file_id: driveFileId
          });
          
          console.log(`[Sync] PDF subiu com sucesso para o Drive com ID: ${driveFileId}`);
        } catch (err) {
          console.error(`[Sync] Erro ao subir PDF para o Drive: ${book.title}`, err);
        }
      }
    }
  } catch (err) {
    console.error("[Sync] Erro na sincronização de PDFs", err);
  }
}

/**
 * Utilitário para limpar todos os dados da nuvem (Hard Reset).
 * Isso apaga as tabelas no Firestore para que o próximo Push suba uma base limpa.
 */
export async function hardResetCloud(): Promise<void> {
  console.log("Iniciando Hard Reset da nuvem...");
  for (const table of SYNC_TABLES) {
    try {
      const snap = await getDocs(collection(db, table));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, table, d.id));
      }
      console.log(`Tabela ${table} limpa na nuvem.`);
    } catch (err) {
      console.error(`Erro ao limpar tabela ${table}:`, err);
    }
  }
  console.log("Hard Reset concluído! A próxima sincronização enviará apenas os dados válidos atuais do seu Desktop.");
}

// Expor globalmente para facilitar o uso no console
(window as any).hardResetCloud = hardResetCloud;

