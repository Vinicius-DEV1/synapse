import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import PageReference from './PageReference';

vi.mock('../../store/useStore', () => ({
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

  it('updates title in real time when caderno-page-updated is received', () => {
    const Component = (PageReference.config.addNodeView as any)();
    const { getByText } = render(<Component {...mockProps} />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('caderno-page-updated', {
          detail: { id: 'p1', title: 'Título Renomeado da Página' },
        })
      );
    });

    expect(getByText('Título Renomeado da Página')).toBeDefined();
  });
});
