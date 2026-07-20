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
  // #3: Busca apenas rows com IDs específicos (evita carregar tabela inteira na memória)
  // No IndexedDB, usamos uma transaction com get individual por ID — 
  // muito mais eficiente que getAll + filter quando há poucos IDs vs muitas rows.
  getRowsByIds: async (tableName: string, ids: string[]) => {
    if (!db.objectStoreNames.contains(tableName as any) || ids.length === 0) return [];
    
    const tx = db.transaction(tableName as any, 'readonly');
    const results: any[] = [];
    
    // Buscar cada ID individualmente dentro da mesma transaction (rápido no IndexedDB)
    const promises = ids.map(async (id: string) => {
      try {
        const row = await tx.store.get(id);
        if (row) results.push(row);
      } catch {
        // ID não encontrado — normal durante sync
      }
    });
    
    await Promise.all(promises);
    await tx.done;
    
    return results;
  }
});
