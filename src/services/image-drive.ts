/**
 * image-drive.ts
 *
 * Service responsible for encrypted image uploads to Google Drive
 * and local caching (IndexedDB on Web, IPC on Tauri).
 */

import { encryptFile, decryptFile } from './storage';
import { getValidAccessToken, uploadToDrive, downloadFromDrive } from './drive';
import { getWebDb } from './db-web';
import { isDesktopApp } from './platform';

// Utility: Detect true MIME type from image magic bytes
function detectMimeType(buffer: ArrayBuffer): string {
  const arr = new Uint8Array(buffer).subarray(0, 4);
  const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  if (header.startsWith('89504e47')) return 'image/png';
  if (header.startsWith('ffd8ff')) return 'image/jpeg';
  if (header.startsWith('47494638')) return 'image/gif';
  if (header.startsWith('52494646')) return 'image/webp'; // RIFF...WEBP
  return 'image/png'; // fallback
}

// ---------------------------------------------------------------------------
// Helpers de cache local
// ---------------------------------------------------------------------------

interface CachedImage {
  id: string;
  data: ArrayBuffer;
  mimeType: string;
}

/**
 * Busca uma imagem no cache local.
 * Retorna o registro cacheado ou undefined se não existir.
 */
export async function getCachedImage(id: string): Promise<CachedImage | undefined> {
  if (isDesktopApp()) {
    // Desktop - usa comandos nativos do Tauri para acessar o cache
    try {
      const cached = await window.api?.imageCache?.get(id);
      if (cached) {
        return {
          id,
          data: new Uint8Array(cached.data).buffer,
          mimeType: cached.mimeType
        };
      }
    } catch (e) {
      console.error('[ImageDrive:getCachedImage] Erro ao ler cache local via Tauri:', e);
    }
    return undefined;
  } else {
    // Web - usa IndexedDB
    const db = await getWebDb();
    const result = await db.get('image_cache', id);
    return result ?? undefined;
  }
}

/**
 * Salva uma imagem no cache local.
 */
export async function setCachedImage(
  id: string,
  data: ArrayBuffer,
  mimeType: string
): Promise<void> {
  if (isDesktopApp()) {
    // Desktop - usa comandos nativos do Tauri
    try {
      await window.api?.imageCache?.put(id, data, mimeType);
      
      // Immediate verification: read back to confirm persistence
      const verifyResult = await window.api?.imageCache?.get(id);
      console.log(`[ImageDrive:setCachedImage] Verificação pós-save:`, verifyResult ? `OK (data.length=${verifyResult.data?.length})` : 'FALHOU - retornou null!');
    } catch (e) {
      console.error('[ImageDrive:setCachedImage] Erro ao salvar no cache local via Tauri:', e);
    }
  } else {
    // Web - grava diretamente no IndexedDB (usa idb, API Promise-based)
    const db = await getWebDb();
    await db.put('image_cache', { id, data, mimeType });
  }
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Faz upload de uma imagem criptografada para a pasta FOTOS do Google Drive.
 * Se não houver token do Drive (modo offline/local), salva apenas no cache local
 * com um ID permanente (local_xxx) para que a imagem continue visível sem Drive.
 * Retorna o ID final da imagem (Drive ID ou ID local).
 */
export async function uploadEncryptedImage(
  file: File,
  masterKey: CryptoKey
): Promise<string> {
  console.log(`[ImageDrive:uploadEncryptedImage] Iniciando upload. file.name="${file.name}", file.size=${file.size}, file.type="${file.type}"`);
  
  // 1. Read file as ArrayBuffer
  const originalBuffer = await file.arrayBuffer();
  console.log(`[ImageDrive:uploadEncryptedImage] ArrayBuffer lido: ${originalBuffer.byteLength} bytes`);

  // 2. Try to get valid access token
  const token = await getValidAccessToken().catch((e) => {
    console.error(`[ImageDrive:uploadEncryptedImage] Erro ao obter token:`, e);
    return null;
  });
  console.log(`[ImageDrive:uploadEncryptedImage] Token obtido: ${token ? 'SIM (length=' + token.length + ')' : 'NÃO (null)'}`);

  if (!token) {
    // Dispatch event to notify user (opens auth modal)
    window.dispatchEvent(new CustomEvent('drive-auth-expired'));
    
    // Modo offline/local: salva apenas no cache com ID permanente
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setCachedImage(localId, originalBuffer, file.type);
    console.log(`[ImageDrive] Sem token Drive — modal disparado e imagem salva localmente como ${localId}`);
    return localId;
  }

  // 3. Encrypt content with AES-GCM
  const encryptedBuffer = await encryptFile(originalBuffer, masterKey);
  console.log(`[ImageDrive:uploadEncryptedImage] Criptografado: ${encryptedBuffer.byteLength} bytes`);

  // 4. Generate unique filename for Drive
  const uniqueName = `IMG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.enc`;

  // 5. Faz upload para a pasta FOTOS (usePhotosFolder = true)
  const driveFileId = await uploadToDrive(token, uniqueName, encryptedBuffer, 'photos');
  console.log(`[ImageDrive:uploadEncryptedImage] Upload concluído. driveFileId="${driveFileId}"`);

  // 6. Save ORIGINAL image to local cache for fast access
  await setCachedImage(driveFileId, originalBuffer, file.type);
  console.log(`[ImageDrive:uploadEncryptedImage] Cache local salvo com driveFileId="${driveFileId}"`);

  return driveFileId;
}

/**
 * Obtém uma imagem pelo ID do arquivo no Google Drive.
 * Primeiro verifica o cache local (IndexedDB / Tauri IPC).
 * Se não encontrar, baixa do Drive, descriptografa, salva no cache e retorna.
 * Retorna uma object URL (blob://) para uso em tags <img>.
 * O chamador é responsável por revogar a URL quando não precisar mais.
 */
export async function getDecryptedImageUrl(
  driveFileId: string,
  masterKey: CryptoKey
): Promise<string> {
  // 1. Tenta buscar no cache local primeiro
  const cached = await getCachedImage(driveFileId);

  if (cached) {
    // Encontrou no cache — cria blob URL diretamente
    const blob = new Blob([cached.data], { type: cached.mimeType || 'image/png' });
    const url = URL.createObjectURL(blob);
    return url;
  }

  // 2. Images with local_ ID exist ONLY in cache - if absent, they are lost
  if (driveFileId.startsWith('local_')) {
    throw new Error('Imagem local não encontrada no cache. Pode ter sido perdida ao reinstalar o app.');
  }

  // 3. Not in cache - download from Drive
  const token = await getValidAccessToken().catch(() => null);
  if (!token) {
    throw new Error(
      'Sem token do Google Drive. Faça login no Drive nas Configurações.'
    );
  }

  // 4. Baixa o arquivo criptografado do Drive
  const encryptedBuffer = await downloadFromDrive(token, driveFileId);

  // 5. Decrypt content
  const decryptedBuffer = await decryptFile(encryptedBuffer, masterKey);

  // 6. Salva no cache local (B20: detecta mimeType real para evitar inflar JPEGs como PNG)
  const realMimeType = detectMimeType(decryptedBuffer);
  await setCachedImage(driveFileId, decryptedBuffer, realMimeType);

  // 7. Cria e retorna a blob URL
  const blob = new Blob([decryptedBuffer], { type: realMimeType });
  const url = URL.createObjectURL(blob);
  return url;
}

