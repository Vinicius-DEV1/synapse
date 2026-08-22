import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncPdfsToCloud } from './sync-pdf';
import { importHexKey } from '../crypto';
import * as drive from '../drive';
import * as storage from '../storage';
import { platform } from '../platform';

vi.mock('../drive', () => ({
  getValidAccessToken: vi.fn(),
  uploadToDrive: vi.fn(),
}));

vi.mock('../storage', () => ({
  encryptFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}));

vi.mock('../platform', () => ({
  platform: {
    canReadLocalFilesystem: true,
    platform: 'desktop',
    useNativeTitleBar: true,
    supportsNativeTabs: true,
  },
}));

describe('sync-pdf service', () => {
  const testHexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  let cryptoKey: CryptoKey;

  beforeEach(async () => {
    vi.clearAllMocks();
    cryptoKey = await importHexKey(testHexKey);
    platform.canReadLocalFilesystem = true;

    (window as any).api = {
      library: {
        getBooks: vi.fn().mockResolvedValue([]),
        getBookFile: vi.fn().mockResolvedValue(null),
        updateBook: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips sync if not running in desktop app', async () => {
    platform.canReadLocalFilesystem = false;

    await syncPdfsToCloud({ library: cryptoKey });
    expect(window.api.library.getBooks).not.toHaveBeenCalled();
  });

  it('uploads un-synced PDF files to Google Drive with E2EE encryption', async () => {
    const mockBooks = [
      {
        id: 'book-1',
        title: 'Clean Code.pdf',
        file_path: '/path/to/Clean Code.pdf',
        drive_file_id: null, // Needs sync!
      },
      {
        id: 'book-2',
        title: 'Already Synced.pdf',
        file_path: '/path/to/already.pdf',
        drive_file_id: 'drive-existing-123', // Already synced
      },
    ];

    (window as any).api.library.getBooks.mockResolvedValue(mockBooks);
    (window as any).api.library.getBookFile.mockResolvedValue(new Uint8Array([10, 20, 30]));
    (drive.getValidAccessToken as any).mockResolvedValue('valid-oauth2-token');
    (drive.uploadToDrive as any).mockResolvedValue('new-drive-file-id-789');

    await syncPdfsToCloud({ library: cryptoKey });

    expect(storage.encryptFile).toHaveBeenCalled();
    expect(drive.uploadToDrive).toHaveBeenCalledWith(
      'valid-oauth2-token',
      'Caderno_book-1.enc',
      expect.any(Uint8Array)
    );
    expect(window.api.library.updateBook).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'book-1',
        drive_file_id: 'new-drive-file-id-789',
      })
    );
  });
});
