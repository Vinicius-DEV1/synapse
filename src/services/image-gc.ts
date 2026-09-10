import { getValidAccessToken, listFiles, deleteFromDrive, getOrCreatePhotosFolder, getOrCreateAppFolder } from './drive';
import { getWebDb } from './db-web';
import { isDesktopApp } from './platform';

/**
 * Roda o Garbage Collector (Lixeiro) de imagens.
 * Identifies orphaned image files in Google Drive (PHOTOS folder)
 * that are not referenced in local pages and were created over 30 days ago.
 */
export async function runImageGarbageCollector(): Promise<void> {
  console.log('[GC] Iniciando o Garbage Collector de Imagens...');
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      console.log('[GC] Sem token de acesso ao Drive, abortando.');
      return;
    }

    // 1. Collect all image file IDs referenced in pages
    const usedIds = await extractUsedDriveFileIds();
    console.log(`[GC] Encontrados ${usedIds.size} arquivos em uso nas anotações.`);

    // 2. Listar todos os arquivos da pasta FOTOS
    const appFolderId = await getOrCreateAppFolder(accessToken);
    const photosFolderId = await getOrCreatePhotosFolder(accessToken, appFolderId);
    
    const allFiles = await listFiles(accessToken, photosFolderId);
    console.log(`[GC] ${allFiles.length} arquivos totais na pasta FOTOS no Google Drive.`);

    // 3. Filter and delete old orphan files
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
            // Also attempt to clean from SQLite/IndexedDB to save local cache
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
 * Scans all database tables (Web or Desktop) that may contain rich-text
 * and extracts Google Drive file IDs referenced in <encrypted-image> tags or media_url fields.
 */
async function extractUsedDriveFileIds(): Promise<Set<string>> {
  const usedIds = new Set<string>();
  
  // Tables and columns that may contain Drive file IDs
  const tablesToCheck = [
    { name: 'pages', cols: ['content'] },
    { name: 'anki_notes', cols: ['front', 'back', 'extra_note', 'media_url'] },
    { name: 'diagrams', cols: ['content'] },
    { name: 'ai_prompts', cols: ['content'] },
    { name: 'calendar_events', cols: ['description'] },
    { name: 'focus_sessions', cols: ['summary'] },
    { name: 'library_reading_sessions', cols: ['note'] },
    { name: 'library_highlights', cols: ['note'] }
  ];

  const regex = /<encrypted-image[^>]*data-drive-file-id="([^"]+)"/g;
  let db: any = null;
  if (!isDesktopApp()) {
    db = await getWebDb();
  }

  for (const tableConfig of tablesToCheck) {
    let rows: Record<string, unknown>[] = [];
    if (isDesktopApp()) {
      try {
        rows = (await window.api.sync.getTable(tableConfig.name)) as Record<string, unknown>[];
      } catch (e) {
        console.warn(`[GC] Falha ao ler tabela ${tableConfig.name} no Desktop`, e);
      }
    } else if (db) {
      try {
        rows = await db.getAll(tableConfig.name);
      } catch (e) {
        console.warn(`[GC] Falha ao ler tabela ${tableConfig.name} no Web`, e);
      }
    }

    for (const row of rows) {
      for (const col of tableConfig.cols) {
        const val = row[col];
        if (typeof val === 'string' && val) {
          // Extract HTML image tags (reset regex.lastIndex to prevent state leak across items)
          regex.lastIndex = 0;
          let match;
          while ((match = regex.exec(val)) !== null) {
            usedIds.add(match[1]);
          }
          // Extract plain media_url if raw Drive file ID
          if (col === 'media_url' && val.length > 20 && !val.includes('<')) {
            usedIds.add(val);
          }
        }
      }
    }
  }

  return usedIds;
}

/**
 * Removes an orphaned image record from local cache (IndexedDB or SQLite).
 */
async function removeFromLocalCache(fileId: string): Promise<void> {
  if (isDesktopApp()) {
    if (window.api?.imageCache?.delete) {
      try {
        await window.api.imageCache.delete(fileId);
      } catch (e) {
        console.warn(`[GC] Falha ao remover imagem ${fileId} do cache SQLite:`, e);
      }
    }
  } else {
    const db = await getWebDb();
    if (db) {
      await db.delete('image_cache', fileId);
    }
  }
}
