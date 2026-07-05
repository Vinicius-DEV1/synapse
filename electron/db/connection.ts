import * as sqlite3 from '@journeyapps/sqlcipher';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';

let db: sqlite3.Database | null = null;

import * as fs from 'fs';
import { safeStorage } from 'electron';

function getOrCreateVaultKey(): string {
  const vaultPath = path.join(app.getPath('userData'), 'caderno_vault.key');
  
  if (fs.existsSync(vaultPath)) {
    const fileData = fs.readFileSync(vaultPath);
    if (safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(fileData);
      } catch (err) {
        console.error("Falha ao descriptografar vault key com safeStorage. O SO pode ter mudado a chave mestre.", err);
        throw new Error("Vault decryption failed");
      }
    } else {
      // Fallback sem encriptação (Linux sem libsecret/keychain)
      return fileData.toString('utf-8');
    }
  } else {
    const newKey = crypto.randomUUID() + crypto.randomBytes(32).toString('hex');
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(newKey);
      fs.writeFileSync(vaultPath, encrypted);
    } else {
      fs.writeFileSync(vaultPath, newKey, 'utf-8');
    }
    return newKey;
  }
}

export function getDb(): sqlite3.Database {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export function closeDb(): Promise<void> {
  return new Promise((resolve) => {
    if (db) {
      db.close(() => {
        db = null;
        resolve();
      });
    } else resolve();
  });
}

/**
 * Deriva uma chave AES-256 a partir da senha.
 */
function deriveKeyFromPassword(password: string): Buffer {
  return crypto.pbkdf2Sync(password, 'caderno-keychain-salt', 600000, 32, 'sha256');
}

export function encryptModuleKey(moduleKey: string, password: string): string {
  const key = deriveKeyFromPassword(password);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(moduleKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptModuleKey(encryptedPayload: string, password: string): string | null {
  if (!encryptedPayload) return null;
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = deriveKeyFromPassword(password);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

export function hashAuthPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'caderno-auth-hash').digest('hex');
}

export interface UnlockedModules {
  library?: string;
  finance?: string;
  notes?: string;
  culture?: string;
  anki?: string;
}

export function openCoreAndAttachModules(unlockedKeys: UnlockedModules): Promise<void> {
  return new Promise((resolve, reject) => {
    const corePath = path.join(app.getPath('userData'), 'caderno_core.sqlite').replace(/\\/g, '/');
    const libraryPath = path.join(app.getPath('userData'), 'caderno_library.sqlite').replace(/\\/g, '/');
    const financePath = path.join(app.getPath('userData'), 'caderno_finance.sqlite').replace(/\\/g, '/');
    const notesPath = path.join(app.getPath('userData'), 'caderno_notes.sqlite').replace(/\\/g, '/');
    const culturePath = path.join(app.getPath('userData'), 'caderno_culture.sqlite').replace(/\\/g, '/');
    const ankiPath = path.join(app.getPath('userData'), 'caderno_anki.sqlite').replace(/\\/g, '/');
    
    let coreKey: string;
    try {
      coreKey = getOrCreateVaultKey();
    } catch (err) {
      return reject(err);
    }
    
    const newDb = new sqlite3.Database(corePath, (err) => {
      if (err) return reject(err);
      
      newDb.run(`PRAGMA key = '${coreKey}'`, () => {
         newDb.get('SELECT count(*) FROM sqlite_master', (err2) => {
            if (err2) {
               newDb.close();
               return reject(new Error('Falha ao abrir Core DB'));
            }
            
            const attach = (dbPath: string, name: string, key?: string) => new Promise<void>(res => {
               if (!key) return res();
               const safeKey = key.replace(/'/g, "''");
               newDb.run(`ATTACH DATABASE '${dbPath}' AS ${name} KEY '${safeKey}'`, () => res());
            });
            
            attach(libraryPath, 'library', unlockedKeys.library)
              .then(() => attach(financePath, 'finance', unlockedKeys.finance))
              .then(() => attach(notesPath, 'notes', unlockedKeys.notes))
              .then(() => attach(culturePath, 'culture', unlockedKeys.culture))
              .then(() => attach(ankiPath, 'anki', unlockedKeys.anki))
              .then(() => {
                db = newDb;
                resolve();
              });
         });
      });
    });
  });
}
