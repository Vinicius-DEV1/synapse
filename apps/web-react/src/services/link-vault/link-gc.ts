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

interface ActivePageUrlCollection {
  activeUrls: Set<string>;
  canSafelyUpdateOrphans: boolean;
}

async function resolveReadablePageContent(page: Page): Promise<{ content: string; unreadable: boolean }> {
  if (typeof page.content === 'string' && page.content.length > 0) {
    return { content: page.content, unreadable: false };
  }

  // Lightweight page metadata from getAllPages()/store omits content & encrypted_content.
  // Always hydrate on demand via getPageContent before concluding a page has no links.
  const needsContentFetch = page.content === undefined || Boolean(page.encrypted_content);
  if (needsContentFetch && window.api?.getPageContent) {
    try {
      const decrypted = await window.api.getPageContent(page.id);
      if (typeof decrypted?.content === 'string' && decrypted.content.length > 0) {
        return { content: decrypted.content, unreadable: false };
      }
      // Still ciphertext without plaintext means notes key is unavailable.
      if (decrypted?.encrypted_content) {
        return { content: '', unreadable: true };
      }
      return { content: '', unreadable: false };
    } catch (err) {
      console.warn(`[LinkGC] Failed to load/decrypt content for page ${page.id}:`, err);
      return { content: '', unreadable: true };
    }
  }

  // If content is still absent and no API can read it, mark unreadable rather than falsely purging links.
  if (page.content === undefined || page.encrypted_content) {
    return { content: '', unreadable: true };
  }

  return { content: '', unreadable: false };
}

async function collectActivePageUrlsInternal(): Promise<ActivePageUrlCollection> {
  const activeUrls = new Set<string>();
  let pages: Page[] = [];
  let loadFailed = false;

  if (isDesktopApp() && window.api?.sync?.getTable) {
    try {
      pages = (await window.api.sync.getTable<Page>('pages')) || [];
    } catch (err) {
      console.warn('[LinkGC] Failed to list pages via sync.getTable, falling back to store state:', err);
      loadFailed = true;
      pages = getStoreState().pages || [];
    }
  } else if (isDesktopApp() && window.api?.getAllPages) {
    try {
      pages = await window.api.getAllPages();
    } catch (err) {
      console.warn('[LinkGC] Failed to list pages via IPC, falling back to store state:', err);
      loadFailed = true;
      pages = getStoreState().pages || [];
    }
  } else {
    try {
      const db = await getWebDb();
      if (db) {
        pages = (await db.getAll('pages')) as Page[];
      }
    } catch {
      loadFailed = true;
      pages = getStoreState().pages || [];
    }
  }

  if (!pages || pages.length === 0) {
    pages = getStoreState().pages || [];
  }

  let hasUnreadableEncryptedPage = false;
  for (const page of pages) {
    if (page.deleted_at) continue;

    const { content, unreadable } = await resolveReadablePageContent(page);
    if (unreadable) {
      hasUnreadableEncryptedPage = true;
      continue;
    }

    if (content.length > 0) {
      const urls = extractUrlsFromContent(content);
      for (const u of urls) {
        const canonical = normalizeLinkUrl(u);
        if (canonical) {
          activeUrls.add(canonical);
        }
      }
    }
  }

  return {
    activeUrls,
    canSafelyUpdateOrphans: !loadFailed && !hasUnreadableEncryptedPage,
  };
}

/**
 * Extracts all unique canonical URLs currently referenced in active, non-deleted pages.
 */
export async function collectActivePageUrls(): Promise<Set<string>> {
  const { activeUrls } = await collectActivePageUrlsInternal();
  return activeUrls;
}

/**
 * Scans the workspace and updates the orphan status of all Link Entities.
 * Links present in pages are marked active (orphanedAt = null).
 * Links completely missing from all pages are stamped with orphanedAt = now.
 */
export async function syncLinkOrphanStatus(): Promise<{ newlyOrphaned: number; restored: number }> {
  const { activeUrls, canSafelyUpdateOrphans } = await collectActivePageUrlsInternal();
  if (!canSafelyUpdateOrphans) {
    console.warn('[LinkGC] Skipping orphan marking because some pages could not be decrypted or read.');
    return { newlyOrphaned: 0, restored: 0 };
  }
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
  const { activeUrls, canSafelyUpdateOrphans } = await collectActivePageUrlsInternal();
  if (!canSafelyUpdateOrphans) {
    console.warn('[LinkGC] Aborting Link Garbage Collector because some pages could not be read.');
    return {
      activeCount: 0,
      orphanedCount: 0,
      purgedCount: 0,
      purgedEntities: [],
    };
  }
  await markOrphanedLinks(activeUrls);

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
