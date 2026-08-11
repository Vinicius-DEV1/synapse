/**
 * image-drive.ts
 *
 * Serviço responsável por upload de imagens criptografadas no Google Drive
 * e cache local (IndexedDB na web, IPC no Tauri).
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
 * Verifica se estamos rodando no Desktop (window.api existe) ou na web.
 * No Desktop usa comandos do Tauri; na web usa IndexedDB diretamente.
 */
function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && !!window.api && !!window.api.imageCache;
}

/**
 * Busca uma imagem no cache local.
 * Retorna o registro cacheado ou undefined se não existir.
 */
export async function getCachedImage(id: string): Promise<CachedImage | undefined> {
  console.log(`[ImageDrive:getCachedImage] Buscando id="${id}", isDesktop=${isDesktopApp()}`);
  if (isDesktopApp()) {
    // Desktop - usa comandos nativos do Tauri para acessar o cache
    try {
      const cached = await window.api.imageCache.get(id);
      console.log(`[ImageDrive:getCachedImage] Resultado do Tauri cache:`, cached ? `found (data.length=${cached.data?.length}, mimeType=${cached.mimeType})` : 'null/undefined');
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
  console.log(`[ImageDrive:setCachedImage] Salvando id="${id}", dataSize=${data.byteLength}, mimeType="${mimeType}", isDesktop=${isDesktopApp()}`);
  if (isDesktopApp()) {
    // Desktop - usa comandos nativos do Tauri
    try {
      await window.api.imageCache.put(id, data, mimeType);
      console.log(`[ImageDrive:setCachedImage] Salvo com sucesso no Tauri cache`);
      
      // Verificação imediata: ler de volta para confirmar persistência
      const verifyResult = await window.api.imageCache.get(id);
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
// Funções públicas
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
  
  // 1. Lê o arquivo como ArrayBuffer
  const originalBuffer = await file.arrayBuffer();
  console.log(`[ImageDrive:uploadEncryptedImage] ArrayBuffer lido: ${originalBuffer.byteLength} bytes`);

  // 2. Tenta obter um token de acesso válido
  const token = await getValidAccessToken().catch((e) => {
    console.error(`[ImageDrive:uploadEncryptedImage] Erro ao obter token:`, e);
    return null;
  });
  console.log(`[ImageDrive:uploadEncryptedImage] Token obtido: ${token ? 'SIM (length=' + token.length + ')' : 'NÃO (null)'}`);

  if (!token) {
    // Modo offline/local: salva apenas no cache com ID permanente
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setCachedImage(localId, originalBuffer, file.type);
    console.log(`[ImageDrive] Sem token Drive — imagem salva localmente como ${localId}`);
    return localId;
  }

  // 3. Criptografa o conteúdo com AES-GCM
  const encryptedBuffer = await encryptFile(originalBuffer, masterKey);
  console.log(`[ImageDrive:uploadEncryptedImage] Criptografado: ${encryptedBuffer.byteLength} bytes`);

  // 4. Gera um nome de arquivo único para o Drive
  const uniqueName = `IMG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.enc`;

  // 5. Faz upload para a pasta FOTOS (usePhotosFolder = true)
  const driveFileId = await uploadToDrive(token, uniqueName, encryptedBuffer, 'photos');
  console.log(`[ImageDrive:uploadEncryptedImage] Upload concluído. driveFileId="${driveFileId}"`);

  // 6. Salva a imagem ORIGINAL no cache local para acesso rápido
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
  console.log(`[ImageDrive:getDecryptedImageUrl] Iniciando para driveFileId="${driveFileId}"`);
  
  // 1. Tenta buscar no cache local primeiro
  const cached = await getCachedImage(driveFileId);

  if (cached) {
    console.log(`[ImageDrive:getDecryptedImageUrl] Cache HIT para "${driveFileId}" (${cached.data.byteLength} bytes, ${cached.mimeType})`);
    // Encontrou no cache — cria blob URL diretamente
    const blob = new Blob([cached.data], { type: cached.mimeType || 'image/png' });
    const url = URL.createObjectURL(blob);
    console.log(`[ImageDrive:getDecryptedImageUrl] Blob URL criada: ${url}`);
    return url;
  }

  console.log(`[ImageDrive:getDecryptedImageUrl] Cache MISS para "${driveFileId}"`);

  // 2. Imagens com ID local_ existem APENAS no cache — se não estão lá, perderam-se
  if (driveFileId.startsWith('local_')) {
    throw new Error('Imagem local não encontrada no cache. Pode ter sido perdida ao reinstalar o app.');
  }

  // 3. Não está no cache — precisa baixar do Drive
  const token = await getValidAccessToken().catch(() => null);
  console.log(`[ImageDrive:getDecryptedImageUrl] Token para download: ${token ? 'SIM' : 'NÃO'}`);
  if (!token) {
    throw new Error(
      'Sem token do Google Drive. Faça login no Drive nas Configurações.'
    );
  }

  // 4. Baixa o arquivo criptografado do Drive
  console.log(`[ImageDrive:getDecryptedImageUrl] Baixando do Drive...`);
  const encryptedBuffer = await downloadFromDrive(token, driveFileId);
  console.log(`[ImageDrive:getDecryptedImageUrl] Download concluído: ${encryptedBuffer.byteLength} bytes`);

  // 5. Descriptografa o conteúdo
  const decryptedBuffer = await decryptFile(encryptedBuffer, masterKey);
  console.log(`[ImageDrive:getDecryptedImageUrl] Descriptografado: ${decryptedBuffer.byteLength} bytes`);

  // 6. Salva no cache local para próximas consultas
  // Usa 'image/png' como fallback pois não temos o mimeType original
  await setCachedImage(driveFileId, decryptedBuffer, 'image/png');

  // 7. Cria e retorna a blob URL
  const blob = new Blob([decryptedBuffer], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  console.log(`[ImageDrive:getDecryptedImageUrl] Blob URL criada após download: ${url}`);
  return url;
}

