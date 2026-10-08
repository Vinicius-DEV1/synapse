import React from 'react';
import { Folder, Calendar, Trash2 } from 'lucide-react';
import type { FileFolder, FileItem } from '../../../../types';

interface FilesInspectorFolderDetailsProps {
  activeFolder: FileFolder;
  onRename: (item: FileItem | FileFolder) => void;
  onMove: (item: FileItem | FileFolder) => void;
  onDelete: (item: FileItem | FileFolder, isFolder: boolean) => void;
}

export const FilesInspectorFolderDetails: React.FC<FilesInspectorFolderDetailsProps> = ({
  activeFolder,
  onRename,
  onMove,
  onDelete,
}) => {
  return (
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
  );
};
