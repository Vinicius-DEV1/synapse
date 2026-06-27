import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { uploadEncryptedPdf } from './storage';
import { encryptText, decryptText } from './crypto';

// TODAS as tabelas do nosso Super App
const SYNC_TABLES = [
  'pages', 
  'transactions', 
  'wishlist', 
  'library_books', 
  'library_highlights', 
  'library_bookmarks', 
  'library_collections'
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
    const querySnapshot = await getDocs(collection(db, table));
    const localRows = await window.api.sync.getTable(table);
    
    for (const docSnap of querySnapshot.docs) {
      const cloudData = docSnap.data();
      if (!cloudData.encryptedData) continue;
      
      const localRow = localRows.find((r: any) => r.id === docSnap.id);
      
      const cloudTime = new Date(cloudData.updatedAt || cloudData.createdAt || 0).getTime();
      const localTime = localRow ? new Date(localRow.updated_at || localRow.created_at || 0).getTime() : -1;
      
      // Se a nuvem for mais recente (ou se não existir localmente)
      if (cloudTime > localTime) {
        try {
          const decryptedJson = await decryptText(cloudData.encryptedData, masterKey);
          const parsed = JSON.parse(decryptedJson);
          
          // Remontar a linha com os tempos da nuvem
          const rowToUpsert = {
            id: docSnap.id,
            updated_at: cloudData.updatedAt,
            created_at: cloudData.createdAt,
            ...parsed
          };
          
          await window.api.sync.upsertRow(table, rowToUpsert);
        } catch (err) {
          console.error(`Falha ao descriptografar documento ${docSnap.id} da tabela ${table}`, err);
        }
      }
    }
  }
}

/**
 * Lê todas as tabelas locais, criptografa cada registro individualmente e faz o push
 * para o Firebase, também respeitando o "Last Write Wins".
 */
export async function pushAllToCloud(masterKey: CryptoKey): Promise<void> {
  if (!window.api?.sync) return;

  for (const table of SYNC_TABLES) {
    const localRows = await window.api.sync.getTable(table);
    
    for (const row of localRows) {
      const docRef = doc(db, table, row.id);
      const snap = await getDoc(docRef);
      
      const localTime = new Date(row.updated_at || row.created_at || 0).getTime();
      
      if (snap.exists()) {
        const cloudData = snap.data();
        const cloudTime = new Date(cloudData.updatedAt || cloudData.createdAt || 0).getTime();
        
        // Se a nuvem tem uma versão mais nova ou igual, não enviamos a nossa antiga
        if (localTime <= cloudTime) {
          continue; 
        }
      }
      
      // Separa os metadados (id, tempos) do restante dos dados sensíveis
      const { id, updated_at, created_at, ...sensitiveData } = row;
      
      // Criptografa TODO o conteúdo sensível da linha
      const payloadToEncrypt = JSON.stringify(sensitiveData);
      const encryptedData = await encryptText(payloadToEncrypt, masterKey);
      
      // Sobe pro Firebase mesclando (merge)
      await setDoc(docRef, {
        encryptedData,
        updatedAt: updated_at || null,
        createdAt: created_at || null
      }, { merge: true });
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
      // Se o file_path NÃO contém uma barra ('/'), significa que é um arquivo 
      // local do Desktop (ex: "livro1.pdf") e ainda não está no Storage ("library/livro1.enc")
      if (book.file_path && !book.file_path.includes('/')) {
        console.log(`[Sync] Fazendo upload E2EE de PDF legado: ${book.title}`);
        
        try {
          const fileData = await window.api.library.getBookFile(book.id);
          if (!fileData) continue;
          
          // O IPC do Electron manda Uint8Array, precisamos garantir que seja ArrayBuffer
          const buffer = fileData instanceof Uint8Array ? fileData.buffer : fileData;
          
          // Faz o upload pro Firebase Storage
          const remotePath = await uploadEncryptedPdf(book.id, buffer, masterKey);
          
          // Atualiza o banco local com o novo caminho da nuvem
          await window.api.library.updateBook({
            id: book.id,
            file_path: remotePath
          });
          
          console.log(`[Sync] PDF antigo subiu com sucesso: ${remotePath}`);
        } catch (err) {
          console.error(`[Sync] Erro ao subir PDF legado: ${book.title}`, err);
        }
      }
    }
  } catch (err) {
    console.error("[Sync] Erro na sincronização de PDFs", err);
  }
}
