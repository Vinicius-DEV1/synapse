import { getValidAccessToken } from './drive-auth';
import { getOrCreateAppFolder, getOrCreatePhotosFolder, getOrCreateLofiFolder } from './drive-folders';
import { listFiles } from './drive-operations';
import type { DriveFile, DriveStorageUsage } from './drive-types';

/**
 * Calcula o uso de armazenamento no Google Drive para os diferentes módulos do app.
 */
export async function getDriveStorageUsage(): Promise<DriveStorageUsage | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  try {
    const appFolderId = await getOrCreateAppFolder(token);
    const photosFolderId = await getOrCreatePhotosFolder(token, appFolderId);
    const lofiFolderId = await getOrCreateLofiFolder(token, appFolderId);

    // Get files in main folder
    const mainFiles = await listFiles(token, appFolderId);
    // Get files in photos folder
    const photoFiles = await listFiles(token, photosFolderId);
    // Get files in lofi folder
    const lofiFiles = await listFiles(token, lofiFolderId);

    let library = { size: 0, files: [] as DriveFile[] };
    let videos = { size: 0, files: [] as DriveFile[] };
    let others = { size: 0, files: [] as DriveFile[] };
    
    for (const f of mainFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue;
      
      const size = parseInt(f.size || '0', 10);
      
      if (f.name.startsWith('Caderno_') && f.name.endsWith('.enc')) {
        library.size += size;
        library.files.push(f);
      } else if (f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.vtt') || f.name.endsWith('.m4a') || f.name.includes(' - Legenda ') || f.name.includes(' - Audio ')) {
        videos.size += size;
        videos.files.push(f);
      } else {
        others.size += size;
        others.files.push(f);
      }
    }

    let photos = { size: 0, files: [] as DriveFile[] };
    for (const f of photoFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue;
      const size = parseInt(f.size || '0', 10);
      photos.size += size;
      photos.files.push(f);
    }

    let lofi = { size: 0, files: [] as DriveFile[] };
    for (const f of lofiFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue;
      const size = parseInt(f.size || '0', 10);
      lofi.size += size;
      lofi.files.push(f);
    }

    return {
      total: library.size + videos.size + photos.size + lofi.size + others.size,
      modules: {
        library,
        photos,
        videos,
        lofi,
        others
      }
    };
  } catch (error) {
    console.error("Failed to get drive storage usage:", error);
    return null;
  }
}
