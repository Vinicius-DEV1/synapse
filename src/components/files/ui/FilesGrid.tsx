import React, { useState } from 'react';
import {
  Folder,
  FileText,
  BookOpen,
  Image as ImageIcon,
  Film,
  FileCode,
  Archive,
  File,
  MoreVertical,
  Cloud,
  Check,
} from 'lucide-react';
import type { FileFolder, FileItem } from '../../../types';
import { detectFileType } from '../../../utils/file-type-detector';
import { formatBytes } from '../utils/filesHierarchy';

interface FilesGridProps {
  subfolders: FileFolder[];
  files: FileItem[];
  selectedIds: Set<string>;
  focusedItemId: string | null;
  onToggleSelect: (id: string) => void;
  onFocusItem: (item: { item: FileItem | FileFolder; isFolder: boolean }) => void;
  onOpenFolder: (folderId: string) => void;
  onViewFile: (file: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
  onDropOnFolder: (targetFolderId: string, payload?: { id: string; isFolder: boolean } | null) => void;
  onCanvasContextMenu?: (e: React.MouseEvent) => void;
  onItemClick?: (id: string, e: React.MouseEvent, item: FileItem | FileFolder, isFolder: boolean) => void;
}

export const FilesGrid: React.FC<FilesGridProps> = ({
  subfolders,
  files,
  selectedIds,
  focusedItemId,
  onToggleSelect,
  onFocusItem,
  onOpenFolder,
  onViewFile,
  onContextMenu,
  onDropOnFolder,
  onCanvasContextMenu,
  onItemClick,
}) => {
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const getFileIcon = (file: FileItem) => {
    const type = file.file_type || detectFileType(file.name);
    switch (type) {
      case 'pdf':
        return <FileText size={26} className="text-red-400" />;
      case 'epub':
        return <BookOpen size={26} className="text-emerald-400" />;
      case 'image':
        return <ImageIcon size={26} className="text-blue-400" />;
      case 'video':
        return <Film size={26} className="text-purple-400" />;
      case 'code':
        return <FileCode size={26} className="text-cyan-400" />;
      case 'archive':
        return <Archive size={26} className="text-amber-400" />;
      default:
        return <File size={26} className="text-zinc-400" />;
    }
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
    onDropOnFolder(folderId, payload);
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 select-none"
      onContextMenu={(e) => {
        if (onCanvasContextMenu) {
          e.preventDefault();
          onCanvasContextMenu(e);
        }
      }}
    >
      {/* Subfolders Section */}
      {subfolders.length > 0 && (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
            <Folder size={13} className="text-yellow-400/80" />
            <span>Pastas ({subfolders.length})</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {subfolders.map((folder) => {
              const isSelected = selectedIds.has(folder.id);
              const isFocused = focusedItemId === folder.id;
              const isDragTarget = dragOverFolderId === folder.id;

              return (
                <div
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
                  className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isDragTarget
                      ? 'border-brand-500 bg-brand-500/15 ring-2 ring-brand-500/40'
                      : isSelected || isFocused
                      ? 'border-brand-500/50 bg-brand-500/10 shadow-sm'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      backgroundColor: `${folder.color || '#6366f1'}20`,
                      color: folder.color || '#6366f1',
                    }}
                  >
                    <Folder size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-medium text-zinc-100 truncate group-hover:text-white"
                      title={folder.name}
                    >
                      {folder.name}
                    </p>
                    <p className="text-[10px] text-zinc-500">Pasta</p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, folder, true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-opacity"
                    title="Mais opções"
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Files Section */}
      {files.length > 0 && (
        <section>
          {subfolders.length > 0 && (
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <File size={13} className="text-brand-400" />
              <span>Arquivos ({files.length})</span>
            </h4>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {files.map((file) => {
              const isSelected = selectedIds.has(file.id);
              const isFocused = focusedItemId === file.id;

              return (
                <div
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
                  onDoubleClick={() => onViewFile(file)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu(e, file, false);
                  }}
                  className={`group relative flex flex-col justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected || isFocused
                      ? 'border-brand-500/60 bg-brand-500/10 shadow-md ring-1 ring-brand-500/30'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  {/* Top Bar inside Card: Selection Checkbox & Options Menu */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(file.id);
                      }}
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-brand-500 border-brand-400 text-white'
                          : 'border-white/20 bg-dark-bg/60 opacity-0 group-hover:opacity-100 hover:border-white/40'
                      }`}
                      title={isSelected ? 'Desmarcar' : 'Selecionar'}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </button>

                    <div className="flex items-center gap-1">
                      {file.drive_file_id && (
                        <span title="Salvo no Google Drive" className="text-emerald-400">
                          <Cloud size={13} />
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onContextMenu(e, file, false);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-opacity"
                        title="Mais opções"
                      >
                        <MoreVertical size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail / Icon Display */}
                  <div className="w-full aspect-[4/3] rounded-lg bg-zinc-900/60 border border-white/[0.04] flex flex-col items-center justify-center mb-2.5 transition-transform group-hover:scale-[1.02]">
                    {getFileIcon(file)}
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mt-1.5 px-1.5 py-0.5 rounded bg-white/[0.03]">
                      {file.file_type || detectFileType(file.name)}
                    </span>
                  </div>

                  {/* File Metadata */}
                  <div className="min-w-0">
                    <p
                      className="text-xs font-medium text-zinc-200 truncate group-hover:text-white leading-tight mb-1"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>{formatBytes(file.file_size)}</span>
                      <span>{new Date(file.updated_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
