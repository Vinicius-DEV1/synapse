import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUploadModal from './FileUploadModal';

vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    state: {
      moduleKeys: {
        files: 'test-master-key',
      },
    },
  }),
}));

vi.mock('../../services/drive', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue(null),
  uploadToDrive: vi.fn().mockResolvedValue('drive_123'),
}));

vi.mock('../../services/storage', () => ({
  encryptFile: vi.fn().mockImplementation((buf) => Promise.resolve(buf)),
}));

describe('FileUploadModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      files: {
        saveLocal: vi.fn().mockResolvedValue('/local/path/test.pdf'),
        create: vi.fn().mockImplementation((rec) => Promise.resolve(rec)),
      },
    };
  });

  it('renders initial empty dropzone state correctly', async () => {
    await waitFor(() => {
      render(<FileUploadModal onClose={vi.fn()} />);
    });
    expect(screen.getByText('Enviar Arquivo(s)')).toBeInTheDocument();
    expect(screen.getByText('Clique ou arraste arquivo(s)')).toBeInTheDocument();
  });

  it('handles drag-and-drop of files into the dropzone', async () => {
    render(<FileUploadModal onClose={vi.fn()} />);

    const dropZoneText = screen.getByText('Clique ou arraste arquivo(s)');
    const dropZone = dropZoneText.closest('div')!;

    const testFile = new File(['dummy content'], 'meu_documento.pdf', {
      type: 'application/pdf',
    });

    // Fire dragover
    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [testFile] },
    });

    expect(screen.getByText('Solte os arquivos aqui')).toBeInTheDocument();

    // Fire drop
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [testFile] },
    });

    await waitFor(() => {
      expect(screen.getByText('meu_documento.pdf')).toBeInTheDocument();
    });
  });

  it('appends files when dropping additional files onto the list', async () => {
    const file1 = new File(['content 1'], 'file1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content 2'], 'file2.png', { type: 'image/png' });

    render(<FileUploadModal onClose={vi.fn()} initialFiles={[file1]} />);

    expect(screen.getByText('file1.pdf')).toBeInTheDocument();

    const addMoreZone = screen.getByText('+ Adicionar mais arquivos (ou arraste aqui)').closest('div')!;

    fireEvent.drop(addMoreZone, {
      dataTransfer: { files: [file2] },
    });

    await waitFor(() => {
      expect(screen.getByText('file1.pdf')).toBeInTheDocument();
      expect(screen.getByText('file2.png')).toBeInTheDocument();
    });
  });

  it('calls onClose when clicking Cancelar', () => {
    const onCloseMock = vi.fn();
    render(<FileUploadModal onClose={onCloseMock} />);

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
