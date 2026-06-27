import { getWebDb } from './db-web';
import { uploadEncryptedPdf, getDecryptedPdf } from './storage';
import type { Page, Transaction, WishlistItem, LibraryBook, LibraryHighlight, LibraryBookmark, LibraryCollection, OcrCacheEntry, ReadingSession, BookReadingStats, GlobalReadingStats, PageHistoryEntry } from '../types';

// Função auxiliar para gerar IDs
const generateId = () => crypto.randomUUID();

// Variável para guardar a chave mestra no escopo da API Web
let _masterKey: CryptoKey | null = null;

export const createWebApiMock = async () => {
  const db = await getWebDb();

  return {
    // FUNÇÃO EXCLUSIVA DA WEB PARA INJETAR A CHAVE MESTRA
    _setMasterKey: (key: CryptoKey | null) => { _masterKey = key; },

    // --- PAGES ---
    getAllPages: async () => {
      const all = await db.getAll('pages');
      return all.filter(p => !p.deleted_at);
    },
    createPage: async ({ parentId, title, icon }: { parentId: string | null; title?: string; icon?: string }) => {
      const page = {
        id: generateId(),
        title: title || 'Nova Página',
        icon: icon || '📄',
        content: '',
        parent_id: parentId,
        sort_order: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      };
      await db.put('pages', page);
      return page;
    },
    updatePage: async (page: any) => {
      const existing = await db.get('pages', page.id);
      if (!existing) return 0;
      const updated = { ...existing, ...page, updated_at: new Date().toISOString() };
      await db.put('pages', updated);
      return 1;
    },
    deletePage: async (id: string) => {
      const existing = await db.get('pages', id);
      if (!existing) return false;
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('pages', existing);
      return true;
    },
    reorderPages: async (updates: any[]) => {
      const tx = db.transaction('pages', 'readwrite');
      for (const update of updates) {
        const existing = await tx.store.get(update.id);
        if (existing) {
          existing.sort_order = update.sort_order;
          existing.updated_at = new Date().toISOString();
          await tx.store.put(existing);
        }
      }
      await tx.done;
      return true;
    },
    getPageHistory: async () => [],
    exportBackup: async () => ({ success: false, error: "Backup não suportado na versão Web" }),

    // --- AUTH ---
    auth: {
      status: async () => {
        const config = await db.get('config', 'masterHash');
        if (!config) return { status: 'new' };
        return { status: 'encrypted' };
      },
      login: async (password: string) => {
        // No web, we don't have SQLCipher to "open" the DB. 
        // We just return success because the MasterKey is generated in App.tsx (crypto.ts).
        // The real security is that the Cloud sync will fail if the key is wrong!
        return { success: true };
      },
      setup: async (password: string) => {
        await db.put('config', { id: 'masterHash', value: 'setup-done' });
        return { success: true };
      },
      changePassword: async () => ({ success: false, error: "Alteração de senha requer o app Desktop" }),
      onLock: () => () => {},
      lock: async () => {},
      setPreferences: async () => {}
    },

    // --- FINANCE ---
    finance: {
      getTransactions: async () => {
        const all = await db.getAll('transactions');
        return all.filter(t => !t.deleted_at).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },
      createTransaction: async (tx: any) => {
        const transaction = {
          id: generateId(),
          ...tx,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        };
        await db.put('transactions', transaction);
        return transaction;
      },
      deleteTransaction: async (id: string) => {
        const existing = await db.get('transactions', id);
        if (existing) {
          existing.deleted_at = new Date().toISOString();
          existing.updated_at = new Date().toISOString();
          await db.put('transactions', existing);
          return true;
        }
        return false;
      },
      getWishlist: async () => {
        const all = await db.getAll('wishlist');
        return all.filter(w => !w.deleted_at);
      },
      createWishlist: async (item: any) => {
        const wishlist = {
          id: generateId(),
          ...item,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        };
        await db.put('wishlist', wishlist);
        return wishlist;
      },
      deleteWishlist: async (id: string) => {
        const existing = await db.get('wishlist', id);
        if (existing) {
          existing.deleted_at = new Date().toISOString();
          existing.updated_at = new Date().toISOString();
          await db.put('wishlist', existing);
          return true;
        }
        return false;
      }
    },

    // --- LIBRARY ---
    library: {
      getBooks: async () => {
        const all = await db.getAll('library_books');
        return all.filter(b => !b.deleted_at);
      },
      importBook: async () => {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/pdf';
          
          input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return resolve(null);
            
            if (!_masterKey) {
              alert("Erro: Chave Mestra não encontrada. Faça login novamente.");
              return resolve(null);
            }
            
            try {
              const arrayBuffer = await file.arrayBuffer();
              const bookId = generateId();
              
              // 1. Upload E2EE para o Firebase Storage
              console.log("Iniciando upload E2EE do PDF...");
              const remotePath = await uploadEncryptedPdf(bookId, arrayBuffer, _masterKey);
              console.log("Upload concluído!", remotePath);
              
              // 2. Salva os metadados no IndexedDB
              const title = file.name.replace(/\.pdf$/i, '');
              const book = {
                id: bookId,
                title,
                author: '',
                file_path: remotePath, // Agora salvamos o caminho do Storage, não o local!
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
              resolve(book);
            } catch (err) {
              console.error("Falha ao importar PDF", err);
              resolve(null);
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
      updateBook: async (book: any) => {
        const existing = await db.get('library_books', book.id);
        if (!existing) return 0;
        await db.put('library_books', { ...existing, ...book, updated_at: new Date().toISOString() });
        return 1;
      },
      getBookFile: async (id: string) => {
        if (!_masterKey) {
          alert("Erro: Chave Mestra não encontrada.");
          return null;
        }
        
        const existing = await db.get('library_books', id);
        if (existing && existing.file_path) {
          console.log("Baixando PDF criptografado do Firebase Storage...", existing.file_path);
          try {
            const decryptedBuffer = await getDecryptedPdf(existing.file_path, _masterKey);
            return decryptedBuffer;
          } catch (err: any) {
            console.error("Erro ao baixar PDF do Storage:", err);
            // Removidos os alerts intrusivos. A UI (PdfReader) vai mostrar a tela de erro vermelha com a documentação do case.
            return null;
          }
        }
        return null;
      },
      getCollections: async () => await db.getAll('library_collections'),
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
        await db.delete('library_collections', id);
        return true;
      },
      setBookCollections: async () => true, // Simplificado para Web por enquanto
      getBookCollections: async () => [],
      
      getHighlights: async (bookId: string) => {
        const all = await db.getAllFromIndex('library_highlights', 'book_id', bookId);
        return all.filter(h => !h.deleted_at);
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
        return all.filter(b => !b.deleted_at);
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
    },

    // --- SYNC ENGINE ---
    sync: {
      getTable: async (tableName: string) => {
        if (!db.objectStoreNames.contains(tableName as any)) return [];
        return await db.getAll(tableName as any);
      },
      upsertRow: async (tableName: string, row: any) => {
        if (db.objectStoreNames.contains(tableName as any)) {
          await db.put(tableName as any, row);
        }
        return { success: true };
      }
    }
  };
};
