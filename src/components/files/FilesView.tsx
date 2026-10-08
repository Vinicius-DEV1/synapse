import { useState } from 'react';
import { useFilesData } from './hooks/useFilesData';
import { useFilesExplorer } from './hooks/useFilesExplorer';
import { useFilesModals } from './hooks/useFilesModals';
import { useFilesDragAndDrop } from './hooks/useFilesDragAndDrop';
import { useFilesKeyboardShortcuts } from './hooks/useFilesKeyboardShortcuts';
import { useFilesViewSelection } from './hooks/useFilesViewSelection';
import { useFilesClipboard } from './hooks/useFilesClipboard';
import { useFilesClipboardActions } from './hooks/useFilesClipboardActions';
import { useFilesViewDerived } from './hooks/useFilesViewDerived';
import { FilesFolderSidebar } from './ui/FilesFolderSidebar';
import { FilesHeader } from './ui/FilesHeader';
import { FilesCategoryFilter } from './ui/FilesCategoryFilter';
import { FilesExplorerContent } from './ui/FilesExplorerContent';
import { FilesBulkActionsBar } from './ui/FilesBulkActionsBar';
import { FilesViewModalsBridge } from './ui/FilesViewModalsBridge';

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
    toggleSelect,
    clearSelection,
    handleSelectAll,
    handleItemClick,
  } = useFilesViewSelection({
    subfolders,
    visibleFiles,
    setFocusedItem,
  });

  // Clipboard operations hook
  const { copyItems, cutItems, pasteItems, hasClipboard } = useFilesClipboard();

  // Empty canvas context menu state
  const [canvasContextMenu, setCanvasContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCategoryFilter, setShowCategoryFilter] = useState(true);

  const { handleCopy, handleCut, handlePaste } = useFilesClipboardActions({
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
  });

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

  // Derived view properties (active folder, breadcrumb trail, folder total size)
  const { currentFolder, breadcrumbs, folderTotalBytes } = useFilesViewDerived({
    currentFolderId,
    folders,
    activeSection,
    visibleFiles,
  });

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
        onNewFolder={(parentId) => modals.openNewFolderModal(parentId ?? currentFolderId)}
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

        <FilesExplorerContent
          subfolders={subfolders}
          visibleFiles={visibleFiles}
          selectedIds={selectedIds}
          focusedItem={focusedItem}
          currentFolder={currentFolder}
          folderTotalBytes={folderTotalBytes}
          viewMode={viewMode}
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          isInspectorOpen={isInspectorOpen}
          sortBy={sortBy}
          sortOrder={sortOrder}
          currentFolderId={currentFolderId}
          onCanvasContextMenu={(coords) => setCanvasContextMenu(coords)}
          onUploadFile={() => modals.setShowUploadModal(true)}
          onUploadFolder={() => modals.setShowFolderUploadModal(true)}
          onNewFolder={(parentId) => modals.openNewFolderModal(parentId)}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={handleSelectAll}
          onToggleSort={toggleSort}
          onFocusItem={setFocusedItem}
          onItemClick={handleItemClick}
          onOpenFolder={navigateToFolder}
          onViewFile={modals.setItemToView}
          onContextMenu={(e, item, isFolder) => {
            modals.setContextMenu({ x: e.clientX, y: e.clientY, item, isFolder });
          }}
          onDropOnFolder={handleDropOnFolder}
          onCloseInspector={() => setIsInspectorOpen(false)}
          onDownload={handleDownload}
          onRename={(target) => modals.setItemToRename(target)}
          onMove={(target) => modals.setItemToMove(target)}
          onDelete={(item, isFolder) => modals.setItemToDelete({ item, isFolder })}
        />
      </div>

      <FilesBulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onMoveSelected={() => modals.handleMoveBulk(selectedIds)}
        onDeleteSelected={() => modals.handleDeleteBulk(selectedIds)}
      />

      <FilesViewModalsBridge
        modals={modals}
        folders={folders}
        currentFolderId={currentFolderId}
        dragInitialFiles={dragInitialFiles}
        canvasContextMenu={canvasContextMenu}
        hasClipboard={hasClipboard}
        viewMode={viewMode}
        setCanvasContextMenu={setCanvasContextMenu}
        setViewMode={setViewMode}
        handlePaste={handlePaste}
        handleSelectAll={handleSelectAll}
        setDragInitialFiles={setDragInitialFiles}
        handleUploadComplete={handleUploadComplete}
        loadData={loadData}
        handleFolderDeleted={handleFolderDeleted}
        clearSelection={clearSelection}
        setFocusedItem={setFocusedItem}
        setIsInspectorOpen={setIsInspectorOpen}
        navigateToFolder={navigateToFolder}
        handleDownload={handleDownload}
        renameItem={renameItem}
        moveItems={moveItems}
        setDriveStatus={setDriveStatus}
      />
    </div>
  );
}
