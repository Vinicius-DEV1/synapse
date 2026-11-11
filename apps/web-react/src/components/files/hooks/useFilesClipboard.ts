import { useState, useCallback } from 'react';
import type { FileFolder, FileItem } from '../../../types';
import { getDescendantFolderIds } from '../utils/filesHierarchy';
import { triggerToast } from '../../ui/ToastContext';

export interface ClipboardItem {
  id: string;
  isFolder: boolean;
}

export type ClipboardOperation = 'copy' | 'cut';

export interface ClipboardState {
  items: ClipboardItem[];
  operation: ClipboardOperation;
}

export function useFilesClipboard() {
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);

  const copyItems = useCallback((items: ClipboardItem[]) => {
    if (items.length === 0) return;
    setClipboard({ items, operation: 'copy' });
    const count = items.length;
    triggerToast(
      count === 1 ? 'Item copiado para a área de transferência.' : `${count} itens copiados.`,
      'info'
    );
  }, []);

  const cutItems = useCallback((items: ClipboardItem[]) => {
    if (items.length === 0) return;
    setClipboard({ items, operation: 'cut' });
    const count = items.length;
    triggerToast(
      count === 1
        ? 'Item recortado. Navegue até o destino e pressione Ctrl+V.'
        : `${count} itens recortados.`,
      'info'
    );
  }, []);

  const pasteItems = useCallback(
    async (
      targetFolderId: string | null,
      folders: FileFolder[],
      files: FileItem[],
      moveItems: (id: string, targetFolderId: string | null, isFolder: boolean) => Promise<void>,
      loadData: () => Promise<void>
    ) => {
      if (!clipboard || clipboard.items.length === 0) return;

      const { items, operation } = clipboard;

      if (operation === 'cut') {
        let movedCount = 0;
        for (const item of items) {
          if (item.isFolder) {
            if (targetFolderId === item.id) continue;
            const descendants = getDescendantFolderIds(item.id, folders);
            if (targetFolderId && descendants.has(targetFolderId)) {
              triggerToast('Não é possível mover uma pasta para dentro de suas subpastas.', 'error');
              continue;
            }
          }
          await moveItems(item.id, targetFolderId, item.isFolder);
          movedCount++;
        }

        setClipboard(null);
        if (movedCount > 0) {
          triggerToast(
            movedCount === 1 ? 'Item movido com sucesso!' : `${movedCount} itens movidos com sucesso!`,
            'success'
          );
        }
      } else if (operation === 'copy') {
        // Create duplicate copy of files
        let copiedCount = 0;
        if (window.api && window.api.files) {
          for (const item of items) {
            if (!item.isFolder) {
              const original = files.find((f) => f.id === item.id);
              if (original) {
                const extIndex = original.name.lastIndexOf('.');
                const copyName =
                  extIndex > 0
                    ? `${original.name.substring(0, extIndex)} (cópia)${original.name.substring(extIndex)}`
                    : `${original.name} (cópia)`;

                await window.api.files.create({
                  name: copyName,
                  file_type: original.file_type,
                  file_size: original.file_size,
                  local_path: original.local_path,
                  drive_file_id: original.drive_file_id,
                  folder_id: targetFolderId,
                  mime_type: original.mime_type,
                });
                copiedCount++;
              }
            }
          }
          await loadData();
        }

        if (copiedCount > 0) {
          triggerToast(
            copiedCount === 1 ? 'Cópia criada com sucesso!' : `${copiedCount} cópias criadas!`,
            'success'
          );
        }
      }
    },
    [clipboard]
  );

  return {
    clipboard,
    copyItems,
    cutItems,
    pasteItems,
    hasClipboard: Boolean(clipboard && clipboard.items.length > 0),
  };
}
