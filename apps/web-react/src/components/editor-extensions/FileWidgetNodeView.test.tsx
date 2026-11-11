import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FileWidgetNodeView from './FileWidgetNodeView';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('../../store/useStore', () => ({
  getStoreState: () => ({ activeTabId: 'tab_1' }),
  getStoreDispatch: () => vi.fn(),
  useStore: () => ({
    state: { activeTabId: 'tab_1' },
    dispatch: vi.fn(),
  }),
}));

describe('FileWidgetNodeView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      files: {
        getById: vi.fn().mockResolvedValue({
          id: 'file_1',
          name: 'Relatorio_Final.pdf',
          file_type: 'pdf',
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
  });

  it('renders file name and appropriate styling when file exists', async () => {
    render(
      <FileWidgetNodeView
        node={{
          attrs: {
            fileId: 'file_1',
            name: 'Relatorio_Final.pdf',
            fileType: 'pdf',
            isLink: false,
          },
        }}
        deleteNode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Relatorio_Final.pdf')).toBeInTheDocument();
    });
  });

  it('renders deleted state in red with (Excluído) when file is not found', async () => {
    (window as any).api.files.getById = vi.fn().mockResolvedValue(null);

    render(
      <FileWidgetNodeView
        node={{
          attrs: {
            fileId: 'file_deleted',
            name: 'Documento_Apagado.docx',
            fileType: 'document',
            isLink: false,
          },
        }}
        deleteNode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Documento_Apagado.docx (Excluído)')).toBeInTheDocument();
    });
  });

  it('shows deleted notice modal on click when file is deleted and allows deleting widget', async () => {
    (window as any).api.files.getById = vi.fn().mockResolvedValue(null);
    const deleteNodeMock = vi.fn();

    render(
      <FileWidgetNodeView
        node={{
          attrs: {
            fileId: 'file_deleted',
            name: 'Documento_Apagado.docx',
            fileType: 'document',
            isLink: false,
          },
        }}
        deleteNode={deleteNodeMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Documento_Apagado.docx (Excluído)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Documento_Apagado.docx (Excluído)'));

    expect(screen.getByText('Arquivo Excluído')).toBeInTheDocument();
    expect(screen.getByText('Remover Widget')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Remover Widget'));
    expect(deleteNodeMock).toHaveBeenCalledTimes(1);
  });

  it('allows cancelling / keeping the widget in deleted notice modal', async () => {
    (window as any).api.files.getById = vi.fn().mockResolvedValue(null);
    const deleteNodeMock = vi.fn();

    render(
      <FileWidgetNodeView
        node={{
          attrs: {
            fileId: 'file_deleted',
            name: 'Documento_Apagado.docx',
            fileType: 'document',
            isLink: false,
          },
        }}
        deleteNode={deleteNodeMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Documento_Apagado.docx (Excluído)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Documento_Apagado.docx (Excluído)'));
    expect(screen.getByText('Manter')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Manter'));
    expect(deleteNodeMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Arquivo Excluído')).toBeNull();
  });

  it('recovers to normal when file is restored and sync event is triggered', async () => {
    (window as any).api.files.getById = vi.fn().mockResolvedValue(null);

    render(
      <FileWidgetNodeView
        node={{
          attrs: {
            fileId: 'file_1',
            name: 'Relatorio_Final.pdf',
            fileType: 'pdf',
            isLink: false,
          },
        }}
        deleteNode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Relatorio_Final.pdf (Excluído)')).toBeInTheDocument();
    });

    // Now simulate file restore in DB
    (window as any).api.files.getById = vi.fn().mockResolvedValue({
      id: 'file_1',
      name: 'Relatorio_Final.pdf',
      file_type: 'pdf',
    });

    act(() => {
      window.dispatchEvent(new Event('app-sync-trigger'));
    });

    await waitFor(() => {
      expect(screen.getByText('Relatorio_Final.pdf')).toBeInTheDocument();
      expect(screen.queryByText('Relatorio_Final.pdf (Excluído)')).toBeNull();
    });
  });

  it('allows renaming the file in-widget and updates DB, node attributes, and dispatches event', async () => {
    const updateAttributesMock = vi.fn();
    const eventListener = vi.fn();
    window.addEventListener('caderno-file-updated', eventListener);

    render(
      <FileWidgetNodeView
        node={{
          attrs: {
            fileId: 'file_1',
            name: 'Relatorio_Final.pdf',
            fileType: 'pdf',
            isLink: false,
          },
        }}
        updateAttributes={updateAttributesMock}
        deleteNode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Relatorio_Final.pdf')).toBeInTheDocument();
    });

    // Double click file name to start renaming
    fireEvent.doubleClick(screen.getByText('Relatorio_Final.pdf'));

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Relatorio_Final.pdf');

    // Change value
    fireEvent.change(input, { target: { value: 'Relatorio_Atualizado.pdf' } });

    // Press Enter to save
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect((window as any).api.files.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'file_1',
          name: 'Relatorio_Atualizado.pdf',
        })
      );
      expect(updateAttributesMock).toHaveBeenCalledWith({ name: 'Relatorio_Atualizado.pdf' });
      expect(eventListener).toHaveBeenCalled();
    });

    window.removeEventListener('caderno-file-updated', eventListener);
  });

  it('allows cancelling renaming with Escape key', async () => {
    const updateAttributesMock = vi.fn();

    render(
      <FileWidgetNodeView
        node={{
          attrs: {
            fileId: 'file_1',
            name: 'Relatorio_Final.pdf',
            fileType: 'pdf',
            isLink: false,
          },
        }}
        updateAttributes={updateAttributesMock}
        deleteNode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Relatorio_Final.pdf')).toBeInTheDocument();
    });

    // Start renaming via pencil button
    const renameButton = screen.getByTitle('Renomear arquivo');
    fireEvent.click(renameButton);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Nao_Salvo.pdf' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Relatorio_Final.pdf')).toBeInTheDocument();
    expect(updateAttributesMock).not.toHaveBeenCalled();
    expect((window as any).api.files.update).not.toHaveBeenCalled();
  });
});

