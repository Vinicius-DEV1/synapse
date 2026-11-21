import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLinkEntity,
  saveLinkEntity,
  touchLinkEntity,
  getAllLinkEntities,
  deleteLinkEntity,
  markOrphanedLinks,
  clearLinkVaultMemoryCache,
} from './linkVaultService';
import { runLinkGarbageCollector, collectActivePageUrls } from './link-gc';
import * as scrapStorage from '../scrap/scrap-storage';
import * as platformModule from '../platform';

// Mock platform
vi.mock('../platform', () => ({
  isDesktopApp: vi.fn(() => false),
  platform: { platform: 'web', canReadLocalFilesystem: false },
}));

// Mock db-web with table separation
const mockTables: Record<string, Map<string, unknown>> = {
  config: new Map(),
  pages: new Map(),
};

vi.mock('../db-web', () => ({
  getWebDb: vi.fn(async () => ({
    get: vi.fn(async (table: string, key: string) => mockTables[table]?.get(key) || null),
    put: vi.fn(async (table: string, val: { id: string }) => {
      if (!mockTables[table]) mockTables[table] = new Map();
      mockTables[table].set(val.id, val);
      return val.id;
    }),
    delete: vi.fn(async (table: string, key: string) => {
      mockTables[table]?.delete(key);
    }),
    getAll: vi.fn(async (table: string) => Array.from(mockTables[table]?.values() || [])),
  })),
}));

// Mock store state
const mockStorePages = [
  { id: 'page-1', content: '<p>Veja https://github.com/google/antigravity aqui</p>', deleted_at: null },
  { id: 'page-2', content: '<p>Outro link https://vite.dev</p>', deleted_at: null },
];

vi.mock('../../store/useStore', () => ({
  getStoreState: vi.fn(() => ({
    pages: mockStorePages,
  })),
}));

// Mock scrap-storage deleteScrapSafely
vi.mock('../scrap/scrap-storage', () => ({
  deleteScrapSafely: vi.fn(async () => {}),
}));

