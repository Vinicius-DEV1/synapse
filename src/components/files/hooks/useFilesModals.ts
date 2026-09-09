import { useState, useCallback } from 'react';
import type { FileFolder, FileItem } from '../../../types';

export function useFilesModals(files: FileItem[], folders: FileFolder[] = []) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderUploadModal, setShowFolderUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<FileFolder | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<{ item: FileItem | FileFolder; isFolder: boolean } | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<Array<{ item: FileItem | FileFolder; isFolder: boolean }> | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem | FileFolder; isFolder: boolean } | null>(null);
  const [itemToView, setItemToView] = useState<FileItem | null>(null);
  const [itemToInfo, setItemToInfo] = useState<FileItem | null>(null);
  const [itemToRename, setItemToRename] = useState<{ item: FileItem | FileFolder; isFolder: boolean } | null>(null);
  const [itemToMove, setItemToMove] = useState<{ item: FileItem | FileFolder; isFolder: boolean } | null>(null);
  const [itemsToMove, setItemsToMove] = useState<Array<{ item: FileItem | FileFolder; isFolder: boolean }> | null>(null);
  const [showDriveAuth, setShowDriveAuth] = useState(false);

  const openNewFolderModal = useCallback((parentId: string | null) => {
    setEditingFolder(undefined);
    setNewFolderParentId(parentId);
    setShowFolderModal(true);
  }, []);

  const handleMoveBulk = useCallback(
    (selectedIds: Set<string>) => {
      const items = Array.from(selectedIds)
        .map((id) => {
          const folder = folders.find((f) => f.id === id);
          if (folder) return { item: folder as FileItem | FileFolder, isFolder: true };
          const file = files.find((x) => x.id === id);
          if (file) return { item: file as FileItem | FileFolder, isFolder: false };
          return null;
        })
        .filter((x): x is { item: FileItem | FileFolder; isFolder: boolean } => x !== null);
      setItemsToMove(items);
    },
    [files, folders]
  );

  const handleDeleteBulk = useCallback(
    (selectedIds: Set<string>) => {
      const items = Array.from(selectedIds)
        .map((id) => {
          const folder = folders.find((f) => f.id === id);
          if (folder) return { item: folder as FileItem | FileFolder, isFolder: true };
          const file = files.find((x) => x.id === id);
          if (file) return { item: file as FileItem | FileFolder, isFolder: false };
          return null;
        })
        .filter((x): x is { item: FileItem | FileFolder; isFolder: boolean } => x !== null);
      setItemsToDelete(items);
    },
    [files, folders]
  );

  const resetDeleteModals = useCallback(() => {
    setItemToDelete(null);
    setItemsToDelete(null);
  }, []);

  const resetMoveModals = useCallback(() => {
    setItemToMove(null);
    setItemsToMove(null);
  }, []);

  return {
    showUploadModal,
    setShowUploadModal,
    showFolderUploadModal,
    setShowFolderUploadModal,
    showFolderModal,
    setShowFolderModal,
    newFolderParentId,
    setNewFolderParentId,
    editingFolder,
    setEditingFolder,
    itemToDelete,
    setItemToDelete,
    itemsToDelete,
    setItemsToDelete,
    contextMenu,
    setContextMenu,
    itemToView,
    setItemToView,
    itemToInfo,
    setItemToInfo,
    itemToRename,
    setItemToRename,
    itemToMove,
    setItemToMove,
    itemsToMove,
    setItemsToMove,
    showDriveAuth,
    setShowDriveAuth,
    openNewFolderModal,
    handleMoveBulk,
    handleDeleteBulk,
    resetDeleteModals,
    resetMoveModals,
  };
}
