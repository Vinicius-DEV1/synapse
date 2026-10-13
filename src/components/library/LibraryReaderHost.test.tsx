import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LibraryReaderHost } from './LibraryReaderHost';
import type { LibraryBook } from '../../types';

vi.mock('./pdf/PdfReader', () => ({
  default: () => <div data-testid="pdf-reader">Mock Pdf Reader</div>,
}));

vi.mock('./epub/EpubReader', () => ({
  default: () => <div data-testid="epub-reader">Mock Epub Reader</div>,
}));

describe('LibraryReaderHost Component', () => {
  const onBack = vi.fn();
  const onUpdateBook = vi.fn();

  const baseBook: LibraryBook = {
    id: 'test-1',
    title: 'O Pequeno Príncipe',
    author: 'Antoine de Saint-Exupéry',
    file_path: null,
    original_name: 'pequeno-principe',
    cover_image: '',
    total_pages: 100,
    last_read_page: 1,
    reading_status: 'reading',
    last_read_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('renders EpubReader when format is explicitly epub', async () => {
    const book: LibraryBook = {
      ...baseBook,
      format: 'epub',
      file_path: 'indexeddb://uuid-123',
    };

    const { findByTestId } = render(
      <LibraryReaderHost book={book} onBack={onBack} onUpdateBook={onUpdateBook} />
    );

    expect(await findByTestId('epub-reader')).toBeDefined();
  });

  it('renders EpubReader when book has an epubcfi last_read_page despite bare indexeddb path', async () => {
    const book: LibraryBook = {
      ...baseBook,
      file_path: 'indexeddb://bb632930-db94-438f-9840-20e',
      last_read_page: 'epubcfi(/6/14[ch-1]!/4/2/10)',
    };

    const { findByTestId } = render(
      <LibraryReaderHost book={book} onBack={onBack} onUpdateBook={onUpdateBook} />
    );

    expect(await findByTestId('epub-reader')).toBeDefined();
  });

  it('renders EpubReader when book has epub_locations despite bare indexeddb path', async () => {
    const book: LibraryBook = {
      ...baseBook,
      file_path: 'indexeddb://bb632930-db94-438f-9840-20e',
      epub_locations: '["loc1", "loc2"]',
    };

    const { findByTestId } = render(
      <LibraryReaderHost book={book} onBack={onBack} onUpdateBook={onUpdateBook} />
    );

    expect(await findByTestId('epub-reader')).toBeDefined();
  });

  it('renders EpubReader when file_path contains .epub extension', async () => {
    const book: LibraryBook = {
      ...baseBook,
      file_path: 'indexeddb://bb632930-db94-438f-9840-20e.epub',
    };

    const { findByTestId } = render(
      <LibraryReaderHost book={book} onBack={onBack} onUpdateBook={onUpdateBook} />
    );

    expect(await findByTestId('epub-reader')).toBeDefined();
  });

  it('renders PdfReader when book is a standard PDF', async () => {
    const book: LibraryBook = {
      ...baseBook,
      format: 'pdf',
      file_path: 'library/doc.pdf.enc',
      original_name: 'doc.pdf',
    };

    const { findByTestId } = render(
      <LibraryReaderHost book={book} onBack={onBack} onUpdateBook={onUpdateBook} />
    );

    expect(await findByTestId('pdf-reader')).toBeDefined();
  });
});