describe('LinkVaultService & LinkGC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTables.config.clear();
    mockTables.pages.clear();
    clearLinkVaultMemoryCache();
  });

  it('saves and retrieves a link entity with canonicalization', async () => {
    const saved = await saveLinkEntity({
      url: 'https://github.com/google/antigravity?utm_source=test',
      notes: 'Minhas notas sobre o antigravity',
      color: '#8b5cf6',
      watched: true,
      scrapId: 'scrap-123',
    });

    expect(saved).not.toBeNull();
    expect(saved?.canonicalUrl).toBe('https://github.com/google/antigravity');
    expect(saved?.notes).toBe('Minhas notas sobre o antigravity');
    expect(saved?.color).toBe('#8b5cf6');

    // Retrieve via clean URL or URL with different tracking params
    const retrieved = await getLinkEntity('https://github.com/google/antigravity?si=share_xyz');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.notes).toBe('Minhas notas sobre o antigravity');
    expect(retrieved?.scrapId).toBe('scrap-123');
  });

  it('merges partial updates without overwriting existing notes or snapshot data', async () => {
    await saveLinkEntity({
      url: 'https://react.dev',
      notes: 'Notas valiosas do React',
      scrapId: 'scrap-react',
      color: '#3b82f6',
    });

    // Partial update from another component (e.g. only marking watched)
    await saveLinkEntity({
      url: 'https://react.dev',
      watched: true,
    });

    const updated = await getLinkEntity('https://react.dev');
    expect(updated?.watched).toBe(true);
    expect(updated?.notes).toBe('Notas valiosas do React');
    expect(updated?.scrapId).toBe('scrap-react');
    expect(updated?.color).toBe('#3b82f6');
  });

  it('marks unreferenced links as orphaned and restores them on re-activation', async () => {
    await saveLinkEntity({
      url: 'https://orphaned-site.com',
      notes: 'Link a ser apagado',
    });

    const activeCanonical = new Set(['https://github.com/google/antigravity']);
    const { newlyOrphaned } = await markOrphanedLinks(activeCanonical);
    expect(newlyOrphaned).toBe(1);

    const orphaned = await getLinkEntity('https://orphaned-site.com');
    expect(orphaned?.orphanedAt).not.toBeNull();

    // Re-activating/touching the link (e.g. pasted back into editor)
    await touchLinkEntity('https://orphaned-site.com');
    const restored = await getLinkEntity('https://orphaned-site.com');
    expect(restored?.orphanedAt).toBeNull();
  });

  it('collects active URLs from pages correctly', async () => {
    const urls = await collectActivePageUrls();
    expect(urls.has('https://github.com/google/antigravity')).toBe(true);
    expect(urls.has('https://vite.dev')).toBe(true);
    expect(urls.has('https://non-existent.com')).toBe(false);
  });

  it('purges orphaned links older than TTL and invokes scrap deletion', async () => {
    const expiredDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 days ago

    // Link 1: Active in pages (should be kept)
    await saveLinkEntity({
      url: 'https://github.com/google/antigravity',
      notes: 'Ativo',
    });

    // Link 2: Orphaned recently (10 days ago, should be kept in grace period)
    const recentOrphan = await saveLinkEntity({
      url: 'https://recent-orphan.com',
      notes: 'Recente',
    });
    if (recentOrphan) {
      recentOrphan.orphanedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      await mockTables.config.set(`link_entity:${recentOrphan.canonicalUrl}`, {
        id: `link_entity:${recentOrphan.canonicalUrl}`,
        data: JSON.stringify(recentOrphan),
      });
    }

    // Link 3: Orphaned 35 days ago (should be purged completely!)
    const expiredOrphan = await saveLinkEntity({
      url: 'https://expired-orphan.com',
      notes: 'Expirado',
      scrapId: 'scrap-to-delete',
      scrapDriveFileId: 'drive-file-123',
    });
    if (expiredOrphan) {
      expiredOrphan.orphanedAt = expiredDate;
      await mockTables.config.set(`link_entity:${expiredOrphan.canonicalUrl}`, {
        id: `link_entity:${expiredOrphan.canonicalUrl}`,
        data: JSON.stringify(expiredOrphan),
      });
    }

    const gcResult = await runLinkGarbageCollector();

    expect(gcResult.purgedCount).toBe(1);
    expect(gcResult.purgedEntities).toContain('https://expired-orphan.com');

    // Verify scrap-storage.deleteScrapSafely was called for the expired snapshot
    expect(scrapStorage.deleteScrapSafely).toHaveBeenCalledWith('scrap-to-delete', 'drive-file-123');

    // Verify expired entity is deleted from store
    const deletedCheck = await getLinkEntity('https://expired-orphan.com');
    expect(deletedCheck).toBeNull();

    // Verify active and recent orphan are still intact
    const activeCheck = await getLinkEntity('https://github.com/google/antigravity');
    expect(activeCheck).not.toBeNull();
    const recentCheck = await getLinkEntity('https://recent-orphan.com');
    expect(recentCheck).not.toBeNull();
  });

  it('decrypts encrypted desktop pages during LinkGC instead of falsely marking links orphaned', async () => {
    vi.mocked(platformModule.isDesktopApp).mockReturnValue(true);
    const expiredDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const saved = await saveLinkEntity({
      url: 'https://desktop-encrypted.dev',
      notes: 'Used inside encrypted note',
    });
    if (saved) {
      saved.orphanedAt = expiredDate;
      mockTables.config.set(`link_entity:${saved.canonicalUrl}`, {
        id: `link_entity:${saved.canonicalUrl}`,
        data: JSON.stringify(saved),
      });
    }

    const deleteRowMock = vi.fn(async () => ({ success: true }));
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getPageContent: vi.fn(async () => ({
          content: '<p>Check https://desktop-encrypted.dev</p>',
          encrypted_content: 'ciphertext',
        })),
        sync: {
          getTable: vi.fn(async (table: string) => {
            if (table === 'pages') {
              return [{ id: 'enc-page-1', content: '', encrypted_content: 'ciphertext', deleted_at: null }];
            }
            if (table === 'config') {
              return Array.from(mockTables.config.values());
            }
            return [];
          }),
          getRow: vi.fn(async (_table: string, id: string) => mockTables.config.get(id) ?? null),
          upsertRow: vi.fn(async (_table: string, row: { id: string }) => {
            mockTables.config.set(row.id, row);
            return { success: true };
          }),
          deleteRow: deleteRowMock,
        },
      },
    });

    const gcResult = await runLinkGarbageCollector();
    expect(gcResult.purgedCount).toBe(0);
    expect(gcResult.activeCount).toBe(1);
    expect(deleteRowMock).not.toHaveBeenCalled();

    const restored = await getLinkEntity('https://desktop-encrypted.dev');
    expect(restored?.orphanedAt).toBeNull();
    vi.mocked(platformModule.isDesktopApp).mockReturnValue(false);
  });
});
