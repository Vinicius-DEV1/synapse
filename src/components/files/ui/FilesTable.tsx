import React, { useState } from 'react';
import {
  FileText,
  MoreVertical,
  Film,
  Image as ImageIcon,
  FileArchive,
  FileCode,
  File,
  Folder,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BookOpen,
  Cloud,
} from 'lucide-react';
import type { FileItem, FileFolder } from '../../../types';
import type { FileSortColumn, FileSortOrder } from '../hooks/useFilesExplorer';
import { detectFileType } from '../../../utils/file-type-detector';
import { formatBytes } from '../utils/filesHierarchy';

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

  const getFileIcon = (file: FileItem) => {
    const type = file.file_type || detectFileType(file.name);
    switch (type) {
      case 'pdf':
        return <FileText size={16} className="text-red-400 shrink-0" />;
      case 'epub':
        return <BookOpen size={16} className="text-emerald-400 shrink-0" />;
      case 'image':
        return <ImageIcon size={16} className="text-blue-400 shrink-0" />;
      case 'video':
        return <Film size={16} className="text-purple-400 shrink-0" />;
      case 'code':
        return <FileCode size={16} className="text-cyan-400 shrink-0" />;
      case 'archive':
        return <FileArchive size={16} className="text-amber-400 shrink-0" />;
      default:
        return <File size={16} className="text-zinc-400 shrink-0" />;
    }
  };

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
            {/* Subfolders rows */}
            {subfolders.map((folder) => {
              const isSelected = selectedIds.has(folder.id);
              const isFocused = focusedItemId === folder.id;
              const isDragTarget = dragOverFolderId === folder.id;

              return (
                <tr
                  key={folder.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, folder, true)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={(e) => handleFolderDrop(e, folder.id)}
                  onClick={(e) => {
                    if (onItemClick) {
                      onItemClick(folder.id, e, folder, true);
                    } else {
                      onFocusItem({ item: folder, isFolder: true });
                    }
                  }}
                  onDoubleClick={() => onOpenFolder(folder.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu(e, folder, true);
                  }}
                  className={`hover:bg-white/[0.04] transition-colors group cursor-pointer ${
                    isDragTarget
                      ? 'bg-brand-500/20 ring-1 ring-brand-500'
                      : isSelected || isFocused
                      ? 'bg-brand-500/10'
                      : ''
                  }`}
                >
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(folder.id)}
                      className={`rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                      }`}
                      title={`Selecionar pasta ${folder.name}`}
                    />
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Folder
                        size={16}
                        style={{ color: folder.color || '#6366f1' }}
                        className="shrink-0"
                      />
                      <span className="font-medium text-zinc-100 group-hover:text-white truncate">
                        {folder.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <span className="text-zinc-500 text-xs">Pasta</span>
                  </td>

                  <td className="px-3 py-2 text-zinc-500 text-[11px] font-mono">—</td>

                  <td className="px-3 py-2 text-zinc-500 text-[11px] whitespace-nowrap">
                    {folder.created_at ? new Date(folder.created_at).toLocaleDateString() : '—'}
                  </td>

                  <td className="px-3 py-2 text-center text-zinc-500 text-[11px]">Local</td>

                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, folder, true);
                      }}
                      className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Mais opções"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Files rows */}
            {files.map((file) => {
              const isSelected = selectedIds.has(file.id);
              const isFocused = focusedItemId === file.id;

              return (
                <tr
                  key={file.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file, false)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    if (onItemClick) {
                      onItemClick(file.id, e, file, false);
                    } else {
                      onFocusItem({ item: file, isFolder: false });
                    }
                  }}
                  onDoubleClick={() => onView(file)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu(e, file, false);
                  }}
                  className={`hover:bg-white/[0.04] transition-colors group cursor-pointer ${
                    isSelected || isFocused ? 'bg-brand-500/10' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(file.id)}
                      className={`rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                      }`}
                      title={`Selecionar ${file.name}`}
                    />
                  </td>

                  <td className="px-3 py-2 max-w-[220px] md:max-w-xs xl:max-w-md">
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(file)}
                      <span
                        className="truncate text-zinc-200 font-medium group-hover:text-white"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <span className="text-zinc-400 text-xs capitalize">
                      {file.file_type || detectFileType(file.name)}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-zinc-400 text-[11px] font-mono whitespace-nowrap">
                    {formatBytes(file.file_size)}
                  </td>

                  <td className="px-3 py-2 text-zinc-500 text-[11px] whitespace-nowrap">
                    {new Date(file.updated_at || Date.now()).toLocaleDateString()}
                  </td>

                  <td className="px-3 py-2 text-center">
                    {file.drive_file_id ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 whitespace-nowrap font-medium"
                        title="Sincronizado no Google Drive"
                      >
                        <Cloud size={12} className="text-emerald-400 shrink-0" />
                        <span>Drive</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-500 whitespace-nowrap"
                        title="Armazenamento local"
                      >
                        Local
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, file, false);
                      }}
                      className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Mais opções"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
