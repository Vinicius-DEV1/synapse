import { getValidAccessToken, downloadFromDrive } from '../drive';
import type { VideoItem } from '../../types';

const VIDEO_TABLE = 'videos';

// `window.api.video` method extended helper
// nativos do desktop (implementados em src/api/tauri/multimedia.ts).
type DesktopVideoApi = NonNullable<typeof window.api.video> & {
  onDownloadProgress: (callback: (percent: number) => void) => () => void;
  getStreamPort: () => Promise<number>;
};

/**
 * Obtém link de streaming a partir do ID do Drive.
 */
export async function getVideoStreamLink(driveFileId: string, masterKey?: CryptoKey): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");
  
  if (!masterKey) {
    // If no key is provided, fallback to direct stream (unencrypted)
    return `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&access_token=${token}`;
  }

  // On Web, since data is encrypted and on-the-fly AES-GCM chunking is unavailable,
  // fetch entire file into memory, decrypt, and create a Blob.
  // IMPORTANT: Uses RAM proportional to video size!
  const buffer = await downloadFromDrive(token, driveFileId);
  try {
    const { decryptFile } = await import('../storage');
    const decryptedBuffer = await decryptFile(buffer, masterKey);
    const blob = new Blob([decryptedBuffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn("Could not decrypt video. Maybe it is not encrypted?", e);
    const blob = new Blob([buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }
}

/**
 * Baixa um vídeo do drive e salva localmente (apenas Desktop)
 */
export async function downloadVideoToLocal(video: VideoItem, onProgress?: (percent: number) => void, forceOriginal?: boolean): Promise<string> {
  if (!window.api?.video) {
    throw new Error("Download local só está disponível no ambiente Desktop.");
  }
  
  const ext = video.original_name.split('.').pop()?.toLowerCase() || '';
  const isUnsupported = !['mp4', 'webm'].includes(ext);
  
  const shouldUseWebVersion = isUnsupported && !forceOriginal;
  
  const targetDriveId = shouldUseWebVersion && video.drive_web_file_id ? video.drive_web_file_id : video.drive_file_id;
  if (!targetDriveId) throw new Error("Vídeo não está no Drive ou versão compatível indisponível.");
  
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  const baseName = video.original_name.replace(/\.[^/.]+$/, "");
  const targetFileName = (shouldUseWebVersion && video.drive_web_file_id) ? `${baseName}_web.mp4` : video.original_name;

  const desktopVideoApi = window.api.video as DesktopVideoApi;
  let localPath = "";
  if (window.api.video.downloadFromDrive) {
    let unlisten: (() => void) | undefined;
    if (desktopVideoApi.onDownloadProgress && onProgress) {
      unlisten = desktopVideoApi.onDownloadProgress(onProgress);
    }
    try {
      localPath = await window.api.video.downloadFromDrive(targetDriveId, token, targetFileName);
    } finally {
      if (unlisten) unlisten();
    }
  } else {
    const buffer = await downloadFromDrive(token, targetDriveId, onProgress);
    localPath = await window.api.video.saveLocal(targetFileName, buffer);
  }
  
  // Atualiza banco de dados marcando como local
  await window.api.sync.upsertRow(VIDEO_TABLE, {
    ...video,
    is_local: true,
    file_path: localPath,
    updated_at: new Date().toISOString()
  });

  return localPath;
}

/**
 * Verifica se um vídeo está disponível localmente.
 * If yes, return URL with file:// or streaming port. Otherwise, return Drive URL.
 */
export async function resolveVideoUrl(video: VideoItem, _masterKey?: CryptoKey, forceWeb?: boolean): Promise<string> {
  const { getSettings } = await import('../../utils/settings');
  const pref = getSettings().videoPlaybackPreference;
  
  const ext = video.original_name.split('.').pop()?.toLowerCase() || '';
  
  let isUnsupported = forceWeb || !['mp4', 'webm'].includes(ext);
  
  if (pref === 'force_web') {
    isUnsupported = true; // Sempre tenta puxar a web version
  } else if (pref === 'force_original') {
    isUnsupported = false; // Sempre tenta rodar o original
  }

  const baseName = video.original_name.replace(/\.[^/.]+$/, "");

  if (window.api?.video && video.is_local) {
    const desktopVideoApi = window.api.video as DesktopVideoApi;
    // When syncing from another OS, file_path may be Windows-formatted and not exist on Linux.
    // Always verify actual file existence using filename.
    const fileNameFallback = video.file_path ? video.file_path.split(/[/\\]/).pop() : undefined;
    const searchName = isUnsupported ? `${baseName}_web.mp4` : video.original_name;

    let localPath = await window.api.video.getLocalPath(searchName);
    if (!localPath) {
      localPath = await window.api.video.getLocalPath(searchName + ".enc");
    }
    if (!localPath && fileNameFallback) {
      localPath = await window.api.video.getLocalPath(fileNameFallback);
    }

    if (localPath) {
      if (desktopVideoApi.getStreamPort) {
        try {
          const port = await desktopVideoApi.getStreamPort();
          const fileName = localPath.split(/[/\\]/).pop();
          return `http://127.0.0.1:${port}/stream?file=culture/${encodeURIComponent(fileName || '')}`;
        } catch (e) {
          console.warn("Failed to get stream port:", e);
        }
      }
      const isWindows = navigator.userAgent.includes('Windows');
      const baseUrl = isWindows ? 'http://encrypted.localhost' : 'encrypted://localhost';
      const fileName = localPath.split(/[/\\]/).pop();
      return `${baseUrl}/culture/${encodeURIComponent(fileName || '')}`;
    }
  }
  
  const isWebEnv = !window.api?.video;
  
  if (isWebEnv) {
    // On Web, if format is unsupported (e.g. MKV), force Web version.
    const targetDriveId = isUnsupported && video.drive_web_file_id 
      ? video.drive_web_file_id 
      : (video.drive_web_file_id || video.drive_file_id);
      
    if (targetDriveId) {
      return `/stream-video/${targetDriveId}`;
    }
  } else {
    // Desktop: Streaming Nativo em Rust do Google Drive (ignorando o Service Worker)
    // If unsupported format (MKV), force cloud web_file_id lookup if not present locally
    const targetDriveId = isUnsupported && video.drive_web_file_id 
      ? video.drive_web_file_id 
      : (video.drive_file_id || video.drive_web_file_id);
      
    const desktopVideoApi = window.api?.video as DesktopVideoApi | undefined;
    if (targetDriveId && desktopVideoApi?.getStreamPort) {
      try {
        const port = await desktopVideoApi.getStreamPort();
        const token = await getValidAccessToken();
        if (token) {
          return `http://127.0.0.1:${port}/stream-drive?file_id=${targetDriveId}&token=${token}&module=culture`;
        }
      } catch (e) {
        console.warn("Failed to get stream port for drive:", e);
      }
    }
    if (targetDriveId) {
      return `/stream-video/${targetDriveId}`; // Fallback para SW
    }
  }

  throw new Error("Vídeo não foi encontrado nem localmente nem na nuvem.");
}
