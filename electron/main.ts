import { app, BrowserWindow, ipcMain, powerMonitor, dialog } from 'electron';
import * as path from 'path';
import { closeDb } from './db/connection';
import { registerAuthHandlers } from './ipc/auth';
import { registerPagesHandlers } from './ipc/pages';
import { registerLibraryHandlers } from './ipc/library';
import { registerFinanceHandlers } from './ipc/finance';
import { registerSyncHandlers } from './ipc/sync';

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

app.whenReady().then(() => {
  // Registrar módulos IPC modulares
  registerAuthHandlers();
  registerPagesHandlers();
  registerLibraryHandlers();
  registerFinanceHandlers();
  registerSyncHandlers();

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
  ipcMain.handle('drive:get-credentials', async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle('drive:save-credentials', async (_, data: any) => ({ success: true }));

  // Logs
  ipcMain.handle('log:write', async (_, message: string) => {
    console.log('[CLIENT]', message);
    return true;
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
