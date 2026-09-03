import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FileViewer from './FileViewer';
import type { FileItem } from '../../types';
import * as fileFetcher from '../../utils/file-fetcher';
import * as downloadUtils from './viewer/utils/documentDownloadUtils';

vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    state: {
      moduleKeys: {},
    },
  }),
}));

vi.mock('../../utils/file-fetcher', () => ({
  getDecryptedFileUrl: vi.fn(),
}));

vi.mock('./viewer/utils/documentDownloadUtils', () => ({
  downloadDocumentFile: vi.fn().mockResolvedValue({ success: true }),
}));

describe('FileViewer Component', () => {
  const baseMockItem: FileItem = {
    id: 'f1',
    name: 'document.txt',
    file_type: 'text',
    file_size: 1024,
    local_path: '/path/to/doc.txt',
    drive_file_id: null,
    folder_id: null,
    mime_type: 'text/plain',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  };

  const mdMockItem: FileItem = {
    ...baseMockItem,
    id: 'f2',
    name: 'notes.md',
    file_type: 'text',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders text file preview with controls', async () => {
    vi.mocked(fileFetcher.getDecryptedFileUrl).mockResolvedValue('blob:http://localhost/test-blob');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('Hello world text content'),
    } as any);

    render(<FileViewer item={baseMockItem} onClose={() => {}} />);
    expect(screen.getByText('document.txt')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Hello world text content')).toBeInTheDocument();
    });
  });

  it('renders image preview for image items', async () => {
    vi.mocked(fileFetcher.getDecryptedFileUrl).mockResolvedValue('blob:http://localhost/test-image');
    const imageItem: FileItem = {
      ...baseMockItem,
      id: 'img1',
      name: 'photo.png',
      file_type: 'image',
      mime_type: 'image/png',
    };

    render(<FileViewer item={imageItem} onClose={() => {}} />);
    expect(screen.getByText('photo.png')).toBeInTheDocument();

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'blob:http://localhost/test-image');
      expect(img).toHaveAttribute('alt', 'photo.png');
    });
  });

  it('renders PDF iframe for PDF items', async () => {
    vi.mocked(fileFetcher.getDecryptedFileUrl).mockResolvedValue('blob:http://localhost/test-pdf');
    const pdfItem: FileItem = {
      ...baseMockItem,
      id: 'pdf1',
      name: 'manual.pdf',
      file_type: 'pdf',
      mime_type: 'application/pdf',
    };

    render(<FileViewer item={pdfItem} onClose={() => {}} />);
    expect(screen.getByText('manual.pdf')).toBeInTheDocument();

    await waitFor(() => {
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'blob:http://localhost/test-pdf');
    });
  });

  it('renders fallback error message when file resolution fails', async () => {
    vi.mocked(fileFetcher.getDecryptedFileUrl).mockResolvedValue(null);

    render(<FileViewer item={baseMockItem} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar o arquivo')).toBeInTheDocument();
    });
  });

  it('renders AI button and edit pencil button for markdown files', async () => {
    vi.mocked(fileFetcher.getDecryptedFileUrl).mockResolvedValue('blob:http://localhost/test-md');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Markdown Content'),
    } as any);

    render(<FileViewer item={mdMockItem} onClose={() => {}} />);

    await waitFor(() => {
      const aiBtn = screen.getByTitle(/Assistente de IA para este documento/i);
      expect(aiBtn).toBeInTheDocument();

      const editBtn = screen.getByTitle(/Editar documento \(Markdown\)/i);
      expect(editBtn).toBeInTheDocument();
    });

    // Click edit pencil button to switch to editor
    const editBtn = screen.getByTitle(/Editar documento \(Markdown\)/i);
    fireEvent.click(editBtn);

    expect(screen.getByPlaceholderText(/Digite ou edite o conteúdo em Markdown aqui/i)).toBeInTheDocument();
  });

  it('triggers downloadDocumentFile when clicking download button', async () => {
    vi.mocked(fileFetcher.getDecryptedFileUrl).mockResolvedValue('blob:http://localhost/test-blob');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('File text'),
    } as any);

    render(<FileViewer item={baseMockItem} onClose={() => {}} />);

    await waitFor(() => {
      const downloadBtn = screen.getByTitle('Download');
      expect(downloadBtn).toBeInTheDocument();
      fireEvent.click(downloadBtn);
    });

    expect(downloadUtils.downloadDocumentFile).toHaveBeenCalledWith('blob:http://localhost/test-blob', 'document.txt');
  });
});
