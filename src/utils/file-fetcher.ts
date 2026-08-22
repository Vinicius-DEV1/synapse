import { getValidAccessToken, downloadFromDrive } from '../services/drive';
import { decryptFile } from '../services/storage';
import type { FileItem } from '../types';

export async function getDecryptedFileUrl(
  item: FileItem, 
  masterKey?: CryptoKey | null
): Promise<string | null> {
  let url = '';

  // 1. Attempt to fetch existing local file
  if (item.local_path && typeof window !== 'undefined' && window.api?.files) {
    try {
      const localUrl = await window.api.files.getLocal(item.local_path);
      if (localUrl) {
        url = localUrl;
      }
    } catch (e) {
      console.warn("[FileFetcher] Error fetching local file:", e);
    }
  }

  // 2. Fallback to downloading from Google Drive if local file is unavailable
  if (!url && item.drive_file_id) {
    const token = await getValidAccessToken();
    if (token) {
      try {
        let arrayBuffer = await downloadFromDrive(token, item.drive_file_id);
        if (masterKey) {
          try {
            arrayBuffer = await decryptFile(arrayBuffer, masterKey);
          } catch (e) {
            console.warn("[FileFetcher] Descriptografia falhou ou arquivo não criptografado:", e);
          }
        }
        const blob = new Blob([arrayBuffer], { type: item.mime_type || 'application/octet-stream' });
        url = URL.createObjectURL(blob);
      } catch (driveErr) {
        console.error("[FileFetcher] Falha ao baixar arquivo do Drive:", driveErr);
      }
    }
  }

  return url || null;
}

