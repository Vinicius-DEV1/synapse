import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FileFolder, FileItem } from '../../../types';
import { useFilesClipboard } from './useFilesClipboard';

describe('useFilesClipboard hook', () => {
  const mockFolders: FileFolder[] = [
    { id: 'f1', name: 'Documentos', parent_id: null, color: '#3b82f6' },
  ];

  const mockFiles: FileItem[] = [
    {
      id: 'doc1',
      name: 'arquivo.pdf',
      file_type: 'pdf',
      file_size: 100,
      local_path: null,
      drive_file_id: null,
      folder_id: null,
      mime_type: 'application/pdf',
    },
  ];

  it('manages copy, cut, and paste operations', async () => {
    const moveItemsMock = vi.fn().mockResolvedValue(undefined);
    const loadDataMock = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useFilesClipboard());

    expect(result.current.hasClipboard).toBe(false);

    // Copy item
    act(() => {
      result.current.copyItems([{ id: 'doc1', isFolder: false }]);
    });

    expect(result.current.hasClipboard).toBe(true);
    expect(result.current.clipboard?.operation).toBe('copy');

    // Cut item
    act(() => {
      result.current.cutItems([{ id: 'doc1', isFolder: false }]);
    });

    expect(result.current.clipboard?.operation).toBe('cut');

    // Paste cut item
    await act(async () => {
      await result.current.pasteItems('f1', mockFolders, mockFiles, moveItemsMock, loadDataMock);
    });

    expect(moveItemsMock).toHaveBeenCalledWith('doc1', 'f1', false);
    expect(result.current.hasClipboard).toBe(false);
  });
});
