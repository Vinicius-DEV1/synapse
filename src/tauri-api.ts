import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, readFile, mkdir } from '@tauri-apps/plugin-fs';
import { BaseDirectory } from '@tauri-apps/api/path';
import { tauriAuthApi } from './api/tauri/auth';
import { tauriFinanceApi } from './api/tauri/finance';

export const createTauriApi = async () => {
  let syncCallbacks: (() => void)[] = [];
  const triggerSync = () => syncCallbacks.forEach(cb => cb());

  window.addEventListener('app-sync-trigger', triggerSync);

  return {
    onSyncTrigger: (callback: () => void) => {
      syncCallbacks.push(callback);
      return () => {
        syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
      };
    },

    // --- AUTH ---
    auth: tauriAuthApi,

    // Configurações e Chaves usando a tabela config do DB
    config: { 
      get: async (key: string) => {
        try {
          const rows = await invoke<any[]>('sync_get_table', { tableName: 'config' });
          const row = rows.find(r => r.id === key);
          if (row && row.data) {
            return JSON.parse(row.data);
          }
        } catch (e) {
          console.error("Config get error:", e);
        }
        return null;
      }, 
      set: async (key: string, value: any) => {
        try {
          await invoke('sync_upsert_row', { 
            tableName: 'config', 
            row: { id: key, data: JSON.stringify(value), updated_at: new Date().toISOString() } 
          });
          return { success: true };
        } catch (e) {
          console.error("Config set error:", e);
          return { success: false };
        }
      } 
    },
    // --- PAGES ---
    getAllPages: async () => await invoke('notes_get_all_pages'),
    getPageContent: async (id: string) => await invoke('notes_get_page_content', { id }),
    createPage: async (page: any) => await invoke('notes_create_page', { page }),
    updatePage: async (page: any) => await invoke('notes_update_page', { page }),
    deletePage: async (id: string) => await invoke('notes_delete_page', { id }),
    reorderPages: async () => true, // TODO
    getPageHistory: async () => [],
    
    // --- IMAGE CACHE ---
    imageCache: {
      get: async (id: string) => await invoke('image_cache_get', { id }),
      put: async (id: string, data: ArrayBuffer, mimeType: string) => 
        await invoke('image_cache_put', { id, data: Array.from(new Uint8Array(data)), mimeType })
    },
    // --- FINANCE ---
    finance: tauriFinanceApi,
    
    // --- LIBRARY ---
    library: {
      importBook: async () => {
        try {
          const selected = await open({
            multiple: false,
            filters: [{ name: 'Books', extensions: ['pdf', 'epub'] }]
          });
          if (selected && typeof selected === 'string') {
            const bookId = crypto.randomUUID();
            const ext = selected.split('.').pop() || 'pdf';
            const localPath = `library/${bookId}.${ext}.enc`; // Always save as .enc
            
            await invoke('library_import_and_encrypt_book', {
                sourcePath: selected,
                destPath: localPath
            });
            
            const title = selected.split('\\').pop()?.replace(/\.(pdf|epub)$/i, '') || 'Livro';
            const book = {
              id: bookId, title, author: 'Desconhecido', file_path: localPath, cover_image: '',
              total_pages: 0, last_read_page: '1', reading_status: 'not_started',
              created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            };
            await invoke('library_add_book', { book });
            return book;
          }
        } catch(e) { console.error("Error importing book", e); }
        return null;
      },
      getBookFile: async (id: string) => {
        try {
          const books = await invoke<any[]>('library_get_books');
          const book = books.find((b: any) => b.id === id);
          if (!book || !book.file_path) return null;
          
          const buffer = await readFile(book.file_path, { baseDir: BaseDirectory.AppData });
          let binary = '';
          const bytes = new Uint8Array(buffer);
          for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
          }
          return window.btoa(binary);
        } catch(e) { console.error("Error getting book file", e); return null; }
      },
      getBooks: async () => await invoke('library_get_books'),
      addBook: async (b: any) => await invoke('library_add_book', { book: b }),
      updateBook: async (b: any) => await invoke('library_update_book', { book: b }),
      deleteBook: async (id: string) => await invoke('library_delete_book', { id }),
      getCollections: async () => await invoke('library_get_collections'),
      addCollection: async (c: any) => await invoke('library_add_collection', { collection: c }),
      updateCollection: async (c: any) => await invoke('library_update_collection', { collection: c }),
      deleteCollection: async (id: string) => await invoke('library_delete_collection', { id }),
      addBookToCollection: async (bookId: string, collectionId: string) => await invoke('library_add_book_to_collection', { bookId, collectionId }),
      removeBookFromCollection: async (bookId: string, collectionId: string) => await invoke('library_remove_book_from_collection', { bookId, collectionId }),
      getBookCollections: async (bookId: string) => await invoke('library_get_book_collections', { bookId }),
      setBookCollections: async (bookId: string, collectionIds: string[]) => await invoke('library_set_book_collections', { bookId, collectionIds }),
      createCollection: async (c: any) => await invoke('library_create_collection', { collection: c }),
      getHighlights: async (bookId: string) => await invoke('library_get_highlights', { bookId }),
      createHighlight: async (h: any) => await invoke('library_create_highlight', { highlight: h }),
      updateHighlight: async (h: any) => await invoke('library_update_highlight', { highlight: h }),
      deleteHighlight: async (id: string) => await invoke('library_delete_highlight', { id }),
      getBookmarks: async (bookId: string) => await invoke('library_get_bookmarks', { bookId }),
      createBookmark: async (b: any) => await invoke('library_create_bookmark', { bookmark: b }),
      updateBookmark: async (b: any) => await invoke('library_update_bookmark', { bookmark: b }),
      deleteBookmark: async (id: string) => await invoke('library_delete_bookmark', { id }),
      getOcrCache: async (bookId: string, pageNumber: number) => await invoke('library_get_ocr_cache', { bookId, pageNumber }),
      saveOcrCache: async (cache: any) => await invoke('library_save_ocr_cache', { cache }),
      startReadingSession: async (data: any) => await invoke('library_start_reading_session', { session: data }),
      endReadingSession: async (data: any) => await invoke('library_end_reading_session', { session: data }),
      getReadingStats: async () => await invoke('library_get_reading_stats')
    },
    
    // --- CALENDAR ---
    calendar: {
      getEvents: async () => await invoke('calendar_get_events'),
      addEvent: async (e: any) => await invoke('calendar_add_event', { event: e }),
      updateEvent: async (e: any) => await invoke('calendar_update_event', { event: e }),
      deleteEvent: async (id: string) => await invoke('calendar_delete_event', { id })
    },
    
    // --- CULTURE ---
    culture: {
      getItems: async () => await invoke('culture_get_items'),
      createItem: async (i: any) => await invoke('culture_create_item', { item: i }),
      updateItem: async (id: string, i: any) => await invoke('culture_update_item', { id, item: i }),
      deleteItem: async (id: string) => await invoke('culture_delete_item', { id }),
      updateProgress: async (id: string, progress: number) => await invoke('culture_update_progress', { id, progress }),
      getEpisodes: async (itemId: string) => await invoke('culture_get_episodes', { itemId }),
      saveEpisodes: async (itemId: string, episodes: any[]) => await invoke('culture_save_episodes', { itemId, episodes }),
      toggleEpisodeWatched: async (episodeId: string, isWatched: boolean) => await invoke('culture_toggle_episode_watched', { episodeId, isWatched }),
      getRecentReleases: async () => [] // Placeholder for external API fetch in future
    },
    
    // --- FOCUS ---
    focus: {
      getSessions: async () => await invoke('focus_get_sessions'),
      createSession: async (s: any) => await invoke('focus_create_session', { session: s }),
      deleteSessions: async () => {}, // mock
      getAlarms: async () => await invoke('focus_get_alarms'),
      createAlarm: async (a: any) => await invoke('focus_create_alarm', { alarm: a }),
      updateAlarm: async (id: number, a: any) => await invoke('focus_update_alarm', { id: id.toString(), alarm: a }),
      deleteAlarm: async (id: number) => await invoke('focus_delete_alarm', { id: id.toString() }),
      setAppIcon: async (type: string) => {} // mock
    },
    
    // --- ANKI ---
    anki: {
      getDecks: async () => await invoke('anki_get_decks'),
      createDeck: async (name: string, desc?: string) => await invoke('anki_create_deck', { name, description: desc }),
      saveCard: async (c: any) => await invoke('anki_save_card', { card: c }),
      getDueCards: async (deckId: string) => await invoke('anki_get_due_cards', { deckId }),
      reviewCard: async (cardId: string, rating: number) => await invoke('anki_review_card', { cardId, rating }),
      getAllCards: async (deckId?: string) => await invoke('anki_get_all_cards', { deckId }),
      deleteCard: async (cardId: string) => await invoke('anki_delete_card', { cardId }),
      deleteCardsBulk: async (cardIds: string[]) => { for(let id of cardIds) await invoke('anki_delete_card', { cardId: id }); },
      updateCard: async (cardId: string, c: any) => await invoke('anki_update_card', { cardId, card: c }),
      moveCards: async () => {} // mock
    },
    
    // --- SYNC ---
    sync: {
      getTable: async (tableName: string) => await invoke('sync_get_table', { tableName }),
      deleteRow: async (tableName: string, id: string) => await invoke('sync_delete_row', { tableName, id }),
      upsertRow: async (tableName: string, row: any) => await invoke('sync_upsert_row', { tableName, row })
    },
    
    // --- DRIVE ---
    drive: {
      openExternalUrl: async (url: string) => await invoke('drive_open_url', { url }),
      getCredentials: async () => await invoke('drive_get_credentials'),
      saveCredentials: async (data: any) => await invoke('drive_save_credentials', { data })
    },
    
    // --- MULTIMEDIA (Native Rust Integrations) ---
    video: {
      getLocalPath: async (filename: string) => await invoke('video_get_local_path', { filename }),
      deleteLocal: async (filename: string) => await invoke('video_delete_local', { filename }),
      scanTracks: async (localPath: string) => await invoke('video_scan_tracks', { localPath }),
      extractSubtitles: async (localPath: string, trackIndex: string) => await invoke('video_extract_subtitles', { localPath, trackIndex }),
      extractAudio: async (localPath: string, trackIndex: string) => await invoke('video_extract_audio', { localPath, trackIndex }),
      remuxDefaultTrack: async (sourcePath: string, filename: string, trackIndex: string) => await invoke('video_remux_default_track', { sourcePath, filename, trackIndex }),
      convertToMp4: async (sourcePath: string, filename: string) => await invoke('video_convert_mp4', { sourcePath, filename }),
      getStreamPort: async () => await invoke('video_get_stream_port'),
      saveLocal: async (filename: string, buffer: ArrayBuffer) => await invoke('video_save_local', { filename, buffer: Array.from(new Uint8Array(buffer)) }),
      copyLocal: async (sourcePath: string, filename: string) => await invoke('video_import_and_encrypt', { sourcePath, destFilename: filename }),
      openFileDialog: async () => {},
      openFolderDialog: async () => {}
    },
    
    lofi: {
      getLocalPath: async (filename: string) => await invoke('lofi_get_local_path', { filename }),
      deleteLocal: async (filename: string) => await invoke('lofi_delete_local', { filename }),
      saveLocal: async (filename: string, buffer: ArrayBuffer) => await invoke('lofi_save_local', { filename, buffer: Array.from(new Uint8Array(buffer)) }),
      copyLocal: async (sourcePath: string, filename: string) => await invoke('lofi_copy_local', { sourcePath, filename })
    },
    
    youtube: {
      fetchInfo: async (url: string) => await invoke('youtube_fetch_info', { url }),
      download: async (url: string, filename: string, quality: string, subs?: string[]) => await invoke('youtube_download', { url, filename, quality, subs }),
      onProgress: (callback: (percent: number) => void) => {
        // Usa tauri event listener (listen from @tauri-apps/api/event) no frontend real
      }
    },
    
    audio: {
      generateTTS: async (text: string, lang?: string) => {
        try {
          const path = await invoke('audio_generate_tts', { text, lang });
          return { success: true, filePath: path };
        } catch (e) {
          return { success: false, error: e };
        }
      },
      extractClip: async (videoPath: string, startTimeMs: number, endTimeMs: number) => {
        try {
          const path = await invoke('audio_extract_clip', { videoPath, startTimeMs, endTimeMs });
          return { success: true, filePath: path };
        } catch (e) {
          return { success: false, error: e };
        }
      }
    },
    
    backup: {
      onLog: (callback: (data: any) => void) => { return () => {}; },
      selectFolder: async () => null,
      startBackup: async (options: any) => ({ success: false, message: "Use o Google Drive Sync na aba Cloud" })
    },
    
    // --- FILES ---
    files: {
      getAll: async () => await invoke('files_get_all'),
      getById: async (id: string) => await invoke('files_get_by_id', { id }),
      create: async (file: Omit<FileItem, 'id' | 'created_at' | 'updated_at'>) => await invoke('files_create', { file }),
      update: async (id: string, file: Partial<FileItem>) => await invoke('files_update', { id, file }),
      delete: async (id: string) => await invoke('files_delete', { id }),
      move: async (id: string, folderId: string | null) => await invoke('files_move', { id, folderId }),
      saveLocal: async (filename: string, data: number[]) => await invoke('files_save_local', { filename, data }),
      getLocal: async (id: string) => `http://encrypted.localhost/files/${encodeURIComponent(id)}`,
      
      folders: {
        getAll: async () => await invoke('file_folders_get_all'),
        create: async (folder: any) => await invoke('file_folders_create', { folder }),
        update: async (folder: any) => await invoke('file_folders_update', { folder }),
        delete: async (id: string) => await invoke('file_folders_delete', { id })
      },
      
      links: {
        getByPage: async (pageId: string) => await invoke('file_links_get_by_page', { pageId }),
        getByFile: async (fileId: string) => await invoke('file_links_get_by_file', { fileId }),
        create: async (link: any) => await invoke('file_links_create', { link }),
        delete: async (id: string) => await invoke('file_links_delete', { id })
      }
    },
    
    // --- VAULT ---
    vault: {
      getGroups: async () => await invoke('vault_get_groups'),
      upsertGroup: async (group: any) => await invoke('vault_upsert_group', { group }),
      deleteGroup: async (id: string) => await invoke('vault_delete_group', { id }),
      reorderGroups: async (updates: any) => await invoke('vault_reorder_groups', { updates }),
      getItems: async (groupId?: string) => await invoke('vault_get_items', { groupId }),
      getItem: async (id: string) => await invoke('vault_get_item', { id }),
      upsertItem: async (item: any) => await invoke('vault_upsert_item', { item }),
      deleteItem: async (id: string) => await invoke('vault_delete_item', { id }),
      searchItems: async (query: string) => await invoke('vault_search_items', { query }),
      getPasswordHistory: async (itemId: string) => await invoke('vault_get_password_history', { itemId }),
      generatePassword: async (opts: any) => await invoke('vault_generate_password', { options: opts }),
      checkBreach: async (password: string) => await invoke('vault_check_breach', { password }),
      checkStrength: async (password: string) => await invoke('vault_check_strength', { password }),
    },
    
    // --- PRACTICE ---
    practice: {
      getSessions: async () => await invoke('practice_get_sessions'),
      createSession: async (session: any) => await invoke('practice_create_session', { session }),
      updateSession: async (session: any) => await invoke('practice_update_session', { session }),
      getMessages: async (sessionId: string) => await invoke('practice_get_messages', { sessionId }),
      createMessage: async (msg: any) => await invoke('practice_create_message', { message: msg }),
      getMemories: async () => await invoke('practice_get_memories'),
      createMemory: async (memory: any) => await invoke('practice_create_memory', { memory }),
      deleteMemory: async (id: string) => await invoke('practice_delete_memory', { id }),
    }
  };
};
