import { getDecryptedPdf, encryptFileChunked } from '../../services/storage';
import { getValidAccessToken, uploadToDrive } from '../../services/drive';

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
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Erro: Chave Mestra não encontrada. Faça login novamente.", type: "error" } }));
          window.dispatchEvent(new Event('library-upload-end'));
          return reject(new Error("Chave Mestra não encontrada"));
        }
        
        try {
          const importedBooks: any[] = [];
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
            
            const title = file.name.replace(/\.(pdf|epub)$/i, '');
            const book = {
              id: bookId,
              title,
              author: '',
              file_path: remotePath, // remote storage path (null if offline)
              drive_file_id: driveFileId,
              original_name: file.name,
              cover_image: '',
              total_pages: 0,
              last_read_page: 1,
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

          const existing = await db.get('library_books', bookId);
          if (existing) {
            existing.file_path = remotePath;
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
    const existing = await db.get('library_books', id);
    if (existing) {
      await db.delete('library_book_files', id).catch(console.warn);
      existing.is_local = false;
      existing.updated_at = new Date().toISOString();
      await db.put('library_books', existing);
      return true;
    }
    return false;
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
    
    // First check local IndexedDB
    try {
      const localRecord = await db.get('library_book_files', id);
      if (localRecord && localRecord.data) {
        const { decryptFileChunked, decryptFile } = await import('../../services/storage');
        const blob = localRecord.data instanceof Blob ? localRecord.data : new Blob([localRecord.data]);
        
        try {
          const decryptedBlob = await decryptFileChunked(blob, _masterKey);
          return await decryptedBlob.arrayBuffer();
        } catch (err) {
          // Fallback for old unchunked ArrayBuffers
          const decrypted = await decryptFile(await blob.arrayBuffer(), _masterKey);
          return decrypted;
        }
      }
    } catch (e) {
      console.warn("Falha ao ler cache local de PDF", e);
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
        const { encryptFile } = await import('../../services/storage');
        const encrypted = await encryptFile(arrayBuffer, _masterKey);
        await db.put('library_book_files', { id: book.id, data: encrypted });
      } catch (cacheErr) {
        console.warn("Falha ao salvar no cache local", cacheErr);
      }
      
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
  getAllBookCollections: async (): Promise<Record<string, string[]>> => {
    const allBookCols = await db.getAll('library_book_collections') || [];
    const allCols = await db.getAll('library_collections') || [];
    const validColIds = new Set(allCols.filter((c: any) => !c.deleted_at).map((c: any) => c.id));
    
    const map: Record<string, string[]> = {};
    for (const r of allBookCols) {
      if (!r.deleted_at && validColIds.has(r.collection_id)) {
        if (!map[r.book_id]) map[r.book_id] = [];
        map[r.book_id].push(r.collection_id);
      }
    }
    return map;
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
    if (existing) {
      await db.put('library_bookmarks', {
        ...existing,
        ...b,
        updated_at: new Date().toISOString(),
      });
      return 1;
    }
    return 0;
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
  getReadingStats: async (): Promise<{ bookStats?: any; globalStats: any }> => {
    try {
      const books = (await db.getAll('library_books') || []).filter((b: any) => !b.deleted_at);
      const sessions = (await db.getAll('library_reading_sessions') || []).filter((s: any) => !s.deleted_at);

      const totalBooksStarted = books.filter((b: any) => b.reading_status === 'reading').length;
      const totalBooksFinished = books.filter((b: any) => b.reading_status === 'finished').length;

      let totalPagesRead = 0;
      let totalDurationSecs = 0;
      const uniqueDays = new Set<string>();

      for (const s of sessions) {
        if (s.pages_read) totalPagesRead += Number(s.pages_read) || 0;
        if (s.started_at && s.ended_at) {
          const start = new Date(s.started_at).getTime();
          const end = new Date(s.ended_at).getTime();
          const dur = (end - start) / 1000;
          if (dur > 0) {
            totalDurationSecs += Math.min(dur, 28800);
          }
        }
        if (s.started_at) {
          try {
            const day = new Date(s.started_at).toISOString().split('T')[0];
            uniqueDays.add(day);
          } catch {}
        }
      }

      const readingDays = Array.from(uniqueDays).sort();

      let longestStreak = 0;
      let currentStreak = 0;

      if (readingDays.length > 0) {
        let tempStreak = 0;
        let prevDate: Date | null = null;

        for (const dStr of readingDays) {
          const currDate = new Date(dStr + 'T00:00:00Z');
          if (prevDate) {
            const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              tempStreak += 1;
            } else if (diffDays > 1) {
              tempStreak = 1;
            }
          } else {
            tempStreak = 1;
          }
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          prevDate = currDate;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        const lastDay = readingDays[readingDays.length - 1];
        if (lastDay === todayStr || lastDay === yesterdayStr) {
          let cStreak = 1;
          for (let i = readingDays.length - 1; i > 0; i--) {
            const d1 = new Date(readingDays[i] + 'T00:00:00Z').getTime();
            const d0 = new Date(readingDays[i - 1] + 'T00:00:00Z').getTime();
            const diff = Math.round((d1 - d0) / (1000 * 60 * 60 * 24));
            if (diff === 1) cStreak += 1;
            else break;
          }
          currentStreak = cStreak;
        }
      }

      const totalTimeMinutes = Math.round(totalDurationSecs / 60);

      return {
        globalStats: {
          totalBooksStarted,
          totalBooksFinished,
          totalTimeMinutes,
          totalPagesRead,
          currentStreak,
          longestStreak,
          readingDays,
        }
      };
    } catch (err) {
      console.error('Failed to calculate web reading stats', err);
      return {
        globalStats: {
          totalBooksStarted: 0,
          totalBooksFinished: 0,
          totalTimeMinutes: 0,
          totalPagesRead: 0,
          currentStreak: 0,
          longestStreak: 0,
          readingDays: [],
        }
      };
    }
  }
});
