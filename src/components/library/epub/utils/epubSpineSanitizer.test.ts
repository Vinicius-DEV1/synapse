import { describe, it, expect, vi } from 'vitest';
import { sanitizeEpubBook, patchRenditionQueue } from './epubSpineSanitizer';
import type { EpubBookLike, EpubRenditionLike } from './epubSpineSanitizer';

describe('epubSpineSanitizer', () => {
  it('prunes phantom spine items missing href or url and re-indexes correctly', () => {
    const mockBook: EpubBookLike = {
      archive: {
        request: vi.fn(),
        zip: {
          file: (name: string) => (name === 'notice.html' || name === 'EPUB/notice.html' ? {} : null),
        },
      },
      spine: {
        spineItems: [
          // Phantom item without href or url (e.g. <itemref idref="cover"/>)
          { idref: 'cover', href: undefined, url: undefined, linear: true, index: 0 },
          // Valid section
          { idref: 'chapter_0', href: 'notice.html', url: 'EPUB/notice.html', linear: true, index: 1 },
        ],
        spineByHref: { 'undefined': 0, 'notice.html': 1 },
        spineById: { 'cover': 0, 'chapter_0': 1 },
        length: 2,
        get: vi.fn((target?: unknown) => {
          if (target === undefined) {
            return mockBook.spine!.spineItems[0];
          }
          return null;
        }),
        first: vi.fn(() => mockBook.spine!.spineItems[0]),
        last: vi.fn(() => mockBook.spine!.spineItems[1]),
        each: vi.fn(),
      },
      load: vi.fn(),
      locations: {
        process: vi.fn(),
      },
    };

    sanitizeEpubBook(mockBook);

    expect(mockBook.spine!.spineItems).toHaveLength(1);
    expect(mockBook.spine!.spineItems[0].idref).toBe('chapter_0');
    expect(mockBook.spine!.spineItems[0].index).toBe(0);
    expect(mockBook.spine!.spineByHref['notice.html']).toBe(0);
    expect(mockBook.spine!.spineById['chapter_0']).toBe(0);
    expect(mockBook.spine!.length).toBe(1);

    // spine.get(undefined) must resolve the valid section, not null or undefined
    const firstSection = mockBook.spine!.get(undefined);
    expect(firstSection?.idref).toBe('chapter_0');
  });

  it('prunes spine items whose files do not exist in the zip archive', () => {
    const mockBook: EpubBookLike = {
      archive: {
        request: vi.fn(),
        zip: {
          file: (name: string) => (name.includes('page_1.html') ? {} : null),
        },
      },
      spine: {
        spineItems: [
          { idref: 'bad_page', href: 'nonexistent.html', url: 'EPUB/nonexistent.html', linear: true, index: 0 },
          { idref: 'good_page', href: 'page_1.html', url: 'EPUB/page_1.html', linear: true, index: 1 },
        ],
        spineByHref: {},
        spineById: {},
        length: 2,
        get: vi.fn(),
        first: vi.fn(),
        last: vi.fn(),
        each: vi.fn(),
      },
    };

    sanitizeEpubBook(mockBook);

    expect(mockBook.spine!.spineItems).toHaveLength(1);
    expect(mockBook.spine!.spineItems[0].idref).toBe('good_page');
    expect(mockBook.spine!.spineItems[0].index).toBe(0);
  });

  it('defensively protects archive.request and book.load from crashing on undefined URLs', async () => {
    const origArchiveRequest = vi.fn().mockResolvedValue('ok');
    const origBookLoad = vi.fn().mockResolvedValue('ok');

    const mockBook: EpubBookLike = {
      archive: {
        request: origArchiveRequest,
      },
      load: origBookLoad,
      spine: {
        spineItems: [
          { idref: 'sec_1', href: 'sec.html', url: 'sec.html', linear: true, index: 0 },
        ],
        spineByHref: {},
        spineById: {},
        length: 1,
        get: vi.fn(),
        first: vi.fn(),
        last: vi.fn(),
        each: vi.fn(),
      },
    };

    sanitizeEpubBook(mockBook);

    // Calling with undefined must reject gracefully rather than throwing synchronous TypeError
    await expect(mockBook.archive!.request(undefined as unknown as string)).rejects.toThrow(
      'Invalid or empty archive request URL'
    );
    expect(origArchiveRequest).not.toHaveBeenCalled();

    await expect(mockBook.load!(undefined as unknown as string)).rejects.toThrow(
      'Cannot load empty or unresolvable path'
    );
    expect(origBookLoad).not.toHaveBeenCalled();

    // Calling with valid string must call through
    await mockBook.archive!.request('valid.html');
    expect(origArchiveRequest).toHaveBeenCalledWith('valid.html', undefined);

    await mockBook.load!('valid.html');
    expect(origBookLoad).toHaveBeenCalledWith('valid.html');
  });

  it('defensively guards locations.process from breaking location generation', async () => {
    const failingProcess = vi.fn().mockRejectedValue(new Error('Corrupt HTML chunk'));

    const mockBook: EpubBookLike = {
      spine: {
        spineItems: [
          { idref: 'sec_1', href: 'sec.html', url: 'sec.html', linear: true, index: 0 },
        ],
        spineByHref: {},
        spineById: {},
        length: 1,
        get: vi.fn(),
        first: vi.fn(),
        last: vi.fn(),
        each: vi.fn(),
      },
      locations: {
        process: failingProcess,
      },
    };

    sanitizeEpubBook(mockBook);

    // Even if origProcess fails, the guarded locations.process resolves [] instead of rejecting
    const res = await mockBook.locations!.process!({ idref: 'sec_1', href: 'sec.html', url: 'sec.html' });
    expect(res).toEqual([]);
  });

  it('patches rendition queue dequeue to catch synchronous errors without freezing', () => {
    const throwingDequeue = vi.fn().mockImplementation(() => {
      throw new TypeError("undefined is not an object (evaluating 'e.indexOf')");
    });

    const mockRendition: EpubRenditionLike = {
      q: {
        dequeue: throwingDequeue,
      },
    };

    patchRenditionQueue(mockRendition);

    // Dequeue should catch synchronous error and resolve safely
    expect(() => mockRendition.q!.dequeue!()).not.toThrow();
  });
});
