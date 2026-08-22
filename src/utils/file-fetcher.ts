import { getValidAccessToken, downloadFromDrive } from '../services/drive';
import { decryptFile } from '../services/storage';
import type { FileItem } from '../types';

export async function getDecryptedFileUrl(
  item: FileItem, 
  masterKey?: CryptoKey | null
): Promise<string | null> {
  let url = '';

  // 1. Tenta obter arquivo local existente
  if (item.local_path && typeof window !== 'undefined' && window.api?.files) {
    try {
      const localUrl = await window.api.files.getLocal(item.local_path);
      if (localUrl) {
        url = localUrl;
      }
    } catch (e) {
      console.warn("[FileFetcher] Erro ao buscar arquivo local:", e);
    }
  }

  // 2. Fallback para download do Google Drive caso arquivo local não exista
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

