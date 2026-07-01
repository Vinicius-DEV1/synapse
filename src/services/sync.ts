import { db } from './firebase';
import { encryptText, decryptText, deriveMasterKey } from './crypto';
import { encryptFile } from './storage';
import { getValidAccessToken, uploadToDrive } from './drive';
import { onSnapshot, serverTimestamp, query, where, collection, doc, setDoc, getDocs, deleteDoc, getDoc } from 'firebase/firestore';

const getLastSyncKey = (type: 'pull' | 'push') => `caderno_last_${type}_time`;

function getLastSyncTime(type: 'pull' | 'push'): number {
  return parseInt(localStorage.getItem(getLastSyncKey(type)) || '0', 10);
}

function setLastSyncTime(type: 'pull' | 'push', time: number) {
  localStorage.setItem(getLastSyncKey(type), time.toString());
}

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

const MODULE_TABLES: Record<string, string[]> = {
  core: ['config'],
  notes: ['pages'],
  finance: ['transactions', 'wishlist'],
  library: [
    'library_books', 
    'library_highlights', 
    'library_bookmarks', 
    'library_collections',
    'library_book_collections',
    'library_reading_sessions'
  ],
  culture: ['items', 'episodes']
};

export async function verifyCloudMasterPassword(password: string): Promise<{ isValid: boolean; isNew: boolean }> {
  try {
    const masterKey = await deriveMasterKey(password);
    
    const docRef = doc(db, 'config', 'auth_validator');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists() || !docSnap.data().encryptedData) {
      // Nuvem 100% virgem
      return { isValid: true, isNew: true };
    }
    
    // Validador existe. Testa estritamente o validador.
    // Qualquer página corrompida na nuvem será ignorada. O validador é a lei.
    try {
      const decryptedJson = await decryptText(docSnap.data().encryptedData, masterKey);
      const parsed = JSON.parse(decryptedJson);
      if (parsed.validator === 'CADERNO_VALIDO') {
        return { isValid: true, isNew: false };
      }
    } catch {
      // Falha ao descriptografar
    }

    return { isValid: false, isNew: false };
  } catch {
    return { isValid: false, isNew: false };
  }
}

