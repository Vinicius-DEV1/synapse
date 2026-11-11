import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureWebScrap } from './scrap-service';
import { platform } from '../platform';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../platform', () => ({
  platform: {
    platform: 'desktop',
    canReadLocalFilesystem: true,
  },
}));

describe('captureWebScrap service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes scrap_capture_page on desktop platform', async () => {
    (platform as { platform: string }).platform = 'desktop';
    const mockPayload = {
      id: 'scrap-123',
      url: 'https://example.com',
      title: 'Example Page',
      favicon: null,
      html_content: '<html><body>Hello</body></html>',
      file_size: 1024,
      created_at: new Date().toISOString(),
      local_path: '/path/to/scrap.html',
    };

    vi.mocked(invoke).mockResolvedValueOnce(mockPayload);

    const result = await captureWebScrap('https://example.com');
    expect(invoke).toHaveBeenCalledWith('scrap_capture_page', { url: 'https://example.com' });
    expect(result).toEqual(mockPayload);
  });

  it('throws helpful error on non-desktop platform', async () => {
    (platform as { platform: string }).platform = 'web';

    await expect(captureWebScrap('https://example.com')).rejects.toThrow(
      'A captura de snapshots está disponível apenas na versão Desktop.'
    );
    expect(invoke).not.toHaveBeenCalled();
  });
});
