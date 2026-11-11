import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ToggleBlock } from './ToggleBlock';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => (
    <div data-testid="toggle-block-wrapper" className={className}>
      {children}
    </div>
  ),
  NodeViewContent: ({ className }: any) => (
    <div data-testid="toggle-block-content" className={className} />
  ),
  ReactNodeViewRenderer: (component: any) => component,
}));

describe('ToggleBlock Extension & NodeView', () => {
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProps = {
      node: {
        attrs: {
          title: 'Resumo do Capítulo',
          isOpen: true,
        },
      },
      updateAttributes: vi.fn(),
      editor: {
        isEditable: true,
        view: { state: { doc: {} } },
      },
      getPos: () => 10,
    };
  });

  it('renders toggle title input and handles title change', () => {
    const Component = (ToggleBlock.config.addNodeView as any)();
    const { getByDisplayValue } = render(<Component {...mockProps} />);

    const input = getByDisplayValue('Resumo do Capítulo');
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: 'Novo Título do Toggle' } });
    expect(mockProps.updateAttributes).toHaveBeenCalledWith({
      title: 'Novo Título do Toggle',
    });
  });

  it('renders action buttons like convert to page and copy', () => {
    const Component = (ToggleBlock.config.addNodeView as any)();
    const { getByTitle } = render(<Component {...mockProps} />);

    const convertBtn = getByTitle(/Converter em Página/i);
    expect(convertBtn).toBeDefined();

    const copyBtn = getByTitle(/Copiar lista oculta/i);
    expect(copyBtn).toBeDefined();
  });
});
