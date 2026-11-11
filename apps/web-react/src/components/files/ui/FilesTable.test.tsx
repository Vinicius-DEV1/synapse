import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilesTable } from './FilesTable';
import type { FileItem, FileFolder } from '../../../types';

describe('FilesTable Component', () => {
  const mockFolder: FileFolder = {
    id: 'folder-1',
    name: 'Documentos',
    color: '#3b82f6',
    parent_id: null,
    created_at: new Date().toISOString(),
  };

  const mockFile: FileItem = {
    id: 'file-1',
    name: 'apostila.pdf',
    file_type: 'pdf',
    file_size: 1024 * 1024,
    folder_id: null,
    drive_file_id: 'drive-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const defaultProps = {
    subfolders: [mockFolder],
    files: [mockFile],
    selectedIds: new Set<string>(),
    focusedItemId: null,
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
    onToggleSort: vi.fn(),
    onToggleSelect: vi.fn(),
    onToggleSelectAll: vi.fn(),
    onFocusItem: vi.fn(),
    onOpenFolder: vi.fn(),
    onView: vi.fn(),
    onContextMenu: vi.fn(),
  };

  it('renders table rows for folders and files', () => {
    render(<FilesTable {...defaultProps} />);
    expect(screen.getByText('Documentos')).toBeInTheDocument();
    expect(screen.getByText('apostila.pdf')).toBeInTheDocument();
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('Drive')).toBeInTheDocument();
  });

  it('allows selecting folder via checkbox', () => {
    render(<FilesTable {...defaultProps} />);
    const folderCheckbox = screen.getByTitle('Selecionar pasta Documentos');
    fireEvent.click(folderCheckbox);
    expect(defaultProps.onToggleSelect).toHaveBeenCalledWith('folder-1');
  });

  it('allows selecting file via checkbox', () => {
    render(<FilesTable {...defaultProps} />);
    const fileCheckbox = screen.getByTitle('Selecionar apostila.pdf');
    fireEvent.click(fileCheckbox);
    expect(defaultProps.onToggleSelect).toHaveBeenCalledWith('file-1');
  });
});
