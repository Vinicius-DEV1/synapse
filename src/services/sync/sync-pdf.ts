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
    const pendingBooks = books.filter(b => !b.drive_file_id);
    if (pendingBooks.length === 0) return;

    window.dispatchEvent(new Event('library-upload-start'));
    try {
      const total = pendingBooks.length;
      for (let i = 0; i < total; i++) {
        const book = pendingBooks[i];
        const bookName = book.title || book.original_name || 'Livro';
        console.log(`[Sync] (${i + 1}/${total}) Fazendo upload E2EE de livro para Google Drive: ${bookName}`);
        
        try {
          const token = await getValidAccessToken();
          if (!token) {
            console.warn('[Sync] Sem token do Google Drive, pulando livro:', bookName);
            continue;
          }

          const fileData = await window.api.library.getBookFile(book.id) as BookFileData;
          if (!fileData) continue;
          
          window.dispatchEvent(new CustomEvent('library-upload-progress', { 
            detail: { filename: bookName, progress: 0, stage: 'encrypting', current: i + 1, total } 
          }));

          let buffer: ArrayBuffer;
          if (typeof fileData === 'string') {
            const binaryString = atob(fileData);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
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
          
          let uploadPayload: Blob;
          if (isEnc1) {
            uploadPayload = new Blob([buffer], { type: 'application/octet-stream' });
          } else {
            const encBuffer = await encryptFile(buffer, masterKey);
            uploadPayload = new Blob([encBuffer], { type: 'application/octet-stream' });
          }
          
          window.dispatchEvent(new CustomEvent('library-upload-progress', { 
            detail: { filename: bookName, progress: 0, stage: 'uploading', current: i + 1, total } 
          }));
          
          const driveFileId = await uploadToDrive(token, `Caderno_${book.id}.enc`, uploadPayload, 'root', (percent) => {
            window.dispatchEvent(new CustomEvent('library-upload-progress', { 
              detail: { filename: bookName, progress: percent, stage: 'uploading', current: i + 1, total } 
            }));
          });
          
          await window.api.library.updateBook({
            ...book,
            drive_file_id: driveFileId,
            updated_at: new Date().toISOString()
          } as any);
          
          console.log(`[Sync] Livro sincronizado com sucesso no Google Drive: ${bookName} (ID: ${driveFileId})`);
        } catch (err) {
          console.error(`[Sync] Erro ao sincronizar livro para o Drive: ${bookName}`, err);
        }
      }
    } finally {
      window.dispatchEvent(new Event('library-upload-end'));
    }
  } catch (err) {
    console.error("[Sync] Erro na sincronização de livros para a nuvem", err);
  }
}
