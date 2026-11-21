import { invoke } from '@tauri-apps/api/core';

export const tauriConfigApi = {
  get: async (key: string) => {
    try {
      const row = await invoke<{ id: string; data: string } | null>('sync_get_row', {
        tableName: 'config',
        id: key,
      });
      if (row && row.data) {
        return JSON.parse(row.data);
      }
    } catch (e) {
      console.error("Config get error:", e);
    }
    return null;
  }, 
  set: async (key: string, value: unknown) => {
    try {
      await invoke('sync_upsert_row', { 
        tableName: 'config', 
        row: { id: key, data: JSON.stringify(value), updated_at: new Date().toISOString() } 
      });
      return { success: true };
    } catch (e) {
      console.error("Config set error:", e);
      return { success: false };
    }
  } 
};
