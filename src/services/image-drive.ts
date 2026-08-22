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
// Local Cache Helpers
// ---------------------------------------------------------------------------

interface CachedImage {
  id: string;
  data: ArrayBuffer;
  mimeType: string;
}

/**
 * Retrieves an image from the local cache.
 * Returns the cached record or undefined if not found.
 */
export async function getCachedImage(id: string): Promise<CachedImage | undefined> {
  if (isDesktopApp()) {
    // Desktop - uses native Tauri IPC commands to access local cache
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
      console.error('[ImageDrive:getCachedImage] Error reading local cache via Tauri:', e);
    }
    return undefined;
  } else {
    // Web - uses IndexedDB
    const db = await getWebDb();
    const result = await db.get('image_cache', id);
    return result ?? undefined;
  }
}

/**
 * Persists an image record to the local cache.
 */
export async function setCachedImage(
  id: string,
  data: ArrayBuffer,
  mimeType: string
): Promise<void> {
  if (isDesktopApp()) {
    // Desktop - uses native Tauri IPC commands
    try {
      await window.api?.imageCache?.put(id, data, mimeType);
      
      // Immediate verification: read back to confirm persistence
      const verifyResult = await window.api?.imageCache?.get(id);
      console.log(`[ImageDrive:setCachedImage] Post-save verification:`, verifyResult ? `OK (data.length=${verifyResult.data?.length})` : 'FAILED - returned null!');
    } catch (e) {
      console.error('[ImageDrive:setCachedImage] Error saving to local cache via Tauri:', e);
    }
  } else {
    // Web - stores directly in IndexedDB via idb Promise wrapper
    const db = await getWebDb();
    await db.put('image_cache', { id, data, mimeType });
  }
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Uploads an encrypted image to the PHOTOS folder on Google Drive.
 * When running offline or without Drive credentials, stores exclusively in local cache
 * with a permanent local ID (local_xxx) ensuring the image remains viewable offline.
 * Returns the final image ID (Drive ID or local ID).
 */
export async function uploadEncryptedImage(
  file: File,
  masterKey: CryptoKey
): Promise<string> {
  console.log(`[ImageDrive:uploadEncryptedImage] Starting upload. file.name="${file.name}", file.size=${file.size}, file.type="${file.type}"`);
  
  // 1. Read file as ArrayBuffer
  const originalBuffer = await file.arrayBuffer();
  console.log(`[ImageDrive:uploadEncryptedImage] ArrayBuffer read: ${originalBuffer.byteLength} bytes`);

  // 2. Try to get valid access token
  const token = await getValidAccessToken().catch((e) => {
    console.error(`[ImageDrive:uploadEncryptedImage] Error obtaining token:`, e);
    return null;
  });
  console.log(`[ImageDrive:uploadEncryptedImage] Token obtained: ${token ? 'YES (length=' + token.length + ')' : 'NO (null)'}`);

  if (!token) {
    // Dispatch event to notify user (opens auth modal)
    window.dispatchEvent(new CustomEvent('drive-auth-expired'));
    
    // Offline/local fallback: save exclusively to local cache with permanent ID
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setCachedImage(localId, originalBuffer, file.type);
    console.log(`[ImageDrive] No Drive token — auth modal dispatched and image saved locally as ${localId}`);
    return localId;
  }

  // 3. Encrypt content with AES-GCM
  const encryptedBuffer = await encryptFile(originalBuffer, masterKey);
  console.log(`[ImageDrive:uploadEncryptedImage] Encrypted: ${encryptedBuffer.byteLength} bytes`);

  // 4. Generate unique filename for Drive
  const uniqueName = `IMG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.enc`;

  // 5. Upload to PHOTOS folder on Google Drive
  const driveFileId = await uploadToDrive(token, uniqueName, encryptedBuffer, 'photos');
  console.log(`[ImageDrive:uploadEncryptedImage] Upload completed. driveFileId="${driveFileId}"`);

  // 6. Save ORIGINAL image to local cache for fast access
  await setCachedImage(driveFileId, originalBuffer, file.type);
  console.log(`[ImageDrive:uploadEncryptedImage] Local cache stored with driveFileId="${driveFileId}"`);

  return driveFileId;
}

/**
 * Retrieves and decrypts an image by its Google Drive file ID.
 * Checks local cache first (IndexedDB / Tauri IPC).
 * If cache miss, downloads from Drive, decrypts, saves to cache, and returns object URL.
 * Caller is responsible for revoking the object URL when no longer needed.
 */
export async function getDecryptedImageUrl(
  driveFileId: string,
  masterKey: CryptoKey
): Promise<string> {
  // 1. Check local cache first
  const cached = await getCachedImage(driveFileId);

  if (cached) {
    // Cache hit — construct blob URL directly
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

  // 4. Download encrypted buffer from Drive
  const encryptedBuffer = await downloadFromDrive(token, driveFileId);

  // 5. Decrypt content
  const decryptedBuffer = await decryptFile(encryptedBuffer, masterKey);

  // 6. Save to local cache (B20: detect real MIME type to avoid inflating JPEGs as PNG)
  const realMimeType = detectMimeType(decryptedBuffer);
  await setCachedImage(driveFileId, decryptedBuffer, realMimeType);

  // 7. Create and return object URL
  const blob = new Blob([decryptedBuffer], { type: realMimeType });
  const url = URL.createObjectURL(blob);
  return url;
}