export async function initializeCloudValidator(masterKey: CryptoKey): Promise<void> {
  const payload = JSON.stringify({ validator: 'CADERNO_VALIDO' });
  const encryptedData = await encryptText(payload, masterKey);
  await setDoc(doc(db, 'config', 'auth_validator'), {
    encryptedData,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Envia as chaves modulares criptografadas para a nuvem.
 * Permite que a versão Web (ou outros dispositivos) baixem as chaves.
 */
export async function pushModularKeysToCloud(keys: Record<string, string>, masterKey: CryptoKey): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const docRef = doc(db, 'config', 'module_keys');
    const docSnap = await getDoc(docRef);
    
    // TRAVA DE SEGURANÇA ABSOLUTA: Se já existem chaves na nuvem, NUNCA sobrescreve.
    // Isso previne que bugs de novos logins (como o que tivemos) destruam a criptografia.
    if (docSnap.exists() && docSnap.data().encryptedData) {
      console.error("🔒 ALERTA DE SEGURANÇA: Tentativa de sobrescrever chaves de criptografia existentes foi bloqueada.");
      return;
    }

    const payload = JSON.stringify(keys);
    const encryptedData = await encryptText(payload, masterKey);
    await setDoc(docRef, {
      encryptedData,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Erro ao subir chaves modulares", err);
  }
}

/**
 * Baixa as chaves modulares da nuvem.
 */
export async function pullModularKeysFromCloud(masterKey: CryptoKey): Promise<Record<string, string> | null> {
  if (!navigator.onLine) return null;
  try {
    const docSnap = await getDoc(doc(db, 'config', 'module_keys'));
    if (docSnap.exists() && docSnap.data().encryptedData) {
      const decryptedJson = await decryptText(docSnap.data().encryptedData, masterKey);
      return JSON.parse(decryptedJson);
    }
  } catch (err) {
    console.error("Erro ao baixar chaves modulares", err);
  }
  return null;
}

/**
 * Faz o download das atualizações na nuvem (Firebase) para a base local.
 *
 * Arquitetura de Sincronização:
 * 1. Recupera o timestamp do último PULL concluído com sucesso (`caderno_last_pull_time`).
 * 2. Em cada tabela (`SYNC_TABLES`), aplica uma Query no Firestore usando `where('updatedAt', '>', lastPull)`.
 *    - Isso economiza cota de leitura do banco de dados ao buscar estritamente os "Diffs" (registros modificados).
 * 3. Para cada documento baixado, a função descriptografa o conteúdo via E2EE (End-to-End Encryption) usando a `masterKey`.
 * 4. Resolve conflitos locais adotando LWW (Last Write Wins) ou merges baseados em CRDT (Yjs) se for edição colaborativa de páginas.
 * 5. Por fim, executa um UPSERT no IndexedDB / SQLite e atualiza o novo Last Pull Timestamp.
 *
 * @param masterKey - A chave criptográfica derivada da senha do usuário para descriptografia simétrica.
 */
export async function pullAllFromCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.sync) {
    console.error("Sync API não exposta no preload.");
    return;
  }

  const lastPull = getLastSyncTime('pull');
  console.log(`[Sync] PULL Iniciado. (lastPull: ${new Date(lastPull).toISOString()})`);
  let highestCloudTime = lastPull;
  let pulledDocsCount = 0;
  let skippedDocsCount = 0;

  const effectiveModuleKeys = { ...moduleKeys };
  if (effectiveModuleKeys['notes']) {
    effectiveModuleKeys['culture'] = effectiveModuleKeys['notes'];
  }

  for (const module of Object.keys(effectiveModuleKeys)) {
    const key = effectiveModuleKeys[module];
    const tables = MODULE_TABLES[module] || [];
    
    for (const table of tables) {
      try {
        let q = collection(db, table) as any;
      if (lastPull > 0) {
        // Usa a data ISO para filtrar no servidor e não gastar cota do Firebase atoa
        const lastPullIso = new Date(lastPull).toISOString();
        q = query(collection(db, table), where('updatedAt', '>', lastPullIso));
      }
      
      const querySnapshot = await getDocs(q);
      const localRows = await window.api.sync.getTable(table);
      
      const localMap = new Map(localRows.map((r: any) => [r.id, r]));

      for (const docSnap of querySnapshot.docs) {
        const cloudData = docSnap.data();
        if (!cloudData.encryptedData) continue;
        if (docSnap.id === 'auth_validator' || docSnap.id === 'module_keys') continue;
        
        const cloudTime = parseDateSafe(cloudData.updatedAt || cloudData.createdAt || 0);
        if (cloudTime > highestCloudTime) {
          highestCloudTime = cloudTime;
        }

        // Pula se não mudou desde o nosso último pull bem-sucedido, exceto se for o primeiro pull
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
              (window as any).api.log(`[PULL] Doc ${docSnap.id}. localTime=${localTime}, cloudTime=${cloudTime}`);
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
              // Se não tiver CRDT e o local for mais novo, Last Write Wins!
              // Ignoramos o pull para não sobrescrever nossa edição.
              if (parsed.deleted_at && !localRow?.deleted_at) {
                Object.assign(rowToUpsert, localRow);
                rowToUpsert.deleted_at = parsed.deleted_at;
              } else {
                skippedDocsCount++;
                if (typeof window !== 'undefined' && (window as any).api?.log) {
                  (window as any).api.log(`[PULL SKIP] Doc ${docSnap.id} skipped (localTime > cloudTime).`);
                }
                continue;
              }
            }

            try {
              pulledDocsCount++;
              await window.api.sync.upsertRow(table, rowToUpsert);
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
    } catch (err: any) {
      const msg = `PULL erro tabela ${table}: ${err?.message}\nStack: ${err?.stack}`;
      console.error(msg);
      (window.api as any).log?.(msg);
      // Aqui escolhemos continuar o pull das outras tabelas
    }
  }
  }

  // Atualiza o tempo do último pull com sucesso
  if (highestCloudTime > lastPull) {
    setLastSyncTime('pull', highestCloudTime);
  }
  console.log(`[Sync] PULL Concluído. Documentos processados: ${pulledDocsCount}, Ignorados (conflito): ${skippedDocsCount}.`);
}

/**
 * Realiza o upload (Push) inteligente dos dados modificados localmente para a nuvem.
 * 
 * Lógica do Diff Local:
 * 1. Verifica se há conexão com a internet. Se não, aborta lançando um erro legível.
 * 2. Recupera o último Timestamp de PUSH salvo no navegador.
 * 3. Busca todas as linhas da tabela local, filtrando apenas aquelas cujo `updated_at` é mais novo que o último PUSH.
 * 4. Ao invés de sobrescrever o Firestore cegamente, ele baixa metadados mínimos dos documentos alvo para comparar datas (Last Write Wins).
 * 5. Se o dado local for realmente mais novo, criptografa o documento via AES-GCM usando a `masterKey` e sobe para o Firebase (`setDoc`).
 * 
 * @param masterKey - A chave criptográfica para encriptar os dados (E2EE).
 * @throws Dispara um erro se não houver internet ou se houver falha de gravação de lotes.
 */
export async function pushAllToCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.sync) return;
  
  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet para sincronizar.');
  }

  const lastPush = getLastSyncTime('push');
  console.log(`[Sync] PUSH Iniciado. (lastPush: ${new Date(lastPush).toISOString()})`);
  let highestLocalTime = lastPush;
  let pushedCount = 0;
  let pushSkippedCount = 0;
  const errors: string[] = [];

  const effectiveModuleKeys = { ...moduleKeys };
  if (effectiveModuleKeys['notes']) {
    effectiveModuleKeys['culture'] = effectiveModuleKeys['notes'];
  }

  for (const module of Object.keys(effectiveModuleKeys)) {
    const key = effectiveModuleKeys[module];
    const tables = MODULE_TABLES[module] || [];
    
    for (const table of tables) {
      try {
        const localRows = await window.api.sync.getTable(table);
        if (localRows.length === 0) continue;

        // Filtro Diff: Apenas tenta enviar o que foi atualizado após o último push!
        // Se não for o primeiro push, economizamos descriptografia em massa da nuvem.
        const rowsToPush = lastPush > 0 
          ? localRows.filter((r: any) => parseDateSafe(r.updated_at || r.created_at || 0) >= lastPush)
          : localRows;

        if (rowsToPush.length === 0) continue;

      // Precisamos baixar a coleção apenas para garantir que não sobrescrevemos algo muito mais novo
      const cloudSnap = await getDocs(collection(db, table));
      const cloudMap = new Map(cloudSnap.docs.map(d => [d.id, d.data()]));
      
      for (const row of rowsToPush) {
        const localTime = parseDateSafe(row.updated_at || row.created_at || 0);
        if (localTime > highestLocalTime) highestLocalTime = localTime;
        
        const isDeleted = !!row.deleted_at;
        const cloudData = cloudMap.get(row.id);

        if (cloudData) {
          const cloudTime = parseDateSafe(cloudData.updatedAt || cloudData.createdAt || 0);
          
          // ⚡ Comparação pura por timestamp (Last Write Wins)
          if (!isDeleted && localTime <= cloudTime) {
            pushSkippedCount++;
            if (typeof window !== 'undefined' && (window as any).api?.log) {
              (window as any).api.log(`[PUSH SKIP] Doc ${row.id}. localTime=${localTime} <= cloudTime=${cloudTime}`);
            }
            continue;
          }
        }

        try {
          if (typeof window !== 'undefined' && (window as any).api?.log) {
            (window as any).api.log(`[PUSH DOING] Doc ${row.id} (${table}). Pushing to Firebase...`);
          }
          const { id, updated_at, created_at, ...sensitiveData } = row;
          const jsonString = JSON.stringify(sensitiveData);

          // Proteção contra documentos grandes demais (> 900KB após criptografia ≈ ~1MB no Firestore)
          if (jsonString.length > 900_000) {
            const msg = `[PUSH SKIP] Doc ${row.id} (${table}) pulado: conteúdo muito grande (${(jsonString.length / 1024).toFixed(0)}KB). Remova imagens Base64 grandes desta página.`;
            console.warn(msg);
            if (typeof window !== 'undefined' && (window as any).api?.log) {
              (window as any).api.log(msg);
            }
            continue;
          }

          const encryptedData = await encryptText(jsonString, key);
          const docRef = doc(db, table, id);
          await setDoc(docRef, {
            encryptedData,
            updatedAt: updated_at || null,
            createdAt: created_at || null
          }, { merge: true });
          pushedCount++;
        } catch (err: any) {
          const msg = `PUSH erro doc ${row.id} (${table}): ${err?.message}`;
          console.warn(msg);
          errors.push(msg);
        }
      }
    } catch (err: any) {
      const msg = `PUSH erro tabela ${table}: ${err?.message}`;
      console.error(msg);
      errors.push(msg);
    }
    }
  }

  if (errors.length > 0) {
    console.warn(`[Sync] PUSH concluído com ${errors.length} avisos. Primeiro: ${errors[0]}`);
  }

  if (pushedCount > 0 || errors.length > 0) {
    console.log(`[Sync] PUSH finalizou: ${pushedCount} docs enviados, ${errors.length} pulados/errados, ${pushSkippedCount} inalterados.`);
    if (typeof window !== 'undefined' && (window as any).api?.log) {
      (window as any).api.log(`[PUSH] ${pushedCount} enviados, ${errors.length} pulados.`);
    }
    // Atualiza o tempo local mesmo com erros parciais, para não re-tentar docs que já subiram
    if (highestLocalTime > getLastSyncTime('push')) {
      setLastSyncTime('push', highestLocalTime);
    }
    // Sinaliza na nuvem para que outros dispositivos façam pull
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
    console.log(`[Sync] PUSH concluído: Nada novo para enviar. (Ignorados: ${pushSkippedCount})`);
  }
}

