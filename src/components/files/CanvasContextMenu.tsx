import React, { useEffect, useRef } from 'react';
import {
  FolderPlus,
  Plus,
  FolderUp,
  ClipboardPaste,
  RefreshCw,
  CheckSquare,
  LayoutGrid,
  List,
} from 'lucide-react';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  hasClipboard: boolean;
  viewMode: 'grid' | 'table';
  onClose: () => void;
  onNewFolder: () => void;
  onOpenFileUpload: () => void;
  onOpenFolderUpload: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onToggleViewMode: () => void;
  onReload: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  hasClipboard,
  viewMode,
  onClose,
  onNewFolder,
  onOpenFileUpload,
  onOpenFolderUpload,
  onPaste,
  onSelectAll,
  onToggleViewMode,
  onReload,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timerId = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position so it doesn't overflow the viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 290);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-52 bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl py-1.5 flex flex-col text-xs text-zinc-200 select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedX, top: adjustedY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={() => {
          onNewFolder();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.08] text-zinc-200 hover:text-white transition-colors text-left"
      >
        <FolderPlus size={14} className="text-yellow-400" />
        <span>Nova Pasta</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onOpenFileUpload();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.08] text-zinc-200 hover:text-white transition-colors text-left"
      >
        <Plus size={14} className="text-brand-400" />
        <span>Fazer Upload de Arquivo</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onOpenFolderUpload();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.08] text-zinc-200 hover:text-white transition-colors text-left"
      >
        <FolderUp size={14} className="text-emerald-400" />
        <span>Fazer Upload de Pasta</span>
      </button>

      <div className="h-px bg-white/[0.08] my-1 mx-2" />

      <button
        type="button"
        disabled={!hasClipboard}
        onClick={() => {
          onPaste();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-zinc-200 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <ClipboardPaste size={14} className="text-purple-400" />
          <span>Colar Item</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Ctrl+V</span>
      </button>

      <div className="h-px bg-white/[0.08] my-1 mx-2" />

      <button
        type="button"
        onClick={() => {
          onSelectAll();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-zinc-200 hover:text-white transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <CheckSquare size={14} className="text-zinc-400" />
          <span>Selecionar Tudo</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Ctrl+A</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onToggleViewMode();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.08] text-zinc-200 hover:text-white transition-colors text-left"
      >
        {viewMode === 'grid' ? (
          <>
            <List size={14} className="text-zinc-400" />
            <span>Mudar para Tabela</span>
          </>
        ) : (
          <>
            <LayoutGrid size={14} className="text-zinc-400" />
            <span>Mudar para Grade</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          onReload();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.08] text-zinc-200 hover:text-white transition-colors text-left"
      >
        <RefreshCw size={14} className="text-zinc-400" />
        <span>Atualizar</span>
      </button>
    </div>
  );
};
