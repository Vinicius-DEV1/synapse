import { getValidAccessToken, downloadFromDrive } from '../drive';

/**
 * Fetches subtitles (VTT) as text.
 * If masterKey is provided, decrypts content (subtitles encrypted during upload).
 */
export async function getSubtitleText(driveSubtitleId?: string, localSubtitlePath?: string, masterKey?: CryptoKey): Promise<string | null> {
  if (!driveSubtitleId && !localSubtitlePath) return null;

  try {
    // 1. Attempt loading from local file first (faster and offline-capable)
    if (localSubtitlePath) {
      try {
        if (window.api?.video?.readLocalFile) {
          const uint8 = await window.api.video.readLocalFile(localSubtitlePath);
          if (uint8 && uint8.length > 0) {
            return new TextDecoder().decode(uint8);
          }
        } else {
          const fileUrl = 'file:///' + localSubtitlePath.replace(/\\/g, '/');
          const res = await fetch(fileUrl);
          if (res.ok) return await res.text();
        }
      } catch (localErr) {
        console.warn('Falha ao ler arquivo de legenda local, tentando via Drive...', localErr);
      }
    }

    // 2. Fallback: Download from Google Drive (with decryption if needed)
    if (driveSubtitleId) {
      const token = await getValidAccessToken();
      if (!token) return null;
      
      const buffer = await downloadFromDrive(token, driveSubtitleId);
      
      if (masterKey) {
        try {
          const { decryptFile } = await import('../storage');
          const decrypted = await decryptFile(buffer, masterKey);
          return new TextDecoder().decode(decrypted);
        } catch {
        }
      }
      return new TextDecoder().decode(buffer);
    }
    
    return null;
  } catch (e) {
    console.error("Falha ao ler legendas:", e);
    return null;
  }
}
