import { describe, it, expect, beforeEach } from 'vitest';
import { webLibraryApi } from './library';

describe('webLibraryApi Unit Tests', () => {
  let inMemoryDb: Record<string, any[]>;
  let idCounter = 0;
  const generateId = () => `id_${++idCounter}`;
  const getMasterKey = () => null;

  const createMockDb = () => {
    inMemoryDb = {
      library_books: [],
      library_collections: [],
      library_book_collections: [],
      library_highlights: [],
      library_bookmarks: [],
      library_reading_sessions: [],
    };

    return {
      getAll: async (table: string) => [...(inMemoryDb[table] || [])],
      get: async (table: string, id: string) =>
        inMemoryDb[table]?.find((item) => item.id === id) || null,
      put: async (table: string, item: any) => {
        if (!inMemoryDb[table]) inMemoryDb[table] = [];
        const index = inMemoryDb[table].findIndex((i) => i.id === item.id);
        if (index >= 0) {
          inMemoryDb[table][index] = item;
        } else {
          inMemoryDb[table].push(item);
        }
      },
      getAllFromIndex: async (table: string, indexKey: string, indexValue: string) => {
        return (inMemoryDb[table] || []).filter((item) => item[indexKey] === indexValue);
      },
    };
  };

  let api: ReturnType<typeof webLibraryApi>;

  beforeEach(() => {
    idCounter = 0;
    const db = createMockDb();
    api = webLibraryApi(db, generateId, getMasterKey);
  });

  describe('Books CRUD', () => {
    it('creates, reads, updates and soft-deletes books', async () => {
      const book = {
        id: 'book_1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        file_path: 'remote/path.pdf',
        total_pages: 400,
        last_read_page: 10,
        reading_status: 'reading',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };

      const db = createMockDb();
      api = webLibraryApi(db, generateId, getMasterKey);

      await db.put('library_books', book);
      const books = await api.getBooks();
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Clean Code');

      // Update
      await api.updateBook({ id: 'book_1', last_read_page: 50 });
      const updatedBooks = await api.getBooks();
      expect(updatedBooks[0].last_read_page).toBe(50);

      // Soft delete
      const deleteResult = await api.deleteBook('book_1');
      expect(deleteResult).toBe(true);

      const activeBooks = await api.getBooks();
      expect(activeBooks).toHaveLength(0);
    });

    it('defines reattachBookFile method', () => {
      expect(typeof api.reattachBookFile).toBe('function');
    });
  });

  describe('Collections & Associations', () => {
    it('manages collections and book-collection associations correctly', async () => {
      const col1 = await api.createCollection({ name: 'Programação', color: '#8b5cf6' });
      const col2 = await api.createCollection({ name: 'Design', color: '#10b981' });

      const collections = await api.getCollections();
      expect(collections).toHaveLength(2);

      await api.setBookCollections('book_100', [col1.id, col2.id]);
      const bookCols = await api.getBookCollections('book_100');
      expect(bookCols).toHaveLength(2);

      // Remove col2
      await api.setBookCollections('book_100', [col1.id]);
      const remainingCols = await api.getBookCollections('book_100');
      expect(remainingCols).toHaveLength(1);
      expect(remainingCols[0].id).toBe(col1.id);
    });
  });

  describe('Highlights and Bookmarks', () => {
    it('creates, retrieves, and soft-deletes highlights and bookmarks', async () => {
      const hl = await api.createHighlight({
        book_id: 'book_100',
        page_number: 5,
        text_content: 'Princípio da responsabilidade única',
        color: 'yellow',
      });

      const highlights = await api.getHighlights('book_100');
      expect(highlights).toHaveLength(1);
      expect(highlights[0].text_content).toBe('Princípio da responsabilidade única');

      await api.deleteHighlight(hl.id);
      const activeHighlights = await api.getHighlights('book_100');
      expect(activeHighlights).toHaveLength(0);

      // Bookmark
      const bm = await api.createBookmark({
        book_id: 'book_100',
        page_number: 12,
        title: 'Capítulo 2',
      });

      const bookmarks = await api.getBookmarks('book_100');
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].title).toBe('Capítulo 2');

      await api.deleteBookmark(bm.id);
      const activeBookmarks = await api.getBookmarks('book_100');
      expect(activeBookmarks).toHaveLength(0);
    });
  });

  describe('Reading Sessions', () => {
    it('tracks start and end of reading sessions', async () => {
      const session = await api.startReadingSession({
        book_id: 'book_100',
        start_page: 1,
      });

      expect(session.id).toBeDefined();
      expect(session.started_at).toBeDefined();

      const ended = await api.endReadingSession({
        id: session.id,
        end_page: 25,
        duration_minutes: 30,
      });

      expect(ended).toBe(true);
    });
  });
});
