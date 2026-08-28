import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import AnnotationPanel from './AnnotationPanel';
import type { LibraryHighlight, LibraryBookmark } from '../../types';

vi.mock('../../ui/AnnotationsTab', () => ({
  AnnotationsTab: ({ groupedHighlights }: any) => (
    <div data-testid="annotations-tab">
      Total de páginas com anotações: {groupedHighlights ? groupedHighlights.size : 0}
    </div>
  ),
}));

vi.mock('../../ui/BookmarksTab', () => ({
  BookmarksTab: () => <div data-testid="bookmarks-tab">Marcadores</div>,
}));

vi.mock('../../ui/TocTab', () => ({
  TocTab: () => <div data-testid="toc-tab">Sumário</div>,
  flattenTocPages: vi.fn(() => []),
}));

describe('AnnotationPanel Component', () => {
  const mockHighlights: LibraryHighlight[] = [
    {
      id: 'h1',
      book_id: 'b1',
      page_number: 5,
      text_content: 'Primeiro princípio da computação',
      color: 'yellow',
      rects: '[]',
      created_at: 1000,
    },
  ];

  const mockBookmarks: LibraryBookmark[] = [];

  it('renders tab buttons and allows switching between annotations, bookmarks and toc', () => {
    const { getByText, getByTestId } = render(
      <AnnotationPanel
        bookId="b1"
        highlights={mockHighlights}
        bookmarks={mockBookmarks}
        tocItems={[]}
        currentPage={5}
        onNavigateToPage={vi.fn()}
        onUpdateHighlight={vi.fn()}
        onDeleteHighlight={vi.fn()}
        onUpdateBookmark={vi.fn()}
        onDeleteBookmark={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(getByTestId('annotations-tab')).toBeDefined();
    expect(getByText(/Total de páginas com anotações: 1/i)).toBeDefined();

    // Switch to bookmarks
    const bookmarksBtn = getByText('Marcadores');
    fireEvent.click(bookmarksBtn);
    expect(getByTestId('bookmarks-tab')).toBeDefined();

    // Switch to TOC
    const tocBtn = getByText('Sumário');
    fireEvent.click(tocBtn);
    expect(getByTestId('toc-tab')).toBeDefined();
  });
});
