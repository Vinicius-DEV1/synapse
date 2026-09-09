import { useMemo, useState, useCallback } from 'react';
import type { FileItem, FileFolder } from '../../types';
import { useFilesData } from './hooks/useFilesData';
import { useFilesExplorer } from './hooks/useFilesExplorer';
import { useFilesModals } from './hooks/useFilesModals';
import { useFilesDragAndDrop } from './hooks/useFilesDragAndDrop';
import { useFilesKeyboardShortcuts } from './hooks/useFilesKeyboardShortcuts';
import { useFilesSelection } from './hooks/useFilesSelection';
import { useFilesClipboard, type ClipboardItem } from './hooks/useFilesClipboard';
import { CanvasContextMenu } from './CanvasContextMenu';
import { getBreadcrumbTrail } from './utils/filesHierarchy';
import { FilesFolderSidebar } from './ui/FilesFolderSidebar';
import { FilesHeader } from './ui/FilesHeader';
import { FilesCategoryFilter } from './ui/FilesCategoryFilter';
import { FilesTable } from './ui/FilesTable';
import { FilesGrid } from './ui/FilesGrid';
import { FilesInspectorPane } from './ui/FilesInspectorPane';
import { FilesEmptyState } from './ui/FilesEmptyState';
import { FilesBulkActionsBar } from './ui/FilesBulkActionsBar';
import { FilesModalsHost } from './ui/FilesModalsHost';

