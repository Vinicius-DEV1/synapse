import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { getUnlockedKeys } from './auth';
import { getOrCreateVaultKey } from '../db/connection';
import * as sqlite3 from '@journeyapps/sqlcipher';

export function registerBackupHandlers() {
  ipcMain.handle('backup:selectFolder', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Selecione a pasta para salvar o backup'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('backup:startBackup', async (event, options: { 
    destination: string, 
    type: 'encrypted' | 'decrypted',
    includeMedia: boolean,
    driveToken?: string
  }) => {
    const { destination, type, includeMedia, driveToken } = options;
    const userDataPath = app.getPath('userData');
    
    // Helper function to send progress logs
    const log = (message: string, progress?: number) => {
      event.sender.send('backup:log', { message, progress });
    };

    try {
      log('Iniciando processo de backup...', 0);
      
      const databases = ['core.sqlite', 'notes.sqlite', 'finance.sqlite', 'anki.sqlite', 'focus.sqlite'];

      if (type === 'encrypted') {
        log('Preparando backup criptografado...', 5);
        for (const dbName of databases) {
          const sourceDb = path.join(userDataPath, dbName);
          const destDb = path.join(destination, dbName);
          
          if (fs.existsSync(sourceDb)) {
            log(`Copiando ${dbName}...`);
            fs.copyFileSync(sourceDb, destDb);
          }
        }
        
        const keysPath = path.join(userDataPath, 'keys.json');
        if (fs.existsSync(keysPath)) {
          log('Copiando chaves de segurança...');
          fs.copyFileSync(keysPath, path.join(destination, 'keys.json'));
        }
        
        log('Backup de banco de dados concluído.', 30);
      } else {
        log('Preparando backup descriptografado...', 5);
        const unlockedKeys = getUnlockedKeys();
        const coreKey = getOrCreateVaultKey();

        for (const dbFile of databases) {
          const dbName = dbFile.split('.')[0];
          const sourceDb = path.join(userDataPath, dbFile);
          const destDb = path.join(destination, `${dbName}_decrypted.sqlite`);
          
          if (fs.existsSync(sourceDb)) {
            log(`Descriptografando e exportando ${dbName}.sqlite...`);
            
            let safeKey: string | undefined;
            if (dbName === 'core') {
              safeKey = coreKey;
            } else {
              safeKey = (unlockedKeys as any)[dbName];
            }

            if (!safeKey) {
              log(`Aviso: Chave do módulo ${dbName} não encontrada. Ignorando.`);
              continue;
            }
            
            // Exclui o destino se já existir
            if (fs.existsSync(destDb)) {
              fs.unlinkSync(destDb);
            }

            await new Promise<void>((resolve, reject) => {
              const db = new sqlite3.Database(sourceDb, (err) => {
                if (err) return reject(err);
                
                db.serialize(() => {
                  db.run(`PRAGMA key = '${safeKey!.replace(/'/g, "''")}'`);
                  
                  db.get('SELECT count(*) FROM sqlite_master', (err) => {
                    if (err) {
                      db.close();
                      return reject(new Error('Chave mestre incorreta ou banco corrompido.'));
                    }
                    
                    db.run(`ATTACH DATABASE '${destDb.replace(/'/g, "''")}' AS plaintext KEY ''`);
                    db.get(`SELECT sqlcipher_export('plaintext')`, (err) => {
                      if (err) {
                        db.close();
                        return reject(err);
                      }
                      
                      db.run(`DETACH DATABASE plaintext`, (err) => {
                        db.close();
                        if (err) return reject(err);
                        resolve();
                      });
                    });
                  });
                });
              });
            });
          }
        }
        log('Backup de banco de dados (descriptografado) concluído.', 30);
      }

      if (includeMedia && driveToken) {
        log('Buscando mídias no Google Drive...', 35);
        
        const netFetch = (await import('electron')).net.fetch;
        
        // Find folder ID
        const query = encodeURIComponent(`name = 'Caderno - Biblioteca' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
        const folderRes = await netFetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
          headers: { Authorization: `Bearer ${driveToken}` }
        });
        
        const folderData = await folderRes.json();
        const folderId = folderData.files?.[0]?.id;
        
        if (folderId) {
          const filesQuery = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
          let pageToken = '';
          let allFiles: any[] = [];
          
          do {
            const filesRes = await netFetch(`https://www.googleapis.com/drive/v3/files?q=${filesQuery}&fields=nextPageToken,files(id,name,mimeType,size)&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`, {
              headers: { Authorization: `Bearer ${driveToken}` }
            });
            const filesData = await filesRes.json();
            allFiles = allFiles.concat(filesData.files || []);
            pageToken = filesData.nextPageToken || '';
          } while (pageToken);
          
          allFiles = allFiles.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
          
          log(`Encontradas ${allFiles.length} mídias. Iniciando download...`, 40);
          
          const mediaDest = path.join(destination, 'Midias');
          if (!fs.existsSync(mediaDest)) {
            fs.mkdirSync(mediaDest);
          }
          
          let downloadedCount = 0;
          for (const file of allFiles) {
            let success = false;
            let retries = 0;
            const maxRetries = 3;
            
            while (!success && retries < maxRetries) {
              try {
                log(`Baixando ${file.name} (Tentativa ${retries + 1}/${maxRetries})...`);
                
                const fileRes = await netFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                  headers: { Authorization: `Bearer ${driveToken}` }
                });
                
                if (!fileRes.ok) {
                  throw new Error(`Status ${fileRes.status}`);
                }
                
                const arrayBuffer = await fileRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                fs.writeFileSync(path.join(mediaDest, file.name), buffer);
                success = true;
                downloadedCount++;
                log(`Sucesso: ${file.name}. (${downloadedCount}/${allFiles.length})`, 40 + (downloadedCount / allFiles.length) * 55);
              } catch (err: any) {
                retries++;
                log(`ERRO ao baixar ${file.name}: ${err.message}. ${retries < maxRetries ? 'Tentando novamente...' : 'Falha definitiva.'}`);
                if (retries < maxRetries) {
                  await new Promise(r => setTimeout(r, 2000 * retries)); // Exponential backoff
                }
              }
            }
          }
          
          if (type === 'decrypted') {
            log('Aviso: Os vídeos já estão em formato nativo (.mp4). Imagens e PDFs com extensão .enc permanecem criptografados nesta versão do exportador.', 95);
          }
        } else {
          log('Pasta "Caderno - Biblioteca" não encontrada no Drive.', 95);
        }
      }

      log('Backup concluído com sucesso!', 100);
      return { success: true };
    } catch (error: any) {
      log(`ERRO CRÍTICO: ${error.message}`, 100);
      return { success: false, error: error.message };
    }
  });
}

