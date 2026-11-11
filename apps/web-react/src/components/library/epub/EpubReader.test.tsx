import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import EpubReader from './EpubReader';
import type { LibraryBook } from '../../../types';

vi.mock('epubjs', () => ({
  default: vi.fn(),
}));

const mockDispatch = vi.fn();

vi.mock('../../../store/useStore', () => ({
  useStore: vi.fn(() => ({
    state: { isReadingModeFullScreen: false },
    dispatch: mockDispatch,
  })),
}));

vi.mock('../../../services/platform', () => ({
  isMobileScreen: vi.fn(() => false),
  platform: {
    platform: 'web',
  },
}));

vi.mock('../../../utils/settings', () => ({
  getSettings: vi.fn(() => ({})),
  saveSettings: vi.fn(),
}));

vi.mock('../../../hooks/useTimeTracker', () => ({
  useTimeTracker: vi.fn(),
}));

vi.mock('./useEpubLoader', () => ({
  useEpubLoader: vi.fn(),
}));

vi.mock('./useEpubTheme', () => ({
  useEpubTheme: vi.fn(),
}));

vi.mock('./EpubTopBar', () => {
  return {
    default: ({ onBack }: any) => (
      <div data-testid="epub-top-bar">
        <button onClick={onBack}>Voltar</button>
      </div>
    ),
  };
});

vi.mock('./EpubSidebars', () => {
  return {
    default: () => <div data-testid="epub-sidebars" />,
  };
});

vi.mock('./EpubHighlightMenu', () => {
  return {
    default: () => <div data-testid="epub-highlight-menu" />,
  };
});

vi.mock('./EpubTypography', () => {
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

  it('dispatches reading mode fullscreen on mobile to hide tabs and bars for immersive reading', async () => {
    const { isMobileScreen } = await import('../../../services/platform');
    vi.mocked(isMobileScreen).mockReturnValue(true);

    const onBack = vi.fn();
    const onUpdateBook = vi.fn();

    const { unmount } = render(
      <EpubReader book={mockBook} onBack={onBack} onUpdateBook={onUpdateBook} />
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_READING_MODE_FULLSCREEN',
      isFullScreen: true,
    });

    unmount();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_READING_MODE_FULLSCREEN',
      isFullScreen: false,
    });
  });
});
