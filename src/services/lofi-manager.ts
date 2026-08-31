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

/**
 * Checks if a buffer starts with standard audio format magic bytes (MP3, OGG, WAV, FLAC, M4A, WebM).
 */
export function isAudioBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 12));

  // 'ID3' (MP3 ID3v2 tag)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  // MP3 Sync Word (MPEG audio frame header: 11 bits set: 0xFF followed by 0xEx or 0xFx)
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return true;
  // 'OggS' (Ogg Vorbis / Opus)
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return true;
  // 'RIFF' (WAV)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true;
  // 'fLaC' (FLAC)
  if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) return true;
  // EBML header (WebM audio)
  if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return true;
  // MP4 / M4A ('ftyp' at offset 4)
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return true;

  return false;
}

/**
 * Checks if a buffer starts with ENC1 encrypted header.
 */
export function isEnc1Buffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  return bytes[0] === 0x45 && bytes[1] === 0x4E && bytes[2] === 0x43 && bytes[3] === 0x31; // 'ENC1'
}

/**
 * Decrypts a buffer fetched from Google Drive into plaintext audio bytes.
 * Handles:
 * 1. Plain unencrypted audio buffers.
 * 2. ENC1 chunked encrypted buffers (with primary & fallback key trial).
 * 3. Legacy single-chunk WebCrypto AES-GCM encrypted buffers.
 */
export async function decryptLofiBufferToPlainAudio(
  buffer: ArrayBuffer,
  masterKey?: CryptoKey,
  fallbackKey?: CryptoKey
): Promise<ArrayBuffer> {
  if (isAudioBuffer(buffer)) {
    return buffer;
  }

  if (masterKey || fallbackKey) {
    const primaryKey = masterKey || fallbackKey!;
    const altKey = masterKey && fallbackKey ? fallbackKey : undefined;

    try {
      const { decryptFileChunked } = await import('./storage');
      const rawBlob = new Blob([buffer]);
      const decryptedBlob = await decryptFileChunked(rawBlob, primaryKey);
      return await decryptedBlob.arrayBuffer();
    } catch (primaryErr) {
      if (altKey) {
        try {
          const { decryptFileChunked } = await import('./storage');
          const rawBlob = new Blob([buffer]);
          const decryptedBlob = await decryptFileChunked(rawBlob, altKey);
          return await decryptedBlob.arrayBuffer();
        } catch (altErr) {
          console.warn("Decryption with fallback key failed", altErr);
        }
      }

      if (!isEnc1Buffer(buffer)) {
        try {
          const { decryptFile } = await import('./storage');
          return await decryptFile(buffer, primaryKey);
        } catch {
          console.warn("Decryption failed on non-ENC1 buffer, falling back to raw bytes", primaryErr);
          return buffer;
        }
      }

      console.error("Falha ao descriptografar áudio do Lofi (arquivo ENC1):", primaryErr);
      throw new Error("Não foi possível descriptografar a faixa de áudio (chave inválida).");
    }
  }

  return buffer;
}

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

  let localPath = "";
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
        // Build the Tauri custom-protocol URL to fetch the encrypted file.
        // We cannot use this URL directly as <audio src> because the browser
        // audio player requires HTTP Range requests which custom protocols
        // don't support — causing MediaError code 4.
        // Instead, fetch the bytes and return a blob URL.
        // The Tauri encrypted protocol already decrypts the content on the fly.
        const isWindows = navigator.userAgent.includes('Windows');
        const baseUrl = isWindows ? 'http://encrypted.localhost' : 'encrypted://localhost';
        const encUrl = `${baseUrl}/focus/${encodeURIComponent(filename_enc)}`;

        const response = await fetch(encUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const buffer = await response.arrayBuffer();

        const blob = new Blob([buffer], { type: getAudioMimeType(lofi.original_name) });
        return URL.createObjectURL(blob);
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
