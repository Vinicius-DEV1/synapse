import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FileFolder } from '../../../types';
import { useFilesDragAndDrop } from './useFilesDragAndDrop';

describe('useFilesDragAndDrop hook', () => {
  const mockFolders: FileFolder[] = [
    { id: 'f1', name: 'Documentos', parent_id: null, color: '#3b82f6' },
    { id: 'f2', name: 'Projetos', parent_id: 'f1', color: '#10b981' },
  ];

  it('prevents moving a folder into itself or its descendant', async () => {
    const moveItemsMock = vi.fn().mockResolvedValue(undefined);
    const onUploadModalMock = vi.fn();

    const { result } = renderHook(() =>
      useFilesDragAndDrop({
        folders: mockFolders,
        currentFolderId: null,
        moveItems: moveItemsMock,
        onOpenUploadModal: onUploadModalMock,
      })
    );

    // Attempt to move 'f1' into 'f1'
    await act(async () => {
      await result.current.handleDropOnFolder('f1', { id: 'f1', isFolder: true });
    });
    expect(moveItemsMock).not.toHaveBeenCalled();

    // Attempt to move 'f1' into 'f2' (which is a descendant of 'f1')
    await act(async () => {
      await result.current.handleDropOnFolder('f2', { id: 'f1', isFolder: true });
    });
    expect(moveItemsMock).not.toHaveBeenCalled();

    // Valid move: move file into 'f2'
    await act(async () => {
      await result.current.handleDropOnFolder('f2', { id: 'doc-123', isFolder: false });
    });
    expect(moveItemsMock).toHaveBeenCalledWith('doc-123', 'f2', false);
  });
});
