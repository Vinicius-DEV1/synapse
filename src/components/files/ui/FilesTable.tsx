import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { FileItem, FileFolder } from '../../../types';
import type { FileSortColumn, FileSortOrder } from '../hooks/useFilesExplorer';
import { FilesTableFolderRow } from './components/FilesTableFolderRow';
import { FilesTableFileRow } from './components/FilesTableFileRow';

interface FilesTableProps {
  subfolders?: FileFolder[];
  files: FileItem[];
  selectedIds: Set<string>;
  focusedItemId: string | null;
  sortBy: FileSortColumn;
  sortOrder: FileSortOrder;
  onToggleSort: (column: FileSortColumn) => void;
  onToggleSelect: (fileId: string) => void;
  onToggleSelectAll: () => void;
  onFocusItem: (item: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onOpenFolder: (folderId: string) => void;
  onView: (file: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  onDropOnFolder?: (targetFolderId: string, payload?: { id: string; isFolder: boolean } | null) => void;
  onCanvasContextMenu?: (e: React.MouseEvent) => void;
  onItemClick?: (id: string, e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
}

export const FilesTable: React.FC<FilesTableProps> = ({
  subfolders = [],
  files,
  selectedIds,
  focusedItemId,
  sortBy,
  sortOrder,
  onToggleSort,
  onToggleSelect,
  onToggleSelectAll,
  onFocusItem,
  onOpenFolder,
  onView,
  onContextMenu,
  onDropOnFolder,
  onCanvasContextMenu,
  onItemClick,
}) => {
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const totalCount = subfolders.length + files.length;
  const allSelected = totalCount > 0 && selectedIds.size >= totalCount;

  const renderSortIndicator = (col: FileSortColumn) => {
    if (sortBy !== col) {
      return <ArrowUpDown size={12} className="opacity-0 group-hover/col:opacity-40 ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={12} className="text-brand-400 ml-1 inline" />
    ) : (
      <ArrowDown size={12} className="text-brand-400 ml-1 inline" />
    );
  };

  const handleDragStart = (e: React.DragEvent, item: FileItem | FileFolder, isFolder: boolean) => {
    const payload = JSON.stringify({ id: item.id, isFolder });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.effectAllowed = 'move';
    try {
      window.sessionStorage.setItem('caderno_internal_drag', payload);
    } catch {
      // Ignore
    }
  };

  const handleDragEnd = () => {
    try {
      window.sessionStorage.removeItem('caderno_internal_drag');
    } catch {
      // Ignore
    }
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    let payload: { id: string; isFolder: boolean } | null = null;
    try {
      const raw = e.dataTransfer.getData('application/json') || window.sessionStorage.getItem('caderno_internal_drag');
      if (raw) payload = JSON.parse(raw);
    } catch {
      // Ignore
    }
    if (onDropOnFolder) {
      onDropOnFolder(folderId, payload);
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0 select-none"
      onContextMenu={(e) => {
        if (onCanvasContextMenu) {
          e.preventDefault();
          onCanvasContextMenu(e);
        }
      }}
    >
      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-x-auto min-w-0 shadow-sm">
        <table className="w-full text-xs text-left border-collapse min-w-[620px]">
          <thead>
            <tr className="bg-white/[0.03] text-zinc-400 text-[11px] uppercase tracking-wider border-b border-white/[0.06]">
              <th className="px-3 py-2.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className={`rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer transition-opacity ${
                    selectedIds.size > 0 ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                  }`}
                  title="Selecionar todos os arquivos e pastas"
                />
              </th>

              <th
                onClick={() => onToggleSort('name')}
                className="px-3 py-2.5 font-medium cursor-pointer group/col hover:text-white transition-colors"
              >
                <span>Nome</span>
                {renderSortIndicator('name')}
              </th>

              <th
                onClick={() => onToggleSort('type')}
                className="px-3 py-2.5 font-medium w-24 cursor-pointer group/col hover:text-white transition-colors"
              >
                <span>Tipo</span>
                {renderSortIndicator('type')}
              </th>

              <th
                onClick={() => onToggleSort('size')}
                className="px-3 py-2.5 font-medium w-28 cursor-pointer group/col hover:text-white transition-colors"
              >
                <span>Tamanho</span>
                {renderSortIndicator('size')}
              </th>

              <th
                onClick={() => onToggleSort('updated_at')}
                className="px-3 py-2.5 font-medium w-32 cursor-pointer group/col hover:text-white transition-colors"
              >
                <span>Modificado</span>
                {renderSortIndicator('updated_at')}
              </th>

              <th className="px-3 py-2.5 font-medium w-20 text-center">Origem</th>
              <th className="px-3 py-2.5 font-medium w-10 text-center">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.04]">
            {subfolders.map((folder) => (
              <FilesTableFolderRow
                key={folder.id}
                folder={folder}
                isSelected={selectedIds.has(folder.id)}
                isFocused={focusedItemId === folder.id}
                isDragTarget={dragOverFolderId === folder.id}
                onToggleSelect={onToggleSelect}
                onItemClick={onItemClick}
                onFocusItem={onFocusItem}
                onOpenFolder={onOpenFolder}
                onContextMenu={onContextMenu}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                handleFolderDragOver={handleFolderDragOver}
                handleFolderDragLeave={handleFolderDragLeave}
                handleFolderDrop={handleFolderDrop}
              />
            ))}

            {files.map((file) => (
              <FilesTableFileRow
                key={file.id}
                file={file}
                isSelected={selectedIds.has(file.id)}
                isFocused={focusedItemId === file.id}
                onToggleSelect={onToggleSelect}
                onItemClick={onItemClick}
                onFocusItem={onFocusItem}
                onView={onView}
                onContextMenu={onContextMenu}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
