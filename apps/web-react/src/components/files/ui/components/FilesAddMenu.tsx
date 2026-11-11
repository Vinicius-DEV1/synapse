import React, { useRef, useEffect } from 'react';
import { Plus, ChevronDown, Upload, FolderUp, FolderPlus } from 'lucide-react';
import { playUiClickSound, playUiActionSound } from '../../../../utils/uiSounds';

interface FilesAddMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenFileUpload: () => void;
  onOpenFolderUpload: () => void;
  onNewFolder: () => void;
}

export const FilesAddMenu: React.FC<FilesAddMenuProps> = ({
  isOpen,
  onToggle,
  onClose,
  onOpenFileUpload,
  onOpenFolderUpload,
  onNewFolder,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          playUiClickSound();
          onToggle();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-all shadow-sm shadow-brand-500/20 active:scale-95"
        title="Adicionar arquivos ou pastas"
      >
        <Plus size={13} strokeWidth={2.5} />
        <span className="hidden sm:inline">Adicionar</span>
        <ChevronDown
          size={11}
          className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => {
              playUiClickSound();
              onClose();
              onOpenFileUpload();
            }}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
          >
            <Upload size={14} className="text-brand-400 shrink-0" />
            <span>Adicionar Arquivo(s)...</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playUiClickSound();
              onClose();
              onOpenFolderUpload();
            }}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
          >
            <FolderUp size={14} className="text-emerald-400 shrink-0" />
            <span>Enviar Pasta Completa</span>
          </button>

          <div className="h-px bg-white/[0.06] my-1" />

          <button
            type="button"
            onClick={() => {
              playUiActionSound();
              onClose();
              onNewFolder();
            }}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
          >
            <FolderPlus size={14} className="text-yellow-400 shrink-0" />
            <span>Criar Nova Pasta</span>
          </button>
        </div>
      )}
    </div>
  );
};
