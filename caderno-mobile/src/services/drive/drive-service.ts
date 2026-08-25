import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { decryptText, decryptFile } from '../crypto';

export const DRIVE_CLIENT_ID = '380707248992-fj03dp8cdeajh25b2til4954j2h3nn1m.apps.googleusercontent.com';
export const DRIVE_CLIENT_SECRET = 'REDACTED_DRIVE_CLIENT_SECRET';

interface DriveToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
}

let cachedToken: DriveToken | null = null;

/**
 * Renews access token using the stored refresh token from Google OAuth2
 */
export async function refreshDriveToken(refreshTokenStr: string): Promise<DriveToken> {
  const params = new URLSearchParams();
  params.append('client_id', DRIVE_CLIENT_ID);
  params.append('client_secret', DRIVE_CLIENT_SECRET);
  params.append('refresh_token', refreshTokenStr);
  params.append('grant_type', 'refresh_token');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[DRIVE] Falha ao renovar token OAuth:', errText);
    throw new Error('Falha ao renovar token do Google Drive');
  }

  const token: DriveToken = await res.json();
  token.expires_at = Date.now() + ((token.expires_in || 3600) * 1000);
  if (!token.refresh_token) {
    token.refresh_token = refreshTokenStr;
  }
  return token;
}

/**
 * Fetches and decrypts the synchronized Google Drive credentials from Firebase.
 * Handles single-encryption, double-encryption, and direct token formats.
 */
export async function getValidDriveAccessToken(coreKeyHex: string): Promise<string | null> {
  try {
    // 1. Check in-memory cached active token
    if (cachedToken?.access_token && cachedToken.expires_at && cachedToken.expires_at > Date.now() + 60000) {
      return cachedToken.access_token;
    }

    console.log('[DRIVE] 🔍 Buscando credenciais do Drive no Firebase (config/drive_credentials)...');

    // 2. Fetch encrypted drive_credentials document from Firebase config collection
    const docSnap = await getDoc(doc(db, 'config', 'drive_credentials'));
    if (!docSnap.exists()) {
      console.warn('[DRIVE] Documento config/drive_credentials não encontrado no Firebase.');
      return null;
    }

    const data = docSnap.data() as { encryptedData?: string; data?: string; value?: string };
    const rawCipher = data.encryptedData || data.data || data.value;
    if (!rawCipher) {
      console.warn('[DRIVE] Documento config/drive_credentials está vazio.');
      return null;
    }

    let parsedPayload: any = {};
    try {
      // 1st Decrypt: with core key
      const decrypted = await decryptText(rawCipher, coreKeyHex);
      parsedPayload = JSON.parse(decrypted);
    } catch {
      try {
        parsedPayload = JSON.parse(rawCipher);
      } catch (e) {
        console.warn('[DRIVE] Falha no primeiro nível de decriptação do Drive:', e);
      }
    }

    // Check if double-encrypted (Desktop saves { id: 'drive_credentials', data: encryptText(JSON.stringify({ token })) })
    if (parsedPayload?.data && typeof parsedPayload.data === 'string') {
      try {
        const innerDecrypted = await decryptText(parsedPayload.data, coreKeyHex);
        const innerObj = JSON.parse(innerDecrypted);
        if (innerObj.token) {
          parsedPayload = innerObj;
        }
      } catch {
        try {
          const innerObj = JSON.parse(parsedPayload.data);
          if (innerObj.token) {
            parsedPayload = innerObj;
          }
        } catch {}
      }
    }

    const token: DriveToken | null = parsedPayload?.token || (parsedPayload?.access_token ? parsedPayload : null);
    if (!token) {
      console.warn('[DRIVE] Nenhum token válido encontrado no payload descriptografado:', parsedPayload);
      return null;
    }

    // If access token is still valid
    if (token.access_token && token.expires_at && token.expires_at > Date.now() + 60000) {
      console.log('[DRIVE] ✅ Token de acesso do Google Drive ainda válido!');
      cachedToken = token;
      return token.access_token;
    }

    // If we have a refresh token, refresh it automatically!
    const refreshTokenStr = token.refresh_token;
    if (refreshTokenStr) {
      console.log('[DRIVE] 🔄 Renovando token do Google Drive em segundo plano...');
      const renewed = await refreshDriveToken(refreshTokenStr);
      cachedToken = renewed;
      console.log('[DRIVE] ✅ Token do Google Drive renovado com sucesso!');
      return renewed.access_token;
    }

    if (token.access_token) {
      // Return whatever access token exists as best-effort fallback
      cachedToken = token;
      return token.access_token;
    }

    return null;
  } catch (err) {
    console.error('[DRIVE] Erro ao obter credenciais do Google Drive:', err);
    return null;
  }
}

/**
 * Downloads an encrypted or plain file from Google Drive and decrypts it
 */
export async function downloadAndDecryptDriveFile(
  driveFileId: string,
  coreKeyHex: string,
  libraryKeyHex: string,
  onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
  const token = await getValidDriveAccessToken(coreKeyHex);
  if (!token) {
    throw new Error('Google Drive desconectado. Conecte sua conta no Desktop ou importe o arquivo localmente.');
  }

  console.log(`[DRIVE] 📥 Baixando arquivo do Google Drive (${driveFileId})...`);

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
  
  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha no download do Drive (HTTP ${response.status})`);
  }

  const rawBuffer = await response.arrayBuffer();
  console.log(`[DRIVE] 📦 Arquivo recebido do Drive: ${rawBuffer.byteLength} bytes.`);

  // Check if file is already a plain ZIP/EPUB (magic bytes 'PK\x03\x04' -> [0x50, 0x4B, 0x03, 0x04])
  const header = new Uint8Array(rawBuffer.slice(0, 4));
  if (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04) {
    console.log('[DRIVE] 📄 Arquivo baixado é um EPUB não-criptografado direto!');
    return rawBuffer;
  }

  console.log(`[DRIVE] 🔓 Descriptografando arquivo baixado...`);

  // Try decrypting with library key first, then core key
  try {
    const decryptedBuffer = await decryptFile(rawBuffer, libraryKeyHex);
    return decryptedBuffer;
  } catch (libErr) {
    console.warn('[DRIVE] Falha ao descriptografar com chave library, tentando chave core...', libErr);
    try {
      const decryptedBuffer = await decryptFile(rawBuffer, coreKeyHex);
      return decryptedBuffer;
    } catch (coreErr) {
      console.error('[DRIVE] Falha em todas as chaves de decriptação:', coreErr);
      throw new Error('Não foi possível descriptografar o arquivo do Google Drive com as chaves atuais.');
    }
  }
}
