import type { FileItem, FileFolder } from '../../../types';
import type { FileSortColumn, FileSortOrder } from '../hooks/useFilesExplorer';
import { FilesEmptyState } from './FilesEmptyState';
import { FilesGrid } from './FilesGrid';
import { FilesTable } from './FilesTable';
import { FilesInspectorPane } from './FilesInspectorPane';

export interface FilesExplorerContentProps {
  subfolders: FileFolder[];
  visibleFiles: FileItem[];
  selectedIds: Set<string>;
  focusedItem: { item: FileItem | FileFolder; isFolder: boolean } | null;
  currentFolder: FileFolder | null;
  folderTotalBytes: number;
  viewMode: 'grid' | 'table';
  searchQuery: string;
  categoryFilter: string;
  isInspectorOpen: boolean;
  sortBy: FileSortColumn;
  sortOrder: FileSortOrder;
  currentFolderId: string | null;
  onCanvasContextMenu: (coords: { x: number; y: number }) => void;
  onUploadFile: () => void;
  onUploadFolder: () => void;
  onNewFolder: (parentId: string | null) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onToggleSort: (by: FileSortColumn) => void;
  onFocusItem: (item: { item: FileItem | FileFolder; isFolder: boolean } | null) => void;
  onItemClick: (id: string, e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  onOpenFolder: (id: string | null) => void;
  onViewFile: (file: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  onDropOnFolder: (targetFolderId: string | null, payload?: { id: string; isFolder: boolean } | null) => void;
  onCloseInspector: () => void;
  onDownload: (file: FileItem) => void;
  onRename: (target: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onMove: (target: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onDelete: (item: FileItem | FileFolder, isFolder: boolean) => void;
}

export const FilesExplorerContent: React.FC<FilesExplorerContentProps> = ({
  subfolders,
  visibleFiles,
  selectedIds,
  focusedItem,
  currentFolder,
  folderTotalBytes,
  viewMode,
  searchQuery,
  categoryFilter,
  isInspectorOpen,
  sortBy,
  sortOrder,
  currentFolderId,
  onCanvasContextMenu,
  onUploadFile,
  onUploadFolder,
  onNewFolder,
  onToggleSelect,
  onToggleSelectAll,
  onToggleSort,
  onFocusItem,
  onItemClick,
  onOpenFolder,
  onViewFile,
  onContextMenu,
  onDropOnFolder,
  onCloseInspector,
  onDownload,
  onRename,
  onMove,
  onDelete,
}) => {
  return (
    <div
      className="flex-1 flex overflow-hidden min-w-0 relative"
      onContextMenu={(e) => {
        e.preventDefault();
        onCanvasContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {subfolders.length === 0 && visibleFiles.length === 0 ? (
        <FilesEmptyState
          isSearchActive={Boolean(searchQuery.trim() || categoryFilter !== 'all')}
          onUploadFile={onUploadFile}
          onUploadFolder={onUploadFolder}
          onNewFolder={() => onNewFolder(currentFolderId)}
        />
      ) : viewMode === 'grid' ? (
        <FilesGrid
          subfolders={subfolders}
          files={visibleFiles}
          selectedIds={selectedIds}
          focusedItemId={focusedItem?.item.id ?? null}
          onToggleSelect={onToggleSelect}
          onFocusItem={onFocusItem}
          onItemClick={onItemClick}
          onCanvasContextMenu={(e) => onCanvasContextMenu({ x: e.clientX, y: e.clientY })}
          onOpenFolder={onOpenFolder}
          onViewFile={onViewFile}
          onContextMenu={onContextMenu}
          onDropOnFolder={onDropOnFolder}
        />
      ) : (
        <FilesTable
          subfolders={subfolders}
          files={visibleFiles}
          selectedIds={selectedIds}
          focusedItemId={focusedItem?.item.id ?? null}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onToggleSort={onToggleSort}
          onToggleSelect={onToggleSelect}
          onToggleSelectAll={onToggleSelectAll}
          onFocusItem={onFocusItem}
          onItemClick={onItemClick}
          onCanvasContextMenu={(e) => onCanvasContextMenu({ x: e.clientX, y: e.clientY })}
          onOpenFolder={onOpenFolder}
          onView={onViewFile}
          onContextMenu={onContextMenu}
          onDropOnFolder={onDropOnFolder}
        />
      )}

      <FilesInspectorPane
        isOpen={isInspectorOpen}
        onClose={onCloseInspector}
        focusedItem={focusedItem}
        currentFolder={currentFolder}
        folderFileCount={visibleFiles.length}
        folderTotalBytes={folderTotalBytes}
        onView={(item) => {
          if ('parent_id' in item) {
            onOpenFolder(item.id);
          } else {
            onViewFile(item as FileItem);
          }
        }}
        onDownload={onDownload}
        onRename={(item) => onRename({ item, isFolder: 'parent_id' in item })}
        onMove={(item) => onMove({ item, isFolder: 'parent_id' in item })}
        onDelete={(item, isFolder) => onDelete(item, isFolder)}
      />
    </div>
  );
};
