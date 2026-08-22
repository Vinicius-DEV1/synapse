import { platform } from '../platform';
import { getValidAccessToken, downloadFromDrive } from '../drive';
import { decryptFile } from '../storage';

export interface ResolveCanonicalOptions {
  moduleName: string;
  id: string;
  savedPath?: string | null;
  driveFileId?: string | null;
  masterKey?: CryptoKey | null;
  extHint?: string; // 'epub', 'pdf', etc.
  onUpdateSavedPath?: (newPath: string) => void;
}

/**
 * Busca o arquivo local em múltiplos caminhos canônicos no AppData da aplicação.
 * Tolera caminhos antigos gravados em outro SO (Windows C:\ vs Linux /home/...).
 */
export async function findLocalCanonicalPath(
  moduleName: string,
  id: string,
  savedPath?: string | null,
  extHint?: string
): Promise<string | null> {
  if (!platform.canReadLocalFilesystem) {
    return null;
  }

  try {
    const { appDataDir, join } = await import('@tauri-apps/api/path');
    const { exists } = await import('@tauri-apps/plugin-fs');
    const dataDir = await appDataDir();

    const candidates: string[] = [];

    // 1. Candidatos canônicos baseados no ID
    if (extHint) {
      candidates.push(await join(dataDir, moduleName, `${id}.${extHint}.enc`));
      candidates.push(await join(dataDir, moduleName, `${id}.${extHint}`));
    }
    candidates.push(await join(dataDir, moduleName, `${id}.enc`));
    candidates.push(await join(dataDir, moduleName, id));

    // 2. Candidatos baseados no savedPath (se existir)
    if (savedPath && !savedPath.startsWith('drive:') && !savedPath.startsWith('http')) {
      const cleanPath = savedPath.replace(/^file:\/\//, '');
      const filename = cleanPath.split(/[/\\]/).pop();

      if (cleanPath.startsWith('/') || cleanPath.match(/^[a-zA-Z]:/)) {
        // Caminho absoluto no SO atual
        candidates.push(cleanPath);
        if (!cleanPath.endsWith('.enc')) candidates.push(`${cleanPath}.enc`);
      } else {
        // Caminho relativo ao AppData
        candidates.push(await join(dataDir, cleanPath));
        if (!cleanPath.endsWith('.enc')) candidates.push(await join(dataDir, `${cleanPath}.enc`));
      }

      // Candidato direto dentro da pasta do módulo
      if (filename) {
        candidates.push(await join(dataDir, moduleName, filename));
        if (!filename.endsWith('.enc')) candidates.push(await join(dataDir, moduleName, `${filename}.enc`));
      }
    }

    // Retorna o primeiro caminho existente
    for (const candidate of candidates) {
      try {
        if (await exists(candidate)) {
          return candidate;
        }
      } catch {}
    }
  } catch (err) {
    console.warn(`[CanonicalResolver] Erro ao verificar caminhos locais para ${moduleName}/${id}:`, err);
  }

  return null;
}

/**
 * Constrói a URL do protocolo customizado seguro (`encrypted://` ou `http://encrypted.localhost`).
 */
export function buildEncryptedAssetUrl(moduleName: string, localFullPath: string): string {
  const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');
  const baseUrl = isWindows ? 'http://encrypted.localhost' : 'encrypted://localhost';
  return `${baseUrl}/${moduleName}/${encodeURIComponent(localFullPath)}`;
}

/**
 * Tenta buscar o buffer através do stream do protocolo customizado.
 */
export async function fetchEncryptedStreamBuffer(assetUrl: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(assetUrl);
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch (err) {
    console.warn(`[CanonicalResolver] Falha ao fazer fetch do stream (${assetUrl}):`, err);
  }
  return null;
}

/**
 * Executa a resolução completa em cascata:
 * 1. Busca no disco local (Tauri).
 * 2. Tenta stream via protocolo encrypted://.
 * 3. Tenta API nativa getBookFile / getFile (se aplicável).
 * 4. Fallback: Baixa do Google Drive, descriptografa e salva em cache local.
 */
export async function resolveCanonicalBuffer(options: ResolveCanonicalOptions): Promise<ArrayBuffer> {
  const { moduleName, id, savedPath, driveFileId, masterKey, extHint, onUpdateSavedPath } = options;

  let arrayBuffer: ArrayBuffer | null = null;

  // 1. Tenta localização local
  const localFound = await findLocalCanonicalPath(moduleName, id, savedPath, extHint);
  if (localFound) {
    const assetUrl = buildEncryptedAssetUrl(moduleName, localFound);
    arrayBuffer = await fetchEncryptedStreamBuffer(assetUrl);
  }

  // 2. Fallback: getBookFile nativo se for biblioteca
  if (!arrayBuffer && moduleName === 'library' && window.api?.library?.getBookFile) {
    try {
      const res = await window.api.library.getBookFile(id);
      if (res) {
        if ((res as unknown) instanceof ArrayBuffer) {
          arrayBuffer = res as any;
        } else if (typeof res === 'string') {
          const binaryString = atob(res);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          arrayBuffer = bytes.buffer;
        }
      }
    } catch (apiErr) {
      console.warn(`[CanonicalResolver] Fallback getBookFile falhou:`, apiErr);
    }
  }

  // 3. Fallback: Google Drive Download
  const targetDriveId = driveFileId || (savedPath?.startsWith('drive://') ? savedPath.replace('drive://', '') : null);

  if (!arrayBuffer && targetDriveId) {
    console.log(`[CanonicalResolver] Baixando ${moduleName}/${id} do Google Drive:`, targetDriveId);
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error("Você precisa conectar sua conta do Google Drive para baixar este arquivo.");
    }

    const encryptedData = await downloadFromDrive(token, targetDriveId);

    // Cache local canônico no Desktop
    if (platform.canReadLocalFilesystem) {
      try {
        const { appDataDir, join } = await import('@tauri-apps/api/path');
        const { writeFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
        const dataDir = await appDataDir();
        const moduleDir = await join(dataDir, moduleName);
        if (!await exists(moduleDir)) {
          await mkdir(moduleDir, { recursive: true });
        }
        const fileExt = extHint ? `.${extHint}.enc` : '.enc';
        const localEncPath = await join(moduleDir, `${id}${fileExt}`);
        await writeFile(localEncPath, new Uint8Array(encryptedData));
        
        const canonicalRelPath = extHint ? `${moduleName}/${id}.${extHint}.enc` : `${moduleName}/${id}.enc`;
        if (onUpdateSavedPath && savedPath !== canonicalRelPath) {
          onUpdateSavedPath(canonicalRelPath);
        }
      } catch (cacheErr) {
        console.warn(`[CanonicalResolver] Não foi possível salvar cache local:`, cacheErr);
      }
    }

    if (masterKey) {
      try {
        arrayBuffer = await decryptFile(encryptedData, masterKey);
      } catch {
        arrayBuffer = encryptedData;
      }
    } else {
      arrayBuffer = encryptedData;
    }
  }

  if (!arrayBuffer) {
    throw new Error("Arquivo não encontrado no disco local nem na nuvem. Verifique se o arquivo foi sincronizado na nuvem.");
  }

  return arrayBuffer;
}
