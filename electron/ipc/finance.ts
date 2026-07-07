import { ipcMain } from 'electron';
import { getDb } from '../db/connection';
import { isModuleUnlocked } from './auth';

export function registerFinanceHandlers() {
  ipcMain.handle('finance:get-transactions', async () => {
    if (!isModuleUnlocked('finance')) throw new Error('Módulo financeiro bloqueado');
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM finance.transactions WHERE deleted_at IS NULL ORDER BY date DESC', (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('finance:create-transaction', async (_, tx: any) => {
    if (!isModuleUnlocked('finance')) throw new Error('Módulo financeiro bloqueado');
    const id = 'tx_' + Date.now().toString(36);
    return new Promise((resolve, reject) => {
      getDb().run(
        `INSERT INTO finance.transactions (id, description, amount, type, category, date, is_recurring, recurrence_period, recurrence_end_date, is_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, tx.description, tx.amount, tx.type, tx.category, tx.date, tx.is_recurring ? 1 : 0, tx.recurrence_period, tx.recurrence_end_date, tx.is_paid !== false ? 1 : 0],
        (err) => {
          if (err) reject(err); else resolve({ id, ...tx });
        }
      );
    });
  });

  ipcMain.handle('finance:delete-transaction', async (_, id: string) => {
    if (!isModuleUnlocked('finance')) throw new Error('Módulo financeiro bloqueado');
    return new Promise((resolve, reject) => {
      getDb().run(`UPDATE finance.transactions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id], (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });

  ipcMain.handle('finance:update-transaction', async (_, id: string, tx: any) => {
    if (!isModuleUnlocked('finance')) throw new Error('Módulo financeiro bloqueado');
    return new Promise((resolve, reject) => {
      const keys = Object.keys(tx);
      if (keys.length === 0) return resolve({ success: true });
      const updates = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => tx[k]);
      values.push(id);
      
      getDb().run(
        `UPDATE finance.transactions SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err); else resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('finance:get-wishlist', async () => {
    if (!isModuleUnlocked('finance')) throw new Error('Módulo financeiro bloqueado');
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM finance.wishlist WHERE deleted_at IS NULL ORDER BY priority DESC', (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('finance:create-wishlist', async (_, item: any) => {
    if (!isModuleUnlocked('finance')) throw new Error('Módulo financeiro bloqueado');
    const id = 'wish_' + Date.now().toString(36);
    return new Promise((resolve, reject) => {
      getDb().run(`INSERT INTO finance.wishlist (id, title, price, priority, link, description, category, expected_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, item.title, item.price, item.priority || 'medium', item.link || null, item.description || null, item.category || 'Geral', item.expected_date || null], (err) => {
        if (err) reject(err); else resolve({ id, ...item });
      });
    });
  });

  ipcMain.handle('finance:update-wishlist', async (_, id: string, item: any) => {
    if (!isModuleUnlocked('finance')) throw new Error('Módulo financeiro bloqueado');
    return new Promise((resolve, reject) => {
      const keys = Object.keys(item);
      if (keys.length === 0) return resolve({ success: true });
      const updates = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => item[k]);
      values.push(id);
      
      getDb().run(
        `UPDATE finance.wishlist SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err); else resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('finance:delete-wishlist', async (_, id: string) => {
    if (!isModuleUnlocked('finance')) throw new Error('Módulo financeiro bloqueado');
    return new Promise((resolve, reject) => {
      getDb().run(`UPDATE finance.wishlist SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id], (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });
}
