import { useState, useCallback } from 'react';
import type { FileFolder } from '../../../types';
import { getDescendantFolderIds } from '../utils/filesHierarchy';
import { triggerToast } from '../../ui/ToastContext';

interface UseFilesDragAndDropOptions {
  folders: FileFolder[];
  currentFolderId: string | null;
  moveItems: (id: string, targetFolderId: string | null, isFolder: boolean) => Promise<void>;
  onOpenUploadModal: (files: File[]) => void;
}

export function useFilesDragAndDrop({
  folders,
  currentFolderId,
  moveItems,
  onOpenUploadModal,
}: UseFilesDragAndDropOptions) {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [dragInitialFiles, setDragInitialFiles] = useState<File[]>([]);

  // Internal drag & drop move handler
  const handleDropOnFolder = useCallback(
    async (
      targetFolderId: string | null,
      customPayload?: { id: string; isFolder: boolean } | null
    ) => {
      let payload = customPayload;

      if (!payload) {
        try {
          const rawData = window.sessionStorage.getItem('caderno_internal_drag');
          if (rawData) {
            payload = JSON.parse(rawData);
            window.sessionStorage.removeItem('caderno_internal_drag');
          }
        } catch (e) {
          console.warn('[DragAndDrop] Could not parse internal drag data:', e);
        }
      }

      if (!payload || !payload.id) return;

      const { id, isFolder } = payload;

      // Cannot move item into its current parent folder
      if (id === targetFolderId) return;

      // Prevent moving folder into itself or its descendants
      if (isFolder) {
        if (targetFolderId === id) {
          triggerToast('Não é possível mover uma pasta para dentro de si mesma.', 'error');
          return;
        }
        const descendants = getDescendantFolderIds(id, folders);
        if (targetFolderId && descendants.has(targetFolderId)) {
          triggerToast('Não é possível mover uma pasta para dentro de suas subpastas.', 'error');
          return;
        }
      }

      try {
        await moveItems(id, targetFolderId, isFolder);
        triggerToast('Item movido com sucesso!', 'success');
      } catch (err) {
        console.error('[DragAndDrop] Failed to move item:', err);
        const msg = err instanceof Error ? err.message : 'Falha ao mover item.';
        triggerToast(msg, 'error');
      }
    },
    [folders, moveItems]
  );

  // External file drop handler (from desktop / file manager)
  const handleFilesDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFiles(false);

      // Check if this was an internal drag dropped on the background
      const rawData = e.dataTransfer.getData('application/json');
      if (rawData) {
        try {
          const parsed = JSON.parse(rawData);
          if (parsed?.id) {
            handleDropOnFolder(currentFolderId, parsed);
            return;
          }
        } catch {
          // Fall through to external files
        }
      }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const filesArray = Array.from(e.dataTransfer.files);
        setDragInitialFiles(filesArray);
        onOpenUploadModal(filesArray);
      }
    },
    [currentFolderId, handleDropOnFolder, onOpenUploadModal]
  );

  const handleFilesDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  }, []);

  const handleFilesDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFiles(false);
  }, []);

  return {
    isDraggingFiles,
    dragInitialFiles,
    setDragInitialFiles,
    handleDropOnFolder,
    handleFilesDrop,
    handleFilesDragOver,
    handleFilesDragLeave,
  };
}
