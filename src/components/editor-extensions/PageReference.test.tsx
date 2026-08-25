import { createContext } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { PageReference } from './PageReference';

vi.mock('../../store/useStore', () => ({
  StoreContext: createContext(null),
  getStoreState: vi.fn(() => ({
    pages: [{ id: 'p1', title: 'Página de Destino' }],
  })),
}));

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => (
    <span data-testid="page-ref-wrapper" className={className}>
      {children}
    </span>
  ),
  ReactNodeViewRenderer: (component: any) => component,
}));

describe('PageReference Extension & NodeView', () => {
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProps = {
      node: {
        attrs: {
          pageId: 'p1',
          title: 'Página de Destino',
        },
      },
      deleteNode: vi.fn(),
    };
  });

  it('renders page link and emits open-floating-page on click', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const Component = (PageReference.config.addNodeView as any)();

    const { getByText } = render(<Component {...mockProps} />);

    expect(getByText('Página de Destino')).toBeDefined();

    const link = getByText('Página de Destino');
    fireEvent.click(link);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'open-floating-page',
        detail: { pageId: 'p1' },
      })
    );
  });

  it('renders deleted state in red with (Excluída) when page is not found in store', () => {
    const Component = (PageReference.config.addNodeView as any)();
    const deletedProps = {
      node: {
        attrs: {
          pageId: 'non-existent-page',
          title: 'Página Que Não Existe Mais',
        },
      },
      deleteNode: vi.fn(),
    };

    const { getByText } = render(<Component {...deletedProps} />);
    expect(getByText('Página Que Não Existe Mais (Excluída)')).toBeDefined();
  });

  it('shows deleted notice modal on click when page is deleted and allows deleting widget', () => {
    const Component = (PageReference.config.addNodeView as any)();
    const deleteNodeMock = vi.fn();
    const deletedProps = {
      node: {
        attrs: {
          pageId: 'non-existent-page',
          title: 'Página Apagada',
        },
      },
      deleteNode: deleteNodeMock,
    };

    const { getByText, queryByText } = render(<Component {...deletedProps} />);
    const widget = getByText('Página Apagada (Excluída)');
    
    // Clicking the widget should show the modal
    fireEvent.click(widget);
    expect(getByText('Página Excluída')).toBeDefined();
    expect(getByText('Remover Widget')).toBeDefined();

    // Clicking Remover Widget should call deleteNode
    fireEvent.click(getByText('Remover Widget'));
    expect(deleteNodeMock).toHaveBeenCalledTimes(1);
  });

  it('allows cancelling / keeping the widget in deleted notice modal', () => {
    const Component = (PageReference.config.addNodeView as any)();
    const deleteNodeMock = vi.fn();
    const deletedProps = {
      node: {
        attrs: {
          pageId: 'non-existent-page',
          title: 'Página Apagada',
        },
      },
      deleteNode: deleteNodeMock,
    };

    const { getByText, queryByText } = render(<Component {...deletedProps} />);
    fireEvent.click(getByText('Página Apagada (Excluída)'));
    expect(getByText('Manter')).toBeDefined();

    fireEvent.click(getByText('Manter'));
    expect(deleteNodeMock).not.toHaveBeenCalled();
    expect(queryByText('Página Excluída')).toBeNull();
  });
});

