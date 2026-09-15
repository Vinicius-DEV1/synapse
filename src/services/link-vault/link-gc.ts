import {
  getAllLinkEntities,
  deleteLinkEntity,
  markOrphanedLinks,
} from './linkVaultService';
import { deleteScrapSafely } from '../scrap/scrap-storage';
import { extractUrlsFromContent, normalizeLinkUrl } from '../../components/editor-extensions/links/utils/urlNormalization';
import { getStoreState } from '../../store/useStore';
import { isDesktopApp } from '../platform';
import { getWebDb } from '../db-web';
import type { Page } from '../../types';

// Standard 30-day grace period (matches image-gc.ts)
export const DEFAULT_LINK_GC_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface LinkGCResult {
  activeCount: number;
  orphanedCount: number;
  purgedCount: number;
  purgedEntities: string[];
}

/**
 * Extracts all unique canonical URLs currently referenced in active, non-deleted pages.
 */
export async function collectActivePageUrls(): Promise<Set<string>> {
  const activeUrls = new Set<string>();

  // 1. Gather all pages across platform storage
  let pages: Page[] = [];

  if (isDesktopApp() && window.api?.getAllPages) {
    try {
      pages = await window.api.getAllPages();
    } catch (err) {
      console.warn('[LinkGC] Failed to list pages via IPC, falling back to store state:', err);
      pages = getStoreState().pages || [];
    }
  } else {
    try {
      const db = await getWebDb();
      if (db) {
        pages = (await db.getAll('pages')) as Page[];
      }
    } catch {
      pages = getStoreState().pages || [];
    }
  }

  if (!pages || pages.length === 0) {
    pages = getStoreState().pages || [];
  }

  // 2. Scan content of each non-deleted page
  for (const page of pages) {
    if (page.deleted_at) continue;

    const content = page.content;
    if (typeof content === 'string' && content.length > 0) {
      const urls = extractUrlsFromContent(content);
      for (const u of urls) {
        const canonical = normalizeLinkUrl(u);
        if (canonical) {
          activeUrls.add(canonical);
        }
      }
    }
  }

  return activeUrls;
}

/**
 * Scans the workspace and updates the orphan status of all Link Entities.
 * Links present in pages are marked active (orphanedAt = null).
 * Links completely missing from all pages are stamped with orphanedAt = now.
 */
export async function syncLinkOrphanStatus(): Promise<{ newlyOrphaned: number; restored: number }> {
  const activeUrls = await collectActivePageUrls();
  return await markOrphanedLinks(activeUrls);
}

/**
 * Executes the Link Garbage Collector.
 * Identifies orphaned entities that have exceeded the retention grace period (30 days),
 * and executes a 100% cascade purge:
 * 1. Purges offline snapshot from Google Drive (if synced)
 * 2. Purges local snapshot files (.enc and HTML) from local disk
 * 3. Purges AI summary and metadata entity from persistent database
 */
export async function runLinkGarbageCollector(
  ttlMs: number = DEFAULT_LINK_GC_TTL_MS
): Promise<LinkGCResult> {
  console.log('[LinkGC] Starting Link Garbage Collector...');

  // 1. Update orphan status with fresh active references
  await syncLinkOrphanStatus();

  // 2. Inspect all entities
  const allEntities = await getAllLinkEntities();
  const now = Date.now();
  let activeCount = 0;
  let orphanedCount = 0;
  let purgedCount = 0;
  const purgedEntities: string[] = [];

  for (const entity of allEntities) {
    if (!entity.orphanedAt) {
      activeCount++;
      continue;
    }

    orphanedCount++;
    const orphanedTimestamp = new Date(entity.orphanedAt).getTime();
    const ageMs = now - orphanedTimestamp;

    if (ageMs >= ttlMs) {
      console.log(
        `[LinkGC] Purging orphaned link: ${entity.canonicalUrl} (${(ageMs / (24 * 60 * 60 * 1000)).toFixed(1)} days orphaned)`
      );

      try {
        // A. Safely deletes any local and Google Drive snapshots
        if (entity.scrapId) {
          await deleteScrapSafely(entity.scrapId, entity.scrapDriveFileId);
        }

        // B. Deletes entity from database and cache
        await deleteLinkEntity(entity.canonicalUrl);

        purgedCount++;
        purgedEntities.push(entity.canonicalUrl);
      } catch (err) {
        console.error(`[LinkGC] Failed to purge orphaned link ${entity.canonicalUrl}:`, err);
      }
    }
  }

  console.log(
    `[LinkGC] Completed: ${activeCount} active, ${orphanedCount} orphaned in grace period, ${purgedCount} 100% purged.`
  );

  return {
    activeCount,
    orphanedCount,
    purgedCount,
    purgedEntities,
  };
}
