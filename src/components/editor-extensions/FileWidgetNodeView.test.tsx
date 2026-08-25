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
});

