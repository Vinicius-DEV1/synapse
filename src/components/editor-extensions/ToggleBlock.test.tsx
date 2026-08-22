import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ToggleBlock from './ToggleBlock';

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

  it('toggles open/close state on chevron button click', () => {
    const Component = (ToggleBlock.config.addNodeView as any)();
    const { getByTitle } = render(<Component {...mockProps} />);

    const toggleBtn = getByTitle(/Recolher conteúdo/i);
    expect(toggleBtn).toBeDefined();

    fireEvent.click(toggleBtn);
    expect(mockProps.updateAttributes).toHaveBeenCalledWith({
      isOpen: false,
    });
  });
});
