import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { BaseDirectory } from '@tauri-apps/api/path';

export const tauriLibraryApi = {
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
};
