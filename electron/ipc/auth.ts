import { ipcMain } from 'electron';
import { getDb, openCoreAndAttachModules, hashAuthPassword, encryptModuleKey, decryptModuleKey } from '../db/connection';
import { setupTables } from '../db/schema';
import * as crypto from 'crypto';

let isLocked = true;
let currentAuthHash: string | null = null;
let currentUnlockedKeys: any = {};

export function registerAuthHandlers() {
  ipcMain.handle('auth:status', async () => {
    if (!isLocked) return { status: 'unencrypted' };
    try {
      const db = getDb();
      return new Promise((resolve) => {
        db.get('SELECT count(*) as count FROM keychain', (err, row: any) => {
          if (err || !row || row.count === 0) {
            resolve({ status: 'new' });
          } else {
            resolve({ status: 'encrypted' });
          }
        });
      });
    } catch {
      // If DB is not even opened (core not opened), then it's 'encrypted' or 'new'
      // We should try to open Core first to check
      try {
        await openCoreAndAttachModules({});
        const db = getDb();
        return new Promise((resolve) => {
          db.get('SELECT count(*) as count FROM keychain', (err, row: any) => {
            if (err || !row || row.count === 0) resolve({ status: 'new' });
            else resolve({ status: 'encrypted' });
          });
        });
      } catch (err) {
        return { status: 'new' }; // Fallback if no core db exists
      }
    }
  });

  ipcMain.handle('auth:login', async (_, password) => {
    try {
      await openCoreAndAttachModules({}); // Open core to read keychain
      const db = getDb();
      const authHash = hashAuthPassword(password);
      
      return new Promise((resolve) => {
        db.get('SELECT * FROM keychain WHERE auth_hash = ?', [authHash], async (err, row: any) => {
          if (err || !row) {
             return resolve({ success: false, error: 'Senha incorreta' });
          }
          
          const library = decryptModuleKey(row.library_key_enc, password);
          const finance = decryptModuleKey(row.finance_key_enc, password);
          const notes = decryptModuleKey(row.notes_key_enc, password);
          const culture = row.culture_key_enc ? decryptModuleKey(row.culture_key_enc, password) : notes;
          const anki = row.anki_key_enc ? decryptModuleKey(row.anki_key_enc, password) : notes;
          
          currentUnlockedKeys = { 
             library: library || undefined, 
             finance: finance || undefined, 
             notes: notes || undefined,
             culture: culture || undefined,
             anki: anki || undefined
          };
          
          // Re-attach with unlocked keys
          await openCoreAndAttachModules(currentUnlockedKeys);
          await setupTables();
          
          isLocked = false;
          currentAuthHash = authHash;
          resolve({ success: true, modules: Object.keys(currentUnlockedKeys).filter(k => currentUnlockedKeys[k]), keys: currentUnlockedKeys });
        });
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:setup', async (_, password, existingKeys?: { library?: string; finance?: string; notes?: string }) => {
    try {
      await openCoreAndAttachModules({});
      const db = getDb();
      
      return new Promise((resolve) => {
        db.get('SELECT count(*) as count FROM keychain', async (err, row: any) => {
          if (err && !err.message.includes('no such table')) {
             console.error('Setup SELECT err:', err);
             return resolve({ success: false, error: 'Erro DB: ' + err.message });
          }
          if (row && row.count > 0) return resolve({ success: false, error: 'Já configurado' });
          
          const authHash = hashAuthPassword(password);
          
          // Gerar chaves mestras dos módulos, ou usar chaves existentes da nuvem
          const libKey = existingKeys?.library || crypto.randomBytes(32).toString('hex');
          const finKey = existingKeys?.finance || crypto.randomBytes(32).toString('hex');
          const notKey = existingKeys?.notes || crypto.randomBytes(32).toString('hex');
          
          const libEnc = encryptModuleKey(libKey, password);
          const finEnc = encryptModuleKey(finKey, password);
          const notEnc = encryptModuleKey(notKey, password);
          
          await new Promise<void>(res => {
            db.run(`CREATE TABLE IF NOT EXISTS keychain (id TEXT PRIMARY KEY, auth_hash TEXT, library_key_enc TEXT, finance_key_enc TEXT, notes_key_enc TEXT)`, (e) => {
              if (e) console.error('Setup CREATE TABLE err:', e);
              res();
            });
          });

          db.run(`INSERT INTO keychain (id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['master', authHash, libEnc, finEnc, notEnc, notEnc, notEnc], async (insertErr) => {
              if (insertErr) {
                console.error('Setup INSERT err:', insertErr);
                return resolve({ success: false, error: insertErr.message });
              }
              
              currentUnlockedKeys = { library: libKey, finance: finKey, notes: notKey, culture: notKey, anki: notKey };
              
              try {
                await openCoreAndAttachModules(currentUnlockedKeys);
                await setupTables();
              } catch (e: any) {
                console.error('Setup Attach/Tables err:', e);
                return resolve({ success: false, error: e.message });
              }
              
              isLocked = false;
              currentAuthHash = authHash;
              resolve({ success: true, modules: ['library', 'finance', 'notes'], keys: currentUnlockedKeys });
          });
        });
      });
    } catch (err: any) {
       return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:lock', async () => {
    isLocked = true;
    currentAuthHash = null;
    currentUnlockedKeys = {};
    // Re-abre o banco apenas com core (dettach todos os módulos)
    await openCoreAndAttachModules({});
    return { success: true };
  });

  ipcMain.handle('auth:check', () => !isLocked);

  // Endpoint para criar senhas de visitantes (módulos específicos)
  ipcMain.handle('auth:add-guest-password', async (_, currentPassword, newPassword, modulesToUnlock: string[]) => {
     try {
        const db = getDb();
        const currentHash = hashAuthPassword(currentPassword);
        if (currentHash !== currentAuthHash) return { success: false, error: 'Senha mestra incorreta' };
        
        const newHash = hashAuthPassword(newPassword);
        
        // Criptografar as chaves que estão desbloqueadas em memória, se permitidas
        const libEnc = modulesToUnlock.includes('library') && currentUnlockedKeys.library ? encryptModuleKey(currentUnlockedKeys.library, newPassword) : null;
        const finEnc = modulesToUnlock.includes('finance') && currentUnlockedKeys.finance ? encryptModuleKey(currentUnlockedKeys.finance, newPassword) : null;
        const notEnc = modulesToUnlock.includes('notes') && currentUnlockedKeys.notes ? encryptModuleKey(currentUnlockedKeys.notes, newPassword) : null;
        
        const culEnc = modulesToUnlock.includes('culture') && currentUnlockedKeys.culture ? encryptModuleKey(currentUnlockedKeys.culture, newPassword) : null;
        const ankiEnc = modulesToUnlock.includes('anki') && currentUnlockedKeys.anki ? encryptModuleKey(currentUnlockedKeys.anki, newPassword) : null;
        
        return new Promise((resolve) => {
           db.run(`INSERT INTO keychain (id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc) VALUES (?, ?, ?, ?, ?, ?, ?)`,
             ['guest_' + Date.now(), newHash, libEnc, finEnc, notEnc, culEnc, ankiEnc], (err) => {
               if (err) resolve({ success: false, error: err.message });
               else resolve({ success: true });
             });
        });
      } catch (err: any) {
        return { success: false, error: err.message };
     }
  });

  ipcMain.handle('auth:create-visitor', async (_, visitorPassword, allowedModules: string[]) => {
    if (isLocked) throw new Error('Cofre principal trancado');
    
    // As chaves descriptografadas estão na memória do master user
    const libKey = allowedModules.includes('library') ? currentUnlockedKeys.library : null;
    const finKey = allowedModules.includes('finance') ? currentUnlockedKeys.finance : null;
    const notKey = allowedModules.includes('notes') ? currentUnlockedKeys.notes : null;
    
    const culKey = allowedModules.includes('culture') ? currentUnlockedKeys.culture : null;
    const ankiKey = allowedModules.includes('anki') ? currentUnlockedKeys.anki : null;
    
    const libEnc = libKey ? encryptModuleKey(libKey, visitorPassword) : null;
    const finEnc = finKey ? encryptModuleKey(finKey, visitorPassword) : null;
    const notEnc = notKey ? encryptModuleKey(notKey, visitorPassword) : null;
    const culEnc = culKey ? encryptModuleKey(culKey, visitorPassword) : null;
    const ankiEnc = ankiKey ? encryptModuleKey(ankiKey, visitorPassword) : null;
    
    const authHash = hashAuthPassword(visitorPassword);
    const id = 'visitor_' + Date.now().toString(36);
    
    return new Promise((resolve) => {
      getDb().run(
        `INSERT INTO keychain (id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, authHash, libEnc, finEnc, notEnc, culEnc, ankiEnc],
        (err) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve({ success: true, visitorId: id });
        }
      );
    });
  });

  ipcMain.handle('auth:get-visitors', async () => {
    if (isLocked) return [];
    return new Promise((resolve) => {
      getDb().all('SELECT id, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc FROM keychain WHERE id != "master"', (err, rows) => {
        if (err || !rows) return resolve([]);
        
        const visitors = rows.map((r: any) => ({
          id: r.id,
          modules: [
            r.library_key_enc ? 'library' : null,
            r.finance_key_enc ? 'finance' : null,
            r.notes_key_enc ? 'notes' : null,
            r.culture_key_enc ? 'culture' : null,
            r.anki_key_enc ? 'anki' : null
          ].filter(Boolean)
        }));
        
        resolve(visitors);
      });
    });
  });

  ipcMain.handle('auth:delete-visitor', async (_, id: string) => {
    if (isLocked) throw new Error('Cofre principal trancado');
    if (id === 'master') throw new Error('Não é possível deletar a senha mestra');
    
    return new Promise((resolve) => {
      getDb().run('DELETE FROM keychain WHERE id = ?', [id], (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      });
    });
  });
}

export function isModuleUnlocked(module: string): boolean {
  return !!currentUnlockedKeys[module];
}

export function getUnlockedKeys() {
  return currentUnlockedKeys;
}
