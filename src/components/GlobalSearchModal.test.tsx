import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GlobalSearchModal from './GlobalSearchModal';

const mockPages = [
  {
    id: 'page_1',
    title: 'Guia de Arquitetura de Software',
    content: '<p>Padrões de microsserviços e mensageria</p>',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'page_2',
    title: 'Finanças Pessoais',
    content: '<p>Planejamento de orçamento e investimentos</p>',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

vi.mock('../store/useStore', () => ({
  useStore: () => ({
    state: {
      pages: mockPages,
      activePageId: 'page_1',
    },
    dispatch: vi.fn(),
  }),
}));

describe('GlobalSearchModal Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on open-global-search window event and filters pages by query', () => {
    render(<GlobalSearchModal />);

    // Inicialmente fechado
    expect(screen.queryByPlaceholderText('Buscar em todas as páginas...')).not.toBeInTheDocument();

    // Dispara evento para abrir o modal
    act(() => {
      window.dispatchEvent(new Event('open-global-search'));
    });

    const searchInput = screen.getByPlaceholderText('Buscar em todas as páginas...');
    expect(searchInput).toBeInTheDocument();

    // Digita termo de busca
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Arquitetura' } });
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Guia de Arquitetura de Software')).toBeInTheDocument();
  });

  it('closes modal on Escape key', () => {
    render(<GlobalSearchModal />);

    act(() => {
      window.dispatchEvent(new Event('open-global-search'));
    });

    expect(screen.getByPlaceholderText('Buscar em todas as páginas...')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(screen.queryByPlaceholderText('Buscar em todas as páginas...')).not.toBeInTheDocument();
  });
});
