export const createWebConfigApi = (db: any) => ({
  get: async (key: string) => {
    const item = await db.get('config', key);
    return item ? item.value : null;
  },
  set: async (key: string, data: any) => {
    await db.put('config', { id: key, value: data, updated_at: new Date().toISOString() });
    return { success: true };
  }
});
