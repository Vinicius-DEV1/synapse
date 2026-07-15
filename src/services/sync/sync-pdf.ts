import { encryptFile } from '../storage';
import { getValidAccessToken, uploadToDrive } from '../drive';

export async function syncPdfsToCloud(moduleKeys: Record<string, CryptoKey>): Promise<void> {
  if (!window.api?.library) return;
  
  const masterKey = moduleKeys['library'];
  if (!masterKey) return; 
  
  const isDesktopApp = navigator.userAgent.toLowerCase().includes('Desktop');
  if (!isDesktopApp) {
    return;
  }
  
  try {
    const books = await window.api.library.getBooks();
    for (const book of books) {
      if (book.file_path && !book.drive_file_id) {
        console.log(`[Sync] Fazendo upload E2EE de PDF para Google Drive: \${book.title}`);
        
        try {
          const token = await getValidAccessToken();
          if (!token) {
            console.warn('[Sync] Sem token do Google Drive, pulando PDF:', book.title);
            continue;
          }

          const fileData = await window.api.library.getBookFile(book.id);
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
            buffer = fileData.buffer;
          } else {
            buffer = fileData;
          }
          
          const encrypted = await encryptFile(buffer, masterKey);
          
          const driveFileId = await uploadToDrive(token, `Caderno_\${book.id}.enc`, encrypted);
          
          await window.api.library.updateBook({
            id: book.id,
            drive_file_id: driveFileId
          });
          
          console.log(`[Sync] PDF subiu com sucesso para o Drive com ID: \${driveFileId}`);
        } catch (err) {
          console.error(`[Sync] Erro ao subir PDF para o Drive: \${book.title}`, err);
        }
      }
    }
  } catch (err) {
    console.error("[Sync] Erro na sincronização de PDFs", err);
  }
}
