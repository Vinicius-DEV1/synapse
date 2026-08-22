import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubPageGrid from './SubPageGrid';
import { useStore } from '../../../store/useStore';
import type { Page } from '../../../types';

vi.mock('../../../store/useStore', () => ({
  useStore: vi.fn(),
}));

describe('SubPageGrid Component', () => {
  const mockDispatch = vi.fn();
  const mockPages: Page[] = [
    {
      id: 'sub-1',
      title: 'Sub-página 1',
      icon: '📄',
      parent_id: 'root-1',
      created_at: 100,
      updated_at: 100,
      is_locked: false,
    },
    {
      id: 'sub-2',
      title: 'Sub-página 2',
      icon: '🚀',
      parent_id: 'root-1',
      created_at: 100,
      updated_at: 100,
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

  it('renders subpage items and add button', () => {
    const onNavigate = vi.fn();
    const onCreatePage = vi.fn();
    const onUpdatePage = vi.fn();

    render(
      <SubPageGrid
        pages={mockPages}
        onNavigate={onNavigate}
        onCreatePage={onCreatePage}
        onUpdatePage={onUpdatePage}
      />
    );

    expect(screen.getByText('Sub-página 1')).toBeDefined();
    expect(screen.getByText('Sub-página 2')).toBeDefined();
    expect(screen.getByText('Nova Sub-página')).toBeDefined();
  });

  it('navigates when clicking on a subpage title', () => {
    const onNavigate = vi.fn();
    const onCreatePage = vi.fn();
    const onUpdatePage = vi.fn();

    render(
      <SubPageGrid
        pages={mockPages}
        onNavigate={onNavigate}
        onCreatePage={onCreatePage}
        onUpdatePage={onUpdatePage}
      />
    );

    fireEvent.click(screen.getByText('Sub-página 1'));
    expect(onNavigate).toHaveBeenCalledWith('sub-1');
  });

  it('dispatches SHOW_CONTEXT_MENU when right-clicking a subpage card', () => {
    const onNavigate = vi.fn();
    const onCreatePage = vi.fn();
    const onUpdatePage = vi.fn();

    render(
      <SubPageGrid
        pages={mockPages}
        onNavigate={onNavigate}
        onCreatePage={onCreatePage}
        onUpdatePage={onUpdatePage}
      />
    );

    const card = screen.getByText('Sub-página 1').closest('div');
    expect(card).toBeDefined();

    fireEvent.contextMenu(card!, {
      clientX: 250,
      clientY: 300,
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SHOW_CONTEXT_MENU',
      x: 250,
      y: 300,
      pageId: 'sub-1',
    });
  });

  it('dispatches ADD_TAB when middle-clicking a subpage card', () => {
    const onNavigate = vi.fn();
    const onCreatePage = vi.fn();
    const onUpdatePage = vi.fn();

    render(
      <SubPageGrid
        pages={mockPages}
        onNavigate={onNavigate}
        onCreatePage={onCreatePage}
        onUpdatePage={onUpdatePage}
      />
    );

    const card = screen.getByText('Sub-página 2').closest('div');
    expect(card).toBeDefined();

    fireEvent(card!, new MouseEvent('auxclick', {
      button: 1, // Middle click
      bubbles: true,
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_TAB',
        tab: expect.objectContaining({
          module: 'notes',
          pageId: 'sub-2',
        }),
      })
    );
  });
});
