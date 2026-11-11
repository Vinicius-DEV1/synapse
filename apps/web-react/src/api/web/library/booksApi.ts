import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web-schema';
import type { LibraryBook } from '../../../types/library';
import { getValidAccessToken, uploadToDrive } from '../../../services/drive';
import { getDecryptedPdf, encryptFileChunked } from '../../../services/storage';

export const createBooksApi = (
  db: IDBPDatabase<CadernoDBSchema>,
  generateId: () => string,
  getMasterKey: () => CryptoKey | null
) => ({
  getBooks: async (): Promise<LibraryBook[]> => {
    const all = await db.getAll('library_books');
    const filtered = all.filter((b) => !b.deleted_at);
    try {
      const keys = await db.getAllKeys('library_book_files');
      const localKeysSet = new Set(keys.map((k) => String(k)));
      return filtered.map((b) => {
        const cleanId = b.id.replace(/^indexeddb:\/\//, '').replace(/\.(epub|pdf).*$/i, '');
        const hasLocalCache = localKeysSet.has(cleanId);
        return {
          ...b,
          is_local: hasLocalCache || b.is_local || false,
        };
      });
    } catch {
      return filtered;
    }
  },

  getBook: async (id: string): Promise<LibraryBook | null> => {
    const book = await db.get('library_books', id);
    if (!book || book.deleted_at) return null;
    return book;
  },

  importBook: async () => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'application/pdf,application/epub+zip,.pdf,.epub';
      
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        if (!files.length) {
          window.dispatchEvent(new Event('library-upload-end'));
          return resolve(null);
        }
        
        window.dispatchEvent(new Event('library-upload-start'));
        
        const _masterKey = getMasterKey();
        if (!_masterKey) {
          console.warn("[Upload] Chave mestra não encontrada. Upload abortado.");
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Erro: Chave Mestra não encontrada. Faça login novamente.", type: "error" } }));
          window.dispatchEvent(new Event('library-upload-end'));
          return reject(new Error("Chave Mestra não encontrada"));
        }
        
        try {
          const importedBooks: LibraryBook[] = [];
          const total = files.length;
          for (let i = 0; i < total; i++) {
            const file = files[i];
            const bookId = generateId();
            const fileName = file.name;
            
            window.dispatchEvent(new CustomEvent('library-upload-progress', { 
              detail: { filename: fileName, progress: 0, stage: 'encrypting', current: i + 1, total } 
            }));
            
            const encryptedBlob = await encryptFileChunked(file, _masterKey, (p) => {
              window.dispatchEvent(new CustomEvent('library-upload-progress', { 
                detail: { filename: fileName, progress: p, stage: 'encrypting', current: i + 1, total } 
              }));
            });
            
            await db.put('library_book_files', { id: bookId, data: encryptedBlob });
            
            let driveFileId: string | null = null;
            let remotePath: string | null = null;
            try {
              const token = await getValidAccessToken();
              if (token) {
                window.dispatchEvent(new CustomEvent('library-upload-progress', { 
                  detail: { filename: fileName, progress: 0, stage: 'uploading', current: i + 1, total } 
                }));
                driveFileId = await uploadToDrive(token, `Caderno_${bookId}.enc`, encryptedBlob, 'root', (p) => {
                  window.dispatchEvent(new CustomEvent('library-upload-progress', { 
                    detail: { filename: fileName, progress: p, stage: 'uploading', current: i + 1, total } 
                  }));
                });
                remotePath = `drive://${driveFileId}`;
              }
            } catch (e) {
              console.warn('[Library] Drive upload skipped (offline or no auth)', e);
            }
            
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            const format: 'pdf' | 'epub' = (ext === 'epub' || file.type.includes('epub')) ? 'epub' : 'pdf';
            const rawName = file.name.replace(/\.(pdf|epub)$/i, '');
            let title = rawName;
            let author = 'Desconhecido';

            if (rawName.includes(' - ')) {
              const parts = rawName.split(' - ');
              if (parts.length >= 2 && parts[0]?.trim() && parts[1]?.trim()) {
                title = parts[0].trim();
                author = parts[1].trim();
              }
            }

            const book: LibraryBook = {
              id: bookId,
              title,
              author,
              format,
              file_path: remotePath || `indexeddb://${bookId}.${format}`,
              drive_file_id: driveFileId,
              original_name: file.name,
              cover_image: '',
              total_pages: 0,
              last_read_page: format === 'epub' ? '' : 1,
              reading_status: 'not_started',
              last_read_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null,
              is_local: true
            };
            
            await db.put('library_books', book);
            importedBooks.push(book);
          }
          window.dispatchEvent(new Event('library-upload-end'));
          resolve(importedBooks);
        } catch (err) {
          console.error("[Upload] ERRO ao importar arquivo(s):", err);
          window.dispatchEvent(new Event('library-upload-end'));
          reject(err);
        }
      };
      
      input.click();
    });
  },

  deleteBook: async (id: string) => {
    const cleanId = id.replace(/^indexeddb:\/\//, '').replace(/\.(epub|pdf).*$/i, '');
    const existing = await db.get('library_books', cleanId);
    if (existing) {
      await db.delete('library_book_files', cleanId).catch(console.warn);
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('library_books', existing);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app-sync-trigger-immediate'));
      }
      return true;
    }
    return false;
  },

  reattachBookFile: async (bookId: string) => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = false;
      input.accept = 'application/pdf,application/epub+zip,.pdf,.epub';
      
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return resolve(null);
        
        const _masterKey = getMasterKey();
        if (!_masterKey) {
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Erro: Chave Mestra não encontrada. Faça login novamente.", type: "error" } }));
          return reject(new Error("Chave Mestra não encontrada"));
        }
        
        try {
          window.dispatchEvent(new CustomEvent('library-upload-progress', { 
            detail: { filename: file.name, progress: 0, stage: 'encrypting' } 
          }));
          const encryptedBlob = await encryptFileChunked(file, _masterKey, (p) => {
            window.dispatchEvent(new CustomEvent('library-upload-progress', { 
              detail: { filename: file.name, progress: p, stage: 'encrypting' } 
            }));
          });
          await db.put('library_book_files', { id: bookId, data: encryptedBlob });
          
          let driveFileId: string | null = null;
          let remotePath: string | null = null;
          try {
            const token = await getValidAccessToken();
            if (token) {
              window.dispatchEvent(new CustomEvent('library-upload-progress', { 
                detail: { filename: file.name, progress: 0, stage: 'uploading' } 
              }));
              driveFileId = await uploadToDrive(token, `Caderno_${bookId}.enc`, encryptedBlob, 'root', (p) => {
                window.dispatchEvent(new CustomEvent('library-upload-progress', { 
                  detail: { filename: file.name, progress: p, stage: 'uploading' } 
                }));
              });
              remotePath = `drive://${driveFileId}`;
            }
          } catch (e) {
            console.warn('[Library] Drive upload skipped for reattach (offline or no auth)', e);
          }

          const cleanBookId = bookId.replace(/^indexeddb:\/\//, '').replace(/\.(epub|pdf).*$/i, '');
          const existing = await db.get('library_books', cleanBookId);
          if (existing) {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            const format: 'pdf' | 'epub' = (ext === 'epub' || file.type.includes('epub')) ? 'epub' : 'pdf';
            existing.format = format;
            existing.file_path = remotePath || `indexeddb://${cleanBookId}.${format}`;
            existing.drive_file_id = driveFileId;
            existing.original_name = file.name;
            existing.updated_at = new Date().toISOString();
            existing.is_local = true;
            await db.put('library_books', existing);
          }
          window.dispatchEvent(new Event('library-upload-end'));
          resolve(remotePath);
        } catch (err) {
          console.error("Erro ao reanexar arquivo:", err);
          window.dispatchEvent(new Event('library-upload-end'));
          reject(err);
        }
      };
      
      input.click();
    });
  },

  evictBookLocalCache: async (id: string) => {
    const cleanId = id.replace(/^indexeddb:\/\//, '').replace(/\.(epub|pdf).*$/i, '');
    const existing = await db.get('library_books', cleanId);
    if (existing) {
      await db.delete('library_book_files', cleanId).catch(console.warn);
      existing.is_local = false;
      if (existing.file_path && !existing.file_path.startsWith('drive://')) {
        existing.file_path = existing.drive_file_id ? `drive://${existing.drive_file_id}` : '';
      }
      existing.updated_at = new Date().toISOString();
      await db.put('library_books', existing);
      return true;
    }
    return false;
  },

  updateBook: async (book: Partial<LibraryBook> & { id: string }): Promise<number> => {
    const cleanId = book.id.replace(/^indexeddb:\/\//, '').replace(/\.(epub|pdf).*$/i, '');
    const existing = await db.get('library_books', cleanId);
    if (!existing) return 0;
    await db.put('library_books', { ...existing, ...book, id: cleanId, updated_at: new Date().toISOString() });
    return 1;
  },

  getBookFile: async (id: string) => {
    const cleanId = id.replace(/^indexeddb:\/\//, '').replace(/\.(epub|pdf).*$/i, '');
    const book = await db.get('library_books', cleanId);
    if (!book || book.deleted_at) return null;
    const _masterKey = getMasterKey();
    if (!_masterKey) throw new Error("Chave Mestra não encontrada");
    
    // First check local IndexedDB
    try {
      const localRecord = await db.get('library_book_files', cleanId);
      if (localRecord && localRecord.data) {
        const { decryptFileChunked, decryptFile } = await import('../../../services/storage');
        const blob = localRecord.data instanceof Blob ? localRecord.data : new Blob([localRecord.data]);
        
        try {
          const decryptedBlob = await decryptFileChunked(blob, _masterKey);
          return await decryptedBlob.arrayBuffer();
        } catch {
          // Fallback for old unchunked ArrayBuffers
          const decrypted = await decryptFile(await blob.arrayBuffer(), _masterKey);
          return decrypted;
        }
      }
    } catch (e) {
      console.warn("Falha ao ler cache local de PDF/EPUB", e);
    }
    
    // Fallback to remote
    const remotePath = book.file_path?.startsWith('drive://') 
      ? book.file_path 
      : (book.drive_file_id ? `drive://${book.drive_file_id}` : null);

    if (!remotePath) return null;

    try {
      const arrayBuffer = await getDecryptedPdf(remotePath, _masterKey);
      
      // Cache it locally for next time
      try {
        const { encryptFile } = await import('../../../services/storage');
        const encrypted = await encryptFile(arrayBuffer, _masterKey);
        await db.put('library_book_files', { id: cleanId, data: encrypted });
        book.is_local = true;
        book.updated_at = new Date().toISOString();
        await db.put('library_books', book);
      } catch (cacheErr) {
        console.warn("Falha ao salvar no cache local", cacheErr);
      }
      
      return arrayBuffer;
    } catch (e) {
      console.error("Falha ao baixar do drive/storage", e);
      return null;
    }
  }
});