export default function FilesView() {
  const {
    folders,
    files,
    searchQuery,
    setSearchQuery,
    driveStatus,
    setDriveStatus,
    loadData,
    handleDownload,
    renameItem,
    moveItems,
  } = useFilesData();

  // Navigation, view mode, sorting, scope and category filter state
  const {
    currentFolderId,
    activeSection,
    selectSection,
    navigateToFolder,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    goUpOneLevel,
    viewMode,
    setViewMode,
    isInspectorOpen,
    toggleInspector,
    setIsInspectorOpen,
    focusedItem,
    setFocusedItem,
    sortBy,
    sortOrder,
    toggleSort,
    categoryFilter,
    setCategoryFilter,
    searchScope,
    setSearchScope,
    handleFolderDeleted,
    subfolders,
    files: visibleFiles,
  } = useFilesExplorer({ folders, files, searchQuery });

  // Dialog and modal states hook
  const modals = useFilesModals(files, folders);

  // Advanced multi-selection hook
  const {
    selectedIds,
    selectItemWithModifiers,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useFilesSelection();

  // Clipboard operations hook
  const { copyItems, cutItems, pasteItems, hasClipboard } = useFilesClipboard();

  // Empty canvas context menu state
  const [canvasContextMenu, setCanvasContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCategoryFilter, setShowCategoryFilter] = useState(true);

  // Ordered list of visible IDs for range multi-selection
  const allVisibleIds = useMemo(() => {
    return [...subfolders.map((f) => f.id), ...visibleFiles.map((f) => f.id)];
  }, [subfolders, visibleFiles]);

  const handleSelectAll = useCallback(() => {
    selectAll(allVisibleIds);
  }, [selectAll, allVisibleIds]);

  const handleItemClick = useCallback(
    (id: string, e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => {
      selectItemWithModifiers(id, e, allVisibleIds);
      setFocusedItem({ item, isFolder });
    },
    [selectItemWithModifiers, allVisibleIds, setFocusedItem]
  );

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

  const handlePaste = useCallback(() => {
    pasteItems(currentFolderId, folders, files, moveItems, loadData);
  }, [pasteItems, currentFolderId, folders, files, moveItems, loadData]);

  // Drag and drop orchestration hook
  const {
    isDraggingFiles,
    dragInitialFiles,
    setDragInitialFiles,
    handleDropOnFolder,
    handleFilesDrop,
    handleFilesDragOver,
    handleFilesDragLeave,
  } = useFilesDragAndDrop({
    folders,
    currentFolderId,
    moveItems,
    onOpenUploadModal: (dragFiles) => {
      setDragInitialFiles(dragFiles);
      modals.setShowUploadModal(true);
    },
  });

  // Keyboard navigation shortcuts
  useFilesKeyboardShortcuts({
    canGoBack,
    canGoForward,
    canGoUp: currentFolderId !== null && activeSection === 'folders',
    goBack,
    goForward,
    goUpOneLevel,
    toggleInspector,
    focusedItem,
    selectedCount: selectedIds.size,
    onOpenFolder: navigateToFolder,
    onOpenFile: modals.setItemToView,
    onRenameItem: (item) => modals.setItemToRename(item),
    onDeleteItem: (item) => modals.setItemToDelete(item),
    onDeleteBulk: () => modals.handleDeleteBulk(selectedIds),
    onClearSelection: clearSelection,
    onSelectAll: handleSelectAll,
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
  });

  // Active folder details for inspector
  const currentFolder = useMemo(() => {
    return folders.find((f) => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  // Breadcrumbs trail
  const breadcrumbs = useMemo(() => {
    const rootLabel =
      activeSection === 'folders'
        ? 'Início'
        : activeSection === 'all'
        ? 'Todos os Arquivos'
        : activeSection === 'recent'
        ? 'Recentes'
        : 'Google Drive';

    if (activeSection !== 'folders') {
      return [{ id: null, name: rootLabel }];
    }
    return getBreadcrumbTrail(currentFolderId, folders, 'Início');
  }, [currentFolderId, folders, activeSection]);

  const folderTotalBytes = useMemo(() => {
    return visibleFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
  }, [visibleFiles]);

  const handleUploadComplete = () => {
    modals.setShowUploadModal(false);
    modals.setShowFolderUploadModal(false);
    loadData();
  };

  return (
    <div className="flex h-full bg-dark-bg text-dark-text overflow-hidden relative select-none">
      {/* Hierarchical Folder Sidebar */}
      <FilesFolderSidebar
        folders={folders}
        files={files}
        selectedFolderId={currentFolderId}
        activeSection={activeSection}
        driveStatus={driveStatus}
        onSelectSection={selectSection}
        onSelectFolder={navigateToFolder}
        onNewFolder={(parentId) => {
          modals.openNewFolderModal(parentId !== undefined ? parentId : currentFolderId);
        }}
        onContextMenu={(e, folder) => {
          e.stopPropagation();
          modals.setContextMenu({ x: e.clientX, y: e.clientY, item: folder, isFolder: true });
        }}
        onDropOnFolder={handleDropOnFolder}
        isOpen={isSidebarOpen}
      />

      {/* Main Content Area */}
      <div
        onDragOver={handleFilesDragOver}
        onDragEnter={handleFilesDragOver}
        onDragLeave={handleFilesDragLeave}
        onDrop={handleFilesDrop}
        className={`flex-1 flex flex-col h-full overflow-hidden min-w-0 transition-colors ${
          isDraggingFiles ? 'ring-2 ring-inset ring-brand-500/50 bg-brand-500/5' : ''
        }`}
      >
        <FilesHeader
          breadcrumbs={breadcrumbs}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          canGoUp={currentFolderId !== null && activeSection === 'folders'}
          onGoBack={goBack}
          onGoForward={goForward}
          onGoUp={goUpOneLevel}
          onNavigateBreadcrumb={navigateToFolder}
          onDropOnFolder={handleDropOnFolder}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchScope={searchScope}
          onToggleSearchScope={() => setSearchScope((prev) => (prev === 'current' ? 'all' : 'current'))}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onToggleSort={toggleSort}
          isInspectorOpen={isInspectorOpen}
          onToggleInspector={toggleInspector}
          driveStatus={driveStatus}
          onOpenDriveAuth={() => modals.setShowDriveAuth(true)}
          onOpenFolderUpload={() => modals.setShowFolderUploadModal(true)}
          onOpenFileUpload={() => modals.setShowUploadModal(true)}
          onNewFolder={() => modals.openNewFolderModal(currentFolderId)}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          showCategoryFilter={showCategoryFilter}
          onToggleCategoryFilter={() => setShowCategoryFilter((prev) => !prev)}
          onReload={loadData}
        />

        {showCategoryFilter && (
          <FilesCategoryFilter
            activeCategory={categoryFilter}
            onSelectCategory={setCategoryFilter}
            files={files}
          />
        )}

        <div
          className="flex-1 flex overflow-hidden min-w-0 relative"
          onContextMenu={(e) => {
            e.preventDefault();
            setCanvasContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          {subfolders.length === 0 && visibleFiles.length === 0 ? (
            <FilesEmptyState
              isSearchActive={Boolean(searchQuery.trim() || categoryFilter !== 'all')}
              onUploadFile={() => modals.setShowUploadModal(true)}
              onUploadFolder={() => modals.setShowFolderUploadModal(true)}
              onNewFolder={() => modals.openNewFolderModal(currentFolderId)}
            />
          ) : viewMode === 'grid' ? (
            <FilesGrid
              subfolders={subfolders}
              files={visibleFiles}
              selectedIds={selectedIds}
              focusedItemId={focusedItem?.item.id ?? null}
              onToggleSelect={toggleSelect}
              onFocusItem={setFocusedItem}
              onItemClick={handleItemClick}
              onCanvasContextMenu={(e) => setCanvasContextMenu({ x: e.clientX, y: e.clientY })}
              onOpenFolder={navigateToFolder}
              onViewFile={modals.setItemToView}
              onContextMenu={(e, item, isFolder) => {
                modals.setContextMenu({ x: e.clientX, y: e.clientY, item, isFolder });
              }}
              onDropOnFolder={handleDropOnFolder}
            />
          ) : (
            <FilesTable
              subfolders={subfolders}
              files={visibleFiles}
              selectedIds={selectedIds}
              focusedItemId={focusedItem?.item.id ?? null}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onToggleSort={toggleSort}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={handleSelectAll}
              onFocusItem={setFocusedItem}
              onItemClick={handleItemClick}
              onCanvasContextMenu={(e) => setCanvasContextMenu({ x: e.clientX, y: e.clientY })}
              onOpenFolder={navigateToFolder}
              onView={modals.setItemToView}
              onContextMenu={(e, item, isFolder) => {
                modals.setContextMenu({ x: e.clientX, y: e.clientY, item, isFolder });
              }}
              onDropOnFolder={handleDropOnFolder}
            />
          )}

          <FilesInspectorPane
            isOpen={isInspectorOpen}
            onClose={() => setIsInspectorOpen(false)}
            focusedItem={focusedItem}
            currentFolder={currentFolder}
            folderFileCount={visibleFiles.length}
            folderTotalBytes={folderTotalBytes}
            onView={(item) => {
              if ('parent_id' in item) {
                navigateToFolder(item.id);
              } else {
                modals.setItemToView(item as FileItem);
              }
            }}
            onDownload={handleDownload}
            onRename={(item) => modals.setItemToRename({ item, isFolder: 'parent_id' in item })}
            onMove={(item) => modals.setItemToMove({ item, isFolder: 'parent_id' in item })}
            onDelete={(item, isFolder) => modals.setItemToDelete({ item, isFolder })}
          />
        </div>
      </div>

      <FilesBulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onMoveSelected={() => modals.handleMoveBulk(selectedIds)}
        onDeleteSelected={() => modals.handleDeleteBulk(selectedIds)}
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
    </div>
  );
}
