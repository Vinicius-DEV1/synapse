import { getValidAccessToken, listFiles, deleteFromDrive, getOrCreatePhotosFolder, getOrCreateAppFolder } from './drive';
import { getWebDb } from './db-web';
function isDesktopApp(): boolean {
  return navigator.userAgent.toLowerCase().includes('Desktop') || 
         (typeof window !== 'undefined' && !!window.api);
}

/**
 * Roda o Garbage Collector (Lixeiro) de imagens.
 * Procura arquivos de imagem no Google Drive (pasta FOTOS) que não estão mais
 * referenciados em nenhuma página local e que foram criados há mais de 30 dias.
 */
export async function runImageGarbageCollector(): Promise<void> {
  console.log('[GC] Iniciando o Garbage Collector de Imagens...');
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      console.log('[GC] Sem token de acesso ao Drive, abortando.');
      return;
    }

    // 1. Pegar todos os IDs de arquivos sendo usados nas páginas
    const usedIds = await extractUsedDriveFileIds();
    console.log(`[GC] Encontrados ${usedIds.size} arquivos em uso nas anotações.`);

    // 2. Listar todos os arquivos da pasta FOTOS
    const appFolderId = await getOrCreateAppFolder(accessToken);
    const photosFolderId = await getOrCreatePhotosFolder(accessToken, appFolderId);
    
    const allFiles = await listFiles(accessToken, photosFolderId);
    console.log(`[GC] ${allFiles.length} arquivos totais na pasta FOTOS no Google Drive.`);

    // 3. Filtrar e deletar arquivos órfãos velhos
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    for (const file of allFiles) {
      if (!usedIds.has(file.id)) {
        const fileDate = new Date(file.createdTime).getTime();
        const age = now - fileDate;

        if (age > thirtyDaysInMs) {
          console.log(`[GC] Deletando imagem órfã: ${file.name} (ID: ${file.id}) - ${(age/86400000).toFixed(1)} dias de idade.`);
          try {
            await deleteFromDrive(accessToken, file.id);
            // Também tenta limpar do SQLite/IndexedDB para economizar cache local
            await removeFromLocalCache(file.id);
            deletedCount++;
          } catch (e) {
             console.error(`[GC] Falha ao deletar arquivo ${file.id}:`, e);
          }
        }
      }
    }

    console.log(`[GC] Concluído! ${deletedCount} imagens órfãs removidas.`);
  } catch (error) {
    console.error('[GC] Erro fatal durante a execução:', error);
  }
}

/**
 * Busca todas as páginas do banco de dados (Web ou Desktop)
 * e extrai os IDs do Google Drive usados nas tags <encrypted-image>.
 */
async function extractUsedDriveFileIds(): Promise<Set<string>> {
  const usedIds = new Set<string>();
  let pages: any[] = [];

  if (isDesktopApp()) {
    pages = await window.api.sync.getTable('pages');
  } else {
    const db = await getWebDb();
    if (db) {
      pages = await db.getAll('pages');
    }
  }

  const regex = /<encrypted-image[^>]*data-drive-file-id="([^"]+)"/g;

  for (const page of pages) {
    if (page.content) {
      let match;
      while ((match = regex.exec(page.content)) !== null) {
        usedIds.add(match[1]);
      }
    }
  }

  return usedIds;
}

/**
 * Remove a imagem órfã do cache local (IndexedDB ou SQLite)
 */
async function removeFromLocalCache(fileId: string): Promise<void> {
  if (isDesktopApp()) {
     // Faltaria adicionar o método delete no IPC do imageCache se estivéssemos preocupados 
     // com o cache SQLite (atualmente não temos o método 'delete' no IPC, mas podemos apenas ignorar 
     // pois a nuvem é o que importa para espaço principal).
  } else {
     const db = await getWebDb();
     if (db) {
       await db.delete('image_cache', fileId);
     }
  }
}
