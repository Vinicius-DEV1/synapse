import React from 'react';
import { Folder, FolderPlus, X } from 'lucide-react';
import type { FileFolder } from '../../../types';

interface FilesFolderSidebarProps {
  folders: FileFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onNewFolder: () => void;
  onContextMenu: (e: React.MouseEvent, folder: FileFolder) => void;
  onDeleteFolder: (folder: FileFolder) => void;
}

export function FilesFolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onNewFolder,
  onContextMenu,
  onDeleteFolder
}: FilesFolderSidebarProps) {
  return (
    <div className="w-64 border-r border-white/5 bg-dark-card/30 flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="font-semibold text-sm">Pastas</h2>
        <button 
          onClick={onNewFolder}
          className="p-1 hover:bg-white/5 rounded-lg text-dark-subtext transition-colors group"
          title="Nova Pasta"
        >
          <FolderPlus size={16} className="group-hover:text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <button 
          onClick={() => onSelectFolder(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedFolderId === null ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:bg-white/5'
          }`}
        >
          <Folder size={16} />
          <span>Todos os Arquivos</span>
        </button>
        
        {folders.map(folder => (
          <div key={folder.id} className="relative group/folder">
            <button
              onClick={() => onSelectFolder(folder.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, folder);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedFolderId === folder.id ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:bg-white/5'
              }`}
            >
              <Folder size={16} style={{ color: folder.color || '#6366f1' }} />
              <span className="flex-1 text-left truncate">{folder.name}</span>
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onDeleteFolder(folder);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-subtext hover:text-red-400 opacity-0 group-hover/folder:opacity-100 transition-opacity"
              title="Excluir pasta"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
