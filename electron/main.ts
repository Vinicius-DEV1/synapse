import { app, BrowserWindow, ipcMain, powerMonitor } from 'electron';
import * as path from 'path';
import * as sqlite3 from '@journeyapps/sqlcipher';
import * as fs from 'fs';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let db: sqlite3.Database | null = null;
let shouldLockOnSuspend = true;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function setupTables() {
  if (!db) return;
  db.run('PRAGMA foreign_keys = ON');
  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      title TEXT NOT NULL DEFAULT 'Nova Página',
      icon TEXT DEFAULT '📄',
      content TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE
    )
  `);
  // Add deleted_at to existing pages table if missing (migration)
  db.run(`ALTER TABLE pages ADD COLUMN deleted_at DATETIME DEFAULT NULL`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS page_history (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      content TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT DEFAULT '',
      date TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    )
  `);
  // Migration
  db.run(`ALTER TABLE transactions ADD COLUMN deleted_at DATETIME DEFAULT NULL`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      estimated_cost REAL NOT NULL,
      priority TEXT DEFAULT 'medium',
      expected_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    )
  `);
  // Migration
  db.run(`ALTER TABLE wishlist ADD COLUMN deleted_at DATETIME DEFAULT NULL`, () => {});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../icon.png'),
    backgroundColor: '#0f0e17',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:35174');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  const lockApp = () => {
    if (db) {
      db.close();
      db = null;
    }
    if (mainWindow) {
      mainWindow.webContents.send('app:lock');
    }
  };

  powerMonitor.on('suspend', () => {
    if (shouldLockOnSuspend) lockApp();
  });
  powerMonitor.on('lock-screen', () => {
    if (shouldLockOnSuspend) lockApp();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============ AUTH IPC HANDLERS ============

ipcMain.handle('auth:status', async () => {
  const dbPath = path.join(app.getPath('userData'), 'caderno.sqlite');
  if (!fs.existsSync(dbPath)) {
    return { status: 'new' };
  }
  
  return new Promise((resolve) => {
    const tempDb = new sqlite3.Database(dbPath, (err) => {
      if (err) return resolve({ status: 'error' });
      tempDb.get('SELECT count(*) FROM sqlite_master', (err2) => {
        tempDb.close();
        if (err2 && err2.message.includes('file is not a database')) {
          resolve({ status: 'encrypted' });
        } else if (err2) {
          resolve({ status: 'error' });
        } else {
          resolve({ status: 'unencrypted' });
        }
      });
    });
  });
});

ipcMain.handle('auth:login', async (_, password) => {
  return new Promise((resolve) => {
    const dbPath = path.join(app.getPath('userData'), 'caderno.sqlite');
    const tempDb = new sqlite3.Database(dbPath, (err) => {
      if (err) return resolve({ success: false, error: err.message });
      const safePwd = password.replace(/'/g, "''");
      tempDb.run(`PRAGMA key = '${safePwd}'`, () => {
        tempDb.get('SELECT count(*) FROM sqlite_master', (err2) => {
          if (err2) {
            tempDb.close();
            return resolve({ success: false, error: 'Senha incorreta' });
          }
          db = tempDb;
          setupTables();
          resolve({ success: true });
        });
      });
    });
  });
});

ipcMain.handle('auth:setup', async (_, password) => {
  const dbPath = path.join(app.getPath('userData'), 'caderno.sqlite');
  const tempEncPath = path.join(app.getPath('userData'), 'caderno_encrypted.sqlite');
  const backupPath = path.join(app.getPath('userData'), `caderno_backup_${Date.now()}.sqlite`);

  if (fs.existsSync(dbPath)) {
     // Migration
     fs.copyFileSync(dbPath, backupPath);
     
     return new Promise((resolve) => {
       const unencryptedDb = new sqlite3.Database(dbPath, () => {
         const safePwd = password.replace(/'/g, "''");
         unencryptedDb.run(`ATTACH DATABASE '${tempEncPath.replace(/\\/g, '/')}' AS encrypted KEY '${safePwd}'`, (err) => {
            if (err) return resolve({ success: false, error: err.message });
            unencryptedDb.run(`SELECT sqlcipher_export('encrypted')`, (err2) => {
              if (err2) return resolve({ success: false, error: err2.message });
              unencryptedDb.run(`DETACH DATABASE encrypted`, () => {
                 unencryptedDb.close(() => {
                   fs.unlinkSync(dbPath);
                   fs.renameSync(tempEncPath, dbPath);
                   
                   // DELETAR BACKUP DESPROTEGIDO PARA GARANTIR SEGURANÇA ZERO-KNOWLEDGE
                   if (fs.existsSync(backupPath)) {
                     fs.unlinkSync(backupPath);
                   }

                   db = new sqlite3.Database(dbPath, () => {
                     db!.run(`PRAGMA key = '${safePwd}'`, () => {
                       setupTables();
                       resolve({ success: true });
                     });
                   });
                 });
              });
            });
         });
       });
     });
  } else {
    // New database
    return new Promise((resolve) => {
      db = new sqlite3.Database(dbPath, () => {
         const safePwd = password.replace(/'/g, "''");
         db!.run(`PRAGMA key = '${safePwd}'`, () => {
            setupTables();
            resolve({ success: true });
         });
      });
    });
  }
});

ipcMain.handle('auth:change-password', async (_, newPassword) => {
   if (!db) return { success: false, error: 'DB not open' };
   return new Promise((resolve) => {
      const safePwd = newPassword.replace(/'/g, "''");
      db!.run(`PRAGMA rekey = '${safePwd}'`, (err) => {
         if (err) resolve({ success: false, error: err.message });
         else resolve({ success: true });
      });
   });
});

ipcMain.handle('auth:lock', async () => {
  if (db) {
    db.close();
    db = null;
  }
});

ipcMain.handle('auth:set-preferences', async (_, prefs: { autoLockOnSuspend: boolean }) => {
  shouldLockOnSuspend = prefs.autoLockOnSuspend;
});

// ============ IPC HANDLERS ============

ipcMain.handle('db:get-all-pages', async () => {
  return new Promise((resolve, reject) => {
    if (!db) return reject('DB not open');
    db.all('SELECT * FROM pages WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('db:create-page', async (_, page: { parentId: string | null; title?: string; icon?: string }) => {
  if (!db) throw new Error('DB not open');
  const id = generateId();
  const title = page.title || 'Nova Página';
  const icon = page.icon || '📄';

  const maxOrder: number = await new Promise((resolve, reject) => {
    const q = page.parentId
      ? 'SELECT COALESCE(MAX(sort_order), -1) as maxOrd FROM pages WHERE parent_id = ? AND deleted_at IS NULL'
      : 'SELECT COALESCE(MAX(sort_order), -1) as maxOrd FROM pages WHERE parent_id IS NULL AND deleted_at IS NULL';
    const params = page.parentId ? [page.parentId] : [];
    db!.get(q, params, (err, row: any) => {
      if (err) reject(err);
      else resolve(row?.maxOrd ?? -1);
    });
  });

  return new Promise((resolve, reject) => {
    const stmt = db!.prepare(
      'INSERT INTO pages (id, parent_id, title, icon, content, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run([id, page.parentId || null, title, icon, '', maxOrder + 1], function (err) {
      if (err) reject(err);
      else {
        resolve({
          id,
          parent_id: page.parentId || null,
          title,
          icon,
          content: '',
          sort_order: maxOrder + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });
    stmt.finalize();
  });
});

ipcMain.handle('db:update-page', async (_, page: { id: string; title?: string; icon?: string; content?: string; parent_id?: string | null }) => {
  if (!db) throw new Error('DB not open');
  const fields: string[] = [];
  const values: any[] = [];

  if (page.title !== undefined) { fields.push('title = ?'); values.push(page.title); }
  if (page.icon !== undefined) { fields.push('icon = ?'); values.push(page.icon); }
  if (page.content !== undefined) { fields.push('content = ?'); values.push(page.content); }
  if (page.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(page.parent_id); }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(page.id);

  return new Promise((resolve, reject) => {
    const stmt = db!.prepare(`UPDATE pages SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`);
    stmt.run(values, function (err) {
      if (err) {
        reject(err);
        stmt.finalize();
        return;
      }
      const changes = this.changes;
      stmt.finalize();

      if (page.content !== undefined) {
        const histId = generateId();
        db!.run('INSERT INTO page_history (id, page_id, content) VALUES (?, ?, ?)', [histId, page.id, page.content], (histErr) => {
          if (histErr) console.error('Failed to save page history:', histErr);
          resolve(changes);
        });
      } else {
        resolve(changes);
      }
    });
  });
});

ipcMain.handle('db:get-page-history', async (_, pageId: string) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject('DB not open');
    db.all('SELECT * FROM page_history WHERE page_id = ? ORDER BY created_at DESC', [pageId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('db:delete-page', async (_, id: string) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    const deleteRecursive = (pageId: string): Promise<void> => {
      return new Promise((res, rej) => {
        db!.all('SELECT id FROM pages WHERE parent_id = ? AND deleted_at IS NULL', [pageId], (err, children: any[]) => {
          if (err) return rej(err);
          Promise.all(children.map((c) => deleteRecursive(c.id)))
            .then(() => {
              db!.run('UPDATE pages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [pageId], (err2) => {
                if (err2) rej(err2);
                else res();
              });
            })
            .catch(rej);
        });
      });
    };

    deleteRecursive(id).then(() => resolve(true)).catch(reject);
  });
});

ipcMain.handle('db:reorder-pages', async (_, updates: { id: string; sort_order: number }[]) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    const stmt = db!.prepare('UPDATE pages SET sort_order = ? WHERE id = ?');
    let remaining = updates.length;
    if (remaining === 0) return resolve(true);

    for (const u of updates) {
      stmt.run([u.sort_order, u.id], (err) => {
        if (err) return reject(err);
        remaining--;
        if (remaining === 0) {
          stmt.finalize();
          resolve(true);
        }
      });
    }
  });
});

// ============ FINANCE IPC HANDLERS ============

ipcMain.handle('finance:get-transactions', async () => {
  return new Promise((resolve, reject) => {
    if (!db) return reject('DB not open');
    db.all('SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY date DESC, created_at DESC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('finance:create-transaction', async (_, tx: { type: string; amount: number; description: string; category?: string; date: string; status?: string }) => {
  if (!db) throw new Error('DB not open');
  const id = generateId();
  return new Promise((resolve, reject) => {
    const stmt = db!.prepare('INSERT INTO transactions (id, type, amount, description, category, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run([id, tx.type, tx.amount, tx.description, tx.category || '', tx.date, tx.status || 'completed'], function (err) {
      if (err) reject(err);
      else {
        resolve({
          id,
          ...tx,
          category: tx.category || '',
          status: tx.status || 'completed',
          created_at: new Date().toISOString()
        });
      }
    });
    stmt.finalize();
  });
});

ipcMain.handle('finance:delete-transaction', async (_, id: string) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.run('UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

ipcMain.handle('finance:get-wishlist', async () => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.all('SELECT * FROM wishlist WHERE deleted_at IS NULL ORDER BY created_at DESC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('finance:create-wishlist', async (_, item: { title: string; estimated_cost: number; priority?: string; expected_date?: string }) => {
  if (!db) throw new Error('DB not open');
  const id = generateId();
  return new Promise((resolve, reject) => {
    const stmt = db!.prepare('INSERT INTO wishlist (id, title, estimated_cost, priority, expected_date) VALUES (?, ?, ?, ?, ?)');
    stmt.run([id, item.title, item.estimated_cost, item.priority || 'medium', item.expected_date || null], function (err) {
      if (err) reject(err);
      else {
        resolve({
          id,
          ...item,
          priority: item.priority || 'medium',
          expected_date: item.expected_date || null,
          created_at: new Date().toISOString()
        });
      }
    });
    stmt.finalize();
  });
});

ipcMain.handle('finance:delete-wishlist', async (_, id: string) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.run('UPDATE wishlist SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});
