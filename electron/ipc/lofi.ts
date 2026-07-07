import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export function setupLofiIpc() {
  const lofiDir = path.join(app.getPath('userData'), 'lofi');
  if (!fs.existsSync(lofiDir)) {
    fs.mkdirSync(lofiDir, { recursive: true });
  }

  ipcMain.handle('lofi:save-local', async (_, filename: string, buffer: ArrayBuffer) => {
    const filePath = path.join(lofiDir, filename);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
  });

  ipcMain.handle('lofi:copy-local', async (_, sourcePath: string, filename: string) => {
    const filePath = path.join(lofiDir, filename);
    fs.copyFileSync(sourcePath, filePath);
    return filePath;
  });

  ipcMain.handle('lofi:delete-local', async (_, filename: string) => {
    const filePath = path.join(lofiDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  });

  ipcMain.handle('lofi:get-local-path', async (_, filename: string) => {
    const filePath = path.join(lofiDir, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  });
}
