import { normalizeLinkUrl } from '../../components/editor-extensions/links/utils/urlNormalization';
import { isDesktopApp } from '../platform';
import { getWebDb } from '../db-web';

export interface LinkEntityRecord {
  canonicalUrl: string;
  originalUrl: string;
  title: string | null;
  channel: string | null;
  domain: string;
  notes: string;
  color: string;
  watched: boolean;
  watching: boolean;
  scrapId: string | null;
  scrapStatus: 'idle' | 'capturing' | 'ready' | 'sync_pending' | 'error' | null;
  scrapLocalPath: string | null;
  scrapDriveFileId: string | null;
  scrapFileSize: number | null;
  scrapCreatedAt: string | null;
  aiSummary: string | null;
  aiSummaryCreatedAt: string | null;
  aiSummaryModel: string | null;
  firstSeenAt: string;
  lastReferencedAt: string;
  orphanedAt: string | null;
}

const CONFIG_PREFIX = 'link_entity:';

// In-memory runtime cache for 0ms instantaneous read across editor mounts
const memoryVaultCache = new Map<string, LinkEntityRecord>();

/**
 * Resets the in-memory cache (primarily for unit tests).
 */
export function clearLinkVaultMemoryCache(): void {
  memoryVaultCache.clear();
}
/**
 * Synchronous O(1) lookup from in-memory cache or localStorage for drop/paste and modal initial state.
 */
