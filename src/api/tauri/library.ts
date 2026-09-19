import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';

export const tauriLibraryApi = {


  importBook: async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Books', extensions: ['pdf', 'epub'] }]
      });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        if (paths.length === 0) return null;
        const importedBooks = [];
        for (const filePath of paths) {
          const bookId = crypto.randomUUID();
          const ext = (filePath.split('.').pop() || 'pdf').toLowerCase();
          const localPath = `library/${bookId}.${ext}.enc`; // Always save as .enc
          
          await invoke('library_import_and_encrypt_book', {
              sourcePath: filePath,
              destPath: localPath
          });
          
          const cleanFileName = filePath.split(/[/\\]/).pop() || 'Livro';
          const title = cleanFileName.replace(/\.(pdf|epub)$/i, '') || 'Livro';
          const book = {
            id: bookId,
            title,
            original_name: cleanFileName,
            author: 'Desconhecido',
            file_path: localPath,
            cover_image: '',
            total_pages: 0,
            current_page: 0,
            last_read_page: ext === 'epub' ? '' : '1',
            reading_status: 'not_started',
            is_local: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await invoke('library_add_book', { book });
          importedBooks.push(book);
        }
        return importedBooks;
      }
    } catch(e) {
      console.error("Error importing book(s)", e);
      throw e;
    }
    return null;
  },
  getBookFile: async (id: string) => {
    try {
      // 1. First try direct native Rust read (handles all app_data paths consistently)
      try {
        console.log(`[library.ts] Tentando invoke 'library_get_book_file' nativo para ${id}...`);
        const raw = await invoke<number[] | Uint8Array>('library_get_book_file', { id });
        if (raw && (Array.isArray(raw) ? raw.length > 0 : (raw as Uint8Array).byteLength > 0)) {
          const uint8 = Array.isArray(raw) ? new Uint8Array(raw) : (raw as Uint8Array);
          console.log(`[library.ts] invoke 'library_get_book_file' retornou ${uint8.byteLength} bytes.`);
          return uint8.buffer;
        }
      } catch (err) {
        console.warn(`[library.ts] invoke 'library_get_book_file' falhou:`, err);
        // fallback to JS reading
      }

      const book = await invoke<{ file_path?: string } | null>('library_get_book', { id });
      if (!book) return null;
      
      const candidatePaths: string[] = [];

      // 1. Canonical candidates based on book ID
      candidatePaths.push(`library/${id}.epub.enc`);
      candidatePaths.push(`library/${id}.pdf.enc`);
      candidatePaths.push(`library/${id}.enc`);

      // 2. Exact database path if present
      if (book.file_path && !candidatePaths.includes(book.file_path)) {
        candidatePaths.push(book.file_path);
      }

      let buffer: Uint8Array | null = null;
      for (const p of candidatePaths) {
        const clean = p.replace('file://', '');
        console.log(`[library.ts] Tentando ler candidato para ${id}: ${clean}`);
        try {
          if (p.startsWith('/') || p.match(/^[a-zA-Z]:/)) {
            console.log(`[library.ts] Tentando ler absolute path via JS: ${p}`);
            const raw = await readFile(p);
            if (raw && raw.byteLength > 0) {
              console.log(`[library.ts] LIDO COM SUCESSO absolute path: ${p} (${raw.byteLength} bytes)`);
              buffer = new Uint8Array(raw);
              break;
            }
          }
          const { getBaseAppDir } = await import('./path');
          const { join } = await import('@tauri-apps/api/path');
          const dataDir = await getBaseAppDir();
          const fullPath = await join(dataDir, p);
          
          console.log(`[library.ts] Tentando ler via JS appDataDir: ${fullPath}`);
          const raw = await readFile(fullPath);
          if (raw && raw.byteLength > 0) {
            console.log(`[library.ts] LIDO COM SUCESSO appDataDir: ${fullPath} (${raw.byteLength} bytes)`);
            buffer = new Uint8Array(raw);
            break;
          }
        } catch (err) {
          console.log(`[library.ts] Falha ao tentar ler ${p}:`, err);
        }
      }

      if (!buffer) {
        console.warn(`[library.ts] Nenhum candidato foi lido com sucesso para o livro ${id}.`);
        return null;
      }
      return buffer.buffer;
    } catch(e) { console.error("Error getting book file", e); return null; }
  },
  getBooks: async () => await invoke('library_get_books'),
  getBook: async (id: string) => await invoke('library_get_book', { id }),
  addBook: async (b: any) => await invoke('library_add_book', { book: b }),
  updateBook: async (b: any) => await invoke('library_update_book', { book: b }),
  deleteBook: async (id: string) => await invoke('library_delete_book', { id }),
  evictBookLocalCache: async (id: string) => {
    try {
      await invoke('library_evict_book_local_cache', { id });
      return true;
    } catch (e) {
      console.warn('Failed to evict cache in tauri', e);
      return false;
    }
  },
  reattachBookFile: async (bookId: string) => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Books', extensions: ['pdf', 'epub'] }]
      });
      if (selected) {
        const filePath = Array.isArray(selected) ? selected[0] : selected;
        if (!filePath) return null;
        const ext = (filePath.split('.').pop() || 'pdf').toLowerCase();
        const localPath = `library/${bookId}.${ext}.enc`;
        await invoke('library_import_and_encrypt_book', {
          sourcePath: filePath,
          destPath: localPath
        });

        // Retrieve existing book to prevent wiping metadata
        const books = await invoke<any[]>('library_get_books');
        const existing = books.find((b: any) => b.id === bookId) || { id: bookId, title: 'Livro' };

        await invoke('library_update_book', {
          book: {
            title: 'Livro',
            total_pages: 0,
            current_page: 0,
            ...existing,
            file_path: localPath,
            updated_at: new Date().toISOString()
          }
        });
        return localPath;
      }
    } catch(e) {
      console.error("Error reattaching book file", e);
      throw e;
    }
    return null;
  },
  getCollections: async () => await invoke('library_get_collections'),
  addCollection: async (c: any) => await invoke('library_add_collection', { collection: c }),
  updateCollection: async (c: any) => await invoke('library_update_collection', { collection: c }),
  deleteCollection: async (id: string) => await invoke('library_delete_collection', { id }),
  addBookToCollection: async (bookId: string, collectionId: string) => await invoke('library_add_book_to_collection', { bookId, collectionId }),
  removeBookFromCollection: async (bookId: string, collectionId: string) => await invoke('library_remove_book_from_collection', { bookId, collectionId }),
  getBookCollections: async (bookId: string) => await invoke('library_get_book_collections', { bookId }),
  getAllBookCollections: async (): Promise<Record<string, string[]>> => await invoke('library_get_all_book_collections'),
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
  getReadingStats: async (): Promise<{ bookStats?: any; globalStats: any }> => {
    try {
      const res: any = await invoke('library_get_reading_stats');
      const g = res?.globalStats || res?.global_stats || res || {};
      return {
        globalStats: {
          totalBooksStarted: g.totalBooksStarted ?? g.total_books_started ?? 0,
          totalBooksFinished: g.totalBooksFinished ?? g.total_books_finished ?? 0,
          totalTimeMinutes: g.totalTimeMinutes ?? g.total_time_minutes ?? 0,
          totalPagesRead: g.totalPagesRead ?? g.total_pages_read ?? 0,
          totalHighlights: g.totalHighlights ?? g.total_highlights ?? 0,
          currentStreak: g.currentStreak ?? g.current_streak ?? 0,
          longestStreak: g.longestStreak ?? g.longest_streak ?? 0,
          readingDays: g.readingDays ?? g.reading_days ?? [],
        }
      };
    } catch (e) {
      console.error('Error fetching reading stats in tauri', e);
      return {
        globalStats: {
          totalBooksStarted: 0,
          totalBooksFinished: 0,
          totalTimeMinutes: 0,
          totalPagesRead: 0,
          totalHighlights: 0,
          currentStreak: 0,
          longestStreak: 0,
          readingDays: [],
        }
      };
    }
  }
};
