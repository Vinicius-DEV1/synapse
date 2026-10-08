import { useMemo, useCallback } from 'react';
import type { FileFolder, FileItem } from '../../../types';
import { useFilesSelection } from './useFilesSelection';

interface UseFilesViewSelectionParams {
  subfolders: FileFolder[];
  visibleFiles: FileItem[];
  setFocusedItem: (focused: { item: FileItem | FileFolder; isFolder: boolean } | null) => void;
}

export function useFilesViewSelection({
  subfolders,
  visibleFiles,
  setFocusedItem,
}: UseFilesViewSelectionParams) {
  const selection = useFilesSelection();

  // Ordered list of visible IDs for range multi-selection
  const allVisibleIds = useMemo(() => {
    return [...subfolders.map((f) => f.id), ...visibleFiles.map((f) => f.id)];
  }, [subfolders, visibleFiles]);

  const handleSelectAll = useCallback(() => {
    selection.selectAll(allVisibleIds);
  }, [selection, allVisibleIds]);

  const handleItemClick = useCallback(
    (id: string, e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => {
      selection.selectItemWithModifiers(id, e, allVisibleIds);
      setFocusedItem({ item, isFolder });
    },
    [selection, allVisibleIds, setFocusedItem]
  );

  return {
    ...selection,
    allVisibleIds,
    handleSelectAll,
    handleItemClick,
  };
}
