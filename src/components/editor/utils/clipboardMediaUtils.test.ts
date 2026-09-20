import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isImageFilePath,
  getMimeTypeFromPath,
  extractLocalImagePaths,
  extractImageFilesFromClipboard,
  readLocalImageAsFile,
  resolveClipboardImages,
} from './clipboardMediaUtils';
import * as platform from '../../../services/platform';

vi.mock('../../../services/platform', () => ({
  isDesktopApp: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://localhost${path}`),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: vi.fn(),
}));

describe('clipboardMediaUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isImageFilePath', () => {
    it('identifies valid image extensions correctly', () => {
      expect(isImageFilePath('/home/user/photo.jpeg')).toBe(true);
      expect(isImageFilePath('/home/user/photo.jpg')).toBe(true);
      expect(isImageFilePath('/home/user/photo.png')).toBe(true);
      expect(isImageFilePath('/home/user/photo.webp')).toBe(true);
      expect(isImageFilePath('/home/user/photo.gif')).toBe(true);
      expect(isImageFilePath('/home/user/photo.svg')).toBe(true);
      expect(isImageFilePath('/home/user/photo.bmp')).toBe(true);
      expect(isImageFilePath('/home/user/photo.avif')).toBe(true);
      expect(isImageFilePath('C:\\Users\\testuser\\photo.PNG')).toBe(true);
    });

    it('rejects non-image extensions', () => {
      expect(isImageFilePath('/home/user/document.pdf')).toBe(false);
      expect(isImageFilePath('/home/user/video.mp4')).toBe(false);
      expect(isImageFilePath('/home/user/notes.txt')).toBe(false);
      expect(isImageFilePath('')).toBe(false);
    });
  });

  describe('getMimeTypeFromPath', () => {
    it('returns appropriate mime types', () => {
      expect(getMimeTypeFromPath('image.png')).toBe('image/png');
      expect(getMimeTypeFromPath('image.jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromPath('image.jpeg')).toBe('image/jpeg');
      expect(getMimeTypeFromPath('image.webp')).toBe('image/webp');
      expect(getMimeTypeFromPath('image.svg')).toBe('image/svg+xml');
      expect(getMimeTypeFromPath('unknown.xyz')).toBe('image/jpeg');
    });
  });

  describe('extractLocalImagePaths', () => {
    it('extracts Linux absolute image path from plain text', () => {
      const text = '/home/user/Downloads/sample-image.jpeg';
      const paths = extractLocalImagePaths(text);
      expect(paths).toEqual(['/home/user/Downloads/sample-image.jpeg']);
    });

    it('extracts path from file:// URI with URL encoding', () => {
      const uri = 'file:///home/user/Downloads/sample-image.jpeg';
      const paths = extractLocalImagePaths(uri);
      expect(paths).toEqual(['/home/user/Downloads/sample-image.jpeg']);
    });

    it('extracts Windows file paths', () => {
      const winPath = 'C:\\Users\\testuser\\Pictures\\screenshot.png';
      const paths = extractLocalImagePaths(winPath);
      expect(paths).toEqual(['C:\\Users\\testuser\\Pictures\\screenshot.png']);
    });

    it('extracts multiple lines from text/uri-list', () => {
      const multi = `
        file:///home/user/Pictures/img1.png
        file:///home/user/Pictures/img2.jpg
        /home/user/document.pdf
      `;
      const paths = extractLocalImagePaths(multi);
      expect(paths).toEqual(['/home/user/Pictures/img1.png', '/home/user/Pictures/img2.jpg']);
    });

    it('ignores non-path and regular text', () => {
      const text = 'Hello world, this is a normal sentence.';
      expect(extractLocalImagePaths(text)).toEqual([]);
    });
  });

  describe('extractImageFilesFromClipboard', () => {
    it('extracts image files from items and files', () => {
      const file1 = new File(['content1'], 'image1.png', { type: 'image/png' });
      const mockEvent = {
        clipboardData: {
          items: [
            {
              type: 'image/png',
              kind: 'file',
              getAsFile: () => file1,
            },
          ],
          files: [file1],
        },
      } as unknown as ClipboardEvent;

      const result = extractImageFilesFromClipboard(mockEvent);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('image1.png');
    });
  });

  describe('readLocalImageAsFile', () => {
    it('returns null if not running in desktop app', async () => {
      vi.mocked(platform.isDesktopApp).mockReturnValue(false);
      const res = await readLocalImageAsFile('/home/user/test.png');
      expect(res).toBeNull();
    });

    it('reads file via native Tauri invoke when successful', async () => {
      vi.mocked(platform.isDesktopApp).mockReturnValue(true);
      const core = await import('@tauri-apps/api/core');
      vi.mocked(core.invoke).mockResolvedValue(new Uint8Array([1, 2, 3]) as any);

      const res = await readLocalImageAsFile('/home/user/test.png');
      expect(res).not.toBeNull();
      expect(res?.name).toBe('test.png');
      expect(res?.type).toBe('image/png');
    });

    it('falls back to plugin-fs when invoke fails', async () => {
      vi.mocked(platform.isDesktopApp).mockReturnValue(true);
      const core = await import('@tauri-apps/api/core');
      vi.mocked(core.invoke).mockRejectedValue(new Error('IPC error'));
      const fsModule = await import('@tauri-apps/plugin-fs');
      vi.mocked(fsModule.readFile).mockResolvedValue(new Uint8Array([1, 2, 3]) as any);

      const res = await readLocalImageAsFile('/home/user/test.jpg');
      expect(res).not.toBeNull();
      expect(res?.name).toBe('test.jpg');
      expect(res?.type).toBe('image/jpeg');
    });
  });

  describe('resolveClipboardImages', () => {
    it('returns direct clipboard files if present without reading disk', async () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      const mockEvent = {
        clipboardData: {
          items: [{ type: 'image/png', kind: 'file', getAsFile: () => file }],
          files: [file],
          getData: vi.fn().mockReturnValue(''),
        },
      } as unknown as ClipboardEvent;

      const result = await resolveClipboardImages(mockEvent);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('test.png');
    });

    it('resolves local paths from text/plain when no direct files exist in desktop mode', async () => {
      vi.mocked(platform.isDesktopApp).mockReturnValue(true);
      const fakeBlob = new Blob(['image data'], { type: 'image/jpeg' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(fakeBlob),
      });

      const mockEvent = {
        clipboardData: {
          items: [],
          files: [],
          getData: vi.fn((format: string) =>
            format === 'text/plain'
              ? '/home/user/Downloads/sample-image.jpeg'
              : ''
          ),
        },
      } as unknown as ClipboardEvent;

      const result = await resolveClipboardImages(mockEvent);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('sample-image.jpeg');
      expect(result[0].type).toBe('image/jpeg');
    });
  });
});
