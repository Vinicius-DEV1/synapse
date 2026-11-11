import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentBundleNodeView from './DocumentBundleNodeView';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('../../ui/Portal', () => ({
  Portal: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./DocumentBundleModal', () => ({
  default: ({ isOpen, initialTitle, onClose }: any) =>
    isOpen ? (
      <div data-testid="bundle-modal-mock">
        <span>Modal Mock: {initialTitle}</span>
        <button onClick={onClose}>Fechar</button>
      </div>
    ) : null,
}));

describe('DocumentBundleNodeView Component', () => {
  const mockNode = {
    attrs: {
      id: 'bundle_1',
      title: 'Apostilas POO',
      color: 'default',
      items: [
        { fileId: 'f1', name: 'aula1.md', fileType: 'text' },
        { fileId: 'f2', name: 'aula2.pdf', fileType: 'pdf' },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bundle title, item count and file extensions', () => {
    render(
      <DocumentBundleNodeView
        node={mockNode}
        deleteNode={vi.fn()}
        updateAttributes={vi.fn()}
      />
    );

    expect(screen.getByText('Apostilas POO')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('.md')).toBeInTheDocument();
    expect(screen.getByText('.pdf')).toBeInTheDocument();
  });

  it('opens DocumentBundleModal when clicking the widget', () => {
    render(
      <DocumentBundleNodeView
        node={mockNode}
        deleteNode={vi.fn()}
        updateAttributes={vi.fn()}
      />
    );

    const widget = screen.getByText('Apostilas POO').closest('div');
    fireEvent.click(widget!);

    expect(screen.getByTestId('bundle-modal-mock')).toBeInTheDocument();
    expect(screen.getByText('Modal Mock: Apostilas POO')).toBeInTheDocument();
  });

  it('allows inline renaming when double clicking the title', () => {
    const updateAttributes = vi.fn();
    render(
      <DocumentBundleNodeView
        node={mockNode}
        deleteNode={vi.fn()}
        updateAttributes={updateAttributes}
      />
    );

    const titleSpan = screen.getByText('Apostilas POO');
    fireEvent.doubleClick(titleSpan);

    const input = screen.getByDisplayValue('Apostilas POO');
    fireEvent.change(input, { target: { value: 'Apostilas Novas' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(updateAttributes).toHaveBeenCalledWith({ title: 'Apostilas Novas' });
  });

  it('opens confirmation modal when clicking the delete button in toolbar and unlinks on choice', () => {
    const deleteNode = vi.fn();
    render(
      <DocumentBundleNodeView
        node={mockNode}
        deleteNode={deleteNode}
        updateAttributes={vi.fn()}
      />
    );

    const deleteBtn = screen.getByTitle('Excluir agrupamento');
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Excluir Agrupamento')).toBeInTheDocument();
    expect(screen.getByText('Apenas desvincular da página')).toBeInTheDocument();
    expect(screen.getByText('Excluir permanentemente de tudo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Apenas desvincular da página'));
    expect(deleteNode).toHaveBeenCalled();
  });
});
