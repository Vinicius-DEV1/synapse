import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web-schema';
import type { LibraryHighlight } from '../../../types/library';

export const createHighlightsApi = (db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) => ({
  getHighlights: async (bookId: string): Promise<LibraryHighlight[]> => {
    const all = await db.getAllFromIndex('library_highlights', 'book_id', bookId);
    return all.filter((h) => !h.deleted_at);
  },
  createHighlight: async (h: Omit<LibraryHighlight, 'id' | 'created_at'>): Promise<LibraryHighlight> => {
    const hl: LibraryHighlight = { id: generateId(), ...h, created_at: new Date().toISOString(), deleted_at: null };
    await db.put('library_highlights', hl);
    return hl;
  },
  updateHighlight: async (h: Partial<LibraryHighlight> & { id: string }): Promise<number> => {
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
  }
});
