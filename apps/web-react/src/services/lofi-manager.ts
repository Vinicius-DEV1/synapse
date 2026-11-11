import { getValidAccessToken, uploadToDrive, downloadFromDrive, deleteFromDrive } from './drive';
import type { LofiItem } from '../types';

const LOFI_TABLE = 'lofis';

export {
  getAudioMimeType,
  isAudioBuffer,
  isEnc1Buffer,
  decryptLofiBufferToPlainAudio,
} from './audio/audio-format-utils';
import {
  getAudioMimeType,
  decryptLofiBufferToPlainAudio,
} from './audio/audio-format-utils';

export async function getLofiStreamLink(
  driveFileId: string, 
  masterKey?: CryptoKey, 
  originalName?: string,
  fallbackKey?: CryptoKey
): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");
  
  const buffer = await downloadFromDrive(token, driveFileId);
  const mimeType = originalName ? getAudioMimeType(originalName) : 'audio/mpeg';

  const audioBytes = await decryptLofiBufferToPlainAudio(buffer, masterKey, fallbackKey);
  const blob = new Blob([audioBytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export async function downloadLofiToLocal(
  lofi: LofiItem, 
  onProgress?: (percent: number) => void,
  masterKey?: CryptoKey,
  fallbackKey?: CryptoKey
): Promise<string> {
  if (!window.api?.lofi) {
    throw new Error("Download local só está disponível no ambiente Desktop.");
  }
  if (!lofi.drive_file_id) throw new Error("Lofi não está no Drive.");
  
  const token = await getValidAccessToken();
  if (!token) {
    window.dispatchEvent(new CustomEvent('drive-auth-expired'));
    throw new Error("Não foi possível autenticar com o Google Drive. Conecte sua conta para fazer o download.");
  }

  let localPath: string;
  if (window.api.lofi.downloadFromDrive) {
    let unlisten: (() => void) | undefined;
    if (onProgress && window.api.lofi.onDownloadProgress) {
      unlisten = window.api.lofi.onDownloadProgress((payload) => {
        if (payload.driveId === lofi.drive_file_id) {
          onProgress(payload.percent);
        }
      });
    }
    try {
      localPath = await window.api.lofi.downloadFromDrive(lofi.drive_file_id, token, lofi.original_name);
    } finally {
      if (unlisten) unlisten();
    }
  } else {
    const rawBufferFromDrive = await downloadFromDrive(token, lofi.drive_file_id, onProgress);
    const plainAudioBuffer = await decryptLofiBufferToPlainAudio(rawBufferFromDrive, masterKey, fallbackKey);
    localPath = await window.api.lofi.saveLocal(lofi.original_name, plainAudioBuffer);
  }
  
  if (window.api?.sync) {
    await window.api.sync.upsertRow(LOFI_TABLE, {
      ...lofi,
      is_local: true,
      file_path: localPath,
      updated_at: new Date().toISOString()
    });
  }

  return localPath;
}

export async function resolveLofiUrl(
  lofi: LofiItem, 
  masterKey?: CryptoKey,
  fallbackKey?: CryptoKey
): Promise<string> {
  if (window.api?.lofi && lofi.is_local) {
    const filename_enc = `${lofi.original_name}.enc`;
    try {
      const localPath = await window.api.lofi.getLocalPath(filename_enc);
      if (localPath) {
        const isWindows = navigator.userAgent.includes('Windows');
        const baseUrl = isWindows ? 'http://encrypted.localhost' : 'encrypted://localhost';
        const encUrl = `${baseUrl}/focus/${encodeURIComponent(filename_enc)}`;

        const response = await fetch(encUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const audioBytes = await decryptLofiBufferToPlainAudio(buffer, masterKey, fallbackKey);
          const blob = new Blob([audioBytes], { type: getAudioMimeType(lofi.original_name) });
          return URL.createObjectURL(blob);
        } else {
          console.warn(`Fetch failed with status ${response.status}, falling back to Drive.`);
        }
      } else {
        console.warn(`Local lofi file missing for ${lofi.original_name}, falling back to Drive.`);
      }
    } catch (e) {
      console.warn('Failed to load local lofi, falling back to Drive.', e);
    }
  }
  if (lofi.drive_file_id) {
    return getLofiStreamLink(lofi.drive_file_id, masterKey, lofi.original_name, fallbackKey);
  }
  throw new Error('Lofi não foi encontrado nem localmente nem na nuvem.');
}


export async function uploadNewLofi(file: File, duration?: number, masterKey?: CryptoKey, onProgress?: (percent: number) => void): Promise<LofiItem> {
  const token = await getValidAccessToken();
  if (!token) {
    window.dispatchEvent(new CustomEvent('drive-auth-expired'));
    throw new Error("Não foi possível autenticar com o Google Drive. Conecte sua conta para fazer upload.");
  }

  let isLocal = false;
  let localPath: string | undefined = undefined;
  
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  
  if (onProgress) onProgress(10); 

  const buffer = await file.arrayBuffer();

  if (window.api?.lofi?.saveLocal) {
    try {
      localPath = await window.api.lofi.saveLocal(file.name, buffer);
      isLocal = true;
    } catch (e) {
      console.warn("Não foi possível processar o lofi localmente:", e);
    }
  }

  let finalBufferToUpload = buffer;
  let finalFileName = file.name;
  let isEncrypted = false;

  if (localPath) {
    try {
      const req = await fetch('http://asset.localhost/' + encodeURIComponent(localPath));
      finalBufferToUpload = await req.arrayBuffer();
      finalFileName = file.name + '.enc';
      isEncrypted = true;
    } catch (e) {
      console.error("Erro ao ler arquivo criptografado localmente", e);
    }
  }

  if (!isEncrypted) {
    if (masterKey) {
      const { encryptFile } = await import('./storage');
      finalBufferToUpload = await encryptFile(buffer, masterKey);
      finalFileName = file.name + '.enc';
    } else {
      throw new Error("Master key is required for uploading securely on the Web.");
    }
  }

  const mainFileId = await uploadToDrive(token, finalFileName, finalBufferToUpload, 'lofi', (p) => {
    if (onProgress) onProgress(40 + (p * 0.6));
  });

  const newLofi: LofiItem = {
    id: crypto.randomUUID(),
    title: baseName,
    original_name: file.name,
    drive_file_id: mainFileId,
    is_local: isLocal,
    file_path: localPath,
    duration: duration,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (window.api?.sync) {
    await window.api.sync.upsertRow(LOFI_TABLE, newLofi);
  }

  if (onProgress) onProgress(100);

  return newLofi;
}

/**
 * Revokes a previously created lofi object URL to prevent memory leaks.
 */
export function revokeLofiUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('[lofi-manager] Failed to revoke blob URL:', err);
    }
  }
}