/**
 * Inscreve-se para escutar sinais de atualização vindos de OUTROS dispositivos (Real-time).
 * Retorna uma função para cancelar a inscrição.
 */
export function listenForCloudSyncSignal(onSignal: () => void) {
  const signalRef = doc(db, 'config', 'sync_signal');
  return onSnapshot(signalRef, (docSnap) => {
    if (docSnap.exists()) {
      // Sempre que houver uma alteração na nuvem vinda de outro lugar, avisa a UI para rodar o PULL
      onSignal();
    }
  });
}

/**
 * Verifica se existem PDFs locais (no Desktop) que ainda não foram subidos para
 * o Firebase Storage e faz o upload deles em background.
 */
export async function syncPdfsToCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.library) return;
  
  const masterKey = moduleKeys['library'];
  if (!masterKey) return; // Library module not unlocked
  
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
          
          // getBookFile returns base64 string - decode to ArrayBuffer
          let buffer: ArrayBuffer;
          if (typeof fileData === 'string') {
            const binaryString = atob(fileData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            buffer = bytes.buffer;
          } else if (fileData instanceof Uint8Array) {
            buffer = fileData.buffer;
          } else {
            buffer = fileData;
          }
          
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
  const allTables = Object.values(MODULE_TABLES).flat();
  for (const table of allTables) {
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

