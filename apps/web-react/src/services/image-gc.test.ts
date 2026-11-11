import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runImageGarbageCollector } from './image-gc';
import * as drive from './drive';
import { getWebDb } from './db-web';
import 'fake-indexeddb/auto';

vi.mock('./drive', () => ({
  getValidAccessToken: vi.fn(),
  getOrCreateAppFolder: vi.fn().mockResolvedValue('app_folder_id'),
  getOrCreatePhotosFolder: vi.fn().mockResolvedValue('photos_folder_id'),
  listFiles: vi.fn(),
  deleteFromDrive: vi.fn().mockResolvedValue(undefined),
}));

describe('image-gc service (Garbage Collector)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    (window as any).api = null; // simulate Web environment for getWebDb

    const db = await getWebDb();
    await db.clear('pages');
    await db.clear('image_cache');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aborts when no valid drive token is present', async () => {
    (drive.getValidAccessToken as any).mockResolvedValue(null);
    await runImageGarbageCollector();
    expect(drive.listFiles).not.toHaveBeenCalled();
  });

  it('preserves images that are currently referenced in active notes', async () => {
    (drive.getValidAccessToken as any).mockResolvedValue('valid_token');

    const db = await getWebDb();
    await db.put('pages', {
      id: 'p1',
      title: 'Nota com Imagem',
      content: '<p>Foto:</p><encrypted-image data-drive-file-id="used_image_id" />',
    });

    const now = Date.now();
    const oldTimestamp = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(); // 40 days old

    (drive.listFiles as any).mockResolvedValue([
      { id: 'used_image_id', name: 'used.png', createdTime: oldTimestamp },
    ]);

    await runImageGarbageCollector();

    expect(drive.deleteFromDrive).not.toHaveBeenCalled();
  });

  it('deletes orphaned images older than 30 days from Drive and local cache', async () => {
    (drive.getValidAccessToken as any).mockResolvedValue('valid_token');

    const db = await getWebDb();
    // No page references 'orphan_old_id'
    await db.put('image_cache', {
      id: 'orphan_old_id',
      data: new ArrayBuffer(8),
      mimeType: 'image/png',
    });

    const now = Date.now();
    const oldTimestamp = new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 days old
    const recentTimestamp = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days old

    (drive.listFiles as any).mockResolvedValue([
      { id: 'orphan_old_id', name: 'orphan_old.png', createdTime: oldTimestamp },
      { id: 'orphan_recent_id', name: 'orphan_recent.png', createdTime: recentTimestamp },
    ]);

    await runImageGarbageCollector();

    // Only old orphan (>30d) should be deleted
    expect(drive.deleteFromDrive).toHaveBeenCalledTimes(1);
    expect(drive.deleteFromDrive).toHaveBeenCalledWith('valid_token', 'orphan_old_id');

    const cachedItem = await db.get('image_cache', 'orphan_old_id');
    expect(cachedItem).toBeUndefined();
  });
});
