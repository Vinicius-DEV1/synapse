import { getWebDb } from './db-web';
import { encryptText, decryptText } from './crypto';

export const DRIVE_CLIENT_ID = '380707248992-fj03dp8cdeajh25b2til4954j2h3nn1m.apps.googleusercontent.com';
export const DRIVE_CLIENT_SECRET = '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'; // Seguro manter no client para SPA/Electron pessoais

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

async function getOrCreateAppFolder(accessToken: string): Promise<string> {
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

/**
 * Faz upload do buffer (já criptografado) para o Google Drive
 */
export async function uploadToDrive(accessToken: string, filename: string, buffer: ArrayBuffer): Promise<string> {
  const folderId = await getOrCreateAppFolder(accessToken);

  const metadata = {
    name: filename,
    mimeType: 'application/octet-stream',
    parents: [folderId] // Salva dentro da pasta do app
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([buffer], { type: 'application/octet-stream' }));

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  });

  if (!res.ok) {
    throw new Error(`Erro ao fazer upload no Google Drive: ${res.statusText}`);
  }

  const data = await res.json();
  return data.id; // File ID no Google Drive
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
      if (row && row.value) {
        return JSON.parse(row.value);
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
  if (config && config.value) {
    try {
      return JSON.parse(config.value);
    } catch (e) {
      return { token: null };
    }
  }
  return { token: null };
}

/**
 * Salva as credenciais persistidas localmente
 */
export async function saveDriveCredentials(token: DriveToken | null): Promise<void> {
  const data = { token };
  
  if (window.api?.sync) {
    // Salva na tabela config para que o sync engine envie pro Firebase
    await window.api.sync.upsertRow('config', {
      id: 'drive_credentials',
      value: JSON.stringify(data),
      updated_at: new Date().toISOString()
    });
    // Fallback local file
    if (window.api?.drive) {
      await window.api.drive.saveCredentials(data);
    }
    return;
  }
  
  const db = await getWebDb();
  await db.put('config', { 
    id: 'drive_credentials', 
    value: JSON.stringify(data),
    updated_at: new Date().toISOString()
  });
}

/**
 * Retorna um access token válido (renova automaticamente se necessário).
 */
export async function getValidAccessToken(): Promise<string | null> {
  const creds = await getDriveCredentials();
  if (!creds.token) return null;

  if (creds.token.expires_at && Date.now() > creds.token.expires_at - (5 * 60 * 1000)) {
    if (!creds.token.refresh_token) return null;
    
    try {
      const newToken = await refreshToken(creds.token.refresh_token);
      await saveDriveCredentials(newToken);
      return newToken.access_token;
    } catch (err) {
      console.error("Falha ao renovar token:", err);
      return null;
    }
  }

  return creds.token.access_token;
}
