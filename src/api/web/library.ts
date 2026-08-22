import { uploadEncryptedPdf, getDecryptedPdf } from '../../services/storage';

export const webLibraryApi = (db: any, generateId: () => string, getMasterKey: () => CryptoKey | null) => ({
  getBooks: async () => {
    const all = await db.getAll('library_books');
    return all.filter((b: any) => !b.deleted_at);
  },
  importBook: async () => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'application/pdf,application/epub+zip,.pdf,.epub';
      
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files || []) as File[];
        if (!files.length) {
          window.dispatchEvent(new Event('library-upload-end'));
          return resolve(null);
        }
        
        window.dispatchEvent(new Event('library-upload-start'));
        
        const _masterKey = getMasterKey();
        if (!_masterKey) {
          console.warn("[Upload] Chave mestra não encontrada. Upload abortado.");
          alert("Erro: Chave Mestra não encontrada. Faça login novamente.");
          window.dispatchEvent(new Event('library-upload-end'));
          return reject(new Error("Chave Mestra não encontrada"));
        }
        
        try {
          const importedBooks = [];
          for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const bookId = generateId();
            
            const remotePath = await uploadEncryptedPdf(bookId, arrayBuffer, _masterKey);
            
            const driveFileId = remotePath.replace('drive://', '');
            const title = file.name.replace(/\.(pdf|epub)$/i, '');
            const book = {
              id: bookId,
              title,
              author: '',
              file_path: remotePath, // Agora salvamos o caminho do Storage, não o local!
              drive_file_id: driveFileId,
              original_name: file.name,
              cover_image: '',
              total_pages: 0,
              last_read_page: 1,
              reading_status: 'not_started',
              last_read_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null
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
    const existing = await db.get('library_books', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('library_books', existing);
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
      
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return resolve(null);
        
        const _masterKey = getMasterKey();
        if (!_masterKey) {
          alert("Erro: Chave Mestra não encontrada. Faça login novamente.");
          return reject(new Error("Chave Mestra não encontrada"));
        }
        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const remotePath = await uploadEncryptedPdf(bookId, arrayBuffer, _masterKey);
          const driveFileId = remotePath.replace('drive://', '');
          const existing = await db.get('library_books', bookId);
          if (existing) {
            existing.file_path = remotePath;
            existing.drive_file_id = driveFileId;
            existing.original_name = file.name;
            existing.updated_at = new Date().toISOString();
            await db.put('library_books', existing);
          }
          resolve(remotePath);
        } catch (err) {
          console.error("Erro ao reanexar arquivo:", err);
          reject(err);
        }
      };
      
      input.click();
    });
  },
  updateBook: async (book: any) => {
    const existing = await db.get('library_books', book.id);
    if (!existing) return 0;
    await db.put('library_books', { ...existing, ...book, updated_at: new Date().toISOString() });
    return 1;
  },
  getBookFile: async (id: string) => {
    const book = await db.get('library_books', id);
    if (!book) return null;
    const _masterKey = getMasterKey();
    if (!_masterKey) throw new Error("Chave Mestra não encontrada");
    
    // Determine remote path
    const remotePath = book.file_path?.startsWith('drive://') 
      ? book.file_path 
      : (book.drive_file_id ? `drive://${book.drive_file_id}` : null);

    if (!remotePath) return null;

    try {
      const arrayBuffer = await getDecryptedPdf(remotePath, _masterKey);
      return arrayBuffer;
    } catch (e) {
      console.error("Falha ao baixar do drive/storage", e);
      return null;
    }
  },
  getCollections: async () => {
    const all = await db.getAll('library_collections') || [];
    return all.filter((c: any) => !c.deleted_at);
  },
  createCollection: async (c: any) => {
    const col = { id: generateId(), ...c, created_at: new Date().toISOString() };
    await db.put('library_collections', col);
    return col;
  },
  updateCollection: async (c: any) => {
    const existing = await db.get('library_collections', c.id);
    if (existing) await db.put('library_collections', { ...existing, ...c });
    return 1;
  },
  deleteCollection: async (id: string) => {
    const existing = await db.get('library_collections', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('library_collections', existing);
    }
    return true;
  },
  setBookCollections: async (bookId: string, collectionIds: string[]) => {
    const existing = await db.getAllFromIndex('library_book_collections', 'book_id', bookId);
    
    for (const e of existing) {
      if (!collectionIds.includes(e.collection_id)) {
        if (!e.deleted_at) {
          e.deleted_at = new Date().toISOString();
          e.updated_at = new Date().toISOString();
          await db.put('library_book_collections', e);
        }
      } else {
        if (e.deleted_at) {
            e.deleted_at = null;
            e.updated_at = new Date().toISOString();
            await db.put('library_book_collections', e);
        }
      }
    }
    
    const existingColIds = existing.map((e: any) => e.collection_id);
    const newCols = collectionIds.filter((id: string) => !existingColIds.includes(id));
    for (const colId of newCols) {
      await db.put('library_book_collections', {
        id: generateId(),
        book_id: bookId,
        collection_id: colId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      });
    }
    return true;
  },
  getBookCollections: async (bookId: string) => {
    const bookCols = await db.getAllFromIndex('library_book_collections', 'book_id', bookId);
    const activeCols = bookCols.filter((r: any) => !r.deleted_at).map((r: any) => r.collection_id);
    
    const allCollections = await db.getAll('library_collections');
    return allCollections.filter((c: any) => activeCols.includes(c.id) && !c.deleted_at);
  },
  
  getHighlights: async (bookId: string) => {
    const all = await db.getAllFromIndex('library_highlights', 'book_id', bookId);
    return all.filter((h: any) => !h.deleted_at);
  },
  createHighlight: async (h: any) => {
    const hl = { id: generateId(), ...h, created_at: new Date().toISOString(), deleted_at: null };
    await db.put('library_highlights', hl);
    return hl;
  },
  updateHighlight: async (h: any) => {
    const existing = await db.get('library_highlights', h.id);
    if (existing) await db.put('library_highlights', { ...existing, ...h });
    return 1;
  },
  deleteHighlight: async (id: string) => {
    const existing = await db.get('library_highlights', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('library_highlights', existing);
    }
    return true;
  },
  getBookmarks: async (bookId: string) => {
    const all = await db.getAllFromIndex('library_bookmarks', 'book_id', bookId);
    return all.filter((b: any) => !b.deleted_at);
  },
  createBookmark: async (b: any) => {
    const bm = { id: generateId(), ...b, created_at: new Date().toISOString(), deleted_at: null };
    await db.put('library_bookmarks', bm);
    return bm;
  },
  updateBookmark: async (b: any) => {
    const existing = await db.get('library_bookmarks', b.id);
    if (existing) await db.put('library_bookmarks', { ...existing, ...b });
    return 1;
  },
  deleteBookmark: async (id: string) => {
    const existing = await db.get('library_bookmarks', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('library_bookmarks', existing);
    }
    return true;
  },
  getOcrCache: async () => null,
  saveOcrCache: async () => true,
  startReadingSession: async (data: any) => {
    const session = { id: generateId(), ...data, started_at: new Date().toISOString() };
    await db.put('library_reading_sessions', session);
    return session;
  },
  endReadingSession: async (data: any) => {
    const existing = await db.get('library_reading_sessions', data.id);
    if (existing) {
      await db.put('library_reading_sessions', { ...existing, ...data, ended_at: new Date().toISOString() });
    }
    return true;
  },
  getReadingStats: async () => ({ globalStats: { totalBooksStarted: 0, totalBooksFinished: 0, totalTimeMinutes: 0, totalPagesRead: 0, currentStreak: 0, longestStreak: 0, readingDays: [] } })
});
