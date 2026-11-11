import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web-schema';
import type { LibraryBookmark } from '../../../types/library';

export const createBookmarksApi = (db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) => ({
  getBookmarks: async (bookId: string): Promise<LibraryBookmark[]> => {
    const all = await db.getAllFromIndex('library_bookmarks', 'book_id', bookId);
    return all.filter((b) => !b.deleted_at);
  },
  createBookmark: async (b: Omit<LibraryBookmark, 'id' | 'created_at'>): Promise<LibraryBookmark> => {
    const bm: LibraryBookmark = { id: generateId(), ...b, created_at: new Date().toISOString(), deleted_at: null };
    await db.put('library_bookmarks', bm);
    return bm;
  },
  updateBookmark: async (b: Partial<LibraryBookmark> & { id: string }): Promise<number> => {
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
  }
});
