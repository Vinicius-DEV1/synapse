import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageHeader } from './PageHeader';
import { useStore } from '../../store/useStore';
import type { Page } from '../../types';

vi.mock('../../store/useStore', () => ({
  useStore: vi.fn(),
}));

describe('PageHeader Component', () => {
  const mockDispatch = vi.fn();
  const mockPages: Page[] = [
    {
      id: 'root-1',
      title: 'Página Raiz',
      icon: '📁',
      parent_id: null,
      created_at: 100,
      updated_at: 100,
      sort_order: 0,
      is_locked: false,
    },
    {
      id: 'sub-1',
      title: 'Primeira Filha',
      icon: '📄',
      parent_id: 'root-1',
      created_at: 100,
      updated_at: 100,
      sort_order: 0,
      is_locked: false,
    },
    {
      id: 'sub-2',
      title: 'Segunda Filha',
      icon: '📄',
      parent_id: 'root-1',
      created_at: 100,
      updated_at: 100,
      sort_order: 1,
      is_locked: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue({
      state: {
        pages: mockPages,
      },
      dispatch: mockDispatch,
    });
  });

  it('renders breadcrumbs and triggers context menu on right-click', () => {
    const onUpdatePage = vi.fn();
    const onShowHistory = vi.fn();

    render(
      <PageHeader
        page={mockPages[1]}
        onUpdatePage={onUpdatePage}
        onShowHistory={onShowHistory}
      />
    );

    const rootCrumb = screen.getByText('📁 Página Raiz');
    expect(rootCrumb).toBeDefined();

    fireEvent.contextMenu(rootCrumb, {
      clientX: 120,
      clientY: 180,
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SHOW_CONTEXT_MENU',
      x: 120,
      y: 180,
      pageId: 'root-1',
    });
  });

  it('dispatches ADD_TAB when middle-clicking a breadcrumb', () => {
    const onUpdatePage = vi.fn();
    const onShowHistory = vi.fn();

    render(
      <PageHeader
        page={mockPages[1]}
        onUpdatePage={onUpdatePage}
        onShowHistory={onShowHistory}
      />
    );

    const rootCrumb = screen.getByText('📁 Página Raiz');
    fireEvent(rootCrumb, new MouseEvent('auxclick', {
      button: 1, // Middle click
      bubbles: true,
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_TAB',
        tab: expect.objectContaining({
          module: 'notes',
          pageId: 'root-1',
        }),
      })
    );
  });

  it('navigates to previous sibling page when clicking the previous arrow', () => {
    const onUpdatePage = vi.fn();
    const onShowHistory = vi.fn();

    render(
      <PageHeader
        page={mockPages[2]}
        onUpdatePage={onUpdatePage}
        onShowHistory={onShowHistory}
      />
    );

    const prevButton = screen.getByLabelText('Página anterior');
    const nextButton = screen.getByLabelText('Próxima página');

    expect(prevButton).not.toBeDisabled();
    expect(prevButton.getAttribute('title')).toContain('Primeira Filha');

    expect(nextButton).toBeDisabled();
    expect(nextButton.getAttribute('title')).toBe('Última página desta pasta');

    fireEvent.click(prevButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'NAVIGATE_IN_TAB',
      pageId: 'sub-1',
    });
  });

  it('disables previous arrow when on the first child of folder and next arrow navigates to next sibling', () => {
    const onUpdatePage = vi.fn();
    const onShowHistory = vi.fn();

    render(
      <PageHeader
        page={mockPages[1]}
        onUpdatePage={onUpdatePage}
        onShowHistory={onShowHistory}
      />
    );

    const prevButton = screen.getByLabelText('Página anterior');
    const nextButton = screen.getByLabelText('Próxima página');

    expect(prevButton).toBeDisabled();
    expect(prevButton.getAttribute('title')).toBe('Primeira página desta pasta');

    expect(nextButton).not.toBeDisabled();
    expect(nextButton.getAttribute('title')).toContain('Segunda Filha');

    fireEvent.click(nextButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'NAVIGATE_IN_TAB',
      pageId: 'sub-2',
    });
  });
});
