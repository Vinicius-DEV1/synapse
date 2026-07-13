import { getWebDb } from './db-web';
import { encryptText, decryptText } from './crypto';
import { NetworkResilience } from '../utils/NetworkResilience';

const resilientFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  return NetworkResilience.fetchWithBackoff(
    async (signal) => fetch(input, { ...init, signal }),
    3, 1000, 30000
  );
};

export const DRIVE_CLIENT_ID = '380707248992-fj03dp8cdeajh25b2til4954j2h3nn1m.apps.googleusercontent.com';
export const DRIVE_CLIENT_SECRET = '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'; // Google requires client_secret even with PKCE for Desktop apps

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

export interface DriveToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  expires_at?: number;
}

let _inMemoryMasterKey: CryptoKey | null = null;

export function setDriveMasterKey(key: CryptoKey | null) {
  _inMemoryMasterKey = key;
}

// === PKCE Helpers ===
function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(digest);
}
// ====================

/**
 * Gera a URL de login do Google (OAuth2)
 */
export function getDriveAuthUrl(codeChallenge: string): string {
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
  const redirectUri = encodeURIComponent('http://localhost:5173'); 
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${DRIVE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&code_challenge=${codeChallenge}&code_challenge_method=S256`;
}

/**
 * Troca o código copiado pelo usuário por um par de tokens (Access + Refresh)
 */
export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<DriveToken> {
  const params = new URLSearchParams();
  params.append('client_id', DRIVE_CLIENT_ID);
  params.append('client_secret', DRIVE_CLIENT_SECRET);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', 'http://localhost:5173');
  params.append('code_verifier', codeVerifier);

  const res = await resilientFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Falha ao obter token: ${error.error_description || error.error}`);
  }

  const token: DriveToken = await res.json();
  token.expires_at = Date.now() + (token.expires_in * 1000);
  return token;
}

/**
 * Renova o token de acesso usando o refresh token
 */
export async function refreshToken(refresh_token: string): Promise<DriveToken> {
  const params = new URLSearchParams();
  params.append('client_id', DRIVE_CLIENT_ID);
  params.append('client_secret', DRIVE_CLIENT_SECRET);
  params.append('refresh_token', refresh_token);
  params.append('grant_type', 'refresh_token');

  const res = await resilientFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    throw new Error('Falha ao renovar token do Google Drive');
  }

  const token: DriveToken = await res.json();
  token.expires_at = Date.now() + (token.expires_in * 1000);
  if (!token.refresh_token) {
    token.refresh_token = refresh_token;
  }
  return token;
}

const APP_FOLDER_NAME = 'Caderno - Biblioteca';

export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(`name = '${APP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await resilientFetch(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Se não existir, cria a pasta
  const createRes = await resilientFetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  const createData = await createRes.json();
  return createData.id;
}

export async function getOrCreatePhotosFolder(accessToken: string, parentFolderId: string): Promise<string> {
  const query = encodeURIComponent(`name = 'FOTOS' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await resilientFetch(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Se não existir, cria a subpasta FOTOS
  const createRes = await resilientFetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'FOTOS',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    })
  });

  const createData = await createRes.json();
  return createData.id;
}

