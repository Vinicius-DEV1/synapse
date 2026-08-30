export const createHighlightsApi = (db: any, generateId: () => string) => ({
  getHighlights: async (bookId: string) => {
    const all = await db.getAllFromIndex('library_highlights', 'book_id', bookId);
    return all.filter((h: any) => !h.deleted_at);
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
  }
});
