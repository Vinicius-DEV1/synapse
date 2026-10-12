import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import EpubBookmarkRibbon from './EpubBookmarkRibbon';

const mockToggleBookmark = vi.fn();
let mockIsBookmarked = false;
let mockScrollMode = false;

vi.mock('./hooks/useEpubBookmark', () => ({
  useEpubBookmark: () => ({
    isBookmarked: mockIsBookmarked,
    toggleBookmark: mockToggleBookmark,
    scrollMode: mockScrollMode,
  }),
}));

vi.mock('./EpubContext', () => ({
  useEpub: () => ({
    readingMode: 'dark',
    textWidth: 'medium',
  }),
}));

describe('EpubBookmarkRibbon Component', () => {
  it('renders interactive button and triggers toggleBookmark on click', () => {
    mockIsBookmarked = true;
    const { getByRole, getByLabelText } = render(<EpubBookmarkRibbon />);

    const btn = getByLabelText('Desmarcar página');
    expect(btn).toBeDefined();

    fireEvent.click(btn);
    expect(mockToggleBookmark).toHaveBeenCalled();
  });

  it('renders unbookmarked state with appropriate aria-label and styling', () => {
    mockIsBookmarked = false;
    const { getByLabelText } = render(<EpubBookmarkRibbon />);

    const btn = getByLabelText('Marcar página');
    expect(btn).toBeDefined();
    expect(btn.className).toContain('-translate-y-6');
  });

  it('returns null in continuous scroll mode because ribbons are rendered inline beside paragraphs', () => {
    mockIsBookmarked = true;
    mockScrollMode = true;
    const { container } = render(<EpubBookmarkRibbon />);

    expect(container.firstChild).toBeNull();
  });
});
