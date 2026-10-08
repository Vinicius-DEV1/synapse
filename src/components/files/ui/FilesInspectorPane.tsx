import React from 'react';
import { X, Folder, HardDrive } from 'lucide-react';
import type { FileItem, FileFolder } from '../../../types';
import { formatBytes } from '../utils/filesHierarchy';
import { FilesInspectorFileDetails } from './components/FilesInspectorFileDetails';
import { FilesInspectorFolderDetails } from './components/FilesInspectorFolderDetails';

interface FilesInspectorPaneProps {
  isOpen: boolean;
  onClose: () => void;
  focusedItem: { item: FileItem | FileFolder; isFolder: boolean } | null;
  currentFolder: FileFolder | null;
  folderFileCount: number;
  folderTotalBytes: number;
  onView: (item: FileItem | FileFolder) => void;
  onDownload?: (item: FileItem) => void;
  onRename: (item: FileItem | FileFolder) => void;
  onMove: (item: FileItem | FileFolder) => void;
  onDelete: (item: FileItem | FileFolder, isFolder: boolean) => void;
}

export const FilesInspectorPane: React.FC<FilesInspectorPaneProps> = ({
  isOpen,
  onClose,
  focusedItem,
  currentFolder,
  folderFileCount,
  folderTotalBytes,
  onView,
  onDownload,
  onRename,
  onMove,
  onDelete,
}) => {
  const isFile = focusedItem && !focusedItem.isFolder;
  const activeFile = isFile ? (focusedItem.item as FileItem) : null;
  const activeFolder = focusedItem && focusedItem.isFolder ? (focusedItem.item as FileFolder) : null;

  if (!isOpen) return null;

  return (
    <aside className="w-72 lg:w-80 shrink-0 border-l border-white/[0.06] bg-zinc-950/70 flex flex-col h-full overflow-hidden select-none animate-in slide-in-from-right-4 duration-150">
      {/* Header */}
      <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {focusedItem ? 'Detalhes do Item' : 'Informações da Pasta'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          title="Fechar painel de detalhes (Esc)"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs scrollbar-none">
        {activeFile ? (
          <FilesInspectorFileDetails
            activeFile={activeFile}
            onView={onView}
            onDownload={onDownload}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
          />
        ) : activeFolder ? (
          <FilesInspectorFolderDetails
            activeFolder={activeFolder}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
          />
        ) : (
          /* Current Directory Overview (no item selected) */
          <>
            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-white/[0.06] text-zinc-400 flex items-center justify-center mb-3">
                <Folder size={26} />
              </div>
              <h4 className="text-sm font-medium text-zinc-100 break-all leading-tight mb-1">
                {currentFolder?.name || 'Início (Raiz)'}
              </h4>
              <span className="text-[10px] text-zinc-500">
                {folderFileCount} {folderFileCount === 1 ? 'item' : 'itens'} nesta pasta
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-zinc-400">
                <HardDrive size={14} className="shrink-0 mt-0.5 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-zinc-500">Tamanho dos Arquivos</div>
                  <div className="text-zinc-200 font-mono">
                    {formatBytes(folderTotalBytes)}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed pt-3 border-t border-white/[0.06]">
              Selecione um arquivo ou pasta para visualizar os detalhes completos, links e disparar ações rápidas.
            </p>
          </>
        )}
      </div>
    </aside>
  );
};
