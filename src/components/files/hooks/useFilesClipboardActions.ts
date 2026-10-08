import { useCallback } from 'react';
import type { FileFolder, FileItem } from '../../../types';
import type { ClipboardItem } from './useFilesClipboard';

interface UseFilesClipboardActionsParams {
  selectedIds: Set<string>;
  subfolders: FileFolder[];
  focusedItem: { item: FileItem | FileFolder; isFolder: boolean } | null;
  copyItems: (items: ClipboardItem[]) => void;
  cutItems: (items: ClipboardItem[]) => void;
  pasteItems: (
    targetFolderId: string | null,
    folders: FileFolder[],
    files: FileItem[],
    moveItems: (id: string, targetFolderId: string | null, isFolder: boolean) => Promise<void>,
    loadData: () => Promise<void>
  ) => Promise<void>;
  currentFolderId: string | null;
  folders: FileFolder[];
  files: FileItem[];
  moveItems: (id: string, targetFolderId: string | null, isFolder: boolean) => Promise<void>;
  loadData: () => Promise<void>;
}

export function useFilesClipboardActions({
  selectedIds,
  subfolders,
  focusedItem,
  copyItems,
  cutItems,
  pasteItems,
  currentFolderId,
  folders,
  files,
  moveItems,
  loadData,
}: UseFilesClipboardActionsParams) {
  const handleCopy = useCallback(() => {
    if (selectedIds.size > 0) {
      const itemsToCopy: ClipboardItem[] = Array.from(selectedIds).map((id) => ({
        id,
        isFolder: subfolders.some((f) => f.id === id),
      }));
      copyItems(itemsToCopy);
    } else if (focusedItem) {
      copyItems([{ id: focusedItem.item.id, isFolder: focusedItem.isFolder }]);
    }
  }, [selectedIds, subfolders, focusedItem, copyItems]);

  const handleCut = useCallback(() => {
    if (selectedIds.size > 0) {
      const itemsToCut: ClipboardItem[] = Array.from(selectedIds).map((id) => ({
        id,
        isFolder: subfolders.some((f) => f.id === id),
      }));
      cutItems(itemsToCut);
    } else if (focusedItem) {
      cutItems([{ id: focusedItem.item.id, isFolder: focusedItem.isFolder }]);
    }
  }, [selectedIds, subfolders, focusedItem, cutItems]);

  const handlePaste = useCallback(async () => {
    await pasteItems(currentFolderId, folders, files, moveItems, loadData);
  }, [pasteItems, currentFolderId, folders, files, moveItems, loadData]);

  return {
    handleCopy,
    handleCut,
    handlePaste,
  };
}
