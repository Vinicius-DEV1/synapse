import { ipcMain } from 'electron';
import { getDb } from '../db/connection';
import { isModuleUnlocked } from './auth';

export function registerCultureHandlers() {
  ipcMain.handle('culture:get-items', async () => {
    if (!isModuleUnlocked('notes')) throw new Error('Cofre principal bloqueado');
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM culture.items WHERE deleted_at IS NULL ORDER BY updated_at DESC', (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('culture:create-item', async (_, item: any) => {
    if (!isModuleUnlocked('notes')) throw new Error('Cofre principal bloqueado');
    const id = 'cult_' + Date.now().toString(36);
    return new Promise((resolve, reject) => {
      getDb().run(
        `INSERT INTO culture.items (id, title, type, synopsis, cover_image, access_link, progress, total_progress, is_goal, api_id, api_source, status, last_sync_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.title, item.type, item.synopsis, item.cover_image, item.access_link, item.progress || 0, item.total_progress || 0, item.is_goal ? 1 : 0, item.api_id || null, item.api_source || null, item.status || 'unknown', item.last_sync_at || null],
        (err) => {
          if (err) reject(err); else resolve({ id, ...item, progress: item.progress || 0, total_progress: item.total_progress || 0, is_goal: item.is_goal ? 1 : 0, status: item.status || 'unknown' });
        }
      );
    });
  });

  ipcMain.handle('culture:update-item', async (_, id: string, item: any) => {
    if (!isModuleUnlocked('notes')) throw new Error('Cofre principal bloqueado');
    return new Promise((resolve, reject) => {
      getDb().run(
        `UPDATE culture.items SET title = ?, type = ?, synopsis = ?, cover_image = ?, access_link = ?, progress = ?, total_progress = ?, is_goal = ?, api_id = ?, api_source = ?, status = ?, last_sync_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [item.title, item.type, item.synopsis, item.cover_image, item.access_link, item.progress, item.total_progress, item.is_goal ? 1 : 0, item.api_id || null, item.api_source || null, item.status || 'unknown', item.last_sync_at || null, id],
        (err) => {
          if (err) reject(err); else resolve({ success: true, id, ...item });
        }
      );
    });
  });

  ipcMain.handle('culture:update-progress', async (_, id: string, progress: number) => {
    if (!isModuleUnlocked('notes')) throw new Error('Cofre principal bloqueado');
    return new Promise((resolve, reject) => {
      getDb().run(
        `UPDATE culture.items SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [progress, id],
        (err) => {
          if (err) reject(err); else resolve({ success: true, id, progress });
        }
      );
    });
  });

  ipcMain.handle('culture:delete-item', async (_, id: string) => {
    if (!isModuleUnlocked('notes')) throw new Error('Cofre principal bloqueado');
    return new Promise((resolve, reject) => {
      getDb().run(`UPDATE culture.items SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id], (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });

  // --- EPISODES IPC ---

  ipcMain.handle('culture:get-episodes', async (_, itemId: string) => {
    if (!isModuleUnlocked('notes')) throw new Error('Cofre principal bloqueado');
    return new Promise((resolve, reject) => {
      getDb().all(
        'SELECT * FROM culture.episodes WHERE item_id = ? ORDER BY episode_number ASC',
        [itemId],
        (err, rows) => {
          if (err) reject(err); else resolve(rows || []);
        }
      );
    });
  });

  ipcMain.handle('culture:save-episodes', async (_, itemId: string, episodes: any[]) => {
    if (!isModuleUnlocked('notes')) throw new Error('Cofre principal bloqueado');
    const db = getDb();
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(`
          INSERT INTO culture.episodes (id, item_id, episode_number, title, synopsis, is_watched, aired_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            title = excluded.title, 
            synopsis = excluded.synopsis,
            aired_at = excluded.aired_at,
            updated_at = CURRENT_TIMESTAMP
        `);

        for (const ep of episodes) {
          // ID único fixo para o episódio baseado na API para evitar duplicações se recarregar
          const epId = ep.id || `ep_${itemId}_${ep.episode_number}`;
          stmt.run([epId, itemId, ep.episode_number, ep.title, ep.synopsis || '', ep.is_watched ? 1 : 0, ep.aired_at || null]);
        }

        stmt.finalize();
        
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
            resolve({ success: true, count: episodes.length });
          }
        });
      });
    });
  });

  ipcMain.handle('culture:toggle-episode-watched', async (_, episodeId: string, isWatched: boolean) => {
    if (!isModuleUnlocked('notes')) throw new Error('Cofre principal bloqueado');
    return new Promise((resolve, reject) => {
      getDb().run(
        `UPDATE culture.episodes SET is_watched = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [isWatched ? 1 : 0, episodeId],
        (err) => {
          if (err) reject(err); else resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('culture:get-recent-releases', async () => {
    if (!isModuleUnlocked('notes')) throw new Error('Cofre principal bloqueado');
    return new Promise((resolve, reject) => {
      getDb().all(`
        SELECT e.*, i.title as item_title, i.cover_image as item_cover
        FROM culture.episodes e
        JOIN culture.items i ON e.item_id = i.id
        WHERE e.is_watched = 0
          AND e.aired_at IS NOT NULL
          AND e.aired_at <= CURRENT_TIMESTAMP
          AND e.aired_at >= datetime('now', '-14 days')
        ORDER BY e.aired_at DESC
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  });
}
