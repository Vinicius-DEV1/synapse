import { getWebDb } from './db-web';
import { uploadEncryptedPdf, getDecryptedPdf } from './storage';
import { PayloadOptimizer } from '../utils/PayloadOptimizer';
import { webFinanceApi } from '../api/web/finance';
import { webAuthApi } from '../api/web/auth';

// Função auxiliar para gerar IDs
const generateId = () => crypto.randomUUID();

// Variável para guardar a chave mestra no escopo da API Web
let _masterKey: CryptoKey | null = null;

async function hashLocalPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "caderno-local-auth-salt");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const createWebApiMock = async () => {
  const db = await getWebDb();

  let syncCallbacks: (() => void)[] = [];
  const triggerSync = () => syncCallbacks.forEach(cb => cb());

  const originalPut = db.put.bind(db);
  const originalDelete = db.delete.bind(db);

  db.put = async (storeName: string, val: any, key?: IDBValidKey) => {
    const optimizedVal = PayloadOptimizer.optimize(val);
    const res = await originalPut(storeName, optimizedVal, key);
    if (storeName !== 'config') triggerSync();
    return res;
  };
  
  db.delete = async (storeName: string, key: IDBValidKey | IDBKeyRange) => {
    const res = await originalDelete(storeName, key);
    if (storeName !== 'config') triggerSync();
    return res;
  };

  return {
    // FUNÇÃO EXCLUSIVA DA WEB PARA INJETAR A CHAVE MESTRA
    _setMasterKey: (key: CryptoKey | null) => { _masterKey = key; },
    onSyncTrigger: (callback: () => void) => {
      syncCallbacks.push(callback);
      return () => {
        syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
      };
    },

    // --- CONFIG ---
    config: {
      get: async (key: string) => {
        const item = await db.get('config', key);
        return item ? item.value : null;
      },
      set: async (key: string, data: any) => {
        await db.put('config', { id: key, value: data, updated_at: new Date().toISOString() });
        return { success: true };
      }
    },

    // --- PAGES ---
    getAllPages: async () => {
      const all = await db.getAll('pages');
      return all.filter(p => !p.deleted_at).map(p => {
        const { content, encrypted_content, ...rest } = p;
        return rest;
      });
    },
    getPageContent: async (id: string) => {
      const page = await db.get('pages', id);
      if (!page || page.deleted_at) return { content: '', encrypted_content: null };
      return { content: page.content || '', encrypted_content: page.encrypted_content || null };
    },
    createPage: async ({ parentId, title, icon }: { parentId: string | null; title?: string; icon?: string }) => {
      const page = {
        id: generateId(),
        parent_id: parentId || null,
        title: title || 'Nova Página',
        icon: icon || '📄',
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_locked: 0,
      };
      await db.put('pages', page);
      const { content, encrypted_content, ...rest } = page;
      return rest;
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
    auth: webAuthApi(db),

    // --- FINANCE ---
    finance: webFinanceApi(db, generateId),

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
          input.accept = 'application/pdf,application/epub+zip,.pdf,.epub';
          
          input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) {
              // console.log("[Upload] Nenhum arquivo selecionado.");
              window.dispatchEvent(new Event('library-upload-end'));
              return resolve(null);
            }
            
            // console.log(`[Upload] Arquivo selecionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            window.dispatchEvent(new Event('library-upload-start'));
            
            if (!_masterKey) {
              console.warn("[Upload] Chave mestra não encontrada. Upload abortado.");
              alert("Erro: Chave Mestra não encontrada. Faça login novamente.");
              window.dispatchEvent(new Event('library-upload-end'));
              return reject(new Error("Chave Mestra não encontrada"));
            }
            
            try {
              // console.log("[Upload] Lendo conteúdo do arquivo para a memória...");
              const arrayBuffer = await file.arrayBuffer();
              const bookId = generateId();
              
              // console.log("[Upload] Criptografando e enviando para o Google Drive (E2EE)...");
              const remotePath = await uploadEncryptedPdf(bookId, arrayBuffer, _masterKey);
              // console.log(`[Upload] Sucesso na nuvem! Referência do arquivo: ${remotePath}`);
              
              // 2. Salva os metadados no IndexedDB
              // console.log("[Upload] Salvando metadados no banco local...");
              const title = file.name.replace(/\.(pdf|epub)$/i, '');
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
              // console.log("[Upload] Processo concluído com sucesso!");
              resolve(book);
            } catch (err) {
              console.error("[Upload] ERRO ao importar arquivo:", err);
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
      updateBook: async (book: any) => {
        const existing = await db.get('library_books', book.id);
        if (!existing) return 0;
        await db.put('library_books', { ...existing, ...book, updated_at: new Date().toISOString() });
        return 1;
      },
      getBookFile: async (id: string) => {
        const book = await db.get('library_books', id);
        if (!book || !book.file_path) return null;
        if (!_masterKey) throw new Error("Chave Mestra não encontrada");
        try {
          const arrayBuffer = await getDecryptedPdf(book.file_path, _masterKey);
          return arrayBuffer;
        } catch (e) {
          console.error("Falha ao baixar do drive/storage", e);
          return null;
        }
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
        const newCols = collectionIds.filter(id => !existingColIds.includes(id));
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

    // --- CULTURE ---
    culture: {
      getItems: async () => {
        const all = await db.getAll('items');
        return all.filter(i => !i.deleted_at).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      },
      createItem: async (item: any) => {
        const newItem = {
          id: generateId(),
          ...item,
          progress: item.progress || 0,
          total_progress: item.total_progress || 0,
          is_goal: item.is_goal ? 1 : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        };
        await db.put('items', newItem);
        return newItem;
      },
      updateItem: async (id: string, item: any) => {
        const existing = await db.get('items', id);
        if (!existing) return { success: false, id };
        const updated = {
          ...existing,
          ...item,
          is_goal: item.is_goal !== undefined ? (item.is_goal ? 1 : 0) : existing.is_goal,
          updated_at: new Date().toISOString()
        };
        await db.put('items', updated);
        return { success: true, id };
      },
      updateProgress: async (id: string, progress: number) => {
        const existing = await db.get('items', id);
        if (!existing) return { success: false };
        existing.progress = progress;
        existing.updated_at = new Date().toISOString();
        await db.put('items', existing);
        return { success: true };
      },
      deleteItem: async (id: string) => {
        const existing = await db.get('items', id);
        if (existing) {
          existing.deleted_at = new Date().toISOString();
          existing.updated_at = new Date().toISOString();
          await db.put('items', existing);
        }
        return { success: true };
      },
      getEpisodes: async (itemId: string) => {
        const all = await db.getAllFromIndex('episodes', 'item_id', itemId);
        return all.filter(e => !e.deleted_at).sort((a, b) => a.episode_number - b.episode_number);
      },
      saveEpisodes: async (itemId: string, episodes: any[]) => {
        const existing = await db.getAllFromIndex('episodes', 'item_id', itemId);
        const incomingIds = episodes.map(e => e.id).filter(id => id);
        for (const ep of existing) {
           if (!incomingIds.includes(ep.id) && !ep.deleted_at) {
              ep.deleted_at = new Date().toISOString();
              ep.updated_at = new Date().toISOString();
              await db.put('episodes', ep);
           }
        }
        for (const ep of episodes) {
           const id = ep.id || generateId();
           const epToSave = {
              ...ep,
              id,
              item_id: itemId,
              is_watched: ep.is_watched ? 1 : 0,
              created_at: ep.id ? (ep.created_at || new Date().toISOString()) : new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null
           };
           await db.put('episodes', epToSave);
        }
        return { success: true };
      },
      toggleEpisodeWatched: async (episodeId: string, isWatched: boolean) => {
        const existing = await db.get('episodes', episodeId);
        if (!existing) return { success: false };
        existing.is_watched = isWatched ? 1 : 0;
        existing.updated_at = new Date().toISOString();
        await db.put('episodes', existing);
        return { success: true };
      },
      getRecentReleases: async () => {
        return [];
      }
    },

    // --- FOCUS ---
    focus: {
      getSessions: async () => {
        const all = await db.getAll('focus_sessions') || [];
        return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      },
      createSession: async (session: any) => {
        const id = session.id || generateId();
        const newSession = {
          ...session,
          id,
          created_at: session.created_at || new Date().toISOString()
        };
        await db.put('focus_sessions', newSession);
        return newSession;
      },
      getAlarms: async () => {
        const all = await db.getAll('focus_alarms') || [];
        return all;
      },
      createAlarm: async (alarm: any) => {
        const id = alarm.id || Date.now();
        const newAlarm = { ...alarm, id };
        await db.put('focus_alarms', newAlarm);
        return newAlarm;
      },
      updateAlarm: async (id: number, alarm: any) => {
        const existing = await db.get('focus_alarms', id);
        if (!existing) return null;
        const updated = { ...existing, ...alarm };
        await db.put('focus_alarms', updated);
        return updated;
      },
      deleteAlarm: async (id: number) => {
        await db.delete('focus_alarms', id);
        return true;
      },
      setAppIcon: async () => {
        // App icon does not apply to web
      }
    },

    // --- CALENDAR ---
    calendar: {
      getEvents: async () => {
        const all = await db.getAll('calendar_events') || [];
        return all.filter(e => !e.deleted_at);
      },
      createEvent: async (event: any) => {
        const newEvent = {
          ...event,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        };
        await db.put('calendar_events', newEvent);
        return newEvent;
      },
      updateEvent: async (id: string, event: any) => {
        const existing = await db.get('calendar_events', id);
        if (!existing) return { success: false };
        const updated = { ...existing, ...event, updated_at: new Date().toISOString() };
        await db.put('calendar_events', updated);
        return { success: true };
      },
      deleteEvent: async (id: string) => {
        const existing = await db.get('calendar_events', id);
        if (existing) {
          existing.deleted_at = new Date().toISOString();
          existing.updated_at = new Date().toISOString();
          await db.put('calendar_events', existing);
          return true;
        }
        return false;
      }
    },

    // --- VAULT ---
    vault: {
      getGroups: async () => {
        const all = await db.getAll('vault_groups') || [];
        return all.filter(g => !g.deleted_at).sort((a, b) => a.position - b.position);
      },
      upsertGroup: async (group: any) => {
        const id = group.id || generateId();
        const newGroup = {
          ...group,
          id,
          created_at: group.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        };
        await db.put('vault_groups', newGroup);
      },
      deleteGroup: async (id: string) => {
        const existing = await db.get('vault_groups', id);
        if (existing) {
          existing.deleted_at = new Date().toISOString();
          existing.updated_at = new Date().toISOString();
          await db.put('vault_groups', existing);
        }
      },
      reorderGroups: async (updates: any[]) => {
        for (const update of updates) {
          const existing = await db.get('vault_groups', update.id);
          if (existing) {
            existing.position = update.position;
            existing.updated_at = new Date().toISOString();
            await db.put('vault_groups', existing);
          }
        }
      },
      getItems: async (groupId?: string) => {
        let all: any[] = [];
        if (groupId) {
          all = await db.getAllFromIndex('vault_items', 'group_id', groupId);
        } else {
          all = await db.getAll('vault_items');
        }
        return all.filter(i => !i.deleted_at).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      },
      getItem: async (id: string) => {
        return await db.get('vault_items', id);
      },
      upsertItem: async (item: any) => {
        const id = item.id || generateId();
        const newItem = {
          ...item,
          id,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        };
        await db.put('vault_items', newItem);
      },
      deleteItem: async (id: string) => {
        const existing = await db.get('vault_items', id);
        if (existing) {
          existing.deleted_at = new Date().toISOString();
          existing.updated_at = new Date().toISOString();
          await db.put('vault_items', existing);
        }
      },
      searchItems: async (query: string) => {
        const all = await db.getAll('vault_items');
        const q = query.toLowerCase();
        return all.filter(i => !i.deleted_at && (
          (i.label && i.label.toLowerCase().includes(q)) ||
          (i.username && i.username.toLowerCase().includes(q)) ||
          (i.url && i.url.toLowerCase().includes(q))
        ));
      },
      getPasswordHistory: async (itemId: string) => {
        const all = await db.getAllFromIndex('vault_password_history', 'item_id', itemId);
        return all.filter(h => !h.deleted_at).sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
      },
      generatePassword: async (opts: any) => {
        // mock implementation
        return "mock-password-123";
      },
      checkBreach: async (password: string) => {
        // mock implementation
        return { breached: false, count: 0 };
      },
      checkStrength: async (password: string) => {
         return 3;
      }
    },

    // --- SYNC ENGINE ---
    sync: {
      getTable: async (tableName: string) => {
        if (!db.objectStoreNames.contains(tableName as any)) return [];
        return await db.getAll(tableName as any);
      },
      deleteRow: async (tableName: string, id: string) => {
        if (db.objectStoreNames.contains(tableName as any)) {
          await originalDelete(tableName as any, id);
        }
        return { success: true };
      },
      upsertRow: async (tableName: string, row: any) => {
        if (db.objectStoreNames.contains(tableName as any)) {
          await originalPut(tableName as any, row);
        }
        return { success: true };
      }
    },

    // --- PRACTICE ---
    practice: {
      getSessions: async () => {
        const all = await db.getAll('tutor_sessions') || [];
        return all.filter(s => !s.deleted_at).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      },
      createSession: async (session: any) => {
        const newSession = {
          ...session,
          id: session.id || generateId(),
          created_at: new Date().toISOString()
        };
        await db.put('tutor_sessions', newSession);
        return newSession;
      },
      updateSession: async (session: any) => {
        const existing = await db.get('tutor_sessions', session.id);
        if (existing) {
          const updated = { ...existing, ...session };
          await db.put('tutor_sessions', updated);
          return 1;
        }
        return 0;
      },
      getMessages: async (sessionId: string) => {
        const all = await db.getAllFromIndex('tutor_messages', 'session_id', sessionId) || [];
        return all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      },
      createMessage: async (msg: any) => {
        const newMsg = {
          ...msg,
          id: msg.id || generateId(),
          created_at: new Date().toISOString()
        };
        await db.put('tutor_messages', newMsg);
        return newMsg;
      },
      getMemories: async () => {
        const all = await db.getAll('tutor_memories') || [];
        return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      },
      createMemory: async (memory: any) => {
        const newMemory = {
          ...memory,
          id: memory.id || generateId(),
          created_at: new Date().toISOString()
        };
        await db.put('tutor_memories', newMemory);
        return newMemory;
      }
    }
  };
};
