import React from 'react';
import { FolderOpen, Plus, FolderUp } from 'lucide-react';

interface FilesEmptyStateProps {
  isSearchActive: boolean;
  onUploadFile: () => void;
  onUploadFolder: () => void;
  onNewFolder?: () => void;
}

export const FilesEmptyState: React.FC<FilesEmptyStateProps> = ({
  isSearchActive,
  onUploadFile,
  onUploadFolder,
  onNewFolder,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-500 mb-4 shadow-inner">
        <FolderOpen size={30} className="stroke-[1.5]" />
      </div>

      <h3 className="text-sm font-semibold text-zinc-200 mb-1">
        {isSearchActive ? 'Nenhum resultado encontrado' : 'Esta pasta está vazia'}
      </h3>

      <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
        {isSearchActive
          ? 'Tente ajustar os termos de pesquisa ou limpar os filtros de categoria aplicados.'
          : 'Arraste arquivos diretamente para cá ou use os botões abaixo para organizar seu conteúdo.'}
      </p>

      {!isSearchActive && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onUploadFile}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-all shadow-sm shadow-brand-500/20 active:scale-95"
          >
            <Plus size={14} />
            <span>Adicionar Arquivo</span>
          </button>

          {onNewFolder && (
            <button
              type="button"
              onClick={onNewFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-lg text-xs font-medium border border-white/[0.08] transition-all active:scale-95"
            >
              <Plus size={14} />
              <span>Nova Subpasta</span>
            </button>
          )}

          <button
            type="button"
            onClick={onUploadFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-lg text-xs font-medium border border-white/[0.08] transition-all active:scale-95"
            title="Importar uma pasta completa do seu computador"
          >
            <FolderUp size={14} />
            <span>Importar Pasta</span>
          </button>
        </div>
      )}
    </div>
  );
};
