import { useState } from 'react';
import type { FileFolder, FileItem } from '../../types';
import { useFilesData } from './hooks/useFilesData';
import { FilesFolderSidebar } from './ui/FilesFolderSidebar';
import { FilesHeader } from './ui/FilesHeader';
import { FilesTable } from './ui/FilesTable';
import { FilesBulkActionsBar } from './ui/FilesBulkActionsBar';
import { FilesModalsHost } from './ui/FilesModalsHost';

export default function FilesView() {
  const {
    folders,
    files,
    selectedFolderId,
    setSelectedFolderId,
    searchQuery,
    setSearchQuery,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    driveStatus,
    setDriveStatus,
    loadData,
    handleDownload,
    renameItem,
    moveItems,
  } = useFilesData();

  // Modal and dialog states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderUploadModal, setShowFolderUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
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

  const filteredFiles = files
    .filter(f => selectedFolderId === null || f.folder_id === selectedFolderId)
    .filter(f => !searchQuery.trim() || f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    setShowFolderUploadModal(false);
    loadData();
  };

  const handleMoveBulk = () => {
    const items = Array.from(selectedIds)
      .map(id => {
        const f = files.find(x => x.id === id);
        return f ? { item: f, isFolder: false } : null;
      })
      .filter(Boolean) as Array<{ item: FileItem | FileFolder; isFolder: boolean }>;
    setItemsToMove(items);
  };

  const handleDeleteBulk = () => {
    const items = Array.from(selectedIds)
      .map(id => {
        const f = files.find(x => x.id === id);
        return f ? { item: f, isFolder: false } : null;
      })
      .filter(Boolean) as Array<{ item: FileItem | FileFolder; isFolder: boolean }>;
    setItemsToDelete(items);
  };

  return (
    <div className="flex h-full bg-dark-bg text-dark-text overflow-hidden relative">
      {/* Sidebar Pastas */}
      <FilesFolderSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        onNewFolder={() => {
          setEditingFolder(undefined);
          setShowFolderModal(true);
        }}
        onContextMenu={(e, folder) => {
          setContextMenu({ x: e.clientX, y: e.clientY, item: folder, isFolder: true });
        }}
        onDeleteFolder={(folder) => {
          setItemToDelete({ item: folder, isFolder: true });
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <FilesHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          driveStatus={driveStatus}
          onOpenDriveAuth={() => setShowDriveAuth(true)}
          onOpenFolderUpload={() => setShowFolderUploadModal(true)}
          onOpenFileUpload={() => setShowUploadModal(true)}
        />
        
        <FilesTable
          files={filteredFiles}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={() => toggleSelectAll(filteredFiles)}
          onView={(file) => setItemToView(file)}
          onContextMenu={(e, file) => {
            setContextMenu({ x: e.clientX, y: e.clientY, item: file, isFolder: false });
          }}
        />
      </div>

      {/* Floating Batch Actions Bar */}
      <FilesBulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onMoveSelected={handleMoveBulk}
        onDeleteSelected={handleDeleteBulk}
      />

      {/* Modals & Dialogs Host */}
      <FilesModalsHost
        selectedFolderId={selectedFolderId}
        folders={folders}
        showUploadModal={showUploadModal}
        onCloseUploadModal={() => setShowUploadModal(false)}
        showFolderUploadModal={showFolderUploadModal}
        onCloseFolderUploadModal={() => setShowFolderUploadModal(false)}
        onUploadComplete={handleUploadComplete}
        showFolderModal={showFolderModal}
        onCloseFolderModal={() => setShowFolderModal(false)}
        editingFolder={editingFolder}
        onFolderSaved={loadData}
        itemToDelete={itemToDelete}
        itemsToDelete={itemsToDelete}
        onCloseDeleteModal={() => {
          setItemToDelete(null);
          setItemsToDelete(null);
        }}
        onDeleted={() => {
          setItemToDelete(null);
          setItemsToDelete(null);
          clearSelection();
          loadData();
        }}
        contextMenu={contextMenu}
        onCloseContextMenu={() => setContextMenu(null)}
        onSelectFolder={(id) => setSelectedFolderId(id)}
        onViewItem={(file) => setItemToView(file)}
        onInfoItem={(file) => setItemToInfo(file)}
        onSetItemToDelete={setItemToDelete}
        onSetItemToRename={setItemToRename}
        onSetItemToMove={setItemToMove}
        onDownloadItem={handleDownload}
        itemToRename={itemToRename}
        onCloseRenameModal={() => setItemToRename(null)}
        onRename={renameItem}
        itemToMove={itemToMove}
        itemsToMove={itemsToMove}
        onCloseMoveModal={() => {
          setItemToMove(null);
          setItemsToMove(null);
        }}
        onMove={moveItems}
        itemToInfo={itemToInfo}
        onCloseInfoModal={() => setItemToInfo(null)}
        itemToView={itemToView}
        onCloseViewModal={() => setItemToView(null)}
        showDriveAuth={showDriveAuth}
        onCloseDriveAuth={() => setShowDriveAuth(false)}
        onDriveAuthSuccess={() => {
          setShowDriveAuth(false);
          setDriveStatus('connected');
        }}
      />
    </div>
  );
}
