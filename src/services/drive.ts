import { getWebDb } from './db-web';
import { encryptText, decryptText } from './crypto';

export const DRIVE_CLIENT_ID = '380707248992-fj03dp8cdeajh25b2til4954j2h3nn1m.apps.googleusercontent.com';
export const DRIVE_CLIENT_SECRET = 'REDACTED_DRIVE_CLIENT_SECRET'; // Seguro manter no client para SPA/Electron pessoais

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

/**
 * Gera a URL de login do Google (OAuth2)
 */
export function getDriveAuthUrl(): string {
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
  // Usa localhost mesmo se estivermos rodando no Electron ou Web
  const redirectUri = encodeURIComponent('http://localhost:5173'); 
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${DRIVE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
}

/**
 * Troca o código copiado pelo usuário por um par de tokens (Access + Refresh)
 */
export async function exchangeCodeForToken(code: string): Promise<DriveToken> {
  const params = new URLSearchParams();
  params.append('client_id', DRIVE_CLIENT_ID);
  params.append('client_secret', DRIVE_CLIENT_SECRET);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  // IMPORTANTE: Tem que bater exatamente com o que foi usado na autorização
  params.append('redirect_uri', 'http://localhost:5173');

  const res = await fetch('https://oauth2.googleapis.com/token', {
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

  const res = await fetch('https://oauth2.googleapis.com/token', {
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
  const res = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Se não existir, cria a pasta
  const createRes = await fetch(DRIVE_API_URL, {
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
  const res = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Se não existir, cria a subpasta FOTOS
  const createRes = await fetch(DRIVE_API_URL, {
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

/**
 * Faz upload do buffer (já criptografado) para o Google Drive
 */
export async function uploadToDrive(
  accessToken: string, 
  filename: string, 
  buffer: ArrayBuffer, 
  usePhotosFolder: boolean = false,
  onProgress?: (percent: number) => void
): Promise<string> {
  let folderId = await getOrCreateAppFolder(accessToken);
  if (usePhotosFolder) {
    folderId = await getOrCreatePhotosFolder(accessToken, folderId);
  }

  const metadata = {
    name: filename,
    parents: [folderId]
  };

  // Passo 1: Criar o arquivo vazio (apenas metadados)
  const metaRes = await fetch(DRIVE_API_URL, {
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
export async function downloadFromDrive(accessToken: string, fileId: string): Promise<ArrayBuffer> {
  const res = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    throw new Error(`Erro ao baixar arquivo do Google Drive: ${res.statusText}`);
  }

  return await res.arrayBuffer();
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
        return JSON.parse(val);
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
  await db.put('config', { 
    id: 'drive_credentials', 
    data: JSON.stringify(dataPayload),
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
}

/**
 * Lista todos os arquivos dentro de uma pasta no Google Drive.
 */
export async function listFiles(accessToken: string, folderId: string): Promise<DriveFile[]> {
  // Query para pegar os arquivos da pasta que não estão na lixeira
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  // fields pede arquivos com id, name e data de criação
  const url = `${DRIVE_API_URL}?q=${query}&fields=files(id,name,createdTime)&pageSize=1000`;

  const res = await fetch(url, {
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
  const res = await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok && res.status !== 404) { // Ignora se já foi apagado (404)
    const errorText = await res.text();
    throw new Error(`Failed to delete file from Drive: ${res.status} - ${errorText}`);
  }
}