export async function deleteLofiCompletely(lofi: LofiItem): Promise<void> {
  // Soft-delete: moves item to trash by setting deleted_at without deleting files
  if (window.api?.sync) {
    await window.api.sync.upsertRow(LOFI_TABLE, {
      ...lofi,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
}

export async function hardDeleteLofiPermanently(lofi: LofiItem): Promise<void> {
  if (lofi.is_local && window.api?.lofi) {
    await window.api.lofi.deleteLocal(lofi.original_name).catch((e: unknown) => console.warn("Failed to delete local", e));
  }

  const token = await getValidAccessToken();
  if (token && lofi.drive_file_id) {
    await deleteFromDrive(token, lofi.drive_file_id).catch((e: unknown) => console.warn("Falha ao apagar lofi do Drive", e));
  }

  if (window.api?.trash?.deletePermanently) {
    await window.api.trash.deletePermanently(lofi.id, 'lofi');
  }
}

export async function deleteLofiLocal(lofi: LofiItem): Promise<void> {
  if (lofi.is_local && window.api?.lofi) {
    await window.api.lofi.deleteLocal(lofi.original_name).catch((e: unknown) => console.warn("Failed to delete local", e));
    
    // Update local state to cloud-only
    if (window.api?.sync) {
      await window.api.sync.upsertRow(LOFI_TABLE, {
        ...lofi,
        is_local: false,
        file_path: undefined,
        updated_at: new Date().toISOString()
      });
    }
  }
}

export async function renameLofi(lofi: LofiItem, newTitle: string): Promise<void> {
  if (window.api?.sync) {
    await window.api.sync.upsertRow(LOFI_TABLE, {
      ...lofi,
      title: newTitle,
      updated_at: new Date().toISOString()
    });
  }
}

export async function updateLofiOrder(lofisToUpdate: LofiItem[]): Promise<void> {
  if (window.api?.sync) {
    const timestamp = new Date().toISOString();
    for (const lofi of lofisToUpdate) {
      await window.api.sync.upsertRow(LOFI_TABLE, {
        ...lofi,
        updated_at: timestamp
      });
    }
  }
}
