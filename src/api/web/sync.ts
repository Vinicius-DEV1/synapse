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
  }
});
