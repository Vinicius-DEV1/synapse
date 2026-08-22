import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { BaseDirectory } from '@tauri-apps/api/path';

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
            author: 'Desconhecido',
            file_path: localPath,
            cover_image: '',
            total_pages: 0,
            current_page: 0,
            last_read_page: '1',
            reading_status: 'not_started',
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
      const books = await invoke<any[]>('library_get_books');
      const book = books.find((b: any) => b.id === id);
      if (!book) return null;
      
      const candidatePaths: string[] = [];

      // 1. Canonical candidates based on book ID
      candidatePaths.push(`library/${id}.epub.enc`);
      candidatePaths.push(`library/${id}.pdf.enc`);
      candidatePaths.push(`library/${id}.epub`);
      candidatePaths.push(`library/${id}.pdf`);

      // 2. Candidate based on saved file_path
      if (book.file_path) {
        let clean = book.file_path.replace(/^file:\/\//, '');
        if (clean.startsWith('/') || clean.match(/^[a-zA-Z]:/)) {
          // If absolute, extract filename
          const filename = clean.split(/[/\\]/).pop();
          if (filename) {
            candidatePaths.push(`library/${filename}`);
            if (!filename.endsWith('.enc')) candidatePaths.push(`library/${filename}.enc`);
          }
        } else {
          // Relative path
          candidatePaths.push(clean);
          if (!clean.endsWith('.enc')) candidatePaths.push(`${clean}.enc`);
        }
      }

      let buffer: Uint8Array | null = null;
      for (const p of candidatePaths) {
        try {
          const raw = await readFile(p, { baseDir: BaseDirectory.AppData });
          if (raw && raw.byteLength > 0) {
            buffer = new Uint8Array(raw);
            break;
          }
        } catch {
          // try next
        }
      }

      if (!buffer) return null;

      let binary = '';
      for (let i = 0; i < buffer.byteLength; i++) {
          binary += String.fromCharCode(buffer[i]);
      }
      return window.btoa(binary);
    } catch(e) { console.error("Error getting book file", e); return null; }
  },
  getBooks: async () => await invoke('library_get_books'),
  addBook: async (b: any) => await invoke('library_add_book', { book: b }),
  updateBook: async (b: any) => await invoke('library_update_book', { book: b }),
  deleteBook: async (id: string) => await invoke('library_delete_book', { id }),
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
};
