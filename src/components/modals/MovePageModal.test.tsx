import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MovePageModal from './MovePageModal';
import { StoreContext } from '../../store/useStore';
import type { Page } from '../../types';

describe('MovePageModal component', () => {
  const mockPages: Page[] = [
    {
      id: 'root-1',
      title: 'Estudos',
      parent_id: null,
      content: '',
      icon: '📚',
      sort_order: 0,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'sub-1',
      title: 'Inteligência Artificial',
      parent_id: 'root-1',
      content: '',
      icon: '🤖',
      sort_order: 0,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'sub-2',
      title: 'Deep Learning',
      parent_id: 'sub-1',
      content: '',
      icon: '🧠',
      sort_order: 0,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'root-2',
      title: 'Projetos',
      parent_id: null,
      content: '',
      icon: '🚀',
      sort_order: 1,
      created_at: '',
      updated_at: '',
    },
  ];

  const mockState: any = {
    pages: mockPages,
    tabs: [{ id: 'tab-1', pageId: 'sub-2', module: 'notes' }],
    activeTabId: 'tab-1',
    expandedNodes: ['root-1', 'sub-1'],
  };

  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with source page name and breadcrumbs', () => {
    const handleClose = vi.fn();
    const handleMove = vi.fn().mockResolvedValue(undefined);

    render(
      <StoreContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <MovePageModal
          isOpen={true}
          pageId="sub-2"
          onClose={handleClose}
          onMovePage={handleMove}
        />
      </StoreContext.Provider>
    );

    expect(screen.getByText(/Mover “Deep Learning”/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Estudos > Inteligência Artificial/i).length).toBeGreaterThan(0);
  });

  it('filters destinations in real time when searching', () => {
    const handleClose = vi.fn();
    const handleMove = vi.fn().mockResolvedValue(undefined);

    render(
      <StoreContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <MovePageModal
          isOpen={true}
          pageId="sub-2"
          onClose={handleClose}
          onMovePage={handleMove}
        />
      </StoreContext.Provider>
    );

    const input = screen.getByPlaceholderText(/Buscar página de destino/i);
    fireEvent.change(input, { target: { value: 'Projetos' } });

    expect(screen.getAllByText('Projetos').length).toBeGreaterThan(0);
  });

  it('allows moving page to a new parent', async () => {
    const handleClose = vi.fn();
    const handleMove = vi.fn().mockResolvedValue(undefined);

    render(
      <StoreContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <MovePageModal
          isOpen={true}
          pageId="sub-2"
          onClose={handleClose}
          onMovePage={handleMove}
        />
      </StoreContext.Provider>
    );

    // Click on "Projetos"
    const projetosOption = screen.getAllByText('Projetos')[0];
    fireEvent.click(projetosOption);

    // Click "Mover Aqui" button
    const submitBtn = screen.getByRole('button', { name: /Mover Aqui/i });
    fireEvent.click(submitBtn);

    expect(handleMove).toHaveBeenCalledWith('sub-2', 'root-2');
  });

  it('allows moving page to root', async () => {
    const handleClose = vi.fn();
    const handleMove = vi.fn().mockResolvedValue(undefined);

    render(
      <StoreContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <MovePageModal
          isOpen={true}
          pageId="sub-2"
          onClose={handleClose}
          onMovePage={handleMove}
        />
      </StoreContext.Provider>
    );

    // Click on "Raiz"
    const raizOption = screen.getByText('Raiz');
    fireEvent.click(raizOption);

    const submitBtn = screen.getByRole('button', { name: /Mover Aqui/i });
    fireEvent.click(submitBtn);

    expect(handleMove).toHaveBeenCalledWith('sub-2', null);
  });
});
