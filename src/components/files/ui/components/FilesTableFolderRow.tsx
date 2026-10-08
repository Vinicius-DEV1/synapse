import React from 'react';
import { Folder, MoreVertical } from 'lucide-react';
import type { FileFolder, FileItem } from '../../../../types';

interface FilesTableFolderRowProps {
  folder: FileFolder;
  isSelected: boolean;
  isFocused: boolean;
  isDragTarget: boolean;
  onToggleSelect: (id: string) => void;
  onItemClick?: (id: string, e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  onFocusItem: (item: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onOpenFolder: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  handleDragStart: (e: React.DragEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  handleDragEnd: () => void;
  handleFolderDragOver: (e: React.DragEvent, folderId: string) => void;
  handleFolderDragLeave: (e: React.DragEvent) => void;
  handleFolderDrop: (e: React.DragEvent, folderId: string) => void;
}

export const FilesTableFolderRow: React.FC<FilesTableFolderRowProps> = ({
  folder,
  isSelected,
  isFocused,
  isDragTarget,
  onToggleSelect,
  onItemClick,
  onFocusItem,
  onOpenFolder,
  onContextMenu,
  handleDragStart,
  handleDragEnd,
  handleFolderDragOver,
  handleFolderDragLeave,
  handleFolderDrop,
}) => {
  return (
    <tr
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
};
