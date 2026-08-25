import { sqliteGetFirst, sqliteQuery, sqliteExec } from './bridgeClient';

export const webviewImageCacheApi = {
  async get(id: string): Promise<{ data: number[]; mime_type: string } | null> {
    const row = await sqliteGetFirst<any>(`SELECT data, mimeType FROM image_cache WHERE id = ?`, [id]);
    if (!row) return null;
    return {
      data: Array.isArray(row.data) ? row.data : Array.from(new Uint8Array(row.data)),
      mime_type: row.mimeType || 'image/png',
    };
  },

  async put(id: string, data: ArrayBuffer | number[], mimeType: string): Promise<void> {
    const byteArr = data instanceof ArrayBuffer ? Array.from(new Uint8Array(data)) : data;
    await sqliteQuery(
      `INSERT OR REPLACE INTO image_cache (id, data, mimeType) VALUES (?, ?, ?)`,
      [id, byteArr, mimeType || 'image/png']
    );
  },

  async delete(id: string): Promise<boolean> {
    await sqliteQuery(`DELETE FROM image_cache WHERE id = ?`, [id]);
    return true;
  },

  async cleanupOrphans(): Promise<number> {
    try {
      await sqliteExec(`
        DELETE FROM image_cache 
        WHERE id NOT IN (
          SELECT DISTINCT substr(id, 1) FROM image_cache
          WHERE EXISTS (
            SELECT 1 FROM pages WHERE content LIKE '%' || image_cache.id || '%'
          )
          OR EXISTS (
            SELECT 1 FROM page_history WHERE content LIKE '%' || image_cache.id || '%'
          )
        );
      `);
      return 1;
    } catch {
      return 0;
    }
  },
};
