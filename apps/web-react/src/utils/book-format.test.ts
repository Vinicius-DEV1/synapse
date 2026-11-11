import { describe, it, expect } from 'vitest';
import { isBookEpub, detectBufferFormat } from './book-format';
import type { LibraryBook } from '../types/library';

describe('book-format utilities', () => {
  describe('isBookEpub', () => {
    it('returns false for null or undefined book', () => {
      expect(isBookEpub(null)).toBe(false);
      expect(isBookEpub(undefined)).toBe(false);
      expect(isBookEpub({})).toBe(false);
    });

    it('honors explicit format property', () => {
      expect(isBookEpub({ format: 'epub' })).toBe(true);
      expect(isBookEpub({ format: 'pdf' })).toBe(false);
      // format takes precedence over file path
      expect(isBookEpub({ format: 'pdf', file_path: 'test.epub' })).toBe(false);
      expect(isBookEpub({ format: 'epub', file_path: 'test.pdf' })).toBe(true);
    });

    it('identifies EPUB by last_read_page CFI string', () => {
      expect(isBookEpub({ last_read_page: 'epubcfi(/6/14[ch2]!/4/2)' })).toBe(true);
      expect(isBookEpub({ last_read_page: '/6/14[ch2]!/4/2' })).toBe(true);
      expect(isBookEpub({ last_read_page: 5 })).toBe(false);
      expect(isBookEpub({ last_read_page: '5' })).toBe(false);
    });

    it('identifies EPUB by non-empty epub_locations', () => {
      expect(isBookEpub({ epub_locations: '["cfi1", "cfi2"]' })).toBe(true);
      expect(isBookEpub({ epub_locations: '' })).toBe(false);
      expect(isBookEpub({ epub_locations: null })).toBe(false);
    });

    it('identifies EPUB even with indexeddb path if original_name or cfi is present', () => {
      const bookWithIdb: Partial<LibraryBook> = {
        id: 'uuid-123',
        title: 'Dom Casmurro',
        file_path: 'indexeddb://uuid-123',
        original_name: 'Dom Casmurro.epub',
      };
      expect(isBookEpub(bookWithIdb)).toBe(true);
    });

    it('identifies EPUB with indexeddb path ending in .epub', () => {
      const bookWithIdbExt: Partial<LibraryBook> = {
        id: 'uuid-123',
        title: 'Dom Casmurro',
        file_path: 'indexeddb://uuid-123.epub',
        original_name: 'Dom Casmurro',
      };
      expect(isBookEpub(bookWithIdbExt)).toBe(true);
    });

    it('identifies EPUB by title or original_name extension', () => {
      expect(isBookEpub({ title: 'Novel.epub' })).toBe(true);
      expect(isBookEpub({ original_name: 'Novel.EPUB' })).toBe(true);
      expect(isBookEpub({ file_path: 'library/123.epub.enc' })).toBe(true);
      expect(isBookEpub({ file_path: 'library/123.pdf.enc' })).toBe(false);
    });
  });

  describe('detectBufferFormat', () => {
    it('returns unknown for empty or tiny buffer', () => {
      expect(detectBufferFormat(null)).toBe('unknown');
      expect(detectBufferFormat(new Uint8Array([0, 1]))).toBe('unknown');
    });

    it('detects PDF by magic bytes %PDF', () => {
      // %PDF = 0x25, 0x50, 0x44, 0x46
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
      expect(detectBufferFormat(pdfBytes)).toBe('pdf');
      expect(detectBufferFormat(pdfBytes.buffer)).toBe('pdf');
    });

    it('detects EPUB by magic bytes PK (ZIP)', () => {
      // PK\x03\x04 = 0x50, 0x4B, 0x03, 0x04
      const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
      expect(detectBufferFormat(zipBytes)).toBe('epub');
      expect(detectBufferFormat(zipBytes.buffer)).toBe('epub');
    });

    it('detects PDF even with leading whitespace or BOM', () => {
      const paddedPdf = new Uint8Array([0x0a, 0x20, 0x25, 0x50, 0x44, 0x46, 0x2d]);
      expect(detectBufferFormat(paddedPdf)).toBe('pdf');
    });

    it('detects EPUB even with leading whitespace or offset', () => {
      const paddedZip = new Uint8Array([0x00, 0x00, 0x50, 0x4b, 0x03, 0x04]);
      expect(detectBufferFormat(paddedZip)).toBe('epub');
    });

    it('returns unknown for random binary', () => {
      const random = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a]);
      expect(detectBufferFormat(random)).toBe('unknown');
    });
  });
});
