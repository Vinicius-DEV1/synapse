import { resilientFetch } from './drive-auth';
import { getOrCreateAppFolder, getOrCreatePhotosFolder, getOrCreateLofiFolder, DRIVE_API_URL } from './drive-folders';
import { exportKeyToHex } from '../crypto';
import { decryptVaultField } from '../vault-crypto';
import type { DriveFile } from './drive-types';

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/**
 * Decrypts file ID if encrypted by Desktop (Rust)
 */
export async function decryptDriveFileId(fileId: string): Promise<string> {
  if (fileId && fileId.includes(':') && fileId.split(':').length === 3) {
    const keys = (window as any).__cadernoModuleKeys;
    if (!keys) return fileId;
    
    for (const mod of Object.keys(keys)) {
       try {
         const hex = await exportKeyToHex(keys[mod]);
         const decrypted = await decryptVaultField(fileId, hex);
         if (decrypted && !decrypted.includes(':')) {
           return decrypted;
         }
       } catch (e) {
         // Ignore and try next key
       }
    }
  }
  return fileId;
}

/**
 * Uploads encrypted buffer to Google Drive
 */
export async function uploadToDrive(
  accessToken: string, 
  filename: string, 
  buffer: ArrayBuffer | Blob, 
  targetFolder: 'root' | 'photos' | 'lofi' = 'root',
  onProgress?: (percent: number) => void
): Promise<string> {
  let folderId = await getOrCreateAppFolder(accessToken);
  if (targetFolder === 'photos') {
    folderId = await getOrCreatePhotosFolder(accessToken, folderId);
  } else if (targetFolder === 'lofi') {
    folderId = await getOrCreateLofiFolder(accessToken, folderId);
  }

  const metadata = {
    name: filename,
    parents: [folderId]
  };

  // Step 1: Create file metadata
  const metaRes = await resilientFetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!metaRes.ok) {
    throw new Error(`Erro ao criar arquivo no Google Drive: ${metaRes.statusText}`);
  }

  const metaData = await metaRes.json();
  const fileId = metaData.id;

  // Step 2: Upload content (ArrayBuffer) using uploadType=media via XMLHttpRequest for progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PATCH', `${DRIVE_UPLOAD_URL.split('?')[0]}/${fileId}?uploadType=media`, true);
    
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(fileId);
      } else {
        reject(new Error(`Erro ao fazer upload no Google Drive: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Falha na rede durante o upload.'));
    
    xhr.send(buffer);
  });
}

/**
 * Baixa um arquivo do Google Drive
 */
export async function downloadFromDrive(
  accessToken: string, 
  fileId: string,
  onProgress?: (percent: number) => void
): Promise<ArrayBuffer> {
  fileId = await decryptDriveFileId(fileId);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${DRIVE_API_URL}/${fileId}?alt=media`, true);
    xhr.responseType = 'arraybuffer';
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    if (onProgress) {
      xhr.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Erro ao baixar arquivo do Google Drive: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Falha na rede durante o download.'));
    
    xhr.send();
  });
}

/**
 * Lista todos os arquivos dentro de uma pasta no Google Drive.
 */
export async function listFiles(accessToken: string, folderId: string): Promise<DriveFile[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  let allFiles: DriveFile[] = [];
  let pageToken: string | undefined = undefined;

  do {
    let url = `${DRIVE_API_URL}?q=${query}&fields=nextPageToken,files(id,name,createdTime,size,mimeType)&pageSize=1000`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const res = await resilientFetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to list files in Drive: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    if (data.files) {
      allFiles = allFiles.concat(data.files);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

/**
 * Deleta um arquivo definitivamente do Google Drive.
 */
export async function deleteFromDrive(accessToken: string, fileId: string): Promise<void> {
  fileId = await decryptDriveFileId(fileId);
  const res = await resilientFetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok && res.status !== 404) { // Ignore if already deleted (404)
    const errorText = await res.text();
    throw new Error(`Failed to delete file from Drive: ${res.status} - ${errorText}`);
  }
}
