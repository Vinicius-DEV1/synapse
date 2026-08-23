import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildEncryptedAssetUrl, findLocalCanonicalPath, resolveCanonicalBuffer } from './canonical-resolver';
import * as drive from '../drive';
import * as storage from '../storage';
import { platform } from '../platform';

vi.mock('../drive', () => ({
  getValidAccessToken: vi.fn(),
  downloadFromDrive: vi.fn(),
}));

vi.mock('../storage', () => ({
  decryptFile: vi.fn().mockImplementation((buf) => Promise.resolve(buf)),
}));

vi.mock('../platform', () => ({
  platform: {
    canReadLocalFilesystem: false,
    platform: 'web',
    useNativeTitleBar: false,
    supportsNativeTabs: false,
  },
}));

describe('canonical-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.canReadLocalFilesystem = false;
  });

  it('builds encrypted asset url correctly on non-windows', () => {
    const url = buildEncryptedAssetUrl('library', '/data/library/book-1.epub.enc');
    expect(url).toContain('encrypted://localhost/library/');
  });

  it('downloads from drive when local filesystem is unavailable', async () => {
    (drive.getValidAccessToken as any).mockResolvedValue('test-token');
    (drive.downloadFromDrive as any).mockResolvedValue(new ArrayBuffer(100));

    const buffer = await resolveCanonicalBuffer({
      moduleName: 'library',
      id: 'book-123',
      driveFileId: 'drive-file-abc',
      extHint: 'epub'
    });

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(drive.downloadFromDrive).toHaveBeenCalledWith('test-token', 'drive-file-abc');
  });

  it('resolves buffer via stream on desktop without drive', async () => {
    platform.canReadLocalFilesystem = true;
    const testBuf = new ArrayBuffer(50);
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(testBuf)
    } as any);

    const buffer = await resolveCanonicalBuffer({
      moduleName: 'library',
      id: 'local-book-1',
      savedPath: 'library/local-book-1.pdf.enc',
      extHint: 'pdf'
    });

    expect(buffer).toBe(testBuf);
    expect(global.fetch).toHaveBeenCalled();

    global.fetch = originalFetch;
  });

  it('throws error when no local file and no drive file is present', async () => {
    await expect(
      resolveCanonicalBuffer({
        moduleName: 'library',
        id: 'book-999',
      })
    ).rejects.toThrow('Arquivo não encontrado no disco local nem na nuvem');
  });
});

