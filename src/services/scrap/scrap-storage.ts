import { encryptFile, decryptFile } from '../storage';
import { getValidAccessToken, uploadToDrive, downloadFromDrive } from '../drive';
import { platform } from '../platform';

export interface ScrapSaveResult {
  scrapId: string;
  driveFileId: string | null;
  localPath: string;
  isSynced: boolean;
}

// In-memory runtime cache for fast subsequent modal views
const memoryCache = new Map<string, string>();

/**
 * Criptografa o HTML do snapshot e faz o upload para o Google Drive com fallback local resiliente.
 */
export async function encryptAndSaveScrap(
  scrapId: string,
  htmlContent: string,
  localPath: string,
  masterKey?: CryptoKey
): Promise<ScrapSaveResult> {
  memoryCache.set(scrapId, htmlContent);

  let driveFileId: string | null = null;
  let isSynced = false;

  try {
    if (!masterKey) {
      console.warn('[ScrapStorage] Chave mestra não fornecida; salvando apenas em cache local.');
      return { scrapId, driveFileId: null, localPath, isSynced: false };
    }

    const encoder = new TextEncoder();
    const rawBytes = encoder.encode(htmlContent);
    const encryptedBuffer = await encryptFile(rawBytes.buffer as ArrayBuffer, masterKey);

    // Save encrypted copy locally in AppData (Desktop)
    if (platform.canReadLocalFilesystem) {
      try {
        const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        await writeFile(`scraps/${scrapId}.enc`, new Uint8Array(encryptedBuffer), { baseDir: BaseDirectory.AppData });
      } catch (err) {
        console.warn('[ScrapStorage] Falha ao salvar arquivo .enc no cache local:', err);
      }
    }

    // Tentar upload para o Google Drive
    if (navigator.onLine) {
      try {
        const token = await getValidAccessToken();
        if (token) {
          driveFileId = await uploadToDrive(token, `Caderno_Scrap_${scrapId}.enc`, encryptedBuffer);
          isSynced = true;
          console.log(`[ScrapStorage] Snapshot ${scrapId} sincronizado no Google Drive com ID: ${driveFileId}`);
        }
      } catch (uploadErr) {
        console.warn('[ScrapStorage] Google Drive offline ou erro no upload; mantido localmente para envio posterior:', uploadErr);
      }
    }
  } catch (err) {
    console.error('[ScrapStorage] Erro no processamento de criptografia do snapshot:', err);
  }

  return {
    scrapId,
    driveFileId,
    localPath,
    isSynced
  };
}

/**
 * Obtém e decriptografa o snapshot da página (via cache local ou Google Drive).
 */
export async function getDecryptedScrap(
  scrapId: string,
  driveFileId?: string | null,
  localPath?: string | null,
  masterKey?: CryptoKey
): Promise<string> {
  // 1. Memória rápida
  if (memoryCache.has(scrapId)) {
    return memoryCache.get(scrapId)!;
  }

  // 2. Arquivo HTML local (Desktop)
  if (platform.canReadLocalFilesystem && localPath) {
    try {
      const { readFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const fileBytes = await readFile(localPath, { baseDir: BaseDirectory.AppData });
      const decoder = new TextDecoder();
      const content = decoder.decode(fileBytes);
      if (content && content.length > 0) {
        memoryCache.set(scrapId, content);
        return content;
      }
    } catch (fsErr) {
      console.warn('[ScrapStorage] Não foi possível ler o HTML local bruto, tentando decriptografar:', fsErr);
    }
  }

  // 3. Arquivo .enc local (Desktop)
  if (platform.canReadLocalFilesystem && masterKey) {
    try {
      const { readFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const encBytes = await readFile(`scraps/${scrapId}.enc`, { baseDir: BaseDirectory.AppData });
      const decrypted = await decryptFile(encBytes.buffer as ArrayBuffer, masterKey);
      const decoder = new TextDecoder();
      const content = decoder.decode(decrypted);
      memoryCache.set(scrapId, content);
      return content;
    } catch (e) {
      console.warn('[ScrapStorage] .enc local não encontrado ou falha na decriptografia local:', e);
    }
  }

  // 4. Download do Google Drive
  if (driveFileId && masterKey) {
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error('Não autenticado com o Google Drive');

      const encryptedArrayBuffer = await downloadFromDrive(token, driveFileId);
      const decrypted = await decryptFile(encryptedArrayBuffer, masterKey);
      const decoder = new TextDecoder();
      const content = decoder.decode(decrypted);
      memoryCache.set(scrapId, content);
      return content;
    } catch (driveErr: any) {
      console.error('[ScrapStorage] Falha ao baixar ou decriptografar snapshot do Google Drive:', driveErr);
      throw new Error(`Falha ao baixar snapshot da nuvem: ${driveErr.message || 'Erro de conexão'}`);
    }
  }

  throw new Error('Snapshot não encontrado no disco local nem na nuvem.');
}

/**
 * Exclui com segurança o snapshot do cache de memória, do disco local e do Google Drive.
 */
export async function deleteScrapSafely(scrapId: string, driveFileId?: string | null): Promise<void> {
  // 1. Limpar cache de memória
  memoryCache.delete(scrapId);

  // 2. Excluir do disco local (Desktop)
  if (platform.platform === 'desktop') {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('scrap_delete_local', { scrapId });
    } catch (localErr) {
      console.warn('[ScrapStorage] Falha ao limpar arquivos locais de scrap:', localErr);
    }
  }

  // 3. Excluir do Google Drive
  if (driveFileId && navigator.onLine) {
    try {
      const { deleteFromDrive } = await import('../drive');
      const token = await getValidAccessToken();
      if (token) {
        await deleteFromDrive(token, driveFileId);
        console.log(`[ScrapStorage] Arquivo ${driveFileId} excluído do Google Drive.`);
      }
    } catch (cloudErr) {
      console.warn('[ScrapStorage] Falha ao excluir snapshot do Google Drive:', cloudErr);
    }
  }
}
