import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadDocumentFile } from './documentDownloadUtils';

vi.mock('../../../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('documentDownloadUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  it('fails gracefully when objectUrl is missing', async () => {
    const res = await downloadDocumentFile('', 'test.md');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Missing objectUrl');
  });

  it('executes web download fallback when Tauri is not present', async () => {
    const mockBlob = new Blob(['sample markdown'], { type: 'text/markdown' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    } as any);

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const res = await downloadDocumentFile('blob:source', 'document.md');
    expect(res.success).toBe(true);
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('handles fetch failure gracefully in web mode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as any);

    const res = await downloadDocumentFile('blob:broken-source', 'document.md');
    expect(res.success).toBe(false);
    expect(res.error).toContain('404');
  });
});
