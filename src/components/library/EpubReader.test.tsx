import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import EpubReader from './EpubReader';
import type { LibraryBook } from '../../types';

vi.mock('epubjs', () => ({
  default: vi.fn(),
}));

vi.mock('../../store/useStore', () => ({
  useStore: vi.fn(() => ({
    state: { isReadingModeFullScreen: false },
    dispatch: vi.fn(),
  })),
}));

vi.mock('../../utils/settings', () => ({
  getSettings: vi.fn(() => ({})),
  saveSettings: vi.fn(),
}));

vi.mock('../../hooks/useTimeTracker', () => ({
  useTimeTracker: vi.fn(),
}));

vi.mock('./epub/useEpubLoader', () => ({
  useEpubLoader: vi.fn(),
}));

vi.mock('./epub/useEpubTheme', () => ({
  useEpubTheme: vi.fn(),
}));

vi.mock('./epub/EpubTopBar', () => {
  return {
    default: ({ onBack }: any) => (
      <div data-testid="epub-top-bar">
        <button onClick={onBack}>Voltar</button>
      </div>
    ),
  };
});

vi.mock('./epub/EpubSidebars', () => {
  return {
    default: () => <div data-testid="epub-sidebars" />,
  };
});

vi.mock('./epub/EpubHighlightMenu', () => {
  return {
    default: () => <div data-testid="epub-highlight-menu" />,
  };
});

vi.mock('./epub/EpubTypography', () => {
  return {
    default: () => <div data-testid="epub-typography" />,
  };
});

describe('EpubReader Component', () => {
  const mockBook: LibraryBook = {
    id: 'book_epub_1',
    title: 'The Pragmatic Programmer',
    author: 'Andy Hunt & Dave Thomas',
    format: 'epub',
    total_pages: 320,
    reading_status: 'reading',
    created_at: 1000,
    updated_at: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders epub layout with top bar, sidebars and viewer area', () => {
    const onBack = vi.fn();
    const onUpdateBook = vi.fn();

    const { getByTestId } = render(
      <EpubReader book={mockBook} onBack={onBack} onUpdateBook={onUpdateBook} />
    );

    expect(getByTestId('epub-top-bar')).toBeDefined();
    expect(getByTestId('epub-sidebars')).toBeDefined();
    expect(getByTestId('epub-highlight-menu')).toBeDefined();
  });
});
