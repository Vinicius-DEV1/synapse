import { app, BrowserWindow, ipcMain, powerMonitor, dialog, protocol, net, nativeImage } from 'electron';
import * as path from 'path';
import { closeDb } from './db/connection';
import { registerAuthHandlers } from './ipc/auth';
import { registerPagesHandlers } from './ipc/pages';
import { registerLibraryHandlers } from './ipc/library';
import { registerFinanceHandlers } from './ipc/finance';
import { registerSyncHandlers } from './ipc/sync';
import { registerConfigHandlers } from './ipc/config';
import { registerCultureHandlers } from './ipc/cultureIpc';
import { registerBackupHandlers } from './ipc/backup';
import { setupVideoIpc } from './ipc/video';
import { setupFocusIpc } from './ipc/focus';
import { setupLofiIpc } from './ipc/lofi';
import { registerAudioHandlers } from './api/audio-manager';
import { registerAnkiHandlers } from './api/anki-manager';
import { registerCalendarHandlers } from './ipc/calendar';

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;
let shouldLockOnSuspend = true;

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
      webSecurity: false, // Necessário para carregar vídeos locais via file://
    },
  });

  mainWindow.setMenuBarVisibility(false);
  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:35174');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Registrar o scheme ANTES do app.whenReady para que o Chromium entenda a URL corretamente e suporte streams
protocol.registerSchemesAsPrivileged([
  { scheme: 'stream-drive', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);

app.whenReady().then(() => {
  // Protocolo customizado para streaming do Drive ignorando CORS/Cookies e adicionando Header
  protocol.handle('stream-drive', async (request) => {
    try {
      const url = new URL(request.url);
      // stream-drive://api/<fileId>?token=...
      const fileId = url.pathname.replace(/^\/+/, ''); 
      const token = url.searchParams.get('token');

      const headers = new Headers(request.headers);
      headers.set('Authorization', `Bearer ${token}`);

      const fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      
      const response = await net.fetch(fetchUrl, {
        headers,
        method: request.method,
        bypassCustomProtocolHandlers: true
      });
      
      // Log diagnostics in the terminal
      console.log(`[stream-drive] Fetching ${fileId} - Status: ${response.status} - Content-Type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        console.error(`[stream-drive] Error fetching from Drive: ${response.status} ${response.statusText}`);
      }
      
      // Se a API do Drive retornar application/octet-stream, forçamos video/mp4 (ou webm)
      // para o Chromium não rejeitar de imediato se ele for rigoroso com mime-types
      let contentType = response.headers.get('content-type') || 'video/mp4';
      if (contentType === 'application/octet-stream') {
        contentType = 'video/mp4'; 
      }
      
      const resHeaders = new Headers(response.headers);
      resHeaders.set('Content-Type', contentType);
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders
      });
    } catch (e) {
      console.error("stream-drive protocol error:", e);
      return new Response(null, { status: 500 });
    }
  });
  // Registrar módulos IPC modulares
  registerAuthHandlers();
  registerPagesHandlers();
  registerLibraryHandlers();
  registerFinanceHandlers();
  registerCultureHandlers();
  registerSyncHandlers();
  registerConfigHandlers();
  setupVideoIpc();
  setupFocusIpc();
  setupLofiIpc();
  registerAudioHandlers();
  registerAnkiHandlers();
  registerBackupHandlers();
  registerCalendarHandlers();

  let focusWindowInstance: BrowserWindow | null = null;

  ipcMain.handle('app:set-icon', async (_, type: 'normal' | 'zzz') => {
    if (focusWindowInstance) {
      if (type === 'zzz') {
        const iconPath = path.join(__dirname, '../public/focus-icon-zzz.png');
        focusWindowInstance.setIcon(nativeImage.createFromPath(iconPath));
      } else {
        const iconPath = path.join(__dirname, '../public/focus-icon.png');
        focusWindowInstance.setIcon(nativeImage.createFromPath(iconPath));
      }
    }
  });

  ipcMain.handle('app:open-focus-window', async () => {
    const focusWindow = new BrowserWindow({
      width: 400,
      height: 600,
      minWidth: 320,
      minHeight: 480,
      icon: path.join(__dirname, '../public/focus-icon.png'),
      backgroundColor: '#0f0e17',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    focusWindow.setMenuBarVisibility(false);
    focusWindow.setMenu(null);
      focusWindowInstance = focusWindow;
      focusWindow.on('closed', () => { focusWindowInstance = null; });
    
    // Windows only: Detach icon in taskbar
    if (process.platform === 'win32') {
      focusWindow.setAppDetails({ appId: 'com.caderno.focus' });
    }

    if (isDev) {
      focusWindow.loadURL('http://127.0.0.1:35174/#/focus-standalone');
      // focusWindow.webContents.openDevTools();
    } else {
      focusWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/focus-standalone' });
    }
  });

  // Preferências
  ipcMain.handle('auth:set-preferences', async (_, prefs: { autoLockOnSuspend: boolean }) => {
    shouldLockOnSuspend = prefs.autoLockOnSuspend;
    return { success: true };
  });

  // Google Drive
  ipcMain.handle('drive:open-external-url', async (_, url: string) => {
    const { shell } = require('electron');
    await shell.openExternal(url);
    return { success: true };
  });

  const driveCredsPath = path.join(app.getPath('userData'), 'drive_credentials.json').replace(/\\/g, '/');
  const fs = require('fs');

  ipcMain.handle('drive:get-credentials', async () => {
    try {
      if (fs.existsSync(driveCredsPath)) {
        const raw = fs.readFileSync(driveCredsPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Erro ao ler credenciais do Drive:', err);
    }
    return { token: null };
  });

  ipcMain.handle('drive:save-credentials', async (_, data: any) => {
    try {
      fs.writeFileSync(driveCredsPath, JSON.stringify(data), 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('Erro ao salvar credenciais do Drive:', err);
      return { success: false, error: String(err) };
    }
  });

  // Logs
  ipcMain.handle('log:write', async (_, message: string) => {
    console.log('[CLIENT]', message);
    return true;
  });

  ipcMain.handle('app:showConfirm', async (_, message: string) => {
    if (!mainWindow) return 1;
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancelar', 'Sim, excluir'],
      defaultId: 0,
      cancelId: 0,
      title: 'Confirmação',
      message: message,
      noLink: true
    });
    return result.response;
  });

  ipcMain.on('app:toggleFullScreen', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  powerMonitor.on('suspend', () => {
    if (shouldLockOnSuspend && mainWindow) {
      ipcMain.emit('auth:lock');
      mainWindow.webContents.send('app:locked');
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  closeDb().then(() => {
    if (process.platform !== 'darwin') app.quit();
  });
});

// Restart backend




