import { getValidAccessToken, downloadFromDrive } from '../services/drive';
import { decryptFile } from '../services/storage';
import type { FileItem } from '../types';

const blobCache = new Map<string, Blob>();

export function getCachedBlob(url: string): Blob | undefined {
  return blobCache.get(url);
}

export function cacheBlobUrl(url: string, blob: Blob): void {
  blobCache.set(url, blob);
}

export function revokeCachedBlobUrl(url: string): void {
  if (blobCache.has(url)) {
    blobCache.delete(url);
    try {
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.debug('[file-fetcher] Failed to revoke blob URL:', err);
    }
  }
}

/**
 * Safely reads text content from a resolved URL.
 * If the URL is backed by an in-memory cached Blob, it directly calls blob.text(),
 * bypassing network fetch and CSP connect-src restrictions entirely.
 */
export async function fetchTextFromUrl(url: string): Promise<string> {
  const cached = blobCache.get(url);
  if (cached) {
    return await cached.text();
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha na requisição: status ${res.status}`);
  }
  return await res.text();
}

/**
 * Safely retrieves a Blob from a cached URL or via fetch.
 */
export async function getBlobFromUrlOrFetch(url: string): Promise<Blob> {
  const cached = blobCache.get(url);
  if (cached) {
    return cached;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao ler dados: status ${res.status}`);
  }
  return await res.blob();
}

export async function getDecryptedFileUrl(
  item: FileItem, 
  masterKey?: CryptoKey | null
): Promise<string | null> {
  let url = '';

  // 1. Attempt to fetch existing local file
  if (item.local_path && typeof window !== 'undefined' && window.api?.files) {
    try {
      const localUrl = await window.api.files.getLocal(item.local_path);
      if (localUrl) {
        url = localUrl;
      }
    } catch (e) {
      console.warn("[FileFetcher] Error fetching local file:", e);
    }
  }

  // 2. Fallback to downloading from Google Drive if local file is unavailable
  if (!url && item.drive_file_id) {
    const token = await getValidAccessToken();
    if (token) {
      try {
        let arrayBuffer = await downloadFromDrive(token, item.drive_file_id);
        if (masterKey) {
          try {
            arrayBuffer = await decryptFile(arrayBuffer, masterKey);
          } catch (e) {
            console.warn("[FileFetcher] Descriptografia falhou ou arquivo não criptografado:", e);
          }
        }
        const blob = new Blob([arrayBuffer], { type: item.mime_type || 'application/octet-stream' });
        url = URL.createObjectURL(blob);
        blobCache.set(url, blob);
      } catch (driveErr) {
        console.error("[FileFetcher] Falha ao baixar arquivo do Drive:", driveErr);
      }
    }
  }

  return url || null;
}

