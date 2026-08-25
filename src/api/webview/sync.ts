import { sqliteGetAll, sqliteQuery } from './bridgeClient';
import type { SyncApi } from '../types';

export const webviewSyncApi: SyncApi = {
  async getTable(tableName: string): Promise<any[]> {
    try {
      return await sqliteGetAll(`SELECT * FROM ${tableName}`);
    } catch {
      return [];
    }
  },

  async deleteRow(tableName: string, id: string): Promise<{ success: boolean }> {
    try {
      await sqliteQuery(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      return { success: true };
    } catch {
      return { success: false };
    }
  },

  async upsertRow(tableName: string, row: any): Promise<{ success: boolean }> {
    try {
      if (!row || typeof row !== 'object') return { success: false };
      
      const keys = Object.keys(row);
      if (keys.length === 0) return { success: false };

      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((k) => {
        const val = row[k];
        if (val !== null && typeof val === 'object') {
          return JSON.stringify(val);
        }
        if (typeof val === 'boolean') {
          return val ? 1 : 0;
        }
        return val;
      });

      const sql = `INSERT OR REPLACE INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
      await sqliteQuery(sql, values);
      return { success: true };
    } catch (e) {
      console.warn(`[webviewSyncApi.upsertRow] Error in ${tableName}:`, e);
      return { success: false };
    }
  },

  async getRowsByIds(tableName: string, ids: string[]): Promise<any[]> {
    if (!ids || ids.length === 0) return [];
    try {
      const placeholders = ids.map(() => '?').join(', ');
      return await sqliteGetAll(
        `SELECT * FROM ${tableName} WHERE id IN (${placeholders})`,
        ids
      );
    } catch {
      return [];
    }
  },
};
