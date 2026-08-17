import type { FileFolder, FileItem } from '../../../types';
import FileUploadModal from '../FileUploadModal';
import FolderUploadModal from '../FolderUploadModal';
import FolderModal from '../FolderModal';
import DeleteModal from '../DeleteModal';
import FileContextMenu from '../FileContextMenu';
import FileInfoModal from '../FileInfoModal';
import FileViewer from '../FileViewer';
import RenameModal from '../RenameModal';
import MoveModal from '../MoveModal';
import DriveAuthModal from '../../library/DriveAuthModal';

interface FilesModalsHostProps {
  selectedFolderId: string | null;
  folders: FileFolder[];
  showUploadModal: boolean;
  onCloseUploadModal: () => void;
  showFolderUploadModal: boolean;
  onCloseFolderUploadModal: () => void;
  onUploadComplete: () => void;
  showFolderModal: boolean;
  onCloseFolderModal: () => void;
  editingFolder: FileFolder | undefined;
  onFolderSaved: () => void;
  itemToDelete: { item: FileItem | FileFolder; isFolder: boolean } | null;
  itemsToDelete: Array<{ item: FileItem | FileFolder; isFolder: boolean }> | null;
  onCloseDeleteModal: () => void;
  onDeleted: () => void;
  contextMenu: { x: number; y: number; item: FileItem | FileFolder; isFolder: boolean } | null;
  onCloseContextMenu: () => void;
  onSelectFolder: (id: string | null) => void;
  onViewItem: (file: FileItem) => void;
  onInfoItem: (file: FileItem) => void;
  onSetItemToDelete: (data: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onSetItemToRename: (data: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onSetItemToMove: (data: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onDownloadItem: (file: FileItem) => void;
  itemToRename: { item: FileItem | FileFolder; isFolder: boolean } | null;
  onCloseRenameModal: () => void;
  onRename: (id: string, newName: string, isFolder: boolean) => Promise<void>;
  itemToMove: { item: FileItem | FileFolder; isFolder: boolean } | null;
  itemsToMove: Array<{ item: FileItem | FileFolder; isFolder: boolean }> | null;
  onCloseMoveModal: () => void;
  onMove: (id: string, targetFolderId: string | null, isFolder: boolean) => Promise<void>;
  itemToInfo: FileItem | null;
  onCloseInfoModal: () => void;
  itemToView: FileItem | null;
  onCloseViewModal: () => void;
  showDriveAuth: boolean;
  onCloseDriveAuth: () => void;
  onDriveAuthSuccess: () => void;
}

export function FilesModalsHost({
  selectedFolderId,
  folders,
  showUploadModal,
  onCloseUploadModal,
  showFolderUploadModal,
  onCloseFolderUploadModal,
  onUploadComplete,
  showFolderModal,
  onCloseFolderModal,
  editingFolder,
  onFolderSaved,
  itemToDelete,
  itemsToDelete,
  onCloseDeleteModal,
  onDeleted,
  contextMenu,
  onCloseContextMenu,
  onSelectFolder,
  onViewItem,
  onInfoItem,
  onSetItemToDelete,
  onSetItemToRename,
  onSetItemToMove,
  onDownloadItem,
  itemToRename,
  onCloseRenameModal,
  onRename,
  itemToMove,
  itemsToMove,
  onCloseMoveModal,
  onMove,
  itemToInfo,
  onCloseInfoModal,
  itemToView,
  onCloseViewModal,
  showDriveAuth,
  onCloseDriveAuth,
  onDriveAuthSuccess
}: FilesModalsHostProps) {
  return (
    <>
      {showUploadModal && (
        <FileUploadModal 
          onClose={onCloseUploadModal}
          onUploadComplete={onUploadComplete}
          currentFolderId={selectedFolderId}
        />
      )}
      
      {showFolderUploadModal && (
        <FolderUploadModal 
          onClose={onCloseFolderUploadModal}
          onUploadComplete={onUploadComplete}
          currentFolderId={selectedFolderId}
        />
      )}

      {showFolderModal && (
        <FolderModal
          onClose={onCloseFolderModal}
          onSave={onFolderSaved}
          existingFolder={editingFolder}
        />
      )}
      
      {(itemToDelete || itemsToDelete) && (
        <DeleteModal
          item={itemToDelete?.item}
          isFolder={itemToDelete?.isFolder}
          items={itemsToDelete || undefined}
          onClose={onCloseDeleteModal}
          onDeleted={onDeleted}
        />
      )}
      
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item as FileItem}
          onClose={onCloseContextMenu}
          onView={contextMenu.isFolder ? () => onSelectFolder(contextMenu.item.id) : (item) => onViewItem(item as FileItem)}
          onInfo={(item) => onInfoItem(item as FileItem)}
          onDelete={(item) => onSetItemToDelete({ item, isFolder: contextMenu.isFolder })}
          onRename={(item) => onSetItemToRename({ item, isFolder: contextMenu.isFolder })}
          onMove={(item) => onSetItemToMove({ item, isFolder: contextMenu.isFolder })}
          onDownload={(item) => onDownloadItem(item as FileItem)}
        />
      )}

      {itemToRename && (
        <RenameModal
          item={itemToRename.item}
          isFolder={itemToRename.isFolder}
          onClose={onCloseRenameModal}
          onRename={onRename}
        />
      )}

      {(itemToMove || itemsToMove) && (
        <MoveModal
          item={itemToMove?.item}
          isFolder={itemToMove?.isFolder}
          items={itemsToMove || undefined}
          folders={folders}
          onClose={onCloseMoveModal}
          onMove={onMove}
        />
      )}

      {itemToInfo && (
        <FileInfoModal
          item={itemToInfo}
          onClose={onCloseInfoModal}
        />
      )}
      
      {itemToView && (
        <FileViewer
          item={itemToView}
          onClose={onCloseViewModal}
        />
      )}

      {showDriveAuth && (
        <DriveAuthModal 
          onClose={onCloseDriveAuth}
          onSuccess={onDriveAuthSuccess}
        />
      )}
    </>
  );
}
