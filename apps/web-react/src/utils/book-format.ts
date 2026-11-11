import type { LibraryBook } from '../types/library';

/**
 * Checks whether a book is an EPUB based on all available metadata signals:
 * 1. Explicit `format` property ('epub' vs 'pdf')
 * 2. EPUB CFI reading progress string (e.g. 'epubcfi(...)')
 * 3. Pre-generated EPUB location indices
 * 4. File path containing .epub or .epub.enc
 * 5. Original filename ending with or containing .epub
 * 6. Book title ending with .epub
 */
export function isBookEpub(book: Partial<LibraryBook> | null | undefined): boolean {
  if (!book) return false;

  // 1. Explicit format field
  if (book.format === 'epub') return true;
  if (book.format === 'pdf') return false;

  // 2. EPUB CFI (canonical fragment identifier) in last_read_page
  if (typeof book.last_read_page === 'string') {
    const lrp = book.last_read_page.trim().toLowerCase();
    if (lrp.startsWith('epubcfi(') || lrp.includes('epubcfi') || lrp.startsWith('/6/')) {
      return true;
    }
  }

  // 3. EPUB locations index exists and is non-empty
  if (typeof book.epub_locations === 'string' && book.epub_locations.trim().length > 0) {
    return true;
  }

  // 4. File path heuristics
  const filePathLower = (book.file_path || '').toLowerCase();
  if (
    filePathLower.endsWith('.epub') ||
    filePathLower.endsWith('.epub.enc') ||
    filePathLower.includes('.epub.') ||
    filePathLower.includes('.epub')
  ) {
    return true;
  }

  // 5. Original filename heuristics
  const origNameLower = (book.original_name || '').toLowerCase();
  if (origNameLower.endsWith('.epub') || origNameLower.includes('.epub')) {
    return true;
  }

  // 6. Title heuristics
  const titleLower = (book.title || '').toLowerCase();
  if (titleLower.endsWith('.epub') || titleLower.includes('.epub')) {
    return true;
  }

  return false;
}

/**
 * Inspects binary magic bytes from an ArrayBuffer or Uint8Array to detect file format.
 * - PDF: begins with %PDF- (0x25, 0x50, 0x44, 0x46)
 * - EPUB: standard PKZip container (0x50, 0x4B, 0x03, 0x04)
 */
export function detectBufferFormat(
  buffer: ArrayBuffer | Uint8Array | null | undefined
): 'pdf' | 'epub' | 'unknown' {
  if (!buffer) return 'unknown';

  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength < 4) return 'unknown';

  // Check direct magic bytes
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'pdf';
  }

  // Standard ZIP header used by EPUB (PK\x03\x04 or PK\x05\x06)
  if (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4B &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
  ) {
    return 'epub';
  }

  // Scan first 128 bytes to tolerate leading BOM / whitespace / offset
  const maxOffset = Math.min(128, Math.max(0, bytes.byteLength - 4));
  for (let i = 0; i <= maxOffset; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46
    ) {
      return 'pdf';
    }
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4B &&
      (bytes[i + 2] === 0x03 || bytes[i + 2] === 0x05 || bytes[i + 2] === 0x07)
    ) {
      return 'epub';
    }
  }

  return 'unknown';
}
