import type { FileFolder, FileItem } from '../../../types';
import type { useFilesModals } from '../hooks/useFilesModals';
import { FilesModalsHost } from './FilesModalsHost';
import { CanvasContextMenu } from '../CanvasContextMenu';

interface FilesViewModalsBridgeProps {
  modals: ReturnType<typeof useFilesModals>;
  folders: FileFolder[];
  currentFolderId: string | null;
  dragInitialFiles: File[];
  canvasContextMenu: { x: number; y: number } | null;
  hasClipboard: boolean;
  viewMode: 'grid' | 'table';
  setCanvasContextMenu: (coords: { x: number; y: number } | null) => void;
  setViewMode: (mode: 'grid' | 'table') => void;
  handlePaste: () => Promise<void>;
  handleSelectAll: () => void;
  setDragInitialFiles: (files: File[]) => void;
  handleUploadComplete: () => void;
  loadData: () => Promise<void>;
  handleFolderDeleted: (id: string) => void;
  clearSelection: () => void;
  setFocusedItem: (item: { item: FileItem | FileFolder; isFolder: boolean } | null) => void;
  setIsInspectorOpen: (open: boolean) => void;
  navigateToFolder: (id: string | null) => void;
  handleDownload: (file: FileItem) => void;
  renameItem: (id: string, newName: string, isFolder: boolean) => Promise<void>;
  moveItems: (id: string, targetFolderId: string | null, isFolder: boolean) => Promise<void>;
  setDriveStatus: (status: 'connected' | 'disconnected' | 'checking') => void;
}

export const FilesViewModalsBridge: React.FC<FilesViewModalsBridgeProps> = ({
  modals,
  folders,
  currentFolderId,
  dragInitialFiles,
  canvasContextMenu,
  hasClipboard,
  viewMode,
  setCanvasContextMenu,
  setViewMode,
  handlePaste,
  handleSelectAll,
  setDragInitialFiles,
  handleUploadComplete,
  loadData,
  handleFolderDeleted,
  clearSelection,
  setFocusedItem,
  setIsInspectorOpen,
  navigateToFolder,
  handleDownload,
  renameItem,
  moveItems,
  setDriveStatus,
}) => {
  return (
    <>
      <FilesModalsHost
        selectedFolderId={currentFolderId}
        folders={folders}
        showUploadModal={modals.showUploadModal}
        uploadInitialFiles={dragInitialFiles}
        onCloseUploadModal={() => {
          modals.setShowUploadModal(false);
          setDragInitialFiles([]);
        }}
        showFolderUploadModal={modals.showFolderUploadModal}
        onCloseFolderUploadModal={() => modals.setShowFolderUploadModal(false)}
        onUploadComplete={handleUploadComplete}
        showFolderModal={modals.showFolderModal}
        newFolderParentId={modals.newFolderParentId}
        onCloseFolderModal={() => {
          modals.setShowFolderModal(false);
          modals.setNewFolderParentId(null);
        }}
        editingFolder={modals.editingFolder}
        onFolderSaved={loadData}
        itemToDelete={modals.itemToDelete}
        itemsToDelete={modals.itemsToDelete}
        onCloseDeleteModal={modals.resetDeleteModals}
        onDeleted={() => {
          if (modals.itemToDelete?.isFolder) {
            handleFolderDeleted(modals.itemToDelete.item.id);
          } else if (modals.itemsToDelete) {
            for (const entry of modals.itemsToDelete) {
              if (entry.isFolder) handleFolderDeleted(entry.item.id);
            }
          }
          modals.resetDeleteModals();
          clearSelection();
          setFocusedItem(null);
          loadData();
        }}
        contextMenu={modals.contextMenu}
        onCloseContextMenu={() => modals.setContextMenu(null)}
        onSelectFolder={navigateToFolder}
        onViewItem={modals.setItemToView}
        onInfoItem={(file) => {
          setFocusedItem({ item: file, isFolder: false });
          setIsInspectorOpen(true);
        }}
        onSetItemToDelete={modals.setItemToDelete}
        onSetItemToRename={modals.setItemToRename}
        onSetItemToMove={modals.setItemToMove}
        onDownloadItem={handleDownload}
        itemToRename={modals.itemToRename}
        onCloseRenameModal={() => modals.setItemToRename(null)}
        onRename={renameItem}
        itemToMove={modals.itemToMove}
        itemsToMove={modals.itemsToMove}
        onCloseMoveModal={modals.resetMoveModals}
        onMove={moveItems}
        itemToInfo={modals.itemToInfo}
        onCloseInfoModal={() => modals.setItemToInfo(null)}
        itemToView={modals.itemToView}
        onCloseViewModal={() => modals.setItemToView(null)}
        showDriveAuth={modals.showDriveAuth}
        onCloseDriveAuth={() => modals.setShowDriveAuth(false)}
        onDriveAuthSuccess={() => {
          modals.setShowDriveAuth(false);
          setDriveStatus('connected');
        }}
      />

      {canvasContextMenu && (
        <CanvasContextMenu
          x={canvasContextMenu.x}
          y={canvasContextMenu.y}
          hasClipboard={hasClipboard}
          viewMode={viewMode}
          onClose={() => setCanvasContextMenu(null)}
          onNewFolder={() => modals.openNewFolderModal(currentFolderId)}
          onOpenFileUpload={() => modals.setShowUploadModal(true)}
          onOpenFolderUpload={() => modals.setShowFolderUploadModal(true)}
          onPaste={handlePaste}
          onSelectAll={handleSelectAll}
          onToggleViewMode={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
          onReload={loadData}
        />
      )}
    </>
  );
};
