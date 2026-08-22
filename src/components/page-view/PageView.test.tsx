import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import PageView from './PageView';
import type { Page } from '../../types';

vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    state: { pages: [], expandedNodes: [] },
    dispatch: vi.fn(),
  }),
}));

vi.mock('../Editor', () => ({
  default: ({ initialContent }: any) => <div data-testid="editor-mock">{initialContent}</div>,
}));

vi.mock('./PageCover', () => ({
  PageCover: () => <div data-testid="page-cover" />,
}));

vi.mock('./PageHeader', () => ({
  PageHeader: () => <div data-testid="page-header" />,
}));

describe('PageView Component', () => {
  const dummyProps = {
    onUpdateContent: vi.fn().mockResolvedValue(undefined),
    onCreatePage: vi.fn().mockResolvedValue(undefined),
    onCreateLinkedPage: vi.fn().mockResolvedValue('page_new'),
    onUpdatePage: vi.fn().mockResolvedValue(undefined),
  };

  const mockPage: Page = {
    id: 'page_123',
    title: 'Página Teste',
    icon: '📄',
    parent_id: null,
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    is_pinned: 0,
    is_locked: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      getPageContent: vi.fn().mockResolvedValue({
        content: '<p>Conteúdo da página</p>',
        encrypted_content: null,
      }),
    };
  });

  it('renders EmptyState when page is null', () => {
    render(<PageView page={null} {...dummyProps} />);
    expect(screen.getByText(/Seu caderno está vazio/i)).toBeDefined();
  });

  it('loads page content and renders Editor', async () => {
    render(<PageView page={mockPage} {...dummyProps} />);

    await waitFor(() => {
      expect((window as any).api.getPageContent).toHaveBeenCalledWith('page_123');
      expect(screen.getByTestId('editor-mock')).toBeDefined();
      expect(screen.getByText('<p>Conteúdo da página</p>')).toBeDefined();
    });
  });

  it('re-fetches content on window focus/visibilitychange', async () => {
    render(<PageView page={mockPage} {...dummyProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('editor-mock')).toBeDefined();
    });

    (window as any).api.getPageContent.mockResolvedValueOnce({
      content: '<p>Conteúdo atualizado de outra aba</p>',
      encrypted_content: null,
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect((window as any).api.getPageContent).toHaveBeenCalledTimes(2);
    });
  });
});
