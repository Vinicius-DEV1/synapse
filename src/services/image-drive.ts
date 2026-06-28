/**
 * image-drive.ts
 *
 * Serviço responsável por upload de imagens criptografadas no Google Drive
 * e cache local (IndexedDB na web, IPC no Electron).
 */

import { encryptFile, decryptFile } from './storage';
import { getValidAccessToken, uploadToDrive, downloadFromDrive } from './drive';
import { getWebDb } from './db-web';

// ---------------------------------------------------------------------------
// Helpers de cache local
// ---------------------------------------------------------------------------

interface CachedImage {
  id: string;
  data: ArrayBuffer;
  mimeType: string;
}

/**
 * Verifica se estamos rodando no Electron (window.api existe) ou na web.
 * No Electron usa IPC handlers; na web usa IndexedDB diretamente.
 */
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).api && !!(window as any).api.imageCache;
}

/**
 * Busca uma imagem no cache local.
 * Retorna o registro cacheado ou undefined se não existir.
 */
async function getCachedImage(id: string): Promise<CachedImage | undefined> {
  if (isElectron()) {
    // Electron — usa IPC para acessar o cache de imagens
    const result = await (window as any).api.imageCache.get(id);
    return result ?? undefined;
  }

  // Web — acessa IndexedDB diretamente (usa idb, API Promise-based)
  const db = await getWebDb();
  const result = await db.get('image_cache', id);
  return result ?? undefined;
}

/**
 * Salva uma imagem no cache local.
 */
async function setCachedImage(
  id: string,
  data: ArrayBuffer,
  mimeType: string
): Promise<void> {
  if (isElectron()) {
    // Electron — usa IPC para gravar no cache de imagens
    await (window as any).api.imageCache.put(id, data, mimeType);
    return;
  }

  // Web — grava diretamente no IndexedDB (usa idb, API Promise-based)
  const db = await getWebDb();
  await db.put('image_cache', { id, data, mimeType });
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Faz upload de uma imagem criptografada para a pasta FOTOS do Google Drive.
 * Também salva a imagem original (sem criptografia) no cache local (IndexedDB).
 * Retorna o ID do arquivo no Google Drive.
 */
export async function uploadEncryptedImage(
  file: File,
  masterKey: CryptoKey
): Promise<string> {
  // 1. Lê o arquivo como ArrayBuffer
  const originalBuffer = await file.arrayBuffer();

  // 2. Obtém um token de acesso válido
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error(
      'Sem token do Google Drive. Faça login no Drive nas Configurações.'
    );
  }

  // 3. Criptografa o conteúdo com AES-GCM
  const encryptedBuffer = await encryptFile(originalBuffer, masterKey);

  // 4. Gera um nome de arquivo único para o Drive
  const uniqueName = `IMG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.enc`;

  // 5. Faz upload para a pasta FOTOS (usePhotosFolder = true)
  const driveFileId = await uploadToDrive(token, uniqueName, encryptedBuffer, true);

  // 6. Salva a imagem ORIGINAL no cache local para acesso rápido
  await setCachedImage(driveFileId, originalBuffer, file.type);

  return driveFileId;
}

/**
 * Obtém uma imagem pelo ID do arquivo no Google Drive.
 * Primeiro verifica o cache local (IndexedDB / Electron IPC).
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
    const blob = new Blob([cached.data], { type: cached.mimeType });
    return URL.createObjectURL(blob);
  }

  // 2. Não está no cache — precisa baixar do Drive
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error(
      'Sem token do Google Drive. Faça login no Drive nas Configurações.'
    );
  }

  // 3. Baixa o arquivo criptografado do Drive
  const encryptedBuffer = await downloadFromDrive(token, driveFileId);

  // 4. Descriptografa o conteúdo
  const decryptedBuffer = await decryptFile(encryptedBuffer, masterKey);

  // 5. Salva no cache local para próximas consultas
  // Usa 'image/png' como fallback pois não temos o mimeType original
  await setCachedImage(driveFileId, decryptedBuffer, 'image/png');

  // 6. Cria e retorna a blob URL
  const blob = new Blob([decryptedBuffer], { type: 'image/png' });
  return URL.createObjectURL(blob);
}
