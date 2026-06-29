import { ipcMain } from 'electron';
import { getDb } from '../db/connection';

export function registerConfigHandlers() {
  ipcMain.handle('config:get', async (_, key: string) => {
    try {
      const db = getDb();
      return new Promise((resolve, reject) => {
        db.get('SELECT data FROM config WHERE id = ?', [key], (err, row: any) => {
          if (err) return reject(err);
          resolve(row ? JSON.parse(row.data) : null);
        });
      });
    } catch (err: any) {
      console.error('config:get error', err);
      return null;
    }
  });

  ipcMain.handle('config:set', async (_, key: string, data: any) => {
    try {
      const db = getDb();
      return new Promise((resolve, reject) => {
        const json = JSON.stringify(data);
        db.run(
          `INSERT INTO config (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP`,
          [key, json],
          (err) => {
            if (err) return reject(err);
            resolve({ success: true });
          }
        );
      });
    } catch (err: any) {
      console.error('config:set error', err);
      return { success: false, error: err.message };
    }
  });
}
