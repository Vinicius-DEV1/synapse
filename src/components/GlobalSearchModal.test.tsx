import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GlobalSearchModal from './GlobalSearchModal';

const mockDispatch = vi.fn();

const mockPages = [
  {
    id: 'root_1',
    parent_id: null,
    title: 'Faculdade',
    icon: '🎓',
    content: '<p>Anotações do curso de computação</p>',
    created_at: new Date(Date.now() - 100000).toISOString(),
    updated_at: new Date(Date.now() - 100000).toISOString(),
    is_pinned: 1,
  },
  {
    id: 'child_1',
    parent_id: 'root_1',
    title: 'Programação Orientada a Objetos',
    icon: '💻',
    content: '<p>Conceitos de herança, polimorfismo e encapsulamento</p>',
    created_at: new Date(Date.now() - 50000).toISOString(),
    updated_at: new Date(Date.now() - 50000).toISOString(),
    is_pinned: 0,
  },
  {
    id: 'child_1_1',
    parent_id: 'child_1',
    title: 'poo',
    icon: '📄',
    content: '<p>Resumo de classes e objetos em TypeScript</p>',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_pinned: 0,
  },
  {
    id: 'root_2',
    parent_id: null,
    title: 'Finanças Pessoais',
    icon: '💰',
    content: '<p>Planejamento de orçamento e investimentos</p>',
    created_at: new Date(Date.now() - 200000).toISOString(),
    updated_at: new Date(Date.now() - 200000).toISOString(),
    is_pinned: 0,
  },
];

vi.mock('../store/useStore', () => ({
  useStore: () => ({
    state: {
      pages: mockPages,
      activePageId: 'child_1_1',
    },
    dispatch: mockDispatch,
  }),
}));

describe('GlobalSearchModal Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockDispatch.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on open-global-search window event and shows recent pages by default', () => {
    render(<GlobalSearchModal />);

    // Inicialmente fechado
    expect(screen.queryByPlaceholderText('Buscar por título, pasta ou conteúdo...')).not.toBeInTheDocument();

    // Dispara evento para abrir o modal
    act(() => {
      window.dispatchEvent(new Event('open-global-search'));
    });

    const searchInput = screen.getByPlaceholderText('Buscar por título, pasta ou conteúdo...');
    expect(searchInput).toBeInTheDocument();

    // Estado inicial deve exibir sugestões recentes e breadcrumbs
    expect(screen.getByText('Páginas Recentes')).toBeInTheDocument();
    expect(screen.getByText('poo')).toBeInTheDocument();
    expect(screen.getAllByText('Faculdade').length).toBeGreaterThanOrEqual(1);
  });

  it('renders breadcrumbs path for nested pages', () => {
    render(<GlobalSearchModal />);

    act(() => {
      window.dispatchEvent(new Event('open-global-search'));
    });

    const searchInput = screen.getByPlaceholderText('Buscar por título, pasta ou conteúdo...');

    // Digita termo de busca
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'poo' } });
      vi.advanceTimersByTime(200);
    });

    // O item 'poo' deve exibir seus ancestrais 'Faculdade' e 'Programação Orientada a Objetos'
    expect(screen.getByText('poo')).toBeInTheDocument();
    expect(screen.getByText('Faculdade')).toBeInTheDocument();
    expect(screen.getByText('Programação Orientada a Objetos')).toBeInTheDocument();
  });

  it('matches subpages when searching by ancestor path or folder name', () => {
    render(<GlobalSearchModal />);

    act(() => {
      window.dispatchEvent(new Event('open-global-search'));
    });

    const searchInput = screen.getByPlaceholderText('Buscar por título, pasta ou conteúdo...');

    // Digita busca combinada de pasta + página
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'faculdade poo' } });
      vi.advanceTimersByTime(200);
    });

    // Deve encontrar 'poo' pelo caminho
    expect(screen.getByText('poo')).toBeInTheDocument();
  });

  it('filters by scope when clicking scope tabs', () => {
    render(<GlobalSearchModal />);

    act(() => {
      window.dispatchEvent(new Event('open-global-search'));
    });

    // Clica no filtro 'Fixadas'
    const pinnedButton = screen.getByRole('button', { name: /Fixadas/i });
    act(() => {
      fireEvent.click(pinnedButton);
    });

    // Apenas a página Faculdade é fixada
    expect(screen.getByText('Páginas Fixadas')).toBeInTheDocument();
    expect(screen.getByText('Faculdade')).toBeInTheDocument();
    expect(screen.queryByText('Finanças Pessoais')).not.toBeInTheDocument();
  });

  it('navigates to page on Enter in current tab', () => {
    render(<GlobalSearchModal />);

    act(() => {
      window.dispatchEvent(new Event('open-global-search'));
    });

    const searchInput = screen.getByPlaceholderText('Buscar por título, pasta ou conteúdo...');
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Finanças' } });
      vi.advanceTimersByTime(200);
    });

    // Pressiona Enter no input/modal
    act(() => {
      fireEvent.keyDown(searchInput, { key: 'Enter' });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'NAVIGATE_IN_TAB',
      pageId: 'root_2',
    });
  });

  it('opens page in new tab on Ctrl+Enter', () => {
    render(<GlobalSearchModal />);

    act(() => {
      window.dispatchEvent(new Event('open-global-search'));
    });

    const searchInput = screen.getByPlaceholderText('Buscar por título, pasta ou conteúdo...');
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Finanças' } });
      vi.advanceTimersByTime(200);
    });

    // Pressiona Ctrl+Enter
    act(() => {
      fireEvent.keyDown(searchInput, { key: 'Enter', ctrlKey: true });
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_TAB',
        tab: expect.objectContaining({
          pageId: 'root_2',
          module: 'notes',
        }),
      })
    );
  });

  it('closes modal on Escape key', () => {
    render(<GlobalSearchModal />);

    act(() => {
      window.dispatchEvent(new Event('open-global-search'));
    });

    expect(screen.getByPlaceholderText('Buscar por título, pasta ou conteúdo...')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(screen.queryByPlaceholderText('Buscar por título, pasta ou conteúdo...')).not.toBeInTheDocument();
  });
});
