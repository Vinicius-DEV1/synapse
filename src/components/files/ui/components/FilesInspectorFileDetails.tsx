import React, { useEffect, useState } from 'react';
import {
  File,
  HardDrive,
  Type,
  Calendar,
  Share2,
  Tag,
  Download,
  Eye,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type { FileItem, FileFolder, FilePageLink } from '../../../../types';
import { detectFileType } from '../../../../utils/file-type-detector';
import { formatBytes } from '../../utils/filesHierarchy';

interface FilesInspectorFileDetailsProps {
  activeFile: FileItem;
  onView: (item: FileItem | FileFolder) => void;
  onDownload?: (item: FileItem) => void;
  onRename: (item: FileItem | FileFolder) => void;
  onMove: (item: FileItem | FileFolder) => void;
  onDelete: (item: FileItem | FileFolder, isFolder: boolean) => void;
}

export const FilesInspectorFileDetails: React.FC<FilesInspectorFileDetailsProps> = ({
  activeFile,
  onView,
  onDownload,
  onRename,
  onMove,
  onDelete,
}) => {
  const [links, setLinks] = useState<FilePageLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);

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

  return (
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
  );
};
