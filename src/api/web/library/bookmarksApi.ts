export const createBookmarksApi = (db: any, generateId: () => string) => ({
  getBookmarks: async (bookId: string) => {
    const all = await db.getAllFromIndex('library_bookmarks', 'book_id', bookId);
    return all.filter((b: any) => !b.deleted_at);
  },
  createBookmark: async (b: any) => {
    const bm = { id: generateId(), ...b, created_at: new Date().toISOString(), deleted_at: null };
    await db.put('library_bookmarks', bm);
    return bm;
  },
  updateBookmark: async (b: any) => {
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
