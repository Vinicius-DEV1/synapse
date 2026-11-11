import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FileItem } from '../../../types';
import { useFilesModals } from './useFilesModals';

describe('useFilesModals hook', () => {
  const mockFiles: FileItem[] = [
    {
      id: 'f1',
      name: 'doc1.pdf',
      file_type: 'pdf',
      file_size: 100,
      local_path: null,
      drive_file_id: null,
      folder_id: null,
      mime_type: 'application/pdf',
    },
    {
      id: 'f2',
      name: 'doc2.pdf',
      file_type: 'pdf',
      file_size: 200,
      local_path: null,
      drive_file_id: null,
      folder_id: null,
      mime_type: 'application/pdf',
    },
  ];

  it('manages modal visibility states and bulk operations', () => {
    const { result } = renderHook(() => useFilesModals(mockFiles));

    expect(result.current.showUploadModal).toBe(false);
    expect(result.current.showFolderModal).toBe(false);

    act(() => {
      result.current.openNewFolderModal('parent-123');
    });

    expect(result.current.showFolderModal).toBe(true);
    expect(result.current.newFolderParentId).toBe('parent-123');

    act(() => {
      result.current.handleMoveBulk(new Set(['f1', 'f2']));
    });

    expect(result.current.itemsToMove?.length).toBe(2);

    act(() => {
      result.current.resetMoveModals();
    });

    expect(result.current.itemsToMove).toBeNull();
  });
});
