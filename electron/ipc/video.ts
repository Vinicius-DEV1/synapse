import { ipcMain, app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export function setupVideoIpc() {
  // Get or create the videos directory
  const getVideosDir = async () => {
    // We use the userData directory for standard storage, or a subfolder in the app if requested.
    // The user requested: "pasta do projeto/videos, mais ele pode alterar nas configurações"
    // For now we default to a 'videos' folder in userData which is safe for Electron
    const videosDir = path.join(app.getPath('userData'), 'videos');
    try {
      await fs.mkdir(videosDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create videos directory', e);
    }
    return videosDir;
  };

  ipcMain.handle('video:getLocalPath', async (_, filename: string) => {
    const videosDir = await getVideosDir();
    const filePath = path.join(videosDir, filename);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  });

  ipcMain.handle('video:deleteLocal', async (_, filename: string) => {
    const videosDir = await getVideosDir();
    const filePath = path.join(videosDir, filename);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (e) {
      console.error('Failed to delete local video', e);
      return false;
    }
  });

  ipcMain.handle('video:copyLocal', async (_, sourcePath: string, filename: string) => {
    const videosDir = await getVideosDir();
    const destPath = path.join(videosDir, filename);
    try {
      await fs.copyFile(sourcePath, destPath);
      return destPath;
    } catch (e) {
      console.error('Failed to copy local video', e);
      throw e;
    }
  });

  ipcMain.handle('video:saveLocal', async (_, filename: string, buffer: ArrayBuffer) => {
    const videosDir = await getVideosDir();
    const filePath = path.join(videosDir, filename);
    try {
      await fs.writeFile(filePath, Buffer.from(buffer));
      return filePath;
    } catch (e) {
      console.error('Failed to save local video', e);
      throw e;
    }
  });
}
