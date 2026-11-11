import React from 'react';
import { Folder, FolderPlus, ChevronRight, ChevronDown } from 'lucide-react';
import type { FileFolder } from '../../../../types';
import type { FileSectionType } from '../../hooks/useFilesExplorer';
import type { FolderTreeNode } from '../../utils/filesHierarchy';

interface FilesFolderTreeItemProps {
  node: FolderTreeNode;
  depth?: number;
  expandedFolders: Set<string>;
  dragOverFolderId: string | 'root' | null;
  activeSection: FileSectionType;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  toggleExpand: (folderId: string, e: React.MouseEvent) => void;
  onNewFolder: (parentId?: string | null) => void;
  onContextMenu: (e: React.MouseEvent, folder: FileFolder) => void;
  onDragOver: (e: React.DragEvent, folderId: string | 'root') => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
}

export const FilesFolderTreeItem: React.FC<FilesFolderTreeItemProps> = ({
  node,
  depth = 0,
  expandedFolders,
  dragOverFolderId,
  activeSection,
  selectedFolderId,
  onSelectFolder,
  toggleExpand,
  onNewFolder,
  onContextMenu,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedFolders.has(node.folder.id);
  const isSelected = activeSection === 'folders' && selectedFolderId === node.folder.id;
  const isDragTarget = dragOverFolderId === node.folder.id;

  return (
    <div className="select-none">
      <div
        onDragOver={(e) => onDragOver(e, node.folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, node.folder.id)}
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
          {node.children.map((child) => (
            <FilesFolderTreeItem
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              dragOverFolderId={dragOverFolderId}
              activeSection={activeSection}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              toggleExpand={toggleExpand}
              onNewFolder={onNewFolder}
              onContextMenu={onContextMenu}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};
