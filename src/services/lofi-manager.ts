import { getValidAccessToken, uploadToDrive, downloadFromDrive, deleteFromDrive } from './drive';
import type { LofiItem } from '../types';

const LOFI_TABLE = 'lofis';

/**
 * Returns the correct MIME type for an audio file based on its extension.
 * Defaults to 'audio/mpeg' for unknown types.
 */
export function getAudioMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase().replace(/\.enc$/, '') ?? '';
  // Strip .enc suffix if present (e.g. "song.mp3.enc" -> check "mp3")
  const cleanExt = filename.replace(/\.enc$/, '').split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    mp3:  'audio/mpeg',
    mpeg: 'audio/mpeg',
    ogg:  'audio/ogg',
    oga:  'audio/ogg',
    opus: 'audio/ogg; codecs=opus',
    wav:  'audio/wav',
    wave: 'audio/wav',
    flac: 'audio/flac',
    m4a:  'audio/mp4',
    m4b:  'audio/mp4',
    aac:  'audio/aac',
    webm: 'audio/webm',
    weba: 'audio/webm',
  };
  return map[cleanExt] ?? map[ext] ?? 'audio/mpeg';
}

export async function getLofiStreamLink(driveFileId: string, masterKey?: CryptoKey, originalName?: string): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");
  
  // In Web, <audio> with Drive URL + access_token often fails due to CORS/Range requests.
  // We download the ArrayBuffer and decrypt in memory (if required).
  const buffer = await downloadFromDrive(token, driveFileId);
  let finalBuffer = buffer;
  
  if (masterKey) {
    try {
      const { decryptFile } = await import('./storage');
      finalBuffer = await decryptFile(buffer, masterKey);
    } catch (e) {
      console.warn("Lofi might not be encrypted (uploaded from Web), using raw bytes.", e);
    }
  }

  // Use original filename for MIME inference; driveFileId is not a filename.
  const mimeType = originalName ? getAudioMimeType(originalName) : 'audio/mpeg';
  const blob = new Blob([finalBuffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

export async function downloadLofiToLocal(lofi: LofiItem, onProgress?: (percent: number) => void): Promise<string> {
  if (!window.api?.lofi) {
    throw new Error("Download local só está disponível no ambiente Desktop.");
  }
  if (!lofi.drive_file_id) throw new Error("Lofi não está no Drive.");
  
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  let localPath = "";
  if (window.api.video?.downloadFromDrive) {
    localPath = await window.api.video.downloadFromDrive(lofi.drive_file_id, token, lofi.original_name);
  } else {
    const buffer = await downloadFromDrive(token, lofi.drive_file_id, onProgress);
    localPath = await window.api.lofi.saveLocal(lofi.original_name, buffer);
  }
  
  await window.api.sync.upsertRow(LOFI_TABLE, {
    ...lofi,
    is_local: true,
    file_path: localPath,
    updated_at: new Date().toISOString()
  });

  return localPath;
}

export async function resolveLofiUrl(lofi: LofiItem, masterKey?: CryptoKey): Promise<string> {
  if (window.api?.lofi && lofi.is_local) {
    const filename_enc = `${lofi.original_name}.enc`;
    try {
      const localPath = await window.api.lofi.getLocalPath(filename_enc);
      if (localPath) {
        // Build the Tauri custom-protocol URL to fetch the encrypted file.
        // We cannot use this URL directly as <audio src> because the browser
        // audio player requires HTTP Range requests which custom protocols
        // don't support — causing MediaError code 4.
        // Instead, fetch the bytes, decrypt, and return a blob URL.
        const isWindows = navigator.userAgent.includes('Windows');
        const baseUrl = isWindows ? 'http://encrypted.localhost' : 'encrypted://localhost';
        const encUrl = `${baseUrl}/focus/${encodeURIComponent(filename_enc)}`;

        const response = await fetch(encUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const buffer = await response.arrayBuffer();

        let finalBuffer = buffer;
        if (masterKey) {
          try {
            const { decryptFile } = await import('./storage');
            finalBuffer = await decryptFile(buffer, masterKey);
          } catch (e) {
            console.warn('Lofi might not be encrypted (old upload), using raw bytes.', e);
          }
        }

        const blob = new Blob([finalBuffer], { type: getAudioMimeType(lofi.original_name) });
        return URL.createObjectURL(blob);
      } else {
        console.warn(`Local lofi file missing for ${lofi.original_name}, falling back to Drive.`);
      }
    } catch (e) {
      console.warn('Failed to load local lofi, falling back to Drive.', e);
    }
  }
  if (lofi.drive_file_id) {
    return getLofiStreamLink(lofi.drive_file_id, masterKey, lofi.original_name);
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
  let mainFileId = '';
  
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

  mainFileId = await uploadToDrive(token, finalFileName, finalBufferToUpload, 'lofi', (p) => {
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
    await window.api.lofi.deleteLocal(lofi.original_name).catch((e: any) => console.warn("Failed to delete local", e));
  }

  const token = await getValidAccessToken();
  if (token && lofi.drive_file_id) {
    await deleteFromDrive(token, lofi.drive_file_id).catch((e: any) => console.warn("Falha ao apagar lofi do Drive", e));
  }

  if (window.api?.trash?.deletePermanently) {
    await window.api.trash.deletePermanently(lofi.id, 'lofi');
  }
}

export async function deleteLofiLocal(lofi: LofiItem): Promise<void> {
  if (lofi.is_local && window.api?.lofi) {
    await window.api.lofi.deleteLocal(lofi.original_name).catch((e: any) => console.warn("Failed to delete local", e));
    
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
