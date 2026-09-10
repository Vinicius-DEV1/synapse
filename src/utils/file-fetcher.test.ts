import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cacheBlobUrl,
  getCachedBlob,
  revokeCachedBlobUrl,
  fetchTextFromUrl,
  getBlobFromUrlOrFetch,
} from './file-fetcher';

describe('file-fetcher utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retrieves text directly from cached blob without network fetch', async () => {
    const mockContent = '# Direct Memory Markdown Content';
    const blob = new Blob([mockContent], { type: 'text/markdown' });
    const blobUrl = 'blob:tauri://localhost/test-uuid-1';

    cacheBlobUrl(blobUrl, blob);
    expect(getCachedBlob(blobUrl)).toBe(blob);

    const fetchSpy = vi.spyOn(global, 'fetch');

    const resultText = await fetchTextFromUrl(blobUrl);
    expect(resultText).toBe(mockContent);
    expect(fetchSpy).not.toHaveBeenCalled();

    revokeCachedBlobUrl(blobUrl);
    expect(getCachedBlob(blobUrl)).toBeUndefined();
  });

  it('falls back to fetch when url is not in blob cache', async () => {
    const remoteUrl = 'https://example.com/notes.txt';
    const mockText = 'Remote text content';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockText),
    } as any);

    const result = await fetchTextFromUrl(remoteUrl);
    expect(result).toBe(mockText);
    expect(fetchSpy).toHaveBeenCalledWith(remoteUrl);
  });

  it('retrieves cached blob via getBlobFromUrlOrFetch without fetch', async () => {
    const blob = new Blob(['binary data'], { type: 'application/octet-stream' });
    const blobUrl = 'blob:tauri://localhost/test-uuid-2';

    cacheBlobUrl(blobUrl, blob);
    const fetchSpy = vi.spyOn(global, 'fetch');

    const retrievedBlob = await getBlobFromUrlOrFetch(blobUrl);
    expect(retrievedBlob).toBe(blob);
    expect(fetchSpy).not.toHaveBeenCalled();

    revokeCachedBlobUrl(blobUrl);
  });
});
