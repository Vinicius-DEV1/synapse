import { sqliteGetAll, sqliteGetFirst, sqliteQuery } from './bridgeClient';
import type { LibraryApi } from '../types';
import type {
  LibraryBook,
  LibraryCollection,
  LibraryHighlight,
  LibraryBookmark,
  OcrCacheEntry,
  ReadingSession,
  BookReadingStats,
  GlobalReadingStats,
} from '../../types/library';

export const webviewLibraryApi = (getMasterKey: () => CryptoKey | null): LibraryApi => ({
  async getBooks(): Promise<LibraryBook[]> {
    return await sqliteGetAll<LibraryBook>(
      `SELECT * FROM library_books WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
  },

  async importBook(): Promise<LibraryBook | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = false;
      input.accept = 'application/pdf,application/epub+zip,.pdf,.epub';

      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return resolve(null);

        try {
          const { uploadEncryptedPdf } = await import('../../services/storage');
          const masterKey = getMasterKey();
          if (!masterKey) throw new Error('Chave mestra não encontrada');

          const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const arrayBuffer = await file.arrayBuffer();
          const remotePath = await uploadEncryptedPdf(bookId, arrayBuffer, masterKey);
          const driveFileId = remotePath.replace('drive://', '');
          const title = file.name.replace(/\.(pdf|epub)$/i, '');
          const now = new Date().toISOString();

          const book: LibraryBook = {
            id: bookId,
            title,
            author: 'Desconhecido',
            file_path: remotePath,
            drive_file_id: driveFileId,
            original_name: file.name,
            cover_image: '',
            collections: [],
            total_pages: 0,
            current_page: 0,
            reading_status: 'not_started',
            last_read_page: 1,
            last_read_at: null,
            epub_locations: '',
            created_at: now,
            updated_at: now,
          };

          await sqliteQuery(
            `INSERT INTO library_books (id, title, author, file_path, drive_file_id, cover_image, collections, total_pages, current_page, reading_status, last_read_page, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              book.id,
              book.title,
              book.author,
              book.file_path,
              book.drive_file_id,
              book.cover_image,
              JSON.stringify(book.collections || []),
              book.total_pages,
              book.current_page,
              book.reading_status,
              book.last_read_page,
              book.created_at,
              book.updated_at,
            ]
          );

          resolve(book);
        } catch (err) {
          reject(err);
        }
      };

      input.click();
    });
  },

  async deleteBook(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE library_books SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    return true;
  },

  async updateBook(book: { id: string; [key: string]: any }): Promise<number> {
    const fields: string[] = [];
    const params: any[] = [];

    const keys = Object.keys(book).filter((k) => k !== 'id');
    for (const k of keys) {
      fields.push(`${k} = ?`);
      params.push(book[k]);
    }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(book.id);
    await sqliteQuery(`UPDATE library_books SET ${fields.join(', ')} WHERE id = ?`, params);
    return 1;
  },

  async getBookFile(id: string): Promise<string> {
    const book = await sqliteGetFirst<LibraryBook>(`SELECT * FROM library_books WHERE id = ?`, [id]);
    if (!book) throw new Error('Livro não encontrado');
    return book.file_path || '';
  },

  async getCollections(): Promise<LibraryCollection[]> {
    return await sqliteGetAll<LibraryCollection>(`SELECT * FROM library_collections ORDER BY name ASC`);
  },

  async createCollection(c: { name: string; color: string }): Promise<LibraryCollection> {
    const id = `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const col: LibraryCollection = { id, name: c.name, color: c.color, created_at: now };
    await sqliteQuery(
      `INSERT INTO library_collections (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [col.id, col.name, col.color, col.created_at, now]
    );
    return col;
  },

  async updateCollection(c: { id: string; name?: string; color?: string }): Promise<number> {
    const now = new Date().toISOString();
    await sqliteQuery(
      `UPDATE library_collections SET name = COALESCE(?, name), color = COALESCE(?, color), updated_at = ? WHERE id = ?`,
      [c.name, c.color, now, c.id]
    );
    return 1;
  },

  async deleteCollection(id: string): Promise<boolean> {
    await sqliteQuery(`DELETE FROM library_collections WHERE id = ?`, [id]);
    await sqliteQuery(`DELETE FROM library_book_collections WHERE collection_id = ?`, [id]);
    return true;
  },

  async setBookCollections(bookId: string, collectionIds: string[]): Promise<boolean> {
    await sqliteQuery(`DELETE FROM library_book_collections WHERE book_id = ?`, [bookId]);
    for (const colId of collectionIds) {
      await sqliteQuery(
        `INSERT INTO library_book_collections (id, book_id, collection_id) VALUES (?, ?, ?)`,
        [`${bookId}_${colId}`, bookId, colId]
      );
    }
    return true;
  },

  async getBookCollections(bookId: string): Promise<LibraryCollection[]> {
    return await sqliteGetAll<LibraryCollection>(
      `SELECT c.* FROM library_collections c 
       JOIN library_book_collections bc ON c.id = bc.collection_id 
       WHERE bc.book_id = ?`,
      [bookId]
    );
  },

  async getHighlights(bookId: string): Promise<LibraryHighlight[]> {
    return await sqliteGetAll<LibraryHighlight>(
      `SELECT * FROM library_highlights WHERE book_id = ? ORDER BY page_number ASC`,
      [bookId]
    );
  },

  async createHighlight(h: any): Promise<LibraryHighlight> {
    const id = `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const hl: LibraryHighlight = {
      id,
      book_id: h.book_id,
      page_number: h.page_number,
      text_content: h.text_content || '',
      color: h.color || 'yellow',
      rects: h.rects || '',
      highlight_type: h.highlight_type || 'text',
      note: h.note || '',
      created_at: now,
    };
    await sqliteQuery(
      `INSERT INTO library_highlights (id, book_id, page_number, text_content, color, rects, highlight_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hl.id, hl.book_id, hl.page_number, hl.text_content, hl.color, hl.rects, hl.highlight_type, hl.note, hl.created_at]
    );
    return hl;
  },

  async updateHighlight(h: any): Promise<number> {
    await sqliteQuery(
      `UPDATE library_highlights SET color = COALESCE(?, color), note = COALESCE(?, note), rects = COALESCE(?, rects) WHERE id = ?`,
      [h.color, h.note, h.rects, h.id]
    );
    return 1;
  },

  async deleteHighlight(id: string): Promise<boolean> {
    await sqliteQuery(`DELETE FROM library_highlights WHERE id = ?`, [id]);
    return true;
  },

  async getBookmarks(bookId: string): Promise<LibraryBookmark[]> {
    return await sqliteGetAll<LibraryBookmark>(
      `SELECT * FROM library_bookmarks WHERE book_id = ? ORDER BY page_number ASC`,
      [bookId]
    );
  },

  async createBookmark(b: any): Promise<LibraryBookmark> {
    const id = `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const bm: LibraryBookmark = {
      id,
      book_id: b.book_id,
      page_number: b.page_number,
      label: b.label || '',
      created_at: now,
    };
    await sqliteQuery(
      `INSERT INTO library_bookmarks (id, book_id, page_number, label, created_at) VALUES (?, ?, ?, ?, ?)`,
      [bm.id, bm.book_id, bm.page_number, bm.label, bm.created_at]
    );
    return bm;
  },

  async updateBookmark(b: any): Promise<number> {
    await sqliteQuery(`UPDATE library_bookmarks SET label = ? WHERE id = ?`, [b.label, b.id]);
    return 1;
  },

  async deleteBookmark(id: string): Promise<boolean> {
    await sqliteQuery(`DELETE FROM library_bookmarks WHERE id = ?`, [id]);
    return true;
  },

  async getOcrCache(bookId: string, pageNumber: number): Promise<OcrCacheEntry | null> {
    return await sqliteGetFirst<OcrCacheEntry>(
      `SELECT * FROM library_ocr_cache WHERE book_id = ? AND page_number = ?`,
      [bookId, pageNumber]
    );
  },

  async saveOcrCache(data: any): Promise<boolean> {
    const id = `${data.book_id}_p${data.page_number}`;
    await sqliteQuery(
      `INSERT OR REPLACE INTO library_ocr_cache (id, book_id, page_number, text_content, word_boxes)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.book_id, data.page_number, data.text_content, data.word_boxes]
    );
    return true;
  },

  async startReadingSession(data: any): Promise<ReadingSession> {
    const id = `rs_${Date.now()}`;
    const now = new Date().toISOString();
    const session: ReadingSession = {
      id,
      book_id: data.book_id,
      started_at: now,
      ended_at: null,
      pages_read: 0,
      start_page: data.start_page,
      end_page: data.start_page,
    };
    await sqliteQuery(
      `INSERT INTO library_reading_sessions (id, book_id, started_at, start_page, end_page, pages_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [session.id, session.book_id, session.started_at, session.start_page, session.end_page]
    );
    return session;
  },

  async endReadingSession(data: any): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(
      `UPDATE library_reading_sessions SET ended_at = ?, end_page = ?, pages_read = ? WHERE id = ?`,
      [now, data.end_page, data.pages_read, data.id]
    );
    return true;
  },

  async getReadingStats(bookId?: string): Promise<{ bookStats?: BookReadingStats; globalStats: GlobalReadingStats }> {
    const sessions = await sqliteGetAll<ReadingSession>(`SELECT * FROM library_reading_sessions`);
    const totalPages = sessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
    const globalStats: GlobalReadingStats = {
      totalBooksStarted: 1,
      totalBooksFinished: 0,
      totalTimeMinutes: sessions.length * 15,
      totalPagesRead: totalPages,
      currentStreak: 1,
      longestStreak: 1,
      readingDays: [],
    };

    let bookStats: BookReadingStats | undefined;
    if (bookId) {
      const bookSessions = sessions.filter((s) => s.book_id === bookId);
      const readPages = bookSessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
      bookStats = {
        totalTimeMinutes: bookSessions.length * 15,
        totalPagesRead: readPages,
        averagePagesPerSession: bookSessions.length > 0 ? readPages / bookSessions.length : 0,
        sessionsCount: bookSessions.length,
        lastReadAt: bookSessions[bookSessions.length - 1]?.started_at || null,
      };
    }

    return { bookStats, globalStats };
  },
});
