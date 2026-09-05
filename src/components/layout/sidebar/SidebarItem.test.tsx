import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SidebarItem from './SidebarItem';
import type { Page } from '../../../types';

const mockDispatch = vi.fn();
vi.mock('../../../store/useStore', () => ({
  getStoreDispatch: () => mockDispatch,
  getStoreState: () => ({
    pages: [],
    expandedNodes: [],
  }),
  useStore: () => ({
    state: { pages: [], expandedNodes: [] },
    dispatch: mockDispatch,
  }),
}));

describe('SidebarItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPage: Page = {
    id: 'page_1',
    parent_id: null,
    title: 'Nota de Teste',
    icon: '📘',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  it('renders page title and icon properly', () => {
    render(
      <SidebarItem
        page={mockPage}
        depth={0}
        activePageId={null}
        onCreatePage={vi.fn()}
        onUpdatePage={vi.fn()}
      />
    );

    expect(screen.getByText('Nota de Teste')).toBeInTheDocument();
    expect(screen.getByText('📘')).toBeInTheDocument();
  });

  it('dispatches navigation action on click', () => {
    render(
      <SidebarItem
        page={mockPage}
        depth={0}
        activePageId={null}
        onCreatePage={vi.fn()}
        onUpdatePage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Nota de Teste'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'NAVIGATE_IN_TAB',
      pageId: 'page_1',
    });
  });

  it('renders children when expanded', () => {
    const childPage: Page = {
      id: 'page_child_1',
      parent_id: 'page_1',
      title: 'Sub-página 1',
      icon: '📄',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    const childrenMap = new Map<string, Page[]>([
      ['page_1', [childPage]],
    ]);

    render(
      <SidebarItem
        page={mockPage}
        depth={0}
        activePageId={null}
        onCreatePage={vi.fn()}
        onUpdatePage={vi.fn()}
        childrenMap={childrenMap}
        isExpanded={true}
      />
    );

    expect(screen.getByText('Sub-página 1')).toBeInTheDocument();
  });
});
