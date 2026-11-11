import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StorageFilesModal from './StorageFilesModal';
import { HardDrive } from 'lucide-react';
import { I18nProvider } from '../../../i18n';
import type { DriveFile } from '../../../services/drive';

describe('StorageFilesModal Component', () => {
  const mockFiles: DriveFile[] = [
    {
      id: 'file-1',
      name: 'algebra_linear.pdf',
      size: '2048000',
      createdTime: '2026-01-01T10:00:00Z',
      mimeType: 'application/pdf',
    },
    {
      id: 'file-2',
      name: 'calculo_avancado.pdf',
      size: '1024000',
      createdTime: '2026-01-02T12:00:00Z',
      mimeType: 'application/pdf',
    },
  ];

  it('renders files list and module name', () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <StorageFilesModal
          isOpen={true}
          onClose={vi.fn()}
          moduleName="Biblioteca"
          icon={HardDrive}
          color="text-blue-400"
          bg="bg-blue-500/20"
          files={mockFiles}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Biblioteca')).toBeInTheDocument();
    expect(screen.getByText('algebra_linear.pdf')).toBeInTheDocument();
    expect(screen.getByText('calculo_avancado.pdf')).toBeInTheDocument();
  });

  it('filters files when search term is typed', () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <StorageFilesModal
          isOpen={true}
          onClose={vi.fn()}
          moduleName="Biblioteca"
          icon={HardDrive}
          color="text-blue-400"
          bg="bg-blue-500/20"
          files={mockFiles}
        />
      </I18nProvider>
    );

    const input = screen.getByPlaceholderText(/Buscar arquivos/i);
    fireEvent.change(input, { target: { value: 'algebra' } });

    expect(screen.getByText('algebra_linear.pdf')).toBeInTheDocument();
    expect(screen.queryByText('calculo_avancado.pdf')).not.toBeInTheDocument();
  });

  it('calls onClose on Escape key', () => {
    const handleClose = vi.fn();
    render(
      <I18nProvider initialLanguage="pt-BR">
        <StorageFilesModal
          isOpen={true}
          onClose={handleClose}
          moduleName="Biblioteca"
          icon={HardDrive}
          color="text-blue-400"
          bg="bg-blue-500/20"
          files={mockFiles}
        />
      </I18nProvider>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on caderno-back-press event', () => {
    const handleClose = vi.fn();
    render(
      <I18nProvider initialLanguage="pt-BR">
        <StorageFilesModal
          isOpen={true}
          onClose={handleClose}
          moduleName="Biblioteca"
          icon={HardDrive}
          color="text-blue-400"
          bg="bg-blue-500/20"
          files={mockFiles}
        />
      </I18nProvider>
    );

    window.dispatchEvent(new CustomEvent('caderno-back-press'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
