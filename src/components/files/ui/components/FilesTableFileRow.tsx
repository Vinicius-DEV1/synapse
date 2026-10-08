import React from 'react';
import {
  FileText,
  BookOpen,
  Image as ImageIcon,
  Film,
  FileCode,
  FileArchive,
  File,
  Cloud,
  MoreVertical,
} from 'lucide-react';
import type { FileFolder, FileItem } from '../../../../types';
import { detectFileType } from '../../../../utils/file-type-detector';
import { formatBytes } from '../../utils/filesHierarchy';

interface FilesTableFileRowProps {
  file: FileItem;
  isSelected: boolean;
  isFocused: boolean;
  onToggleSelect: (id: string) => void;
  onItemClick?: (id: string, e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  onFocusItem: (item: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onView: (file: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  handleDragStart: (e: React.DragEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  handleDragEnd: () => void;
}

export const FilesTableFileRow: React.FC<FilesTableFileRowProps> = ({
  file,
  isSelected,
  isFocused,
  onToggleSelect,
  onItemClick,
  onFocusItem,
  onView,
  onContextMenu,
  handleDragStart,
  handleDragEnd,
}) => {
  const getFileIcon = (target: FileItem) => {
    const type = target.file_type || detectFileType(target.name);
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

  return (
    <tr
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
};
