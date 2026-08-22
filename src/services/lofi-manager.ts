import { getValidAccessToken, uploadToDrive, downloadFromDrive, deleteFromDrive } from './drive';
import type { LofiItem } from '../types';

declare module '../api/types' {
  interface ICadernoAPI {
    lofi?: {
      saveLocal: (name: string, data: ArrayBuffer) => Promise<string>;
      getLocalPath: (name: string) => Promise<string | null>;
      deleteLocal: (name: string) => Promise<void>;
    };
  }
}

const LOFI_TABLE = 'lofis';

export async function getLofiStreamLink(driveFileId: string, masterKey?: CryptoKey): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");
  
  // No Web, o <audio> com URL do Drive + access_token costuma falhar por CORS/Range.
  // Baixamos o ArrayBuffer e descriptografamos (se necessário).
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

  const blob = new Blob([finalBuffer], { type: 'audio/mpeg' }); // Usando tipo genérico de áudio
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
        const isWindows = navigator.userAgent.includes('Windows');
        const baseUrl = isWindows ? 'http://encrypted.localhost' : 'encrypted://localhost';
        return `${baseUrl}/focus/${encodeURIComponent(filename_enc)}`;
      } else {
        console.warn(`Local lofi file missing for ${lofi.original_name}, falling back to Drive.`);
      }
    } catch (e) {
      console.warn("Failed to check local lofi path", e);
    }
  }
  if (lofi.drive_file_id) {
    return getLofiStreamLink(lofi.drive_file_id, masterKey);
  }
  throw new Error("Lofi não foi encontrado nem localmente nem na nuvem.");
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
  // Soft-delete: envia o item para a Lixeira definindo deleted_at sem apagar os arquivos
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
