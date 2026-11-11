import { useEffect } from 'react';
import type { FileItem, FileFolder } from '../../../types';

interface UseFilesKeyboardShortcutsOptions {
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  goBack: () => void;
  goForward: () => void;
  goUpOneLevel: () => void;
  toggleInspector: () => void;
  focusedItem: { item: FileItem | FileFolder; isFolder: boolean } | null;
  selectedCount: number;
  onOpenFolder: (folderId: string) => void;
  onOpenFile: (file: FileItem) => void;
  onRenameItem: (item: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onDeleteItem: (item: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onDeleteBulk: () => void;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
}

export function useFilesKeyboardShortcuts({
  canGoBack,
  canGoForward,
  canGoUp,
  goBack,
  goForward,
  goUpOneLevel,
  toggleInspector,
  focusedItem,
  selectedCount,
  onOpenFolder,
  onOpenFile,
  onRenameItem,
  onDeleteItem,
  onDeleteBulk,
  onClearSelection,
  onSelectAll,
  onCopy,
  onCut,
  onPaste,
}: UseFilesKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is actively editing inside an input or editable field
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Alt + Left: Go Back
      if (e.altKey && e.key === 'ArrowLeft') {
        if (canGoBack) {
          e.preventDefault();
          goBack();
        }
      }
      // Alt + Right: Go Forward
      else if (e.altKey && e.key === 'ArrowRight') {
        if (canGoForward) {
          e.preventDefault();
          goForward();
        }
      }
      // Alt + Up or Backspace: Go Up One Level
      else if ((e.altKey && e.key === 'ArrowUp') || e.key === 'Backspace') {
        if (canGoUp) {
          e.preventDefault();
          goUpOneLevel();
        }
      }
      // Toggle Inspector: 'i' or 'I'
      else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        toggleInspector();
      }
      // Enter: Open focused file or folder
      else if (e.key === 'Enter') {
        if (focusedItem) {
          e.preventDefault();
          if (focusedItem.isFolder) {
            onOpenFolder(focusedItem.item.id);
          } else {
            onOpenFile(focusedItem.item as FileItem);
          }
        }
      }
      // F2: Rename focused item
      else if (e.key === 'F2') {
        if (focusedItem) {
          e.preventDefault();
          onRenameItem(focusedItem);
        }
      }
      // Delete: Delete focused or bulk items
      else if (e.key === 'Delete') {
        if (selectedCount > 0) {
          e.preventDefault();
          onDeleteBulk();
        } else if (focusedItem) {
          e.preventDefault();
          onDeleteItem(focusedItem);
        }
      }
      // Escape: Clear selection
      else if (e.key === 'Escape') {
        onClearSelection();
      }
      // Ctrl/Cmd + A: Select All
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        if (onSelectAll) {
          e.preventDefault();
          onSelectAll();
        }
      }
      // Ctrl/Cmd + C: Copy
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (onCopy) {
          e.preventDefault();
          onCopy();
        }
      }
      // Ctrl/Cmd + X: Cut
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        if (onCut) {
          e.preventDefault();
          onCut();
        }
      }
      // Ctrl/Cmd + V: Paste
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (onPaste) {
          e.preventDefault();
          onPaste();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canGoBack,
    canGoForward,
    canGoUp,
    goBack,
    goForward,
    goUpOneLevel,
    toggleInspector,
    focusedItem,
    selectedCount,
    onOpenFolder,
    onOpenFile,
    onRenameItem,
    onDeleteItem,
    onDeleteBulk,
    onClearSelection,
    onSelectAll,
    onCopy,
    onCut,
    onPaste,
  ]);
}
