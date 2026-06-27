import { app, BrowserWindow, ipcMain, powerMonitor, dialog } from 'electron';
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
    CREATE TABLE IF NOT EXISTS config (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    )
  `);
  // Migrations for config
  db.run(`ALTER TABLE config ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});
  db.run(`ALTER TABLE config ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});
  db.run(`ALTER TABLE config ADD COLUMN deleted_at DATETIME DEFAULT NULL`, () => {});

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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    )
  `);
  // Migrations
  db.run(`ALTER TABLE transactions ADD COLUMN deleted_at DATETIME DEFAULT NULL`, () => {});
  db.run(`ALTER TABLE transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      estimated_cost REAL NOT NULL,
      priority TEXT DEFAULT 'medium',
      expected_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    )
  `);
  // Migrations
  db.run(`ALTER TABLE wishlist ADD COLUMN deleted_at DATETIME DEFAULT NULL`, () => {});
  db.run(`ALTER TABLE wishlist ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS library_books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      cover_image TEXT DEFAULT '',
      total_pages INTEGER DEFAULT 0,
      last_read_page INTEGER DEFAULT 1,
      reading_status TEXT DEFAULT 'not_started',
      last_read_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL,
      drive_file_id TEXT DEFAULT NULL
    )
  `);
  // Migration for library_books
  db.run(`ALTER TABLE library_books ADD COLUMN drive_file_id TEXT DEFAULT NULL`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS library_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#8b5cf6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    )
  `);
  // Migration
  db.run(`ALTER TABLE library_collections ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS library_book_collections (
      book_id TEXT NOT NULL,
      collection_id TEXT NOT NULL,
      PRIMARY KEY (book_id, collection_id),
      FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE,
      FOREIGN KEY (collection_id) REFERENCES library_collections(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS library_highlights (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      text_content TEXT DEFAULT '',
      color TEXT DEFAULT 'yellow',
      rects TEXT DEFAULT '[]',
      highlight_type TEXT DEFAULT 'text',
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE
    )
  `);
  // Migration
  db.run(`ALTER TABLE library_highlights ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS library_bookmarks (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      label TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE
    )
  `);
  // Migration
  db.run(`ALTER TABLE library_bookmarks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS library_ocr_cache (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      text_content TEXT DEFAULT '',
      word_boxes TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS library_reading_sessions (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      started_at DATETIME NOT NULL,
      ended_at DATETIME DEFAULT NULL,
      pages_read INTEGER DEFAULT 0,
      start_page INTEGER DEFAULT 1,
      end_page INTEGER DEFAULT 1,
      FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE
    )
  `);
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
  mainWindow.webContents.openDevTools();
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
              db!.run('UPDATE pages SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [pageId], (err2) => {
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

ipcMain.handle('db:export-backup', async () => {
  if (!mainWindow) throw new Error('Window not available');
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Salvar Backup de Emergência (Criptografado)',
    defaultPath: path.join(app.getPath('documents'), `caderno_backup_${new Date().toISOString().slice(0,10)}.sqlite`),
    filters: [{ name: 'SQLite DB', extensions: ['sqlite'] }]
  });

  if (result.canceled || !result.filePath) return { success: false, canceled: true };

  const dbPath = path.join(app.getPath('userData'), 'caderno.sqlite');
  
  try {
    fs.copyFileSync(dbPath, result.filePath);
    return { success: true, path: result.filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
    db!.run('UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], (err) => {
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
    db!.run('UPDATE wishlist SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

// ============ LIBRARY IPC HANDLERS ============

// --- Books ---

ipcMain.handle('library:get-books', async () => {
  return new Promise((resolve, reject) => {
    if (!db) return reject('DB not open');
    db.all('SELECT * FROM library_books WHERE deleted_at IS NULL ORDER BY last_read_at DESC NULLS LAST, created_at DESC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('library:import-book', async () => {
  if (!db || !mainWindow) throw new Error('DB not open');

  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const selectedPath = result.filePaths[0];
  const libraryDir = path.join(app.getPath('userData'), 'library');
  if (!fs.existsSync(libraryDir)) fs.mkdirSync(libraryDir, { recursive: true });

  const uniqueName = generateId() + '.pdf';
  const destPath = path.join(libraryDir, uniqueName);
  fs.copyFileSync(selectedPath, destPath);

  const originalName = path.basename(selectedPath);
  const title = originalName.replace(/\.pdf$/i, '');
  const id = generateId();

  return new Promise((resolve, reject) => {
    const stmt = db!.prepare('INSERT INTO library_books (id, title, author, file_path, original_name, total_pages) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run([id, title, '', uniqueName, originalName, 0], function (err) {
      if (err) reject(err);
      else {
        resolve({
          id,
          title,
          author: '',
          file_path: uniqueName,
          original_name: originalName,
          cover_image: '',
          total_pages: 0,
          last_read_page: 1,
          reading_status: 'not_started',
          last_read_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        });
      }
    });
    stmt.finalize();
  });
});

ipcMain.handle('library:delete-book', async (_, id: string) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.run('UPDATE library_books SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

ipcMain.handle('library:update-book', async (_, book: { id: string; title?: string; author?: string; last_read_page?: number; reading_status?: string; last_read_at?: string; total_pages?: number; cover_image?: string }) => {
  if (!db) throw new Error('DB not open');
  const fields: string[] = [];
  const values: any[] = [];

  if (book.title !== undefined) { fields.push('title = ?'); values.push(book.title); }
  if (book.author !== undefined) { fields.push('author = ?'); values.push(book.author); }
  if (book.last_read_page !== undefined) { fields.push('last_read_page = ?'); values.push(book.last_read_page); }
  if (book.reading_status !== undefined) { fields.push('reading_status = ?'); values.push(book.reading_status); }
  if (book.last_read_at !== undefined) { fields.push('last_read_at = ?'); values.push(book.last_read_at); }
  if (book.total_pages !== undefined) { fields.push('total_pages = ?'); values.push(book.total_pages); }
  if (book.cover_image !== undefined) { fields.push('cover_image = ?'); values.push(book.cover_image); }

  if (fields.length === 0) return 0;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(book.id);

  return new Promise((resolve, reject) => {
    const stmt = db!.prepare(`UPDATE library_books SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`);
    stmt.run(values, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
    stmt.finalize();
  });
});

ipcMain.handle('library:get-book-file', async (_, id: string) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.get('SELECT file_path FROM library_books WHERE id = ? AND deleted_at IS NULL', [id], (err, row: any) => {
      if (err) reject(err);
      else if (!row) resolve(null);
      else {
        const libraryDir = path.join(app.getPath('userData'), 'library');
        const fullPath = path.join(libraryDir, row.file_path);
        fs.readFile(fullPath, (readErr, data) => {
          if (readErr) reject(readErr);
          else resolve(data);
        });
      }
    });
  });
});

// --- Collections ---

ipcMain.handle('library:get-collections', async () => {
  return new Promise((resolve, reject) => {
    if (!db) return reject('DB not open');
    db.all('SELECT * FROM library_collections WHERE deleted_at IS NULL ORDER BY name', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('library:create-collection', async (_, c: { name: string; color?: string }) => {
  if (!db) throw new Error('DB not open');
  const id = generateId();
  return new Promise((resolve, reject) => {
    const stmt = db!.prepare('INSERT INTO library_collections (id, name, color) VALUES (?, ?, ?)');
    stmt.run([id, c.name, c.color || '#8b5cf6'], function (err) {
      if (err) reject(err);
      else {
        resolve({
          id,
          name: c.name,
          color: c.color || '#8b5cf6',
          created_at: new Date().toISOString(),
          deleted_at: null
        });
      }
    });
    stmt.finalize();
  });
});

ipcMain.handle('library:update-collection', async (_, c: { id: string; name?: string; color?: string }) => {
  if (!db) throw new Error('DB not open');
  const fields: string[] = [];
  const values: any[] = [];

  if (c.name !== undefined) { fields.push('name = ?'); values.push(c.name); }
  if (c.color !== undefined) { fields.push('color = ?'); values.push(c.color); }

  if (fields.length === 0) return 0;

  values.push(c.id);

  return new Promise((resolve, reject) => {
    const stmt = db!.prepare(`UPDATE library_collections SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`);
    stmt.run(values, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
    stmt.finalize();
  });
});

ipcMain.handle('library:delete-collection', async (_, id: string) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.run('UPDATE library_collections SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

ipcMain.handle('library:set-book-collections', async (_, bookId: string, collectionIds: string[]) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.run('DELETE FROM library_book_collections WHERE book_id = ?', [bookId], (err) => {
      if (err) return reject(err);
      if (!collectionIds || collectionIds.length === 0) return resolve(true);

      const stmt = db!.prepare('INSERT INTO library_book_collections (book_id, collection_id) VALUES (?, ?)');
      let remaining = collectionIds.length;

      for (const colId of collectionIds) {
        stmt.run([bookId, colId], (err2) => {
          if (err2) return reject(err2);
          remaining--;
          if (remaining === 0) {
            stmt.finalize();
            resolve(true);
          }
        });
      }
    });
  });
});

ipcMain.handle('library:get-book-collections', async (_, bookId: string) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject('DB not open');
    db.all('SELECT c.* FROM library_collections c INNER JOIN library_book_collections bc ON c.id = bc.collection_id WHERE bc.book_id = ? AND c.deleted_at IS NULL', [bookId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// --- Highlights ---

ipcMain.handle('library:get-highlights', async (_, bookId: string) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject('DB not open');
    db.all('SELECT * FROM library_highlights WHERE book_id = ? AND deleted_at IS NULL ORDER BY page_number, created_at', [bookId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('library:create-highlight', async (_, h: { book_id: string; page_number: number; text_content?: string; color?: string; rects?: string; highlight_type?: string; note?: string }) => {
  if (!db) throw new Error('DB not open');
  const id = generateId();
  return new Promise((resolve, reject) => {
    const stmt = db!.prepare('INSERT INTO library_highlights (id, book_id, page_number, text_content, color, rects, highlight_type, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run([id, h.book_id, h.page_number, h.text_content || '', h.color || 'yellow', h.rects || '[]', h.highlight_type || 'text', h.note || ''], function (err) {
      if (err) reject(err);
      else {
        resolve({
          id,
          book_id: h.book_id,
          page_number: h.page_number,
          text_content: h.text_content || '',
          color: h.color || 'yellow',
          rects: h.rects || '[]',
          highlight_type: h.highlight_type || 'text',
          note: h.note || '',
          created_at: new Date().toISOString(),
          deleted_at: null
        });
      }
    });
    stmt.finalize();
  });
});

ipcMain.handle('library:update-highlight', async (_, h: { id: string; color?: string; note?: string; rects?: string }) => {
  if (!db) throw new Error('DB not open');
  const fields: string[] = [];
  const values: any[] = [];

  if (h.color !== undefined) { fields.push('color = ?'); values.push(h.color); }
  if (h.note !== undefined) { fields.push('note = ?'); values.push(h.note); }
  if (h.rects !== undefined) { fields.push('rects = ?'); values.push(h.rects); }

  if (fields.length === 0) return 0;

  values.push(h.id);

  return new Promise((resolve, reject) => {
    const stmt = db!.prepare(`UPDATE library_highlights SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`);
    stmt.run(values, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
    stmt.finalize();
  });
});

ipcMain.handle('library:delete-highlight', async (_, id: string) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.run('UPDATE library_highlights SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

// --- Bookmarks ---

ipcMain.handle('library:get-bookmarks', async (_, bookId: string) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject('DB not open');
    db.all('SELECT * FROM library_bookmarks WHERE book_id = ? AND deleted_at IS NULL ORDER BY page_number', [bookId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('library:create-bookmark', async (_, b: { book_id: string; page_number: number; label?: string }) => {
  if (!db) throw new Error('DB not open');
  const id = generateId();
  return new Promise((resolve, reject) => {
    // Check if bookmark already exists for this book+page
    db!.get('SELECT id FROM library_bookmarks WHERE book_id = ? AND page_number = ? AND deleted_at IS NULL', [b.book_id, b.page_number], (err, existing: any) => {
      if (err) return reject(err);

      if (existing) {
        // Update existing bookmark
        db!.run('UPDATE library_bookmarks SET label = ? WHERE id = ?', [b.label || '', existing.id], (err2) => {
          if (err2) reject(err2);
          else resolve({ id: existing.id, book_id: b.book_id, page_number: b.page_number, label: b.label || '' });
        });
      } else {
        // Insert new bookmark
        const stmt = db!.prepare('INSERT INTO library_bookmarks (id, book_id, page_number, label) VALUES (?, ?, ?, ?)');
        stmt.run([id, b.book_id, b.page_number, b.label || ''], function (err2) {
          if (err2) reject(err2);
          else {
            resolve({
              id,
              book_id: b.book_id,
              page_number: b.page_number,
              label: b.label || '',
              created_at: new Date().toISOString(),
              deleted_at: null
            });
          }
        });
        stmt.finalize();
      }
    });
  });
});

ipcMain.handle('library:update-bookmark', async (_, b: { id: string; label: string }) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.run('UPDATE library_bookmarks SET label = ? WHERE id = ? AND deleted_at IS NULL', [b.label, b.id], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
});

ipcMain.handle('library:delete-bookmark', async (_, id: string) => {
  if (!db) throw new Error('DB not open');
  return new Promise((resolve, reject) => {
    db!.run('UPDATE library_bookmarks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

// --- OCR Cache ---

ipcMain.handle('library:get-ocr-cache', async (_, bookId: string, pageNumber: number) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject('DB not open');
    db.get('SELECT * FROM library_ocr_cache WHERE book_id = ? AND page_number = ? LIMIT 1', [bookId, pageNumber], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
});

ipcMain.handle('library:save-ocr-cache', async (_, data: { book_id: string; page_number: number; text_content?: string; word_boxes?: string }) => {
  if (!db) throw new Error('DB not open');
  const id = generateId();
  return new Promise((resolve, reject) => {
    const stmt = db!.prepare('INSERT OR REPLACE INTO library_ocr_cache (id, book_id, page_number, text_content, word_boxes) VALUES (?, ?, ?, ?, ?)');
    stmt.run([id, data.book_id, data.page_number, data.text_content || '', data.word_boxes || '[]'], function (err) {
      if (err) reject(err);
      else resolve({ id, ...data });
    });
    stmt.finalize();
  });
});

// --- Reading Sessions ---

ipcMain.handle('library:start-reading-session', async (_, data: { book_id: string; start_page?: number }) => {
  if (!db) throw new Error('DB not open');
  const id = generateId();
  const startedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const stmt = db!.prepare('INSERT INTO library_reading_sessions (id, book_id, started_at, start_page) VALUES (?, ?, ?, ?)');
    stmt.run([id, data.book_id, startedAt, data.start_page || 1], function (err) {
      if (err) reject(err);
      else {
        resolve({
          id,
          book_id: data.book_id,
          started_at: startedAt,
          ended_at: null,
          pages_read: 0,
          start_page: data.start_page || 1,
          end_page: data.start_page || 1
        });
      }
    });
    stmt.finalize();
  });
});

ipcMain.handle('library:end-reading-session', async (_, data: { id: string; end_page: number; pages_read: number }) => {
  if (!db) throw new Error('DB not open');
  const endedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    db!.run('UPDATE library_reading_sessions SET ended_at = ?, end_page = ?, pages_read = ? WHERE id = ?', [endedAt, data.end_page, data.pages_read, data.id], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
});

ipcMain.handle('library:get-reading-stats', async (_, bookId?: string) => {
  if (!db) throw new Error('DB not open');

  if (bookId) {
    // Per-book stats
    return new Promise((resolve, reject) => {
      db!.all('SELECT * FROM library_reading_sessions WHERE book_id = ? AND ended_at IS NOT NULL', [bookId], (err, rows: any[]) => {
        if (err) return reject(err);

        let totalTimeMinutes = 0;
        let totalPagesRead = 0;

        for (const row of rows) {
          const started = new Date(row.started_at).getTime();
          const ended = new Date(row.ended_at).getTime();
          totalTimeMinutes += (ended - started) / 60000;
          totalPagesRead += row.pages_read || 0;
        }

        const sessionsCount = rows.length;
        const averagePagesPerSession = sessionsCount > 0 ? Math.round(totalPagesRead / sessionsCount) : 0;
        const lastReadAt = rows.length > 0 ? rows[rows.length - 1].ended_at : null;

        resolve({
          totalTimeMinutes: Math.round(totalTimeMinutes),
          totalPagesRead,
          averagePagesPerSession,
          sessionsCount,
          lastReadAt
        });
      });
    });
  }

  // Global stats
  return new Promise((resolve, reject) => {
    db!.get("SELECT COUNT(*) as count FROM library_books WHERE reading_status != 'not_started' AND deleted_at IS NULL", [], (err, booksStartedRow: any) => {
      if (err) return reject(err);
      const totalBooksStarted = booksStartedRow?.count || 0;

      db!.get("SELECT COUNT(*) as count FROM library_books WHERE reading_status = 'finished' AND deleted_at IS NULL", [], (err2, booksFinishedRow: any) => {
        if (err2) return reject(err2);
        const totalBooksFinished = booksFinishedRow?.count || 0;

        db!.all('SELECT * FROM library_reading_sessions WHERE ended_at IS NOT NULL', [], (err3, sessions: any[]) => {
          if (err3) return reject(err3);

          let totalTimeMinutes = 0;
          let totalPagesRead = 0;

          for (const s of sessions) {
            const started = new Date(s.started_at).getTime();
            const ended = new Date(s.ended_at).getTime();
            totalTimeMinutes += (ended - started) / 60000;
            totalPagesRead += s.pages_read || 0;
          }

          // Get distinct reading dates for streak calculation
          db!.all("SELECT DISTINCT date(started_at) as reading_date FROM library_reading_sessions WHERE ended_at IS NOT NULL ORDER BY reading_date DESC", [], (err4, dateRows: any[]) => {
            if (err4) return reject(err4);

            const readingDates = dateRows.map((r: any) => r.reading_date);

            // Calculate current streak
            let currentStreak = 0;
            let longestStreak = 0;
            let tempStreak = 0;

            if (readingDates.length > 0) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayStr = today.toISOString().split('T')[0];

              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];

              // Current streak: count consecutive days from today or yesterday backwards
              if (readingDates[0] === todayStr || readingDates[0] === yesterdayStr) {
                let checkDate = new Date(readingDates[0]);
                for (const dateStr of readingDates) {
                  const expected = checkDate.toISOString().split('T')[0];
                  if (dateStr === expected) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                  } else {
                    break;
                  }
                }
              }

              // Longest streak
              tempStreak = 1;
              longestStreak = 1;
              for (let i = 0; i < readingDates.length - 1; i++) {
                const curr = new Date(readingDates[i]);
                const next = new Date(readingDates[i + 1]);
                const diffDays = (curr.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
                if (diffDays === 1) {
                  tempStreak++;
                  longestStreak = Math.max(longestStreak, tempStreak);
                } else {
                  tempStreak = 1;
                }
              }
            }

            // Reading days in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
            const recentReadingDays = readingDates.filter(d => d >= thirtyDaysAgoStr);

            resolve({
              totalBooksStarted,
              totalBooksFinished,
              totalTimeMinutes: Math.round(totalTimeMinutes),
              totalPagesRead,
              currentStreak,
              longestStreak,
              readingDays: recentReadingDays
            });
          });
        });
      });
    });
  });
});

import { shell } from 'electron';

// -- DRIVE API --
ipcMain.handle('drive:open-external-url', async (_, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle('drive:get-credentials', async () => {
  return new Promise((resolve) => {
    db!.get(`SELECT value FROM config WHERE id = 'drive_credentials'`, [], (err, row: any) => {
      if (err || !row) resolve({ token: null });
      else resolve(JSON.parse(row.value));
    });
  });
});

ipcMain.handle('drive:save-credentials', async (_, data: any) => {
  return new Promise((resolve, reject) => {
    const value = JSON.stringify(data);
    db!.run(
      `INSERT INTO config (id, value, created_at, updated_at) VALUES ('drive_credentials', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       ON CONFLICT(id) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [value, value],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

// -- LOG HANDLER (diagnóstico temporário) --
const logFile = path.join(app.getPath('userData'), 'sync_debug.log');
ipcMain.handle('log:write', async (_, message: string) => {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, line);
});

// -- SYNC API (GENERIC) --
ipcMain.handle('sync:get-table', async (_, tableName: string) => {
    return new Promise((resolve, reject) => {
      const validTables = ['pages', 'transactions', 'wishlist', 'library_books', 'library_highlights', 'library_bookmarks', 'library_collections', 'config'];
      if (!validTables.includes(tableName)) return reject('Invalid table');
      db!.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('sync:upsert-row', async (_, tableName: string, row: any) => {
    return new Promise((resolve, reject) => {
      const validTables = ['pages', 'transactions', 'wishlist', 'library_books', 'library_highlights', 'library_bookmarks', 'library_collections', 'config'];
      if (!validTables.includes(tableName)) return reject('Invalid table');
      
      const keys = Object.keys(row);
      const values = Object.values(row);
      const placeholders = keys.map(() => '?').join(', ');
      
      const updateSet = keys.filter(k => k !== 'id' && k !== 'created_at')
                            .map(k => `${k} = EXCLUDED.${k}`).join(', ');
      
      let sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
      if (updateSet.length > 0) {
        sql += ` ON CONFLICT(id) DO UPDATE SET ${updateSet}`;
      } else {
        sql += ` ON CONFLICT(id) DO NOTHING`;
      }
      
      db!.run(sql, values, function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  });

