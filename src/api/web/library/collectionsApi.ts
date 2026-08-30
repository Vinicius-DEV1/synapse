export const createCollectionsApi = (db: any, generateId: () => string) => ({
  getCollections: async () => {
    const all = await db.getAll('library_collections') || [];
    return all.filter((c: any) => !c.deleted_at);
  },
  createCollection: async (c: any) => {
    const col = { id: generateId(), ...c, created_at: new Date().toISOString() };
    await db.put('library_collections', col);
    return col;
  },
  updateCollection: async (c: any) => {
    const existing = await db.get('library_collections', c.id);
    if (existing) await db.put('library_collections', { ...existing, ...c });
    return 1;
  },
  deleteCollection: async (id: string) => {
    const existing = await db.get('library_collections', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('library_collections', existing);
    }
    return true;
  },
  setBookCollections: async (bookId: string, collectionIds: string[]) => {
    const existing = await db.getAllFromIndex('library_book_collections', 'book_id', bookId);
    
    for (const e of existing) {
      if (!collectionIds.includes(e.collection_id)) {
        if (!e.deleted_at) {
          e.deleted_at = new Date().toISOString();
          e.updated_at = new Date().toISOString();
          await db.put('library_book_collections', e);
        }
      } else {
        if (e.deleted_at) {
            e.deleted_at = null;
            e.updated_at = new Date().toISOString();
            await db.put('library_book_collections', e);
        }
      }
    }
    
    const existingColIds = existing.map((e: any) => e.collection_id);
    const newCols = collectionIds.filter((id: string) => !existingColIds.includes(id));
    for (const colId of newCols) {
      await db.put('library_book_collections', {
        id: generateId(),
        book_id: bookId,
        collection_id: colId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      });
    }
    return true;
  },
  getBookCollections: async (bookId: string) => {
    const bookCols = await db.getAllFromIndex('library_book_collections', 'book_id', bookId);
    const activeCols = bookCols.filter((r: any) => !r.deleted_at).map((r: any) => r.collection_id);
    
    const allCollections = await db.getAll('library_collections');
    return allCollections.filter((c: any) => activeCols.includes(c.id) && !c.deleted_at);
  },
  getAllBookCollections: async (): Promise<Record<string, string[]>> => {
    const allBookCols = await db.getAll('library_book_collections') || [];
    const allCols = await db.getAll('library_collections') || [];
    const validColIds = new Set(allCols.filter((c: any) => !c.deleted_at).map((c: any) => c.id));
    
    const map: Record<string, string[]> = {};
    for (const r of allBookCols) {
      if (!r.deleted_at && validColIds.has(r.collection_id)) {
        if (!map[r.book_id]) map[r.book_id] = [];
        map[r.book_id].push(r.collection_id);
      }
    }
    return map;
  }
});
