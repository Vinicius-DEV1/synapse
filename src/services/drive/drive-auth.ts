import { getWebDb } from '../db-web';
import { encryptText, decryptText } from '../crypto';
import { NetworkResilience } from '../../utils/network-resilience';
import type { DriveToken } from './drive-types';

export const resilientFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  return NetworkResilience.fetchWithBackoff(
    async (signal) => fetch(input, { ...init, signal }),
    3, 1000, 30000
  );
};

export const DRIVE_CLIENT_ID = '380707248992-fj03dp8cdeajh25b2til4954j2h3nn1m.apps.googleusercontent.com';
export const DRIVE_CLIENT_SECRET = import.meta.env.VITE_DRIVE_CLIENT_SECRET || 'REDACTED_DRIVE_CLIENT_SECRET';

// Extended drive auth helper for OAuth token storage
// mas tauriDriveApi (src/api/tauri/drive.ts) também implementa getCredentials/saveCredentials
// (fallback compatibility for locally stored credentials).
type DriveApiWithCredentials = {
  openExternalUrl: (url: string) => Promise<void>;
  getCredentials?: () => Promise<{ token: DriveToken | null } | null>;
  saveCredentials?: (data: { token: DriveToken | null }) => Promise<void>;
};

let _inMemoryMasterKey: CryptoKey | null = null;

export function setDriveMasterKey(key: CryptoKey | null) {
  _inMemoryMasterKey = key;
}

// === PKCE Helpers ===
function base64URLEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
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

/**
 * Generates Google OAuth2 login URL with PKCE
 */
export function getDriveAuthUrl(codeChallenge: string): string {
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
  const redirectUri = encodeURIComponent(import.meta.env.VITE_DRIVE_REDIRECT_URI || 'http://localhost:5173'); 
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${DRIVE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&code_challenge=${codeChallenge}&code_challenge_method=S256`;
}

/**
 * Troca o código de autorização por tokens (Access + Refresh)
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
          let parsed;
          try {
            parsed = JSON.parse(val);
          } catch {
            if (_inMemoryMasterKey) {
              const decrypted = await decryptText(val, _inMemoryMasterKey);
              parsed = JSON.parse(decrypted);
            } else {
              return { token: null };
            }
          }
          return parsed ? parsed : { token: null };
        }
      }
    } catch (e) {
      console.warn("Failed to read drive_credentials from SQLite", e);
    }
    // Fallback to local file for backwards compatibility
    const driveApi = window.api?.drive as DriveApiWithCredentials | undefined;
    if (driveApi?.getCredentials) {
      const creds = await driveApi.getCredentials();
      return creds ? creds : { token: null };
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
        let parsed;
        try {
          parsed = JSON.parse(val);
        } catch {
          if (_inMemoryMasterKey) {
            const decrypted = await decryptText(val, _inMemoryMasterKey);
            parsed = JSON.parse(decrypted);
          } else {
            return { token: null };
          }
        }
        return parsed ? parsed : { token: null };
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
  
  let valToSave = JSON.stringify(dataPayload);
  if (_inMemoryMasterKey) {
    valToSave = await encryptText(valToSave, _inMemoryMasterKey);
  }

  if (window.api?.sync) {
    await window.api.sync.upsertRow('config', {
      id: 'drive_credentials',
      data: valToSave,
      updated_at: new Date().toISOString()
    });
    const driveApi = window.api?.drive as DriveApiWithCredentials | undefined;
    if (driveApi?.saveCredentials) {
      await driveApi.saveCredentials(dataPayload);
    }
    return;
  }
  
  const db = await getWebDb();
  await db.put('config', { 
    id: 'drive_credentials', 
    data: valToSave,
    updated_at: new Date().toISOString()
  });
}

export async function forceTokenRefresh(): Promise<string | null> {
  const creds = await getDriveCredentials();
  if (!creds.token || !creds.token.refresh_token) return null;
  
  try {
    const newToken = await refreshToken(creds.token.refresh_token);
    await saveDriveCredentials(newToken);
    return newToken.access_token;
  } catch (e) {
    console.error("Failed to force refresh token", e);
    await saveDriveCredentials(null);
    window.dispatchEvent(new CustomEvent('drive-auth-expired'));
    return null;
  }
}

/**
 * Retorna um access token válido (renova automaticamente se necessário).
 */
export async function getValidAccessToken(forceRefresh = false): Promise<string | null> {
  if (forceRefresh) return await forceTokenRefresh();
  
  const creds = await getDriveCredentials();
  if (!creds.token) return null;

  if (Date.now() > (creds.token.expires_at || 0) - 60000) { // 1 min buffer
    if (!creds.token.refresh_token) {
      return null;
    }
    try {
      const newToken = await refreshToken(creds.token.refresh_token);
      await saveDriveCredentials(newToken);
      return newToken.access_token;
    } catch (e) {
      console.error("Failed to refresh token", e);
      await saveDriveCredentials(null);
      window.dispatchEvent(new CustomEvent('drive-auth-expired'));
      return null;
    }
  }

  return creds.token.access_token;
}
