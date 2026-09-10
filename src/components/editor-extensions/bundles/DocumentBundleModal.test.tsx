import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DocumentBundleModal from './DocumentBundleModal';
import type { BundledFileItem } from './types';

vi.mock('../../ui/Portal', () => ({
  Portal: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../files/FileViewer', () => ({
  default: ({ item, onClose }: any) => (
    <div data-testid="file-viewer-mock">
      <span>Mock Viewer: {item?.name}</span>
      <button onClick={onClose}>Fechar Viewer</button>
    </div>
  ),
}));

describe('DocumentBundleModal Component', () => {
  const mockItems: BundledFileItem[] = [
    { fileId: 'f1', name: '01_intro.md', fileType: 'text', fileSize: 1024 },
    { fileId: 'f2', name: '02_design.pdf', fileType: 'pdf', fileSize: 2048 },
  ];

  const mockEditor: any = {
    commands: {
      removeFromDocumentBundle: vi.fn(),
      ungroupDocumentBundle: vi.fn(),
    },
    state: {
      doc: {
        descendants: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with title and list of bundled files', () => {
    render(
      <DocumentBundleModal
        isOpen={true}
        onClose={vi.fn()}
        editor={mockEditor}
        getPos={() => 10}
        bundleId="bundle_1"
        initialTitle="Módulo 1 - POO"
        initialItems={mockItems}
        onUpdateBundle={vi.fn()}
      />
    );

    expect(screen.getByText('Módulo 1 - POO')).toBeInTheDocument();
    expect(screen.getByText('01_intro.md')).toBeInTheDocument();
    expect(screen.getByText('02_design.pdf')).toBeInTheDocument();
    expect(screen.getByText('(2 arquivos)')).toBeInTheDocument();
  });

  it('allows renaming the bundle title', () => {
    const onUpdateBundle = vi.fn();
    render(
      <DocumentBundleModal
        isOpen={true}
        onClose={vi.fn()}
        editor={mockEditor}
        getPos={() => 10}
        bundleId="bundle_1"
        initialTitle="Módulo 1"
        initialItems={mockItems}
        onUpdateBundle={onUpdateBundle}
      />
    );

    const titleHeader = screen.getByText('Módulo 1');
    fireEvent.doubleClick(titleHeader);

    const input = screen.getByDisplayValue('Módulo 1');
    fireEvent.change(input, { target: { value: 'Módulo 1 - Atualizado' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onUpdateBundle).toHaveBeenCalledWith('Módulo 1 - Atualizado', mockItems);
  });

  it('reorders items when clicking move down/up buttons', () => {
    const onUpdateBundle = vi.fn();
    render(
      <DocumentBundleModal
        isOpen={true}
        onClose={vi.fn()}
        editor={mockEditor}
        getPos={() => 10}
        bundleId="bundle_1"
        initialTitle="Módulo 1"
        initialItems={mockItems}
        onUpdateBundle={onUpdateBundle}
      />
    );

    const moveDownButtons = screen.getAllByTitle('Mover para baixo');
    fireEvent.click(moveDownButtons[0]);

    expect(onUpdateBundle).toHaveBeenCalledWith('Módulo 1', [
      mockItems[1],
      mockItems[0],
    ]);
  });

  it('calls ungroupDocumentBundle when clicking Desagrupar Todos', () => {
    const onClose = vi.fn();
    render(
      <DocumentBundleModal
        isOpen={true}
        onClose={onClose}
        editor={mockEditor}
        getPos={() => 10}
        bundleId="bundle_1"
        initialTitle="Módulo 1"
        initialItems={mockItems}
        onUpdateBundle={vi.fn()}
      />
    );

    const ungroupAllBtn = screen.getByText('Desagrupar Todos na Página');
    fireEvent.click(ungroupAllBtn);

    expect(mockEditor.commands.ungroupDocumentBundle).toHaveBeenCalledWith(10);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls removeFromDocumentBundle with insertLoose=true when ungrouping a single item', () => {
    const onClose = vi.fn();
    render(
      <DocumentBundleModal
        isOpen={true}
        onClose={onClose}
        editor={mockEditor}
        getPos={() => 10}
        bundleId="bundle_1"
        initialTitle="Módulo 1"
        initialItems={mockItems}
        onUpdateBundle={vi.fn()}
      />
    );

    const ungroupButtons = screen.getAllByTitle('Desagrupar para a página');
    fireEvent.click(ungroupButtons[0]);

    expect(mockEditor.commands.removeFromDocumentBundle).toHaveBeenCalledWith(10, 'f1', true);
    expect(onClose).toHaveBeenCalled();
  });

  it('opens confirmation modal when clicking remove file and removes from group on confirm', () => {
    const onUpdateBundle = vi.fn();
    render(
      <DocumentBundleModal
        isOpen={true}
        onClose={vi.fn()}
        editor={mockEditor}
        getPos={() => 10}
        bundleId="bundle_1"
        initialTitle="Módulo 1"
        initialItems={mockItems}
        onUpdateBundle={onUpdateBundle}
      />
    );

    const deleteButtons = screen.getAllByTitle('Remover do agrupamento');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Remover Arquivo')).toBeInTheDocument();
    expect(screen.getByText('Apenas desvincular do grupo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Apenas desvincular do grupo'));

    expect(onUpdateBundle).toHaveBeenCalledWith('Módulo 1', [mockItems[1]]);
    expect(mockEditor.commands.removeFromDocumentBundle).toHaveBeenCalledWith(10, 'f1', false);
  });
});