export function getLinkEntitySync(rawUrl: string): LinkEntityRecord | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const canonical = normalizeLinkUrl(rawUrl);
  if (!canonical) return null;

  // 1. In-memory runtime cache
  const cached = memoryVaultCache.get(canonical);
  if (cached) return cached;

  // 2. Synchronous localStorage lookup
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${CONFIG_PREFIX}${canonical}`);
      if (raw) {
        const parsed = JSON.parse(raw) as LinkEntityRecord;
        if (parsed) {
          memoryVaultCache.set(canonical, parsed);
          return parsed;
        }
      }
    } catch {}
  }

  return null;
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return '';
  }
}

/**
 * Reads a link entity from persistent storage (localStorage, SQLite, or IndexedDB).
 */
async function readPersistentEntity(configKey: string): Promise<LinkEntityRecord | null> {
  // 1. Instant localStorage check
  if (typeof localStorage !== 'undefined') {
    try {
      const localRaw = localStorage.getItem(configKey);
      if (localRaw) {
        const parsed = JSON.parse(localRaw) as LinkEntityRecord;
        if (parsed) return parsed;
      }
    } catch {}
  }

  // 2. Desktop IPC check (targeted query by ID preferred over full table scan)
  try {
    if (isDesktopApp() && window.api?.sync) {
      if (window.api.sync.getRowsByIds) {
        try {
          const rows = (await window.api.sync.getRowsByIds('config', [configKey])) as Array<{ id: string; data?: string; value?: string }>;
          const targetRow = rows.find((r) => r.id === configKey) || rows[0];
          if (targetRow) {
            const rawJson = targetRow.data || targetRow.value;
            if (rawJson) {
              return JSON.parse(rawJson) as LinkEntityRecord;
            }
          }
        } catch {}
      }

      if (window.api.sync.getTable) {
        const rows = (await window.api.sync.getTable('config')) as Array<{ id: string; data?: string; value?: string }>;
        const targetRow = rows.find((r) => r.id === configKey);
        if (targetRow) {
          const rawJson = targetRow.data || targetRow.value;
          if (rawJson) {
            return JSON.parse(rawJson) as LinkEntityRecord;
          }
        }
      }
      return null;
    }

    // 3. Web IndexedDB check
    const db = await getWebDb();
    if (db) {
      const row = await db.get('config', configKey);
      if (row) {
        const rawJson = row.data || row.value;
        if (typeof rawJson === 'string') {
          return JSON.parse(rawJson) as LinkEntityRecord;
        }
        if (typeof row === 'object' && row.canonicalUrl) {
          return row as LinkEntityRecord;
        }
      }
    }
  } catch (err) {
    console.warn(`[LinkVault] Failed to read persistent entity ${configKey}:`, err);
  }
  return null;
}

/**
 * Writes a link entity to persistent storage across all tiers (localStorage, SQLite, IndexedDB).
 */
async function writePersistentEntity(configKey: string, record: LinkEntityRecord): Promise<void> {
  const jsonStr = JSON.stringify(record);

  // 1. Instant local storage write
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(configKey, jsonStr);
    } catch {}
  }

  try {
    // 2. Desktop SQLite write with dual column support (data & value)
    if (isDesktopApp() && window.api?.sync?.upsertRow) {
      await window.api.sync.upsertRow('config', {
        id: configKey,
        data: jsonStr,
        value: jsonStr,
        updated_at: new Date().toISOString(),
      });
      return;
    }

    // 3. Web IndexedDB write
    const db = await getWebDb();
    if (db) {
      await db.put('config', {
        id: configKey,
        data: jsonStr,
        value: jsonStr,
        canonicalUrl: record.canonicalUrl,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn(`[LinkVault] Failed to persist entity ${configKey}:`, err);
  }
}

/**
 * Retrieves a Link Entity by URL. Performs O(1) in-memory cache lookup
 * first, falling back to persistent storage.
 */
export async function getLinkEntity(rawUrl: string): Promise<LinkEntityRecord | null> {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const canonical = normalizeLinkUrl(rawUrl);
  if (!canonical) return null;

  // 1. In-memory cache check (0ms)
  if (memoryVaultCache.has(canonical)) {
    return memoryVaultCache.get(canonical)!;
  }

  // 2. Persistent storage
  const configKey = `${CONFIG_PREFIX}${canonical}`;
  const record = await readPersistentEntity(configKey);
  if (record) {
    memoryVaultCache.set(canonical, record);
    return record;
  }

  return null;
}

/**
 * Upserts a Link Entity, preserving existing attributes if not explicitly updated.
 */
export async function saveLinkEntity(
  input: Partial<LinkEntityRecord> & { url: string }
): Promise<LinkEntityRecord | null> {
  if (!input.url || typeof input.url !== 'string') return null;
  const canonical = normalizeLinkUrl(input.url);
  if (!canonical) return null;

  const now = new Date().toISOString();
  const existing = await getLinkEntity(input.url);

  const merged: LinkEntityRecord = {
    canonicalUrl: canonical,
    originalUrl: input.originalUrl || existing?.originalUrl || input.url,
    title: input.title !== undefined ? input.title : (existing?.title ?? null),
    channel: input.channel !== undefined ? input.channel : (existing?.channel ?? null),
    domain: existing?.domain || extractDomain(input.url),
    notes: input.notes !== undefined ? input.notes : (existing?.notes ?? ''),
    color: input.color !== undefined ? input.color : (existing?.color ?? 'default'),
    watched: input.watched !== undefined ? input.watched : (existing?.watched ?? false),
    watching: input.watching !== undefined ? input.watching : (existing?.watching ?? false),
    scrapId: input.scrapId !== undefined ? input.scrapId : (existing?.scrapId ?? null),
    scrapStatus: input.scrapStatus !== undefined ? input.scrapStatus : (existing?.scrapStatus ?? null),
    scrapLocalPath: input.scrapLocalPath !== undefined ? input.scrapLocalPath : (existing?.scrapLocalPath ?? null),
    scrapDriveFileId: input.scrapDriveFileId !== undefined ? input.scrapDriveFileId : (existing?.scrapDriveFileId ?? null),
    scrapFileSize: input.scrapFileSize !== undefined ? input.scrapFileSize : (existing?.scrapFileSize ?? null),
    scrapCreatedAt: input.scrapCreatedAt !== undefined ? input.scrapCreatedAt : (existing?.scrapCreatedAt ?? null),
    aiSummary: input.aiSummary !== undefined ? input.aiSummary : (existing?.aiSummary ?? null),
    aiSummaryCreatedAt: input.aiSummaryCreatedAt !== undefined ? input.aiSummaryCreatedAt : (existing?.aiSummaryCreatedAt ?? null),
    aiSummaryModel: input.aiSummaryModel !== undefined ? input.aiSummaryModel : (existing?.aiSummaryModel ?? null),
    firstSeenAt: existing?.firstSeenAt || now,
    lastReferencedAt: now,
    orphanedAt: null, // Reset orphan state whenever entity is updated or referenced
  };

  memoryVaultCache.set(canonical, merged);
  const configKey = `${CONFIG_PREFIX}${canonical}`;
  await writePersistentEntity(configKey, merged);

  return merged;
}

/**
 * Re-activates a Link Entity if it was marked as orphaned.
 */
export async function touchLinkEntity(rawUrl: string): Promise<void> {
  const existing = await getLinkEntity(rawUrl);
  if (existing && existing.orphanedAt) {
    existing.orphanedAt = null;
    existing.lastReferencedAt = new Date().toISOString();
    memoryVaultCache.set(existing.canonicalUrl, existing);
    const configKey = `${CONFIG_PREFIX}${existing.canonicalUrl}`;
    await writePersistentEntity(configKey, existing);
  }
}

/**
 * Retrieves all registered Link Entities across the workspace.
 */
export async function getAllLinkEntities(): Promise<LinkEntityRecord[]> {
  const entities: LinkEntityRecord[] = [];
  try {
    if (isDesktopApp() && window.api?.sync?.getTable) {
      const rows = (await window.api.sync.getTable('config')) as Array<{ id: string; data?: string; value?: string }>;
      for (const row of rows) {
        if (row.id.startsWith(CONFIG_PREFIX)) {
          const raw = row.data || row.value;
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as LinkEntityRecord;
              entities.push(parsed);
              memoryVaultCache.set(parsed.canonicalUrl, parsed);
            } catch {}
          }
        }
      }
      return entities;
    }

    const db = await getWebDb();
    if (db) {
      const rows = await db.getAll('config');
      for (const row of rows) {
        if (row.id && String(row.id).startsWith(CONFIG_PREFIX)) {
          const raw = row.data || row.value;
          if (typeof raw === 'string') {
            try {
              const parsed = JSON.parse(raw) as LinkEntityRecord;
              entities.push(parsed);
              memoryVaultCache.set(parsed.canonicalUrl, parsed);
            } catch {}
          } else if (row.canonicalUrl) {
            entities.push(row as LinkEntityRecord);
            memoryVaultCache.set(row.canonicalUrl, row as LinkEntityRecord);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[LinkVault] Failed to list all entities:', err);
  }
  return entities;
}

/**
 * Deletes a single link entity from memory and persistent store.
 */
export async function deleteLinkEntity(rawUrl: string): Promise<void> {
  const canonical = normalizeLinkUrl(rawUrl);
  if (!canonical) return;

  memoryVaultCache.delete(canonical);
  const configKey = `${CONFIG_PREFIX}${canonical}`;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(configKey);
    } catch {}
  }

  try {
    if (isDesktopApp() && window.api?.sync?.deleteRow) {
      await window.api.sync.deleteRow('config', configKey);
      return;
    }
    const db = await getWebDb();
    if (db) {
      await db.delete('config', configKey);
    }
  } catch (err) {
    console.warn(`[LinkVault] Failed to delete entity ${configKey}:`, err);
  }
}

/**
 * Inspects all link entities against a set of active canonical URLs.
 * Entities not found in activeUrls are marked as orphaned (with timestamp).
 * Active entities with orphanedAt set have their orphan flag cleared.
 */
export async function markOrphanedLinks(activeCanonicalUrls: Set<string>): Promise<{ newlyOrphaned: number; restored: number }> {
  const all = await getAllLinkEntities();
  const now = new Date().toISOString();
  let newlyOrphaned = 0;
  let restored = 0;

  for (const entity of all) {
    const isReferenced = activeCanonicalUrls.has(entity.canonicalUrl);

    if (!isReferenced && !entity.orphanedAt) {
      // Transition from active to orphaned
      entity.orphanedAt = now;
      memoryVaultCache.set(entity.canonicalUrl, entity);
      await writePersistentEntity(`${CONFIG_PREFIX}${entity.canonicalUrl}`, entity);
      newlyOrphaned++;
    } else if (isReferenced && entity.orphanedAt) {
      // Transition from orphaned back to active
      entity.orphanedAt = null;
      entity.lastReferencedAt = now;
      memoryVaultCache.set(entity.canonicalUrl, entity);
      await writePersistentEntity(`${CONFIG_PREFIX}${entity.canonicalUrl}`, entity);
      restored++;
    }
  }

  return { newlyOrphaned, restored };
}
