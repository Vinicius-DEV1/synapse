import { ipcMain } from 'electron';
import { getDb } from '../db/connection';
import { isModuleUnlocked } from './auth';

export function registerPagesHandlers() {
  ipcMain.handle('db:get-all-pages', async () => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    return new Promise((resolve, reject) => {
      // Lazy load: content and encrypted_content are NOT fetched
      getDb().all('SELECT id, parent_id, title, icon, sort_order, crdt_state, created_at, updated_at, deleted_at, is_locked, password_salt, is_pinned, pinned_order FROM notes.pages WHERE deleted_at IS NULL ORDER BY sort_order ASC, updated_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('db:get-page-content', async (_, id: string) => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    return new Promise((resolve, reject) => {
      getDb().get('SELECT content, encrypted_content FROM notes.pages WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || { content: '', encrypted_content: null });
      });
    });
  });

  ipcMain.handle('db:create-page', async (_, page: { parentId: string | null; title?: string; icon?: string }) => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    const id = 'page_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const title = page.title || 'Sem Título';
    const icon = page.icon || 'file';
    
    return new Promise((resolve, reject) => {
      getDb().run(
        `INSERT INTO notes.pages (id, parent_id, title, icon, sort_order) VALUES (?, ?, ?, ?, 0)`,
        [id, page.parentId, title, icon],
        (err) => {
          if (err) reject(err);
          else resolve({ id, parent_id: page.parentId, title, icon, content: '', sort_order: 0, crdt_state: null, is_locked: 0 });
        }
      );
    });
  });

  ipcMain.handle('db:update-page', async (_, page: { id: string; title?: string; icon?: string; content?: string; crdt_state?: string | null; sort_order?: number; is_locked?: number; password_salt?: string | null; encrypted_content?: string | null; parent_id?: string | null; is_pinned?: number; pinned_order?: number }) => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    const updates: string[] = [];
    const values: any[] = [];
    
    if (page.title !== undefined) { updates.push('title = ?'); values.push(page.title); }
    if (page.icon !== undefined) { updates.push('icon = ?'); values.push(page.icon); }
    if (page.content !== undefined) { updates.push('content = ?'); values.push(page.content); }
    if (page.crdt_state !== undefined) { updates.push('crdt_state = ?'); values.push(page.crdt_state); }
    if (page.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(page.sort_order); }
    if (page.is_locked !== undefined) { updates.push('is_locked = ?'); values.push(page.is_locked); }
    if (page.password_salt !== undefined) { updates.push('password_salt = ?'); values.push(page.password_salt); }
    if (page.encrypted_content !== undefined) { updates.push('encrypted_content = ?'); values.push(page.encrypted_content); }
    if (page.parent_id !== undefined) { updates.push('parent_id = ?'); values.push(page.parent_id); }
    if (page.is_pinned !== undefined) { updates.push('is_pinned = ?'); values.push(page.is_pinned); }
    if (page.pinned_order !== undefined) { updates.push('pinned_order = ?'); values.push(page.pinned_order); }
    
    if (updates.length === 0) return { success: true };
    
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(page.id);
    
    return new Promise((resolve, reject) => {
      getDb().run(
        `UPDATE notes.pages SET ${updates.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('db:delete-page', async (_, id: string) => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    return new Promise((resolve, reject) => {
      getDb().run(
        `UPDATE notes.pages SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR parent_id = ?`,
        [id, id],
        (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('db:reorder-pages', async (_, updates: { id: string; sort_order: number }[]) => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    // Implementação de reordenação se existir
    return { success: true };
  });

  // --- PAGE HISTORY ---

  ipcMain.handle('db:get-page-history', async (_, pageId: string) => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    return new Promise((resolve, reject) => {
      getDb().all(
        'SELECT id, page_id, content, created_at FROM notes.page_history WHERE page_id = ? ORDER BY created_at DESC LIMIT 50',
        [pageId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  });

  ipcMain.handle('db:save-page-history', async (_, pageId: string, content: string) => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    const id = 'hist_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO notes.page_history (id, page_id, content) VALUES (?, ?, ?)',
        [id, pageId, content],
        (err) => {
          if (err) { reject(err); return; }
          // Mantém apenas as últimas 50 revisões por página
          db.run(
            `DELETE FROM notes.page_history WHERE page_id = ? AND id NOT IN (
              SELECT id FROM notes.page_history WHERE page_id = ? ORDER BY created_at DESC LIMIT 50
            )`,
            [pageId, pageId],
            () => resolve({ success: true, id })
          );
        }
      );
    });
  });

  // --- IMAGE CACHE (para imagens criptografadas do editor) ---

  ipcMain.handle('image-cache:get', async (_, id: string) => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    return new Promise((resolve, reject) => {
      getDb().get('SELECT id, data, mimeType FROM notes.image_cache WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  });

  ipcMain.handle('image-cache:put', async (_, id: string, data: ArrayBuffer, mimeType: string) => {
    if (!isModuleUnlocked('notes')) throw new Error('Módulo de notas bloqueado');
    return new Promise((resolve, reject) => {
      getDb().run(
        'INSERT OR REPLACE INTO notes.image_cache (id, data, mimeType) VALUES (?, ?, ?)',
        [id, Buffer.from(data), mimeType || 'image/png'],
        (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  });
}
