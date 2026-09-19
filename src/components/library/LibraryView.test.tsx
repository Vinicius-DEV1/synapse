import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import LibraryView from './LibraryView';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('pdfjs-dist/build/pdf.worker.mjs?url', () => ({
  default: 'mock-pdf-worker-url',
}));

const mockDispatch = vi.fn();
const mockLoadData = vi.fn();
const mockHandleImport = vi.fn();
const mockHandleDelete = vi.fn();
const mockHandleUpdateBook = vi.fn();
const mockSaveCollectionRename = vi.fn();

let mockSelectedBook: any = null;
let mockLoading = false;
let mockBooks: any[] = [];

vi.mock('../../store/useStore', () => ({
  useStore: vi.fn(() => ({
    state: {
      tabs: [{ id: 'tab-1', module: 'library', bookId: null }],
    },
    dispatch: mockDispatch,
  })),
}));

vi.mock('./hooks/useLibraryData', () => ({
  useLibraryData: vi.fn(() => ({
    books: mockBooks,
    collections: [],
    loading: mockLoading,
    uploadResult: null,
    setUploadResult: vi.fn(),
    hasDriveAuth: true,
    setHasDriveAuth: vi.fn(),
    selectedBook: mockSelectedBook,
    loadData: mockLoadData,
    handleImport: mockHandleImport,
    handleDelete: mockHandleDelete,
    handleUpdateBook: mockHandleUpdateBook,
    handleSaveRename: mockSaveCollectionRename,
  })),
}));

vi.mock('./hooks/useLibraryFilter', () => ({
  useLibraryFilter: vi.fn((books) => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    selectedCollection: null,
    setSelectedCollection: vi.fn(),
    selectedAuthor: null,
    setSelectedAuthor: vi.fn(),
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    sortBy: 'title',
    setSortBy: vi.fn(),
    sortOrder: 'asc',
    setSortOrder: vi.fn(),
    showSortDropdown: false,
    setShowSortDropdown: vi.fn(),
    showCollectionDropdown: false,
    setShowCollectionDropdown: vi.fn(),
    showAuthorDropdown: false,
    setShowAuthorDropdown: vi.fn(),
    authors: [],
    filteredAndSorted: books,
  })),
}));

vi.mock('./ui/LibraryHeader', () => ({
  LibraryHeader: () => <div data-testid="library-header">Library Header</div>,
}));

vi.mock('./LibraryGrid', () => ({
  default: () => <div data-testid="library-grid">Library Grid</div>,
}));

vi.mock('./pdf/PdfReader', () => ({
  default: () => <div data-testid="pdf-reader">PDF Reader View</div>,
}));

vi.mock('./epub/EpubReader', () => ({
  default: () => <div data-testid="epub-reader">EPUB Reader View</div>,
}));

describe('LibraryView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedBook = null;
    mockLoading = false;
    mockBooks = [];
  });

  it('renders header and grid when on library root', () => {
    mockBooks = [{ id: '1', title: 'Test Book' }];
    const { getByTestId } = render(<LibraryView tabId="tab-1" />);

    expect(getByTestId('library-header')).toBeDefined();
    expect(getByTestId('library-grid')).toBeDefined();
  });

  it('renders PdfReader when a PDF book is selected', async () => {
    mockSelectedBook = {
      id: 'pdf-1',
      title: 'Book.pdf',
      file_path: 'path/to/book.pdf',
    };

    const { findByTestId } = render(<LibraryView tabId="tab-1" />);
    expect(await findByTestId('pdf-reader')).toBeDefined();
  });

  it('renders EpubReader when an EPUB book is selected', async () => {
    mockSelectedBook = {
      id: 'epub-1',
      title: 'Book.epub',
      file_path: 'path/to/book.epub',
    };

    const { findByTestId } = render(<LibraryView tabId="tab-1" />);
    expect(await findByTestId('epub-reader')).toBeDefined();
  });
});
