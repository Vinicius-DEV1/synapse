import { encryptFile } from '../storage';
import { getValidAccessToken, uploadToDrive } from '../drive';
import { platform } from '../platform';

type BookFileData = string | ArrayBuffer | Uint8Array | null;

export async function syncPdfsToCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.library) return;
  
  const masterKey = moduleKeys['library'];
  if (!masterKey) return; 
  
  // Runs only in Desktop environment (with local filesystem access)
  if (!platform.canReadLocalFilesystem) {
    return;
  }
  
  try {
    const books = await window.api.library.getBooks();
    for (const book of books) {
      if (!book.drive_file_id) {
        console.log(`[Sync] Fazendo upload E2EE de livro para Google Drive: ${book.title}`);
        
        try {
          const token = await getValidAccessToken();
          if (!token) {
            console.warn('[Sync] Sem token do Google Drive, pulando livro:', book.title);
            continue;
          }

          const fileData = await window.api.library.getBookFile(book.id) as BookFileData;
          if (!fileData) continue;
          
          let buffer: ArrayBuffer;
          if (typeof fileData === 'string') {
            const binaryString = atob(fileData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            buffer = bytes.buffer;
          } else if (fileData instanceof Uint8Array) {
            const tempArray = new Uint8Array(fileData);
            buffer = tempArray.buffer;
          } else {
            const tempArray = new Uint8Array(fileData);
            buffer = tempArray.buffer;
          }

          const view = new Uint8Array(buffer);
          // Check if already in ENC1 format or already encrypted
          const isEnc1 = view.length > 4 && view[0] === 0x45 && view[1] === 0x4E && view[2] === 0x43 && view[3] === 0x31;
          
          let uploadPayload: ArrayBuffer;
          if (isEnc1) {
            uploadPayload = buffer;
          } else {
            uploadPayload = await encryptFile(buffer, masterKey);
          }
          
          const driveFileId = await uploadToDrive(token, `Caderno_${book.id}.enc`, uploadPayload);
          
          await window.api.library.updateBook({
            ...book,
            drive_file_id: driveFileId,
            updated_at: new Date().toISOString()
          } as any);
          
          console.log(`[Sync] Livro sincronizado com sucesso no Google Drive: ${book.title} (ID: ${driveFileId})`);
        } catch (err) {
          console.error(`[Sync] Erro ao sincronizar livro para o Drive: ${book.title}`, err);
        }
      }
    }
  } catch (err) {
    console.error("[Sync] Erro na sincronização de livros para a nuvem", err);
  }
}
