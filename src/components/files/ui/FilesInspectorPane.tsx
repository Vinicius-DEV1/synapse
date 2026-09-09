import React, { useEffect, useState } from 'react';
import {
  X,
  File,
  Folder,
  Calendar,
  HardDrive,
  Type,
  Share2,
  Tag,
  Download,
  Eye,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type { FileItem, FileFolder, FilePageLink } from '../../../types';
import { detectFileType } from '../../../utils/file-type-detector';
import { formatBytes } from '../utils/filesHierarchy';

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
  const [links, setLinks] = useState<FilePageLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);

  const isFile = focusedItem && !focusedItem.isFolder;
  const activeFile = isFile ? (focusedItem.item as FileItem) : null;
  const activeFolder = focusedItem && focusedItem.isFolder ? (focusedItem.item as FileFolder) : null;

  useEffect(() => {
    let active = true;
    if (activeFile && window.api?.files?.links) {
      setLinksLoading(true);
      window.api.files.links
        .getByFile(activeFile.id)
        .then((fetchedLinks) => {
          if (active) {
            setLinks(fetchedLinks || []);
            setLinksLoading(false);
          }
        })
        .catch((err) => {
          console.error('[FilesInspectorPane] Failed to load file links:', err);
          if (active) setLinksLoading(false);
        });
    } else {
      setLinks([]);
      setLinksLoading(false);
    }
    return () => {
      active = false;
    };
  }, [activeFile?.id]);

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
          // File Details
          <>
            {/* Thumbnail / Header Card */}
            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-3 shadow-inner">
                <File size={28} />
              </div>
              <h4
                className="text-sm font-medium text-zinc-100 break-all leading-tight mb-1 max-w-full line-clamp-2"
                title={activeFile.name}
              >
                {activeFile.name}
              </h4>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider bg-white/[0.05] text-zinc-400 border border-white/[0.04]">
                {activeFile.file_type || detectFileType(activeFile.name)}
              </span>
            </div>

            {/* Actions Bar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onView(activeFile)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 font-medium transition-colors border border-brand-500/20"
              >
                <Eye size={13} />
                <span>Visualizar</span>
              </button>

              {onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(activeFile)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-medium transition-colors border border-emerald-500/20"
                  title="Baixar arquivo descriptografado"
                >
                  <Download size={13} />
                  <span>Baixar</span>
                </button>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-zinc-400">
                <HardDrive size={14} className="shrink-0 mt-0.5 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-zinc-500">Tamanho</div>
                  <div className="text-zinc-200 font-mono">
                    {formatBytes(activeFile.file_size)}
                    <span className="text-zinc-500 text-[10px] ml-1.5">
                      ({activeFile.file_size.toLocaleString()} bytes)
                    </span>
                  </div>
                </div>
              </div>

              {activeFile.mime_type && (
                <div className="flex items-start gap-2.5 text-zinc-400">
                  <Type size={14} className="shrink-0 mt-0.5 text-zinc-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-zinc-500">MIME Type</div>
                    <div className="text-zinc-200 font-mono truncate" title={activeFile.mime_type}>
                      {activeFile.mime_type}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5 text-zinc-400">
                <Calendar size={14} className="shrink-0 mt-0.5 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-zinc-500">Modificado em</div>
                  <div className="text-zinc-200">
                    {new Date(activeFile.updated_at || Date.now()).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-zinc-400">
                <HardDrive size={14} className="shrink-0 mt-0.5 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-zinc-500">Armazenamento</div>
                  <div className="text-zinc-200 flex items-center gap-1.5 mt-0.5">
                    {activeFile.drive_file_id ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        ☁️ Google Drive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.06] text-[10px]">
                        💾 Armazenamento Local
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Linked Pages */}
            <div className="pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Share2 size={13} className="text-blue-400" />
                  Páginas Vinculadas
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">{links.length}</span>
              </div>

              {linksLoading ? (
                <div className="text-zinc-500 text-[11px]">Carregando vínculos...</div>
              ) : links.length > 0 ? (
                <div className="space-y-1.5">
                  {links.map((lnk) => (
                    <div
                      key={lnk.id}
                      className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Tag size={12} className="text-brand-400 shrink-0" />
                        <span className="truncate text-zinc-300">Página vinculada</span>
                      </div>
                      <ExternalLink size={12} className="text-zinc-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-[11px]">Nenhuma página vinculada.</p>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="pt-3 border-t border-white/[0.06] space-y-1.5">
              <button
                type="button"
                onClick={() => onRename(activeFile)}
                className="w-full text-left py-1.5 px-2 rounded-md hover:bg-white/[0.04] text-zinc-300 hover:text-white transition-colors"
              >
                Renomear arquivo...
              </button>
              <button
                type="button"
                onClick={() => onMove(activeFile)}
                className="w-full text-left py-1.5 px-2 rounded-md hover:bg-white/[0.04] text-zinc-300 hover:text-white transition-colors"
              >
                Mover para outra pasta...
              </button>
              <button
                type="button"
                onClick={() => onDelete(activeFile, false)}
                className="w-full text-left py-1.5 px-2 rounded-md hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                <span>Excluir arquivo</span>
              </button>
            </div>
          </>
        ) : activeFolder ? (
          // Folder Details
          <>
            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner"
                style={{
                  backgroundColor: `${activeFolder.color || '#6366f1'}20`,
                  color: activeFolder.color || '#6366f1',
                  border: `1px solid ${activeFolder.color || '#6366f1'}40`,
                }}
              >
                <Folder size={28} />
              </div>
              <h4 className="text-sm font-medium text-zinc-100 break-all leading-tight mb-1">
                {activeFolder.name}
              </h4>
              <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
                Pasta
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-zinc-400">
                <Calendar size={14} className="shrink-0 mt-0.5 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-zinc-500">Criada em</div>
                  <div className="text-zinc-200">
                    {new Date(activeFolder.created_at || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] space-y-1.5">
              <button
                type="button"
                onClick={() => onRename(activeFolder)}
                className="w-full text-left py-1.5 px-2 rounded-md hover:bg-white/[0.04] text-zinc-300 hover:text-white transition-colors"
              >
                Renomear pasta...
              </button>
              <button
                type="button"
                onClick={() => onMove(activeFolder)}
                className="w-full text-left py-1.5 px-2 rounded-md hover:bg-white/[0.04] text-zinc-300 hover:text-white transition-colors"
              >
                Mover pasta...
              </button>
              <button
                type="button"
                onClick={() => onDelete(activeFolder, true)}
                className="w-full text-left py-1.5 px-2 rounded-md hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                <span>Excluir pasta</span>
              </button>
            </div>
          </>
        ) : (
          // Current Directory Overview (no item selected)
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
