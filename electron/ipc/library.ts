import { ipcMain } from 'electron';
import { getDb } from '../db/connection';
import { isModuleUnlocked } from './auth';

export function registerLibraryHandlers() {
  ipcMain.handle('library:get-books', async () => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM library.library_books WHERE deleted_at IS NULL ORDER BY updated_at DESC', (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('library:import-book', async () => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    
    const { dialog } = require('electron');
    const path = require('path');
    const fs = require('fs');

    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Livros', extensions: ['pdf', 'epub'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    
    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    
    // Ler o arquivo na memória para salvar ou para mandar pro frontend extrair os metadados (como capa e título real)
    // Para simplificar e manter E2EE puro, a importação bruta cria o registro.
    // O ideal é usar fs para ler e encriptar e colocar no storage appData
    // Mas o usuário antigo salvava como file://
    
    const id = 'book_' + Date.now().toString(36);
    return new Promise((resolve, reject) => {
      getDb().run(
        `INSERT INTO library.library_books (id, title, file_path, total_pages) VALUES (?, ?, ?, ?)`,
        [id, fileName, 'file://' + filePath, 0],
        (err) => {
          if (err) reject(err);
          else resolve({ id, title: fileName, file_path: 'file://' + filePath, current_page: 1, reading_status: 'not_started' });
        }
      );
    });
  });

  ipcMain.handle('library:create-book', async (_, book: any) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    const id = 'book_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    return new Promise((resolve, reject) => {
      getDb().run(
        `INSERT INTO library.library_books (id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, book.title || 'Sem Título', book.author, book.file_path, book.drive_file_id, book.cover_color, book.cover_image, book.total_pages || 0],
        (err) => {
          if (err) reject(err);
          else resolve({ id, ...book, current_page: 1, reading_status: 'not_started' });
        }
      );
    });
  });

  ipcMain.handle('library:update-book', async (_, book: any) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    const updates: string[] = [];
    const values: any[] = [];
    Object.keys(book).forEach(k => {
      if (k !== 'id') {
        updates.push(`${k} = ?`);
        values.push(book[k]);
      }
    });
    if (updates.length === 0) return { success: true };
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(book.id);

    return new Promise((resolve, reject) => {
      getDb().run(`UPDATE library.library_books SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });

  ipcMain.handle('library:delete-book', async (_, id: string) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    return new Promise((resolve, reject) => {
      getDb().run(`UPDATE library.library_books SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id], (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });

  // Collections
  ipcMain.handle('library:get-collections', async () => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM library.library_collections WHERE deleted_at IS NULL ORDER BY name ASC', (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('library:create-collection', async (_, c: any) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    const id = 'col_' + Date.now().toString(36);
    return new Promise((resolve, reject) => {
      getDb().run(`INSERT INTO library.library_collections (id, name, color) VALUES (?, ?, ?)`, [id, c.name, c.color], (err) => {
        if (err) reject(err); else resolve({ id, ...c });
      });
    });
  });

  ipcMain.handle('library:update-collection', async (_, c: any) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    return new Promise((resolve, reject) => {
      getDb().run(`UPDATE library.library_collections SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [c.name, c.color, c.id], (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });

  ipcMain.handle('library:delete-collection', async (_, id: string) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    return new Promise((resolve, reject) => {
      getDb().run(`UPDATE library.library_collections SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id], (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });

  ipcMain.handle('library:get-book-collections', async (_, bookId: string) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    return new Promise((resolve, reject) => {
      getDb().all('SELECT collection_id FROM library.library_book_collections WHERE book_id = ? AND deleted_at IS NULL', [bookId], (err, rows) => {
        if (err) reject(err); else resolve((rows || []).map((r: any) => r.collection_id));
      });
    });
  });

  ipcMain.handle('library:set-book-collections', async (_, bookId: string, collectionIds: string[]) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('UPDATE library.library_book_collections SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE book_id = ?', [bookId]);
        
        const stmt = db.prepare('INSERT OR REPLACE INTO library.library_book_collections (id, book_id, collection_id, deleted_at, updated_at) VALUES (?, ?, ?, NULL, CURRENT_TIMESTAMP)');
        collectionIds.forEach(colId => {
          stmt.run(`${bookId}_${colId}`, bookId, colId);
        });
        stmt.finalize();
        
        db.run('COMMIT', (err) => {
          if (err) reject(err); else resolve({ success: true });
        });
      });
    });
  });

  // Highlights
  ipcMain.handle('library:get-highlights', async (_, bookId: string) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM library.library_highlights WHERE book_id = ? AND deleted_at IS NULL', [bookId], (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('library:create-highlight', async (_, h: any) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    const id = 'hl_' + Date.now().toString(36);
    return new Promise((resolve, reject) => {
      getDb().run(`INSERT INTO library.library_highlights (id, book_id, page_number, text_content, color, rects, highlight_type, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
        [id, h.book_id, h.page_number, h.text_content, h.color, h.rects, h.highlight_type, h.note], (err) => {
        if (err) reject(err); else resolve({ id, ...h });
      });
    });
  });
  
  ipcMain.handle('library:delete-highlight', async (_, id: string) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    return new Promise((resolve, reject) => {
      getDb().run(`UPDATE library.library_highlights SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id], (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });

  // Outros placeholders necessários para o frontend não quebrar
  ipcMain.handle('library:get-book-file', async (_, bookId: string) => {
    if (!isModuleUnlocked('library')) throw new Error('Biblioteca bloqueada');
    
    return new Promise((resolve, reject) => {
      getDb().get('SELECT file_path FROM library.library_books WHERE id = ?', [bookId], (err, row) => {
        if (err || !row) return resolve(null);
        if (row.file_path && row.file_path.startsWith('file://')) {
          const fs = require('fs');
          const p = row.file_path.replace('file://', '');
          if (fs.existsSync(p)) {
            const buffer = fs.readFileSync(p);
            resolve(buffer.toString('base64'));
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  });
  ipcMain.handle('library:get-bookmarks', async () => []);
  ipcMain.handle('library:get-ocr-cache', async () => null);
  ipcMain.handle('library:get-reading-stats', async () => ({ globalStats: { booksStarted: 0, booksFinished: 0, totalPagesRead: 0 } }));
}
