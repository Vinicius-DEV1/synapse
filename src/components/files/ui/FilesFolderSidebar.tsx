import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderPlus,
  Home,
  Clock,
  Cloud,
  ChevronRight,
  ChevronDown,
  Layers,
  HardDrive,
} from 'lucide-react';
import type { FileFolder, FileItem } from '../../../types';
import type { FileSectionType } from '../hooks/useFilesExplorer';
import { buildFolderTree, calculateStorageStats, type FolderTreeNode } from '../utils/filesHierarchy';

interface FilesFolderSidebarProps {
  folders: FileFolder[];
  files: FileItem[];
  selectedFolderId: string | null;
  activeSection: FileSectionType;
  driveStatus: 'checking' | 'connected' | 'disconnected';
  onSelectSection: (section: FileSectionType) => void;
  onSelectFolder: (id: string | null) => void;
  onNewFolder: (parentId?: string | null) => void;
  onContextMenu: (e: React.MouseEvent, folder: FileFolder) => void;
  onDropOnFolder: (targetFolderId: string | null, payload?: { id: string; isFolder: boolean } | null) => void;
}

export const FilesFolderSidebar: React.FC<FilesFolderSidebarProps> = ({
  folders,
  files,
  selectedFolderId,
  activeSection,
  driveStatus,
  onSelectSection,
  onSelectFolder,
  onNewFolder,
  onContextMenu,
  onDropOnFolder,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [dragOverFolderId, setDragOverFolderId] = useState<string | 'root' | null>(null);

  const folderTree = useMemo(() => buildFolderTree(folders, files), [folders, files]);
  const storageStats = useMemo(() => calculateStorageStats(files), [files]);

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(id === null ? 'root' : id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const handleDrop = (e: React.DragEvent, id: string | null) => {
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
    onDropOnFolder(id, payload);
  };

  // Render a folder node recursively in the tree
  const renderTreeNode = (node: FolderTreeNode, depth = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.folder.id);
    const isSelected = activeSection === 'folders' && selectedFolderId === node.folder.id;
    const isDragTarget = dragOverFolderId === node.folder.id;

    return (
      <div key={node.folder.id} className="select-none">
        <div
          onDragOver={(e) => handleDragOver(e, node.folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.folder.id)}
          onClick={() => {
            onSelectFolder(node.folder.id);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, node.folder);
          }}
          className={`group flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer relative ${
            isDragTarget
              ? 'bg-brand-500/20 ring-1 ring-brand-500 text-brand-300'
              : isSelected
              ? 'bg-brand-500/15 text-brand-300 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
        >
          {/* Chevron expand/collapse */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => toggleExpand(node.folder.id, e)}
              className="p-0.5 -ml-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-3.5" />
          )}

          {/* Folder Icon */}
          <Folder
            size={14}
            className="shrink-0"
            style={{ color: node.folder.color || '#6366f1' }}
          />

          {/* Name */}
          <span className="truncate flex-1" title={node.folder.name}>
            {node.folder.name}
          </span>

          {/* Item Count */}
          {node.itemCount > 0 && (
            <span className="text-[10px] text-zinc-500 font-mono group-hover:hidden">
              {node.itemCount}
            </span>
          )}

          {/* Quick Subfolder Creation */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNewFolder(node.folder.id);
            }}
            className="hidden group-hover:flex p-0.5 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="Criar subpasta"
          >
            <FolderPlus size={12} />
          </button>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-56 md:w-60 shrink-0 border-r border-white/[0.06] bg-zinc-950/60 flex flex-col h-full select-none">
      {/* Quick Access Section */}
      <div className="p-3 border-b border-white/[0.06] space-y-1">
        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Acesso Rápido
        </div>

        <button
          type="button"
          onClick={() => {
            onSelectSection('folders');
            onSelectFolder(null);
          }}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            activeSection === 'folders' && selectedFolderId === null
              ? 'bg-brand-500/15 text-brand-300 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          } ${dragOverFolderId === 'root' ? 'ring-1 ring-brand-500 bg-brand-500/20' : ''}`}
        >
          <Home size={14} className="shrink-0 text-brand-400" />
          <span className="flex-1 text-left">Início (Raiz)</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSection('all')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            activeSection === 'all'
              ? 'bg-brand-500/15 text-brand-300 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
        >
          <Layers size={14} className="shrink-0 text-blue-400" />
          <span className="flex-1 text-left">Todos os Arquivos</span>
          <span className="text-[10px] text-zinc-500 font-mono">{files.length}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSection('recent')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            activeSection === 'recent'
              ? 'bg-brand-500/15 text-brand-300 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
        >
          <Clock size={14} className="shrink-0 text-amber-400" />
          <span className="flex-1 text-left">Recentes</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSection('drive')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            activeSection === 'drive'
              ? 'bg-brand-500/15 text-brand-300 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
        >
          <Cloud size={14} className="shrink-0 text-emerald-400" />
          <span className="flex-1 text-left">Google Drive</span>
          <span className="text-[10px] text-zinc-500 font-mono">{storageStats.driveCount}</span>
        </button>
      </div>

      {/* Folders Tree Section */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-none flex flex-col">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Pastas
          </span>
          <button
            type="button"
            onClick={() => onNewFolder(null)}
            className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
            title="Nova Pasta na Raiz"
          >
            <FolderPlus size={13} />
          </button>
        </div>

        <div className="space-y-0.5 flex-1">
          {folderTree.length === 0 ? (
            <p className="text-[11px] text-zinc-500 px-2 py-4 italic text-center">
              Nenhuma pasta criada.
            </p>
          ) : (
            folderTree.map((node) => renderTreeNode(node))
          )}
        </div>
      </div>

      {/* Vault Storage Summary Footer */}
      <div className="p-3 border-t border-white/[0.06] bg-zinc-950/40 text-xs">
        <div className="flex items-center justify-between text-zinc-400 mb-1.5">
          <span className="flex items-center gap-1.5 text-[11px]">
            <HardDrive size={13} className="text-zinc-500" />
            <span>Armazenamento</span>
          </span>
          <span className="font-mono text-[11px] text-zinc-300">
            {storageStats.formattedTotalSize}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>
            {storageStats.fileCount} {storageStats.fileCount === 1 ? 'arquivo' : 'arquivos'}
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                driveStatus === 'connected' ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            />
            <span>{driveStatus === 'connected' ? 'Nuvem Conectada' : 'Apenas Local'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
