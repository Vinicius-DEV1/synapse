import { ipcMain } from 'electron';
import { getDb } from '../db/connection';
import { isModuleUnlocked } from './auth';

const TABLE_MODULE_MAP: Record<string, string> = {
  'library_books': 'library',
  'library_collections': 'library',
  'library_book_collections': 'library',
  'library_highlights': 'library',
  'library_bookmarks': 'library',
  'transactions': 'finance',
  'wishlist': 'finance',
  'pages': 'notes',
  'items': 'culture'
};

export function registerSyncHandlers() {
  ipcMain.handle('sync:get-table', async (_, tableName: string) => {
    const module = TABLE_MODULE_MAP[tableName];
    if (module && !isModuleUnlocked(module)) {
      return []; // Ignorar tabelas de módulos trancados
    }
    
    const dbName = module ? `${module}.${tableName}` : tableName;

    return new Promise((resolve, reject) => {
      getDb().all(`SELECT * FROM ${dbName}`, (err, rows) => {
        if (err) {
           // Se der erro porque a tabela não existe ou não está anexada, retorna vazio
           resolve([]);
        } else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('sync:delete-row', async (_, tableName: string, id: string) => {
    const module = TABLE_MODULE_MAP[tableName];
    if (module && !isModuleUnlocked(module)) throw new Error('Módulo trancado');
    const dbName = module ? `${module}.${tableName}` : tableName;

    return new Promise((resolve, reject) => {
      getDb().run(`DELETE FROM ${dbName} WHERE id = ?`, [id], (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });

  ipcMain.handle('sync:upsert-row', async (_, tableName: string, row: any) => {
    const module = TABLE_MODULE_MAP[tableName];
    if (module && !isModuleUnlocked(module)) throw new Error('Módulo trancado');
    const dbName = module ? `${module}.${tableName}` : tableName;

    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(k => row[k]);

    return new Promise((resolve, reject) => {
      getDb().run(
        `INSERT OR REPLACE INTO ${dbName} (${columns.join(', ')}) VALUES (${placeholders})`,
        values,
        (err) => {
          if (err) reject(err); else resolve({ success: true });
        }
      );
    });
  });
}