export async function getOrCreateLofiFolder(accessToken: string, parentFolderId: string): Promise<string> {
  const query = encodeURIComponent(`name = 'LOFI' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await resilientFetch(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Se não existir, cria a subpasta LOFI
  const createRes = await resilientFetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'LOFI',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    })
  });

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Faz upload do buffer (já criptografado) para o Google Drive
 */
export async function uploadToDrive(
  accessToken: string, 
  filename: string, 
  buffer: ArrayBuffer, 
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

  // Passo 1: Criar o arquivo vazio (apenas metadados)
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

  // Passo 2: Fazer o upload do conteúdo (ArrayBuffer) usando uploadType=media via XMLHttpRequest para ter progresso
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
 * Pega as credenciais persistidas localmente
 */
export async function getDriveCredentials(): Promise<{ token: DriveToken | null }> {
  if (window.api?.sync) {
    try {
      const rows = await window.api.sync.getTable('config');
      const row = rows.find((r: any) => r.id === 'drive_credentials');
      if (row) {
        const val = row.data || row.value;
        if (val) {
          return JSON.parse(val);
        }
      }
    } catch (e) {
      console.warn("Failed to read drive_credentials from SQLite", e);
    }
    // Fallback to local file for backwards compatibility
    if (window.api?.drive) {
      return await window.api.drive.getCredentials();
    }
    return { token: null };
  }
  
  // Web fallback (lê do config no IndexedDB)
  const db = await getWebDb();
  const config = await db.get('config', 'drive_credentials');
  if (config) {
    const val = config.data || config.value;
    if (val) {
      try {
        let decrypted = val;
        // Se não iniciar com {, assumimos que está encriptado no IndexedDB
        if (!val.startsWith('{') && _inMemoryMasterKey) {
          decrypted = await decryptText(val, _inMemoryMasterKey);
        }
        return JSON.parse(decrypted);
      } catch (e) {
        return { token: null };
      }
    }
  }
  return { token: null };
}

/**
 * Salva as credenciais persistidas localmente
 */
export async function saveDriveCredentials(token: DriveToken | null): Promise<void> {
  const dataPayload = { token };
  
  if (window.api?.sync) {
    // Salva na tabela config para que o sync engine envie pro Firebase
    // Usa 'data' pois a coluna do SQLite se chama 'data'
    await window.api.sync.upsertRow('config', {
      id: 'drive_credentials',
      data: JSON.stringify(dataPayload),
      updated_at: new Date().toISOString()
    });
    // Fallback local file
    if (window.api?.drive) {
      await window.api.drive.saveCredentials(dataPayload);
    }
    return;
  }
  
  const db = await getWebDb();
  let valToSave = JSON.stringify(dataPayload);
  if (_inMemoryMasterKey) {
    valToSave = await encryptText(valToSave, _inMemoryMasterKey);
  }
  await db.put('config', { 
    id: 'drive_credentials', 
    data: valToSave,
    updated_at: new Date().toISOString()
  });
}

/**
 * Retorna um access token válido (renova automaticamente se necessário).
 */
export async function getValidAccessToken(): Promise<string | null> {
  const creds = await getDriveCredentials();
  if (!creds.token) return null;

  if (Date.now() > (creds.token.expires_at || 0) - 60000) { // 1 min buffer
    try {
      const newToken = await refreshToken(creds.token.refresh_token);
      await saveDriveCredentials(newToken);
      return newToken.access_token;
    } catch (e) {
      console.error("Failed to refresh token", e);
      return null;
    }
  }

  return creds.token.access_token;
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  mimeType?: string;
}

/**
 * Lista todos os arquivos dentro de uma pasta no Google Drive.
 */
export async function listFiles(accessToken: string, folderId: string): Promise<DriveFile[]> {
  // Query para pegar os arquivos da pasta que não estão na lixeira
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  // fields pede arquivos com id, name, data de criação, tamanho e tipo
  const url = `${DRIVE_API_URL}?q=${query}&fields=files(id,name,createdTime,size,mimeType)&pageSize=1000`;

  const res = await resilientFetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list files in Drive: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Deleta um arquivo definitivamente do Google Drive.
 */
export async function deleteFromDrive(accessToken: string, fileId: string): Promise<void> {
  const res = await resilientFetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok && res.status !== 404) { // Ignora se já foi apagado (404)
    const errorText = await res.text();
    throw new Error(`Failed to delete file from Drive: ${res.status} - ${errorText}`);
  }
}

export interface DriveStorageUsage {
  total: number;
  modules: {
    library: number;
    photos: number;
    videos: number;
    lofi: number;
    others: number;
  }
}

/**
 * Calcula o uso de armazenamento no Google Drive para os diferentes módulos do app.
 */
export async function getDriveStorageUsage(): Promise<DriveStorageUsage | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  try {
    const appFolderId = await getOrCreateAppFolder(token);
    const photosFolderId = await getOrCreatePhotosFolder(token, appFolderId);
    const lofiFolderId = await getOrCreateLofiFolder(token, appFolderId);

    // Get files in main folder
    const mainFiles = await listFiles(token, appFolderId);
    // Get files in photos folder
    const photoFiles = await listFiles(token, photosFolderId);
    // Get files in lofi folder
    const lofiFiles = await listFiles(token, lofiFolderId);

    let library = 0;
    let videos = 0;
    let others = 0;
    
    for (const f of mainFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue;
      
      const size = parseInt(f.size || '0', 10);
      
      if (f.name.startsWith('Caderno_') && f.name.endsWith('.enc')) {
        library += size;
      } else if (f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.vtt') || f.name.endsWith('.m4a') || f.name.includes(' - Legenda ') || f.name.includes(' - Audio ')) {
        videos += size;
      } else {
        others += size;
      }
    }

    let photos = 0;
    for (const f of photoFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue;
      const size = parseInt(f.size || '0', 10);
      photos += size;
    }

    let lofi = 0;
    for (const f of lofiFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue;
      const size = parseInt(f.size || '0', 10);
      lofi += size;
    }

    return {
      total: library + videos + photos + lofi + others,
      modules: {
        library,
        photos,
        videos,
        lofi,
        others
      }
    };
  } catch (error) {
    console.error("Failed to get drive storage usage:", error);
    return null;
  }
}
