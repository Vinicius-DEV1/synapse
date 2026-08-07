import { getValidAccessToken, downloadFromDrive } from '../services/drive';
import { decryptFile } from '../services/storage';
import type { FileItem } from '../types';

export async function getDecryptedFileUrl(
  item: FileItem, 
  masterKey?: CryptoKey | null
): Promise<string | null> {
  let url = '';

  if (item.local_path && typeof window !== 'undefined' && window.api?.files) {
    url = await window.api.files.getLocal(item.local_path) || '';
  }

  if (!url && item.drive_file_id) {
    const token = await getValidAccessToken();
    if (token) {
      let arrayBuffer = await downloadFromDrive(token, item.drive_file_id);
      if (masterKey) {
        arrayBuffer = await decryptFile(arrayBuffer, masterKey);
      }
      const blob = new Blob([arrayBuffer], { type: item.mime_type || 'application/octet-stream' });
      url = URL.createObjectURL(blob);
    }
  }

  return url || null;
}

