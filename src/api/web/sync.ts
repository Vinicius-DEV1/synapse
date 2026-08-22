export const webSyncApi = (db: any, originalDelete: any, originalPut: any) => ({
  getTable: async (tableName: string) => {
    if (!db.objectStoreNames.contains(tableName as any)) return [];
    return await db.getAll(tableName as any);
  },
  deleteRow: async (tableName: string, id: string) => {
    if (db.objectStoreNames.contains(tableName as any)) {
      await originalDelete(tableName as any, id);
    }
    return { success: true };
  },
  upsertRow: async (tableName: string, row: any) => {
    if (db.objectStoreNames.contains(tableName as any)) {
      try {
        const existing = await db.get(tableName as any, row.id);
        if (existing) {
          row = { ...existing, ...row };
        }
      } catch (e) {
        console.warn(`Failed to fetch existing row for merge in sync upsert:`, e);
      }
      await originalPut(tableName as any, row);
    }
    return { success: true };
  },
  // Fetches only rows with specific IDs (avoids loading the entire table into memory).
  // In IndexedDB, uses a single readonly transaction with individual get operations,
  // which is significantly more efficient than getAll + filter for selective syncing.
  getRowsByIds: async (tableName: string, ids: string[]) => {
    if (!db.objectStoreNames.contains(tableName as any) || ids.length === 0) return [];
    
    const tx = db.transaction(tableName as any, 'readonly');
    const results: any[] = [];
    
    // Fetch each ID individually within the same transaction (efficient in IndexedDB)
    const promises = ids.map(async (id: string) => {
      try {
        const row = await tx.store.get(id);
        if (row) results.push(row);
      } catch {
        // ID not found — expected during normal sync flow
      }
    });
    
    await Promise.all(promises);
    await tx.done;
    
    return results;
  }
});
