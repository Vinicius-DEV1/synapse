import { getValidAccessToken, uploadToDrive, downloadFromDrive, deleteFromDrive } from './drive';
import type { LofiItem } from '../types_lofi';

const LOFI_TABLE = 'lofis';

export async function getLofiStreamLink(driveFileId: string): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");
  
  return `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&access_token=${token}`;
}

export async function downloadLofiToLocal(lofi: LofiItem, onProgress?: (percent: number) => void): Promise<string> {
  if (!window.api?.lofi) {
    throw new Error("Download local só está disponível no ambiente Desktop.");
  }
  if (!lofi.drive_file_id) throw new Error("Lofi não está no Drive.");
  
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  const buffer = await downloadFromDrive(token, lofi.drive_file_id, onProgress);
  const localPath = await window.api.lofi.saveLocal(lofi.original_name, buffer);
  
  await window.api.sync.upsertRow(LOFI_TABLE, {
    ...lofi,
    is_local: true,
    file_path: localPath,
    updated_at: new Date().toISOString()
  });

  return localPath;
}

export async function resolveLofiUrl(lofi: LofiItem): Promise<string> {
  if (window.api?.lofi && lofi.is_local) {
    const filename_enc = `${lofi.original_name}.enc`;
    try {
      const localPath = await window.api.lofi.getLocalPath(filename_enc);
      if (localPath) {
        return `http://encrypted.localhost/focus/${encodeURIComponent(filename_enc)}`;
      } else {
        console.warn(`Local lofi file missing for ${lofi.original_name}, falling back to Drive.`);
      }
    } catch (e) {
      console.warn("Failed to check local lofi path", e);
    }
  }
  if (lofi.drive_file_id) {
    return getLofiStreamLink(lofi.drive_file_id);
  }
  throw new Error("Lofi não foi encontrado nem localmente nem na nuvem.");
}

export async function uploadNewLofi(file: File, duration?: number, onProgress?: (percent: number) => void): Promise<LofiItem> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

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

  if (localPath) {
    try {
      const req = await fetch('http://asset.localhost/' + encodeURIComponent(localPath));
      const encryptedBuffer = await req.arrayBuffer();
      mainFileId = await uploadToDrive(token, file.name + '.enc', encryptedBuffer, 'lofi', (p) => {
        if (onProgress) onProgress(40 + (p * 0.6));
      });
    } catch (e) {
      console.error("Erro ao ler arquivo criptografado", e);
      mainFileId = await uploadToDrive(token, file.name, buffer, 'lofi', (p) => {
        if (onProgress) onProgress(40 + (p * 0.6));
      });
    }
  } else {
    mainFileId = await uploadToDrive(token, file.name, buffer, 'lofi', (p) => {
      if (onProgress) onProgress(40 + (p * 0.6));
    });
  }

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
  if (lofi.is_local && window.api?.lofi) {
    await window.api.lofi.deleteLocal(lofi.original_name).catch((e: any) => console.warn("Failed to delete local", e));
  }

  const token = await getValidAccessToken();
  if (token && lofi.drive_file_id) {
    await deleteFromDrive(token, lofi.drive_file_id).catch((e: any) => console.warn("Falha ao apagar lofi do Drive", e));
  }

  if (window.api?.sync) {
    await window.api.sync.deleteRow(LOFI_TABLE, lofi.id);
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
